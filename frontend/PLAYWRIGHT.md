# 🎭 Playwright E2E Testing Guide

This comprehensive guide covers the Playwright end-to-end testing setup for the KubeStellar UI project, including setup, usage, best practices, and troubleshooting.

## 📋 Overview

Playwright is configured to provide robust end-to-end testing for the KubeStellar UI across multiple browsers with comprehensive coverage:

- ✅ **Cross-browser testing** (Chromium, Firefox, WebKit, Chrome\*)
- ✅ **Responsive design validation** (Desktop & tablet viewports)
- ✅ **Authentication flow testing** (Login, logout, protected routes)
- ✅ **Performance monitoring** (Page load times, network failures)
- ✅ **Accessibility validation** (Basic WCAG compliance)
- ✅ **API integration testing** (Mocked & real endpoints)
- ✅ **CI/CD integration** (GitHub Actions workflow)

> **Note:** \*Chrome is only available in local development, not in CI environment for resource optimization.

## 🚀 Quick Start

### Prerequisites

Ensure you have the following installed:

- **Node.js** v20 or higher
- **npm** or **yarn**
- **Git** for version control

### Installation & Setup

```bash
# 1. Navigate to frontend directory
cd frontend

# 2. Install dependencies (if not done already)
npm install

# 3. Install Playwright browsers
npx playwright install

# 4. Install system dependencies (Linux/macOS)
npx playwright install-deps

# 5. Set up environment configuration
cp .env.playwright.example .env.local
```

> **💡 Pro tip:** Edit `.env.local` to customize your testing preferences (headed mode, video recording, browser selection, etc.)

### First Test Run

```bash
# Start the development server (in one terminal)
npm run dev

# Run Playwright tests (in another terminal)
npm run test:e2e
```

## 🎮 Running Tests

### Basic Commands

```bash
# Run all E2E tests
npm run test:e2e

# Run with browser UI (visual mode)
npm run test:e2e:ui

# Run tests in headed mode (see browsers)
npm run test:e2e:headed

# Run specific test file
npx playwright test e2e/basic-navigation.spec.ts

# Run specific test by name
npx playwright test -g "should load the homepage"
```

### Browser-Specific Testing

```bash
# Test specific browsers
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit

# Test only desktop browsers (local development)
npx playwright test --project=chromium --project=firefox --project=webkit

# Test branded browsers (local only)
npx playwright test --project="Google Chrome"
```

### Advanced Testing Options

```bash
# Debug mode (step through tests)
npm run test:e2e:debug

# Run tests with custom configuration
npx playwright test --config=playwright.config.ts

# Run tests against different environment
VITE_BASE_URL=https://staging.example.com npx playwright test

# Generate test code from browser interactions
npm run test:e2e:codegen

# Run tests with custom timeout
npx playwright test --timeout=60000
```

## 📁 Project Structure

```
frontend/
├── e2e/                           # E2E test files
│   ├── basic-navigation.spec.ts   # Basic app navigation tests
│   ├── auth.spec.ts              # Authentication flow tests
│   ├── performance.spec.ts       # Performance & accessibility tests
│   ├── page-object-tests.spec.ts # Page Object Model examples
│   ├── pages/                    # Page Object Models
│   │   ├── base-page.ts          # Base page class with common methods
│   │   ├── home-page.ts          # Home page interactions
│   │   └── login-page.ts         # Login page interactions
│   └── utils/                    # Test utilities & helpers
│       └── test-utils.ts         # Common test functions
├── playwright.config.ts          # Main Playwright configuration
├── playwright.global-setup.ts    # Global test setup & teardown
├── tsconfig.playwright.json     # TypeScript config for tests
├── .env.playwright.example       # Environment variables template
└── PLAYWRIGHT.md                 # This documentation
```

## 🧪 Test Categories & Examples

### 1. Basic Navigation Tests (`basic-navigation.spec.ts`)

Tests fundamental application behavior:

