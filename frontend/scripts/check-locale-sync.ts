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

// interface GitHubIssue {
//   number: number;
//   title: string;
//   body: string;
//   state: 'open' | 'closed';
//   labels: Array<{ name: string }>;
// }

class LocaleSyncChecker {
  private octokit?: Octokit;
  private owner?: string;
  private repo?: string;
  private prNumber?: string;
  private localesPath: string;
  private masterLocale: string;
  // private issueLabel: string;

  constructor() {
    this.localesPath = path.join(process.cwd(), 'src', 'locales');
    this.masterLocale = 'en';
    const repository = process.env.GITHUB_REPOSITORY;
    const token = process.env.GH_REPO_TOKEN || process.env.GITHUB_TOKEN;
    this.prNumber = process.env.PR_NUMBER || process.env.GITHUB_PR_NUMBER || this.detectPRNumber();
    if (repository && token) {
      [this.owner, this.repo] = repository.split('/');
      this.octokit = new Octokit({ auth: token });
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

  private checkLocaleSync(): LocaleResults {
    console.log('🔍 Checking locale synchronization...');
    const masterKeys = this.flattenObject(this.loadLocaleFile(this.masterLocale)).sort();
    console.log(`📋 Master locale (${this.masterLocale}) has ${masterKeys.length} keys`);

    const results: LocaleResults = {};
    const locales = this.getAvailableLocales();
    console.log(`🌍 Checking ${locales.length} locale(s): ${locales.join(', ')}`);

    for (const locale of locales) {
      try {
        const localeKeys = this.flattenObject(this.loadLocaleFile(locale)).sort();
        const issues = this.compareKeys(masterKeys, localeKeys);
        results[locale.toLowerCase()] = issues;
        console.log(
          `  • ${locale}: ${issues.missing.length} missing, ${issues.extra.length} extra`
        );
      } catch (err) {
        console.error(`❌ Error for locale ${locale}:`, err);
        results[locale] = { missing: [], extra: [] };
      }
    }
    return results;
  }

  // private async findExistingIssues(): Promise<GitHubIssue[]> {
  //   if (!this.octokit || !this.owner || !this.repo) return [];
  //   try {
  //     const { data } = await this.octokit.rest.issues.listForRepo({
  //       owner: this.owner,
  //       repo: this.repo,
  //       labels: this.issueLabel,
  //       state: 'open',
  //     });
  //     return data.map(issue => ({
  //       number: issue.number,
  //       title: issue.title,
  //       body: issue.body ?? '',
  //       state: issue.state as 'open' | 'closed',
  //       labels: issue.labels.map(l => ({ name: typeof l === 'string' ? l : l.name || '' })),
  //     }));
  //   } catch (err) {
  //     console.error('❌ Failed to fetch issues:', err);
  //     return [];
  //   }
  // }

  // private async createOrUpdateIssue(locale: string, issues: LocaleIssues): Promise<void> {
  //   if (!this.octokit || !this.owner || !this.repo) return;
  //   const title = `[Locale Sync] ${locale.toUpperCase()} translation keys out of sync`;
  //   const body = this.generateIssueBody(locale, issues);
  //   const existing = (await this.findExistingIssues()).find(i => i.title === title);
  //   try {
  //     if (existing) {
  //       await this.octokit.rest.issues.update({
  //         owner: this.owner,
  //         repo: this.repo,
  //         issue_number: existing.number,
  //         title,
  //         body,
  //       });
  //       console.log(`🔄 Updated issue #${existing.number}`);
  //     } else {
  //       const { data } = await this.octokit.rest.issues.create({
  //         owner: this.owner,
  //         repo: this.repo,
  //         title,
  //         body,
  //         labels: [this.issueLabel],
  //       });
  //       console.log(`🆕 Created issue #${data.number}`);
  //     }
  //   } catch (err) {
  //     console.error('❌ Issue create/update failed:', err);
  //   }
  // }

  // private async closeResolved(results: LocaleResults): Promise<void> {
  //   if (!this.octokit || !this.owner || !this.repo) return;
  //   const existing = await this.findExistingIssues();
  //   for (const issue of existing) {
  //     const m = issue.title.match(/\[Locale Sync\] (.+) translation keys out of sync/);
  //     if (!m) continue;
  //     const locale = m[1].toLowerCase();
  //     const { missing, extra } = results[locale] || { missing: [], extra: [] };
  //     if (missing.length === 0 && extra.length === 0) {
  //       try {
  //         await this.octokit.rest.issues.update({
  //           owner: this.owner,
  //           repo: this.repo,
  //           issue_number: issue.number,
  //           state: 'closed',
  //         });
  //         console.log(`✅ Closed issue #${issue.number}`);
  //       } catch (err) {
  //         console.error('❌ Failed to close issue:', err);
  //       }
  //     }
  //   }
  // }

  private generatePRComment(results: LocaleResults): string {
    let body = '## :warning: Locale Sync Check Failed\n';
    for (const [locale, issues] of Object.entries(results)) {
      if (issues.missing.length || issues.extra.length) {
        body += `\n### \`${locale}\``;
        if (issues.missing.length) body += `\n- Missing keys (${issues.missing.length}): ${issues.missing.join(', ')}`;
        if (issues.extra.length) body += `\n- Extra keys (${issues.extra.length}): ${issues.extra.join(', ')}`;
      }
    }
    body += '\n\nPlease update the translation files to match `strings.en.json`.';
    return body;
  }

  private async postPRComment(results: LocaleResults) {
    if (!this.octokit || !this.owner || !this.repo || !this.prNumber) return;
    const body = this.generatePRComment(results);
    try {
      await this.octokit.issues.createComment({
        owner: this.owner,
        repo: this.repo,
        issue_number: Number(this.prNumber),
        body,
      });
      console.log('💬 Posted PR comment for locale sync discrepancies.');
    } catch (err) {
      console.error('❌ Failed to post PR comment:', err);
    }
  }

  async run(): Promise<void> {
    const results = this.checkLocaleSync();
    let hasDiscrepancy = false;
    for (const issues of Object.values(results)) {
      if (issues.missing.length || issues.extra.length) {
        hasDiscrepancy = true;
        break;
      }
    }
    if (hasDiscrepancy) {
      if (this.octokit && this.owner && this.repo && this.prNumber) {
        await this.postPRComment(results);
      }
      process.exitCode = 1;
    }
  }
}

async function main() {
  const checker = new LocaleSyncChecker();
  await checker.run();
}

const __filename = fileURLToPath(import.meta.url);
const entryScript = path.resolve(process.argv[1] || '');
if (__filename === entryScript) {
  main().catch(e => {
    console.error('Fatal:', e);
    process.exit(1);
  });
}
