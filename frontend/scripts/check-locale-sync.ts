import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
// import { Octokit } from '@octokit/rest';

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
  // private octokit?: Octokit;
  // private owner?: string;
  // private repo?: string;
  private localesPath: string;
  private masterLocale: string;
  // private issueLabel: string;

  constructor() {
    // const repository = process.env.GITHUB_REPOSITORY;
    // if (!repository) {
    //   console.warn(
    //     '⚠️  GITHUB_REPOSITORY not set; running in local-only mode (no issues will be created).'
    //   );
    // } else {
    //   [this.owner, this.repo] = repository.split('/');
    //   this.octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
    // }
    this.localesPath = path.join(process.cwd(), 'src', 'locales');
    this.masterLocale = 'en';
    // this.issueLabel = 'locale-sync';
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

  // private generateIssueBody(locale: string, issues: LocaleIssues): string {
  //   const { missing, extra } = issues;
  //   let b = `## Locale Sync for \`${locale}\`\n`;
  //   if (missing.length) b += `\nMissing (\`${missing.length}\`): ${missing.join(', ')}\n`;
  //   if (extra.length) b += `\nExtra   (\`${extra.length}\`): ${extra.join(', ')}\n`;
  //   return b;
  // }

  async run(): Promise<void> {
    this.checkLocaleSync();
    // const results = this.checkLocaleSync();
    // const out = path.join(process.cwd(), 'locale-check-results.json');
    // fs.writeFileSync(out, JSON.stringify(results, null, 2));
    // if (this.octokit) {
    //   for (const [loc, iss] of Object.entries(results)) {
    //     if (iss.missing.length || iss.extra.length) {
    //       await this.createOrUpdateIssue(loc, iss);
    //     }
    //   }
    //   await this.closeResolved(results);
    // }
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