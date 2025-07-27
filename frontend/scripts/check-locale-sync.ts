/// <reference types="node" />
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
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

class LocaleSyncChecker {
  private octokit?: Octokit;
  private owner?: string;
  private repo?: string;
  private prNumber?: string;
  private localesPath: string;
  private masterLocale: string;

  constructor() {
    this.localesPath = path.join(process.cwd(), 'src', 'locales');
    this.masterLocale = 'en';
    const repository = process.env.GITHUB_REPOSITORY;
    const token = process.env.GH_REPO_TOKEN || process.env.GITHUB_TOKEN;
    this.prNumber = process.env.PR_NUMBER || process.env.GITHUB_PR_NUMBER || this.detectPRNumber();
    
    if (repository && token) {
      [this.owner, this.repo] = repository.split('/');
      this.octokit = new Octokit({ auth: token });
    } else {
      console.log('⚠️  GITHUB_REPOSITORY or token not set; running in local-only mode (no PR comments will be posted).');
    }
  }

  private detectPRNumber(): string | undefined {
    // Try to detect PR number from CI envs
    if (process.env.GITHUB_REF && process.env.GITHUB_REF.startsWith('refs/pull/')) {
      const match = process.env.GITHUB_REF.match(/refs\/pull\/(\d+)\//);
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

  private generatePRComment(results: LocaleResults): string {
    const summary = Object.entries(results)
      .map(([locale, issues]) => `• ${locale}: ${issues.missing.length} missing, ${issues.extra.length} extra`)
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
      return;
    }

    try {
      const comment = this.generatePRComment(results);
      await this.octokit.rest.issues.createComment({
        owner: this.owner,
        repo: this.repo,
        issue_number: parseInt(this.prNumber),
        body: comment
      });
      console.log('✅ PR comment posted successfully');
    } catch (error) {
      console.error('❌ Failed to post PR comment:', error);
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
          console.log(`  • ${locale}: ${issues.missing.length} missing, ${issues.extra.length} extra`);
        }
      } catch (error) {
        console.error(`❌ Error processing ${locale}:`, error);
        hasIssues = true;
      }
    }
    
    if (hasIssues) {
      console.log('\n❌ Locale synchronization issues found!');
      await this.postPRComment(results);
      process.exit(1); // Fail the check
    } else {
      console.log('\n✅ All locale files are synchronized!');
    }
  }
}

async function main() {
  try {
    const checker = new LocaleSyncChecker();
    await checker.run();
  } catch (error) {
    console.error('❌ Locale sync check failed:', error);
    process.exit(1);
  }
}

main();
