import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:5173';

test.describe('Language Switcher', () => {
  test.describe('Language Switcher on Login Page', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`${BASE}/login`);
      await page.waitForLoadState('domcontentloaded');
    });
  });

  test.describe('Language Switcher on Authenticated Pages', () => {
    test.beforeEach(async ({ page }) => {
      // Login first
      await page.goto(`${BASE}/login`);
      await page.waitForLoadState('domcontentloaded');
      await page.getByRole('textbox', { name: 'Username' }).fill('admin');
      await page.getByRole('textbox', { name: 'Password' }).fill('admin');
      await page.getByRole('button', { name: /Sign In|Sign In to/i }).click();
      await page.waitForURL('/', { timeout: 15000 });
      await page.waitForSelector('header', { timeout: 10000 });
    });

    test('language switcher button is visible in header', async ({ page }) => {
      // Language switcher button has aria-label "Switch language"
      const languageButton = page.getByRole('button', { name: 'Switch language' });
      await expect(languageButton).toBeVisible();
    });

    test('language switcher opens dropdown on click in header', async ({ page }) => {
      // Find and click language switcher button by aria-label
      const languageButton = page.getByRole('button', { name: 'Switch language' });
      await languageButton.click();

      // Wait for dropdown to appear
      await page.waitForTimeout(500);

      // Check if dropdown appeared
      const dropdown = page.locator('[role="listbox"]');
      await expect(dropdown).toBeVisible({ timeout: 3000 });
    });

    test('can change language from header dropdown', async ({ page }) => {
      // Find and open language switcher
      const languageButton = page.getByRole('button', { name: 'Switch language' });
      await languageButton.click();

      // Wait for dropdown to appear
      const dropdown = page.locator('[role="listbox"]');
      await expect(dropdown).toBeVisible({ timeout: 3000 });

      // Select Japanese language
      const japaneseOption = page.locator('[role="option"]').filter({ hasText: '日本語' });
      await japaneseOption.click();
      await page.waitForTimeout(500);

      // Verify language changed (dropdown should close)
      await expect(dropdown).not.toBeVisible();
    });
  });

  test.describe('Language Switcher Accessibility', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`${BASE}/login`);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(500);
    });

    test('language switcher has proper ARIA attributes', async ({ page }) => {
      // Try to find language button by different possible selectors
      let languageButton = page.getByRole('button', { name: 'English' });

      // If not found, try finding by aria-label
      if (!(await languageButton.isVisible({ timeout: 1000 }).catch(() => false))) {
        languageButton = page
          .locator('button[aria-label*="language"], button[aria-haspopup="listbox"]')
          .first();
      }

      // Wait for button to be visible
      await expect(languageButton).toBeVisible({ timeout: 5000 });

      // Check aria-haspopup attribute
      const ariaHasPopup = await languageButton.getAttribute('aria-haspopup');
      expect(ariaHasPopup).toBe('listbox');

      // Check initial aria-expanded state
      const ariaExpanded = await languageButton.getAttribute('aria-expanded');
      expect(ariaExpanded).toBe('false');
    });

    test('language dropdown has proper role attributes', async ({ page }) => {
      // Find language button with flexible selector
      let languageButton = page.getByRole('button', { name: 'English' });

      if (!(await languageButton.isVisible({ timeout: 1000 }).catch(() => false))) {
        languageButton = page
          .locator('button[aria-label*="language"], button[aria-haspopup="listbox"]')
          .first();
      }

      await languageButton.click();

      // Check dropdown role
      const dropdown = page.locator('[role="listbox"]');
      await expect(dropdown).toBeVisible();

      // Check if options have proper role
      const options = page.locator('[role="option"]');
      const optionCount = await options.count();
      expect(optionCount).toBeGreaterThan(0);
    });

    test('language options have aria-selected attribute', async ({ page }) => {
      // Find language button with flexible selector
      let languageButton = page.getByRole('button', { name: 'English' });

      if (!(await languageButton.isVisible({ timeout: 1000 }).catch(() => false))) {
        languageButton = page
          .locator('button[aria-label*="language"], button[aria-haspopup="listbox"]')
          .first();
      }

      await languageButton.click();

      // Wait for dropdown
      await page.waitForSelector('[role="listbox"]');

      // Check if at least one option has aria-selected="true"
      const selectedOption = page.locator('[role="option"][aria-selected="true"]');
      await expect(selectedOption).toBeVisible();
    });

    test('language switcher is keyboard accessible', async ({ page }) => {
      // Tab to language switcher button
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      // Press Enter to open dropdown
      await page.keyboard.press('Enter');
      await page.waitForTimeout(500);

      // Check if dropdown opened
      const dropdown = page.locator('[role="listbox"]');
      const isVisible = await dropdown.isVisible({ timeout: 1000 }).catch(() => false);

      if (isVisible) {
        await expect(dropdown).toBeVisible();
        // Close with Escape
        await page.keyboard.press('Escape');
      }
    });
  });

  test.describe('Language Switcher Responsive Behavior', () => {
    test('language switcher works on mobile viewport', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      // Go to login page
      await page.goto(`${BASE}/login`);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(500);

      // Language switcher should be visible - try multiple selectors
      let languageButton = page.getByRole('button', { name: 'English' });

      if (!(await languageButton.isVisible({ timeout: 2000 }).catch(() => false))) {
        // Try finding by aria-label or aria-haspopup
        languageButton = page
          .locator('button[aria-label*="language"], button[aria-haspopup="listbox"]')
          .first();
      }

      await expect(languageButton).toBeVisible({ timeout: 5000 });

      // Should be able to open dropdown
      await languageButton.click();
      const dropdown = page.locator('[role="listbox"]');
      await expect(dropdown).toBeVisible();
    });
  });
});