```typescript
test('should load the homepage', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await expect(page).toHaveTitle(/KubeStellar/i);
});

test('should display header navigation', async ({ page }) => {
  await page.goto('/');
  const header = page.locator('header, nav, [data-testid="header"]').first();
  await expect(header).toBeVisible();
});
```

### 2. Authentication Tests (`auth.spec.ts`)

Validates login/logout flows:

```typescript
test('should handle login flow', async ({ page }) => {
  await page.goto('/login');

  await page.fill('[data-testid="email"]', 'admin@example.com');
  await page.fill('[data-testid="password"]', 'password');
  await page.click('[data-testid="login-button"]');

  await expect(page).toHaveURL(/dashboard/);
});
```

### 3. Performance Tests (`performance.spec.ts`)

Monitors application performance:

```typescript
test('should load within reasonable time', async ({ page }) => {
  const startTime = Date.now();
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  const loadTime = Date.now() - startTime;

  expect(loadTime).toBeLessThan(10000); // 10 seconds
});
```

### 4. Page Object Model Tests (`page-object-tests.spec.ts`)

Demonstrates maintainable test patterns:

```typescript
test('should navigate using page objects', async ({ page }) => {
  const homePage = new HomePage(page);
  await homePage.goto();
  await homePage.clickNavigation('Dashboard');
  await homePage.verifyPageElements();
});
```

## 🏗️ Page Object Model (POM)

The tests use the Page Object Model pattern for maintainable and reusable code:

### BasePage Class

```typescript
export abstract class BasePage {
  constructor(protected page: Page) {}

  abstract goto(): Promise<void>;

  async waitForLoad() {
    await this.page.waitForLoadState('networkidle');
  }

  async screenshot(name?: string) {
    await this.page.screenshot({ path: `screenshots/${name}.png` });
  }
}
```

### HomePage Class

```typescript
export class HomePage extends BasePage {
  get navigationMenu() {
    return this.page.locator('[data-testid="navigation"]');
  }

  async goto() {
    await this.page.goto('/');
    await this.waitForLoad();
  }

  async clickNavigation(itemText: string) {
    await this.page.click(`nav a:has-text("${itemText}")`);
  }
}
```

### Using Page Objects

```typescript
test('example with page objects', async ({ page }) => {
  const homePage = new HomePage(page);
  const loginPage = new LoginPage(page);

  await homePage.goto();

  if (await homePage.loginButton.isVisible()) {
    await homePage.loginButton.click();
    await loginPage.login('admin', 'password');
  }

  await homePage.verifyPageElements();
});
```

## ⚙️ Configuration

### Playwright Configuration (`playwright.config.ts`)

Key configuration options:

```typescript
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    viewport: { width: 1280, height: 720 },
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    // Chrome only in local development
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
```

### Environment Configuration

Copy the example file and customize your settings:

```bash
# 1. Copy the example environment file
cp .env.playwright.example .env.local

# 2. Edit the file to match your preferences
nano .env.local  # or use your preferred editor
```

Available environment variables (from `.env.playwright.example`):

```env
# Base URL for testing (default: http://localhost:5173)
VITE_BASE_URL=http://localhost:5173

# Backend URL for API testing
VITE_BACKEND_URL=http://localhost:4000

# Test credentials (for testing only - never use real credentials)
TEST_USER_NAME=testuser
TEST_USER_PASSWORD=testpassword123

# Playwright configuration
# Set to 'true' to run tests in headed mode
PLAYWRIGHT_HEADED=false

# Set to 'true' to record video for all tests
PLAYWRIGHT_VIDEO=false

# Timeout settings (in milliseconds)
PLAYWRIGHT_TIMEOUT=30000
PLAYWRIGHT_EXPECT_TIMEOUT=5000

# Browser selection for local testing
# Options: chromium, firefox, webkit, all
PLAYWRIGHT_BROWSER=chromium

# Set to 'true' to enable slow motion (useful for debugging)
PLAYWRIGHT_SLOW_MO=false

# Screenshot settings
# Options: on, off, only-on-failure
PLAYWRIGHT_SCREENSHOT=only-on-failure

# Trace settings
# Options: on, off, retain-on-failure, on-first-retry
PLAYWRIGHT_TRACE=on-first-retry
```

