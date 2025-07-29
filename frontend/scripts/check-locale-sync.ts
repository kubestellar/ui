/// <reference types="node" />
import fs from 'fs';
import path from 'path';
import { Octokit } from '@octokit/rest';

interface LocaleData {
  [key: string]: unknown;
}

interface LocaleIssues {
  missing: string[];
  extra: string[];
}

interface LocaleResults {
  [locale: string]: LocaleIssues;
}

interface GitHubIssue {
  number: number;
  title: string;
  body: string;
  state: 'open' | 'closed';
  labels: Array<{ name: string }>;
}

class LocaleSyncChecker {
  private octokit?: Octokit;
  private owner?: string;
  private repo?: string;
  private prNumber?: string;
  private localesPath: string;
  private masterLocale: string;
  private issueLabel: string;
  private issueTitlePrefix: string;

  constructor() {
    this.localesPath = path.join(process.cwd(), 'src', 'locales');
    this.masterLocale = 'en';
    this.issueLabel = 'locale-sync';
    this.issueTitlePrefix = '[Locale Sync]';
    const repository = process.env.GITHUB_REPOSITORY;
    const ghRepoToken = process.env.GH_REPO_TOKEN;
    const githubToken = process.env.GITHUB_TOKEN;
    const token = ghRepoToken || githubToken;
    this.prNumber = process.env.PR_NUMBER || process.env.GITHUB_PR_NUMBER || this.detectPRNumber();

    // Debug token availability
    if (ghRepoToken) {
      console.log('✅ Using GH_REPO_TOKEN for GitHub API access');
    } else if (githubToken) {
      console.log('⚠️  Using GITHUB_TOKEN (limited permissions) for GitHub API access');
    } else {
      console.log('❌ No GitHub token available');
    }

    // Debug PR number detection
    console.log(`🔍 PR Number detection: ${this.prNumber || 'Not found'}`);
    console.log(`🔍 GITHUB_REF: ${process.env.GITHUB_REF || 'Not set'}`);

    if (repository && token) {
      [this.owner, this.repo] = repository.split('/');
      this.octokit = new Octokit({ auth: token });
      console.log(`✅ GitHub API initialized for ${this.owner}/${this.repo}`);
    } else {
      console.log(
        '⚠️  GITHUB_REPOSITORY or token not set; running in local-only mode (no PR comments or issues will be created).'
      );
    }
  }

