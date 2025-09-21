# Playwright Testing Guide

This guide helps developers add UI tests using [Playwright](https://playwright.dev/) and explains how users can set up and run these tests for the KubeStellar UI.

## Prerequisites

- Node.js (v16+ recommended)
- npm or yarn
- [Playwright](https://playwright.dev/) installed

## Setup

1. **Install Playwright and dependencies:**

   ```sh
   npm install --save-dev @playwright/test
   npx playwright install
   ```

2. **Project Structure:**

   ```
   /tests
     └── example.spec.ts
   playwright.config.ts
   ```

## Writing a Test

Create a new file in the `tests/` directory, e.g., `login.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

test('login page should work', async ({ page }) => {
  await page.goto('http://localhost:3000/login');
  await page.fill('#username', 'testuser');
  await page.fill('#password', 'password');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('http://localhost:3000/dashboard');
});
```

## Running Tests

Start your UI locally, then run:

```sh
npx playwright test
```

## Debugging

To run tests in headed mode:

```sh
npx playwright test --headed
```

## More Resources

- [Playwright Docs](https://playwright.dev/docs/intro)
- [Playwright Test Generator](https://playwright.dev/docs/codegen)

---

**Contributing:**  
Please follow the [Contributing Guidelines](./CONTRIBUTING.md) and ensure your tests are reliable and isolated.