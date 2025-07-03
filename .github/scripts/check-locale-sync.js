#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { Octokit } = require('@octokit/rest');

// Configuration
const LOCALES_DIR = 'frontend/src/locales';
const MASTER_LOCALE = 'strings.en.json';
const ISSUE_LABEL = 'locale-sync';
const ISSUE_TITLE_PREFIX = '[Locale Sync]';

// Initialize GitHub client
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/');

/**
 * Deep comparison of nested objects to find missing keys
 */
function findMissingKeys(master, target, prefix = '') {
  const missing = [];
  const extra = [];
  
  for (const key in master) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    
    if (!(key in target)) {
      missing.push(fullKey);
    } else if (typeof master[key] === 'object' && master[key] !== null && !Array.isArray(master[key])) {
      if (typeof target[key] === 'object' && target[key] !== null && !Array.isArray(target[key])) {
        const nested = findMissingKeys(master[key], target[key], fullKey);
        missing.push(...nested.missing);
        extra.push(...nested.extra);
      } else {
        missing.push(fullKey);
      }
    }
  }
  
  // Check for extra keys in target
  for (const key in target) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    
    if (!(key in master)) {
      extra.push(fullKey);
    }
  }
  
  return { missing, extra };
}

/**
 * Load and parse JSON file
 */
