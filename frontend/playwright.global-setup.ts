import { FullConfig, chromium, firefox, webkit } from '@playwright/test';
import { server } from './mocks/server';

function normalizeBrowserName(raw?: string) {
  if (!raw) return 'chromium';
  const s = String(raw).toLowerCase();
  if (s.includes('firefox')) return 'firefox';
  if (s.includes('webkit') || s.includes('safari')) return 'webkit';
  if (s.includes('chrome')) return 'chromium';
  // covers plain names like 'chromium', 'firefox', 'webkit'
  if (['chromium', 'firefox', 'webkit'].includes(s)) return s;
  return 'chromium';
}

function projectFromArgv(): string | undefined {
  const argv = process.argv.join(' ');
  // --project=firefox
  let m = argv.match(/--project=([^ \t]+)/);
  if (m) return m[1];
  // -p firefox  (rare)
  m = argv.match(/(?:^|\s)-p\s+([^ \t]+)/);
  if (m) return m[1];
  return undefined;
}

export default async function globalSetup(config: FullConfig) {
  console.log('🎭 Playwright Global Setup Started');

  // Start MSW Node Server
  server.listen({ onUnhandledRequest: 'warn' });
  console.log('✅ MSW Node server started');

  // 1) Highest priority: explicit env var (set this in CI or in npm scripts)
  const envProject = process.env.WARMUP_BROWSER || process.env.WARMUP_PROJECT;

  // 2) Next: try to read CLI args (e.g. `npx playwright test --project=firefox`)
  const argvProject = projectFromArgv();

  // 3) Fallback: try to infer from config (prefer named project that looks like a browser)
  const configCandidate =
    config.projects?.find(p => /chromium|chrome|firefox|webkit|safari/i.test(p.name ?? ''))?.name ??
    config.projects?.[0]?.name;

  const raw = envProject || argvProject || configCandidate || 'chromium';
  const browserName = normalizeBrowserName(raw);

  console.log('Detected warmup browser/project:', { raw, browserName });

  // Choose the browser type
  const browserType =
    browserName === 'firefox' ? firefox : browserName === 'webkit' ? webkit : chromium;

  // NOTE: ensure the browser is installed in CI (see notes below)
  const browser = await browserType.launch();
  const page = await browser.newPage();

  try {
    const baseURL =
      config.projects?.[0]?.use?.baseURL || process.env.VITE_BASE_URL || 'http://localhost:5173';
    console.log(`🔥 Warming up ${baseURL} with ${browserName}...`);
    await page.goto(baseURL, { waitUntil: 'networkidle', timeout: 30000 });
    console.log('✅ Application is ready');
  } catch (err) {
    console.warn('⚠️ Warning: Warmup failed:', err);
  } finally {
    await browser.close();
  }

  console.log('🎭 Playwright Global Setup Completed');
}