  private detectPRNumber(): string | undefined {
    // Try to detect PR number from CI envs
    if (process.env.GITHUB_REF && process.env.GITHUB_REF.startsWith('refs/pull/')) {
      const match = process.env.GITHUB_REF.match(/refs\/pull\/(\d+)\//);
      if (match) return match[1];
    }

    // Try alternative patterns
    if (process.env.GITHUB_REF && process.env.GITHUB_REF.includes('/pull/')) {
      const match = process.env.GITHUB_REF.match(/\/pull\/(\d+)/);
      if (match) return match[1];
    }

    return undefined;
  }

  private flattenObject(obj: Record<string, unknown>, prefix = ''): string[] {
    const keys: string[] = [];
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const newKey = prefix ? `${prefix}.${key}` : key;
        if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
          keys.push(...this.flattenObject(obj[key] as Record<string, unknown>, newKey));
        } else {
          keys.push(newKey);
        }
      }
    }
    return keys;
  }

  private loadLocaleFile(locale: string): LocaleData {
    const filePath = path.join(this.localesPath, `strings.${locale}.json`);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Locale file not found: ${filePath}`);
    }
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf8')) as LocaleData;
    } catch (error) {
      throw new Error(`Failed to parse locale file ${filePath}: ${error}`);
    }
  }

  private getAvailableLocales(): string[] {
    const files = fs.readdirSync(this.localesPath);
    return files
      .filter(file => file.startsWith('strings.') && file.endsWith('.json'))
      .map(file => file.replace('strings.', '').replace('.json', ''))
      .filter(locale => locale !== this.masterLocale);
  }

  private compareKeys(masterKeys: string[], localeKeys: string[]): LocaleIssues {
    const masterSet = new Set(masterKeys);
    const localeSet = new Set(localeKeys);
    const missing = masterKeys.filter(key => !localeSet.has(key));
    const extra = localeKeys.filter(key => !masterSet.has(key));
    return { missing, extra };
  }

  private async findExistingIssue(locale: string): Promise<GitHubIssue | null> {
    if (!this.octokit || !this.owner || !this.repo) return null;

    try {
      const { data: issues } = await this.octokit.rest.issues.listForRepo({
        owner: this.owner,
        repo: this.repo,
        labels: this.issueLabel,
        state: 'open',
      });

      const foundIssue = issues.find(issue =>
        issue.title.includes(`${this.issueTitlePrefix} Missing translations for ${locale}`)
      );

      if (!foundIssue) return null;

      return {
        number: foundIssue.number,
        title: foundIssue.title,
        body: foundIssue.body || '',
        state: foundIssue.state as 'open' | 'closed',
        labels: foundIssue.labels.map(label => ({
          name: typeof label === 'string' ? label : label.name || '',
        })),
      };
    } catch (error) {
      console.error('Error fetching issues:', error);
      return null;
    }
  }

  private async createOrUpdateIssue(
    locale: string,
    missing: string[],
    extra: string[]
  ): Promise<number | null> {
    if (!this.octokit || !this.owner || !this.repo) return null;

    const title = `${this.issueTitlePrefix} Missing translations for ${locale}`;
    let body = `## 🌐 Translation Sync Required for ${locale}\n\n`;
    body += `This issue tracks missing or extra translation keys in \`${locale}\` compared to the master English locale.\n\n`;

    if (missing.length > 0) {
      body += `### 📝 Missing Keys (${missing.length})\n`;
      body += `The following keys exist in \`strings.en.json\` but are missing in \`${locale}\`:\n\n`;
      missing.forEach(key => {
        body += `- \`${key}\`\n`;
      });
      body += '\n';
    }

    if (extra.length > 0) {
      body += `### 🔍 Extra Keys (${extra.length})\n`;
      body += `The following keys exist in \`${locale}\` but not in \`strings.en.json\`:\n\n`;
      extra.forEach(key => {
        body += `- \`${key}\`\n`;
      });
      body += '\n';
    }

    body += `### 🔧 How to Fix\n`;
    body += `1. For missing keys: Add the appropriate translations to \`frontend/src/locales/strings.${locale}.json\`\n`;
    body += `2. For extra keys: Remove them from \`frontend/src/locales/strings.${locale}.json\` or add them to \`strings.en.json\` if needed\n`;
    body += `3. This issue will be automatically updated when the locale file is modified\n\n`;
    body += `### 📊 Status\n`;
    body += `- **Total Missing**: ${missing.length}\n`;
    body += `- **Total Extra**: ${extra.length}\n`;
    body += `- **Last Updated**: ${new Date().toISOString()}\n`;

    try {
      const existingIssue = await this.findExistingIssue(locale);

      if (existingIssue) {
        // Update existing issue
        await this.octokit.rest.issues.update({
          owner: this.owner,
          repo: this.repo,
          issue_number: existingIssue.number,
          title,
          body,
        });

        console.log(`Updated issue #${existingIssue.number} for ${locale}`);
        return existingIssue.number;
      } else {
        // Create new issue
        const { data: issue } = await this.octokit.rest.issues.create({
          owner: this.owner,
          repo: this.repo,
          title,
          body,
          labels: [this.issueLabel, 'translation', 'help wanted'],
        });

        console.log(`Created issue #${issue.number} for ${locale}`);
        return issue.number;
      }
    } catch (error) {
      console.error(`Error creating/updating issue for ${locale}:`, error);
      return null;
    }
  }

  private async closeIssueIfFixed(locale: string): Promise<void> {
    if (!this.octokit || !this.owner || !this.repo) return;

    try {
      const existingIssue = await this.findExistingIssue(locale);

      if (existingIssue) {
        await this.octokit.rest.issues.update({
          owner: this.owner,
          repo: this.repo,
          issue_number: existingIssue.number,
          state: 'closed',
        });

        await this.octokit.rest.issues.createComment({
          owner: this.owner,
          repo: this.repo,
          issue_number: existingIssue.number,
          body: `🎉 **Translation sync completed!**\n\nAll translation keys for \`${locale}\` are now in sync with the master English locale. This issue has been automatically closed.\n\n*Updated at: ${new Date().toISOString()}*`,
        });

        console.log(
          `Closed issue #${existingIssue.number} for ${locale} - translations are now in sync`
        );
      }
    } catch (error) {
      console.error(`Error closing issue for ${locale}:`, error);
    }
  }

  private generatePRComment(results: LocaleResults): string {
    const summary = Object.entries(results)
      .map(
        ([locale, issues]) =>
          `• ${locale}: ${issues.missing.length} missing, ${issues.extra.length} extra`
      )
      .join('\n');

    return `## 🌐 Locale Sync Check Results

The following locale files have synchronization issues with the master English locale:

${summary}

**Action Required:** Please ensure all locale files have the same keys as \`strings.en.json\`.
Missing keys should be added, and extra keys should be removed.`;
  }

  private async postPRComment(results: LocaleResults) {
    if (!this.octokit || !this.owner || !this.repo || !this.prNumber) {
      console.log('⚠️  Skipping PR comment - missing GitHub context or token');
      console.log(`   - octokit: ${!!this.octokit}`);
      console.log(`   - owner: ${this.owner}`);
      console.log(`   - repo: ${this.repo}`);
      console.log(`   - prNumber: ${this.prNumber}`);
      return;
    }

    try {
      const comment = this.generatePRComment(results);
      console.log(`📝 Attempting to post PR comment to PR #${this.prNumber}...`);

      await this.octokit.rest.issues.createComment({
        owner: this.owner,
        repo: this.repo,
        issue_number: parseInt(this.prNumber),
        body: comment,
      });
      console.log('✅ PR comment posted successfully');
    } catch (error: unknown) {
      console.error('❌ Failed to post PR comment:', error);
      
      // Provide specific guidance based on error type
      if (error && typeof error === 'object' && 'status' in error) {
        const status = (error as { status: number }).status;
        if (status === 403) {
          console.error('🔒 Permission denied. This is likely due to:');
          console.error('   1. GITHUB_TOKEN lacks sufficient permissions');
          console.error('   2. PR is from a fork and token cannot comment on fork PRs');
          console.error('   3. Need to use GH_REPO_TOKEN with proper permissions');
        } else if (status === 404) {
          console.error('🔍 PR not found. Check if PR number is correct:', this.prNumber);
        } else if (status === 401) {
          console.error('🔑 Authentication failed. Check token validity');
        }
      }
      
      // Log the full error for debugging
      console.error('Full error details:', JSON.stringify(error, null, 2));
    }
  }

  async run(): Promise<void> {
    console.log('🔍 Checking locale synchronization...');
    const masterData = this.loadLocaleFile(this.masterLocale);
    const masterKeys = this.flattenObject(masterData);
    console.log(`📋 Master locale (${this.masterLocale}) has ${masterKeys.length} keys`);

    const locales = this.getAvailableLocales();
    console.log(`🌍 Checking ${locales.length} locale(s): ${locales.join(', ')}`);

    const results: LocaleResults = {};
    let hasIssues = false;

    for (const locale of locales) {
      try {
        const localeData = this.loadLocaleFile(locale);
        const localeKeys = this.flattenObject(localeData);
        const issues = this.compareKeys(masterKeys, localeKeys);
        results[locale] = issues;

        if (issues.missing.length > 0 || issues.extra.length > 0) {
          hasIssues = true;
          console.log(
            `  • ${locale}: ${issues.missing.length} missing, ${issues.extra.length} extra`
          );

          // Create or update GitHub issue
          const issueNumber = await this.createOrUpdateIssue(locale, issues.missing, issues.extra);
          if (issueNumber) {
            console.log(`    📝 Issue #${issueNumber} created/updated for ${locale}`);
          }
        } else {
          console.log(`  ✅ ${locale}: All keys in sync`);
          // Close issue if it exists and locale is now in sync
          await this.closeIssueIfFixed(locale);
        }
      } catch (error) {
        console.error(`❌ Error processing ${locale}:`, error);
        hasIssues = true;
      }
    }

    if (hasIssues) {
      console.log('\n❌ Locale synchronization issues found!');
      console.log('\n📊 Summary:');
      Object.entries(results).forEach(([locale, issues]) => {
        if (issues.missing.length > 0 || issues.extra.length > 0) {
          console.log(
            `  • ${locale}: ${issues.missing.length} missing, ${issues.extra.length} extra`
          );
        }
      });

      // Try to post PR comment, but don't fail the entire check if it fails
      try {
        await this.postPRComment(results);
      } catch {
        console.error('⚠️  PR commenting failed, but continuing with check...');
      }

      process.exit(1); // Fail the check
    } else {
      console.log('\n✅ All locale files are synchronized!');
    }
  }
}

async function main() {
  const checker = new LocaleSyncChecker();
  await checker.run();
}

main().catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});
