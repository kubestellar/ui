import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:5173';

test.describe('Command Palette', () => {
  test.beforeEach(async ({ page }) => {
    // Login first to access the command palette
    await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });

    // Wait for login form to be ready using role-based locator (auto-retries)
    const usernameInput = page.getByRole('textbox', { name: 'Username' });
    await expect(usernameInput).toBeVisible({ timeout: 15000 });

    await usernameInput.fill('admin');
    await page.getByRole('textbox', { name: 'Password' }).fill('admin');
    await page.getByRole('button', { name: /Sign In|Sign In to/i }).click();

    // Wait for navigation to complete
    await page.waitForURL('/', { timeout: 15000 });

    // Wait for header to load
    await page.waitForSelector('header', { timeout: 10000 });
  });

  test.describe('Command Palette Button', () => {
    test('command palette button is visible in header', async ({ page }) => {
      // Look for the command palette button using its aria-label
      const commandPaletteButton = page.getByRole('button', { name: 'Open command palette' });
      await expect(commandPaletteButton).toBeVisible();
    });
  });

  test.describe('Keyboard Shortcuts', () => {
    test('command palette opens by clicking button', async ({ page }) => {
      // Click the command palette button
      const commandPaletteButton = page.getByRole('button', { name: 'Open command palette' });
      await commandPaletteButton.click();

      // Wait for the search input to appear
      const searchInput = page.getByPlaceholder('Search commands...');
      await expect(searchInput).toBeVisible({ timeout: 5000 });
      await expect(searchInput).toBeFocused();
    });
  });
});