### Environment Variable Descriptions

| Variable                    | Options                                         | Description                            |
| --------------------------- | ----------------------------------------------- | -------------------------------------- |
| `VITE_BASE_URL`             | URL string                                      | Frontend application URL for testing   |
| `VITE_BACKEND_URL`          | URL string                                      | Backend API URL for integration tests  |
| `TEST_USER_NAME`            | String                                          | Test username for authentication flows |
| `TEST_USER_PASSWORD`        | String                                          | Test password for authentication flows |
| `PLAYWRIGHT_HEADED`         | `true`/`false`                                  | Show browser windows during tests      |
| `PLAYWRIGHT_VIDEO`          | `true`/`false`                                  | Record videos of all test runs         |
| `PLAYWRIGHT_TIMEOUT`        | Number (ms)                                     | Global timeout for test operations     |
| `PLAYWRIGHT_EXPECT_TIMEOUT` | Number (ms)                                     | Timeout for assertions                 |
| `PLAYWRIGHT_BROWSER`        | `chromium`/`firefox`/`webkit`/`all`             | Browser(s) to use for local testing    |
| `PLAYWRIGHT_SLOW_MO`        | `true`/`false`                                  | Slow down test execution for debugging |
| `PLAYWRIGHT_SCREENSHOT`     | `on`/`off`/`only-on-failure`                    | When to capture screenshots            |
| `PLAYWRIGHT_TRACE`          | `on`/`off`/`retain-on-failure`/`on-first-retry` | When to capture traces                 |

### Common Configuration Examples

#### For Development/Debugging

```bash
# Edit .env.local for debugging
PLAYWRIGHT_HEADED=true
PLAYWRIGHT_SLOW_MO=true
PLAYWRIGHT_VIDEO=true
PLAYWRIGHT_SCREENSHOT=on
PLAYWRIGHT_TRACE=on
PLAYWRIGHT_BROWSER=chromium
```

#### For Fast Local Testing

```bash
# Edit .env.local for speed
PLAYWRIGHT_HEADED=false
PLAYWRIGHT_SLOW_MO=false
PLAYWRIGHT_VIDEO=false
PLAYWRIGHT_SCREENSHOT=only-on-failure
PLAYWRIGHT_TRACE=on-first-retry
PLAYWRIGHT_BROWSER=chromium
```

#### For Comprehensive Testing

```bash
# Edit .env.local for full coverage
PLAYWRIGHT_BROWSER=all
PLAYWRIGHT_VIDEO=retain-on-failure
PLAYWRIGHT_SCREENSHOT=only-on-failure
PLAYWRIGHT_TRACE=on-first-retry
```

#### Quick Environment Setup Commands

```bash
# Set up for debugging (headed mode with slow motion)
echo "PLAYWRIGHT_HEADED=true" >> .env.local
echo "PLAYWRIGHT_SLOW_MO=true" >> .env.local

# Set up for fast testing (headless mode)
echo "PLAYWRIGHT_HEADED=false" >> .env.local
echo "PLAYWRIGHT_SLOW_MO=false" >> .env.local

# Test specific browser
echo "PLAYWRIGHT_BROWSER=firefox" >> .env.local
```

## 📊 Test Reports & Artifacts

### Viewing Reports

```bash
# View HTML report (after running tests)
npm run test:e2e:report

# Or directly with Playwright
npx playwright show-report
```

### Generated Artifacts

- **`playwright-report/`** - HTML test report with screenshots & videos
- **`test-results/`** - Individual test artifacts and traces
- **`screenshots/`** - Custom screenshots taken during tests
- **`playwright-results.json`** - JSON test results for CI
- **`playwright-results.xml`** - JUnit XML for CI integration

### Understanding Test Results

