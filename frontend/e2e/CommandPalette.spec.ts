import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:5173';

test.describe('Command Palette', () => {
  test.beforeEach(async ({ page }) => {
    // Login first to access the command palette
    await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });

    // Wait for login page to be ready
    await page.waitForSelector('input[type="text"], input[name="username"]', { timeout: 10000 });

    await page.getByRole('textbox', { name: 'Username' }).fill('admin');
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
    test('command palette opens with keyboard shortcut Ctrl+K', async ({ page }) => {
      // Ensure the page has focus first
      await page.click('body');
      await page.waitForTimeout(100);

      // Use Ctrl+K to open command palette
      await page.keyboard.press('Control+k');

      // Wait for the search input to appear (which indicates the palette is open)
      const searchInput = page.getByPlaceholder('Search commands...');
      await expect(searchInput).toBeVisible({ timeout: 5000 });

      // Alternative verification: check if we can type in the search input
      await searchInput.fill('test');
      await expect(searchInput).toHaveValue('test');
    });

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
