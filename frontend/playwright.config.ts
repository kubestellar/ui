import { defineConfig, devices } from '@playwright/test';

// Check if running in CI environment
const isCI = !!process.env.CI;
const baseURL = process.env.VITE_BASE_URL || 'http://localhost:5173';

/**
 * Determine worker count for parallelization
 * - CI: Use 50% of available CPUs (or env override) for better resource utilization
 * - Local: Use all available CPUs
 */
const getWorkerCount = (): number | string => {
  if (!isCI) return '100%'; // Use all CPUs locally

  // Allow CI to override worker count via environment variable
  if (process.env.PLAYWRIGHT_WORKERS) {
    const workers = parseInt(process.env.PLAYWRIGHT_WORKERS, 10);
    if (!isNaN(workers) && workers > 0) return workers;
  }

  // Default: 2 workers in CI for stability
  return 2;
};

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './e2e',
  /* Global setup for all tests */
  globalSetup: './playwright.global-setup.ts',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: isCI,
  /* Retry on CI only */
  retries: isCI ? 2 : 0,
  /* Number of parallel workers - enables parallelization in CI */
  workers: getWorkerCount(),
  /* Global timeout for each test */
  timeout: 60000,
  /* Expect timeout */
  expect: {
    timeout: 10000,
  },
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'playwright-results.json' }],
    ['junit', { outputFile: 'playwright-results.xml' }],
    // Blob reporter for merging sharded results in CI
    ...(isCI ? [['blob', { outputDir: 'blob-report' }] as const] : []),
    isCI ? ['github'] : ['list'],
  ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: baseURL,

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',

    /* Take screenshot only when test fails */
    screenshot: 'only-on-failure',

    /* Record video only when retrying the failed test */
    video: 'retain-on-failure',

    /* Browser context options */
    viewport: { width: 1280, height: 720 },

    /* Ignore HTTPS errors */
    ignoreHTTPSErrors: true,

    /* Action timeout - prevent individual actions from hanging */
    actionTimeout: 15000,

    /* Navigation timeout */
    navigationTimeout: 30000,

    /* Extra HTTP headers */
    extraHTTPHeaders: {
      'Accept-Language': 'en-US,en;q=0.9',
    },
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        // Webkit is slower, give it more time
        actionTimeout: 20000,
        navigationTimeout: 40000,
      },
      // More retries for webkit as it can be flaky
      retries: isCI ? 3 : 0,
    },

    // Only include branded browsers in local development (not CI)
    ...(isCI
      ? []
      : [
          {
            name: 'Google Chrome',
            use: { ...devices['Desktop Chrome'], channel: 'chrome' },
          },
        ]),
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !isCI,
    env: {
      VITE_PLAYWRIGHT_TESTING: 'true',
      VITE_DISABLE_CANVAS: 'false', // app handle Firefox detection
      VITE_USE_MSW: 'true', // Enable MSW for tests
    },
    timeout: 180 * 1000, // 3 minutes for server startup in CI
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