```bash
# View test results summary
npx playwright test --reporter=list

# Generate trace files for debugging
npx playwright test --trace=on

# View trace files
npx playwright show-trace trace.zip
```

## 🔧 CI/CD Integration

### GitHub Actions Workflow

The tests run automatically on:

- **Push** to `main` or `dev` branches
- **Pull requests** to `main` or `dev` branches
- **Changes** in `frontend/` directory only

### CI Configuration Features

```yaml
strategy:
  matrix:
    browser: [chromium, firefox, webkit]

steps:
  - name: Run TypeScript check
  - name: Run linting
  - name: Install Playwright Browsers
  - name: Build frontend
  - name: Run Playwright tests
  - name: Upload test artifacts
```

### Environment Variables in CI

```yaml
env:
  CI: true
  VITE_BASE_URL: http://localhost:5173
```

## ✍️ Writing New Tests

### Basic Test Structure

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should perform specific action', async ({ page }) => {
    // Test implementation
    await page.click('[data-testid="button"]');
    await expect(page.locator('[data-testid="result"]')).toBeVisible();
  });
});
```

### Using Test Fixtures

```typescript
test('should test with custom fixture', async ({ page, context }) => {
  // Mock API responses
  await page.route('**/api/users', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([{ id: 1, name: 'Test User' }]),
    });
  });

  await page.goto('/users');
  await expect(page.locator('text=Test User')).toBeVisible();
});
```

### Advanced Test Patterns

```typescript
test('should handle async operations', async ({ page }) => {
  await page.goto('/dashboard');

  // Wait for specific network request
  const responsePromise = page.waitForResponse('**/api/data');
  await page.click('[data-testid="load-data"]');
  const response = await responsePromise;

  expect(response.status()).toBe(200);
  await expect(page.locator('[data-testid="data-loaded"]')).toBeVisible();
});
```

## 🎯 Best Practices

### 1. Selector Strategy

```typescript
// ✅ Good - Use data-testid attributes
await page.click('[data-testid="submit-button"]');

// ✅ Good - Use semantic selectors
await page.click('button:has-text("Submit")');

// ❌ Avoid - Fragile CSS selectors
await page.click('.btn.btn-primary.submit-btn');
```

### 2. Waiting Strategies

```typescript
// ✅ Wait for elements to be visible
await expect(page.locator('[data-testid="result"]')).toBeVisible();

// ✅ Wait for network to be idle
await page.waitForLoadState('networkidle');

// ✅ Wait for specific conditions
await page.waitForFunction(() => document.title.includes('Dashboard'));

// ❌ Avoid - Hard waits
await page.waitForTimeout(5000);
```

### 3. Test Data Management

```typescript
// ✅ Use Page Object Model for reusable actions
const loginPage = new LoginPage(page);
await loginPage.login(testUser.email, testUser.password);

// ✅ Mock API responses for consistent testing
await page.route('**/api/**', route => {
  route.fulfill({ json: mockData });
});

// ✅ Clean up after tests
test.afterEach(async ({ page }) => {
  await page.context().clearCookies();
});
```

### 4. Error Handling

```typescript
test('should handle errors gracefully', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));

  await page.goto('/');

  // Assert no JavaScript errors
  expect(errors).toHaveLength(0);
});
```

## 🐛 Debugging & Troubleshooting

### Debug Mode

```bash
# Run in debug mode (step through tests)
npm run test:e2e:debug

# Debug specific test
npx playwright test --debug auth.spec.ts

# Run with headed browser
npx playwright test --headed --project=chromium
```

### Common Issues & Solutions

#### 1. **Element not found**

```typescript
// Problem: Element selector is wrong or element loads later
await page.click('[data-testid="button"]'); // ❌ Might fail

// Solution: Wait for element to be visible
await expect(page.locator('[data-testid="button"]')).toBeVisible();
await page.click('[data-testid="button"]'); // ✅ More reliable
```

#### 2. **Test timeout**

```typescript
// Problem: Default timeout too short
test('slow operation', async ({ page }) => {
  await page.goto('/slow-page'); // ❌ Might timeout
});

