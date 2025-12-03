import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:5173';

test.describe('Theme Toggle Button', () => {
  test.beforeEach(async ({ page }) => {
    // Login first to access the header
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

  test('theme toggle button is visible in header', async ({ page }) => {
    const themeToggle = page.locator('header button[aria-label*="theme"]');
    await expect(themeToggle).toBeVisible();
  });

  test('clicking theme toggle changes the theme', async ({ page }) => {
    const themeToggle = page.locator('header button[aria-label*="theme"]');
    const htmlElement = page.locator('html');

    // Get initial theme
    const initialTheme = await htmlElement.getAttribute('data-theme');

    // Click toggle
    await themeToggle.click();
    await page.waitForTimeout(500);

    // Get new theme
    const newTheme = await htmlElement.getAttribute('data-theme');

    // Theme should have changed
    expect(initialTheme).not.toBe(newTheme);
  });

  test('multiple theme toggles work correctly', async ({ page }) => {
    const themeToggle = page.locator('header button[aria-label*="theme"]');
    const htmlElement = page.locator('html');

    // Get initial theme
    const initialTheme = await htmlElement.getAttribute('data-theme');

    // Toggle twice
    await themeToggle.click();
    await page.waitForTimeout(300);
    await themeToggle.click();
    await page.waitForTimeout(300);

    // Get final theme
    const finalTheme = await htmlElement.getAttribute('data-theme');

    // Should be back to initial theme
    expect(initialTheme).toBe(finalTheme);
  });
});