function loadLocaleFile(filename) {
  try {
    const filePath = path.join(LOCALES_DIR, filename);
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Error loading ${filename}:`, error.message);
    return null;
  }
}

/**
 * Get all locale files except the master
 */
function getLocaleFiles() {
  try {
    const files = fs.readdirSync(LOCALES_DIR);
    return files
      .filter(file => file.endsWith('.json') && file !== MASTER_LOCALE)
      .sort();
  } catch (error) {
    console.error('Error reading locales directory:', error.message);
    return [];
  }
}

/**
 * Find existing issue for a locale
 */
async function findExistingIssue(locale) {
  try {
    const { data: issues } = await octokit.rest.issues.listForRepo({
      owner,
      repo,
      labels: ISSUE_LABEL,
      state: 'open',
    });
    
    return issues.find(issue => 
      issue.title.includes(`${ISSUE_TITLE_PREFIX} Missing translations for ${locale}`)
    );
  } catch (error) {
    console.error('Error fetching issues:', error.message);
    return null;
  }
}

/**
 * Create or update issue for locale discrepancies
 */
async function createOrUpdateIssue(locale, missing, extra) {
  const title = `${ISSUE_TITLE_PREFIX} Missing translations for ${locale}`;
  
  let body = `## 🌐 Translation Sync Required for ${locale}\n\n`;
  body += `This issue tracks missing or extra translation keys in \`${locale}\` compared to the master English locale.\n\n`;
  
  if (missing.length > 0) {
    body += `### 📝 Missing Keys (${missing.length})\n`;
    body += `The following keys exist in \`${MASTER_LOCALE}\` but are missing in \`${locale}\`:\n\n`;
    missing.forEach(key => {
      body += `- \`${key}\`\n`;
    });
    body += '\n';
  }
  
  if (extra.length > 0) {
    body += `### 🔍 Extra Keys (${extra.length})\n`;
    body += `The following keys exist in \`${locale}\` but not in \`${MASTER_LOCALE}\`:\n\n`;
    extra.forEach(key => {
      body += `- \`${key}\`\n`;
    });
    body += '\n';
  }
  
  body += `### 🔧 How to Fix\n`;
  body += `1. For missing keys: Add the appropriate translations to \`${LOCALES_DIR}/${locale}\`\n`;
  body += `2. For extra keys: Remove them from \`${LOCALES_DIR}/${locale}\` or add them to \`${MASTER_LOCALE}\` if needed\n`;
  body += `3. This issue will be automatically updated when the locale file is modified\n\n`;
  body += `### 📊 Status\n`;
  body += `- **Total Missing**: ${missing.length}\n`;
  body += `- **Total Extra**: ${extra.length}\n`;
  body += `- **Last Updated**: ${new Date().toISOString()}\n`;
  
  try {
    const existingIssue = await findExistingIssue(locale);
    
    if (existingIssue) {
      // Update existing issue
      await octokit.rest.issues.update({
        owner,
        repo,
        issue_number: existingIssue.number,
        title,
        body,
      });
      
      console.log(`Updated issue #${existingIssue.number} for ${locale}`);
      return existingIssue.number;
    } else {
      // Create new issue
      const { data: issue } = await octokit.rest.issues.create({
        owner,
        repo,
        title,
        body,
        labels: [ISSUE_LABEL, 'translation', 'help wanted'],
      });
      
      console.log(`Created issue #${issue.number} for ${locale}`);
      return issue.number;
    }
  } catch (error) {
    console.error(`Error creating/updating issue for ${locale}:`, error.message);
    return null;
  }
}

/**
 * Close issue if locale is now in sync
 */
async function closeIssueIfFixed(locale) {
  try {
    const existingIssue = await findExistingIssue(locale);
    
    if (existingIssue) {
      await octokit.rest.issues.update({
        owner,
        repo,
        issue_number: existingIssue.number,
        state: 'closed',
      });
      
      await octokit.rest.issues.createComment({
        owner,
        repo,
        issue_number: existingIssue.number,
        body: `🎉 **Translation sync completed!**\n\nAll translation keys for \`${locale}\` are now in sync with the master English locale. This issue has been automatically closed.\n\n*Updated at: ${new Date().toISOString()}*`,
      });
      
      console.log(`Closed issue #${existingIssue.number} for ${locale} - translations are now in sync`);
    }
  } catch (error) {
    console.error(`Error closing issue for ${locale}:`, error.message);
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🔍 Starting locale synchronization check...');
  
  // Load master locale
  const masterLocale = loadLocaleFile(MASTER_LOCALE);
  if (!masterLocale) {
    console.error(`Failed to load master locale: ${MASTER_LOCALE}`);
    process.exit(1);
  }
  
  console.log(`✅ Loaded master locale: ${MASTER_LOCALE}`);
  
  // Get all locale files
  const localeFiles = getLocaleFiles();
  console.log(`📁 Found ${localeFiles.length} locale files to check:`, localeFiles);
  
  let totalIssues = 0;
  let summaryReport = '';
  
  for (const localeFile of localeFiles) {
    console.log(`\n🔍 Checking ${localeFile}...`);
    
    const targetLocale = loadLocaleFile(localeFile);
    if (!targetLocale) {
      console.error(`Failed to load ${localeFile}, skipping...`);
      continue;
    }
    
    const { missing, extra } = findMissingKeys(masterLocale, targetLocale);
    
    if (missing.length > 0 || extra.length > 0) {
      console.log(`❌ ${localeFile}: ${missing.length} missing, ${extra.length} extra keys`);
      
      const issueNumber = await createOrUpdateIssue(localeFile, missing, extra);
      if (issueNumber) {
        totalIssues++;
        summaryReport += `- **${localeFile}**: ${missing.length} missing, ${extra.length} extra keys ([#${issueNumber}](https://github.com/${owner}/${repo}/issues/${issueNumber}))\n`;
      }
    } else {
      console.log(`✅ ${localeFile}: All keys in sync`);
      await closeIssueIfFixed(localeFile);
    }
  }
  
  // Set output for GitHub Actions
  console.log(`\n📊 Summary: ${totalIssues} locale files need attention`);
  
  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `has_issues=${totalIssues > 0 ? 'true' : 'false'}\n`);
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `issues_count=${totalIssues}\n`);
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `summary=${summaryReport}\n`);
  }
  
  if (totalIssues > 0) {
    console.log('\n🚨 Action required: Some locale files are out of sync');
    console.log('Check the created/updated issues for details');
  } else {
    console.log('\n🎉 All locale files are in sync!');
  }
}

// Run the script
main().catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});