// Solution: Increase timeout for specific test
test('slow operation', async ({ page }) => {
  test.setTimeout(60000); // 60 seconds
  await page.goto('/slow-page');
});
```

#### 3. **Flaky tests**

```typescript
// Problem: Race conditions or timing issues
await page.click('button');
await expect(page.locator('.result')).toBeVisible(); // ❌ Might be flaky

// Solution: Wait for stable state
await page.click('button');
await page.waitForLoadState('networkidle');
await expect(page.locator('.result')).toBeVisible(); // ✅ More stable
```

### Debugging Commands

```bash
# Generate test code from browser interactions
npx playwright codegen localhost:5173

# Record test execution
npx playwright test --trace=on

# View trace files
npx playwright show-trace test-results/trace.zip

# Run with verbose logging
DEBUG=pw:api npx playwright test
```

## 📈 Performance Optimization

### Test Execution Speed

```typescript
// ✅ Run tests in parallel
test.describe.configure({ mode: 'parallel' });

// ✅ Use beforeAll for expensive setup
test.beforeAll(async ({ browser }) => {
  // Expensive setup once per worker
});

// ✅ Reuse browser contexts
const context = await browser.newContext();
```

### Resource Management

```bash
# Run fewer workers to reduce resource usage
npx playwright test --workers=2

# Run only specific browsers
npx playwright test --project=chromium

# Skip slow tests in development
npx playwright test --grep-invert @slow
```

## 🔍 Advanced Features

### Visual Testing

```typescript
test('should match screenshot', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page).toHaveScreenshot('dashboard.png');
});
```

### API Testing Integration

```typescript
test('should test API and UI together', async ({ page, request }) => {
  // Test API directly
  const response = await request.get('/api/users');
  expect(response.status()).toBe(200);

  // Test UI with real data
  await page.goto('/users');
  await expect(page.locator('[data-testid="user-list"]')).toBeVisible();
});
```

### Custom Matchers

```typescript
// Add custom matchers in test setup
expect.extend({
  async toBeAccessible(page: Page) {
    // Custom accessibility check
    const violations = await checkA11y(page);
    return {
      pass: violations.length === 0,
      message: () => `Found ${violations.length} accessibility violations`,
    };
  },
});
```

## 📚 Resources & Further Reading

### Official Documentation

- [Playwright Documentation](https://playwright.dev/)
- [Playwright Test API](https://playwright.dev/docs/api/class-test)
- [Page Object Model Guide](https://playwright.dev/docs/pom)
- [Best Practices](https://playwright.dev/docs/best-practices)

### KubeStellar UI Specific

- [Frontend Development Guide](../README.md)
- [Contributing Guidelines](../../CONTRIBUTING.md)
- [API Documentation](../../backend/docs/)

### Useful Tools

- [Playwright Test Generator](https://playwright.dev/docs/codegen)
- [Trace Viewer](https://playwright.dev/docs/trace-viewer)
- [VS Code Extension](https://marketplace.visualstudio.com/items?itemName=ms-playwright.playwright)

## 🤝 Contributing

When adding new tests:

1. **Follow existing patterns** - Use Page Object Model for reusable components
2. **Add descriptive test names** - Clearly describe what the test validates
3. **Include both positive and negative cases** - Test success and failure scenarios
4. **Update documentation** - Add new test categories to this guide
5. **Consider performance** - Avoid unnecessarily slow tests
6. **Test across browsers** - Ensure tests work on all configured browsers

### Test Review Checklist

- [ ] Test has clear, descriptive name
- [ ] Uses appropriate waiting strategies (no hard waits)
- [ ] Follows Page Object Model where applicable
- [ ] Includes proper error handling
- [ ] Works across all configured browsers
- [ ] Includes screenshots/videos for debugging
- [ ] Documentation updated if needed

Happy testing! 🎭
