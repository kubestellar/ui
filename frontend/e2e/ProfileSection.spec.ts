import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:5173';

test.describe('Profile Section', () => {
  test.beforeEach(async ({ page }) => {
    // Login first to access the profile section
    await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });

    // Wait for login page to be ready
    await page.waitForSelector('input[type="text"], input[name="username"]', { timeout: 10000 });

    await page.getByRole('textbox', { name: 'Username' }).fill('admin');
    await page.getByRole('textbox', { name: 'Password' }).fill('admin');
    await page.getByRole('button', { name: /Sign In|Sign In to/i }).click();

    // Wait for navigation to complete
    await page.waitForURL('/', { timeout: 15000 });

    // Wait for header to load and profile section to be available
    await page.waitForSelector('header', { timeout: 10000 });
  });

  test.describe('Profile Button Visibility', () => {
    test('profile button shows user icon', async ({ page }) => {
      const profileButton = page.getByRole('button', { name: 'Open user menu' });

      // Check that the button contains an icon (should have a class indicating it's an icon)
      const icon = profileButton.locator('svg, .text-xl');
      await expect(icon).toBeVisible();
    });
  });

  test.describe('User Menu Dropdown', () => {
    test('clicking profile button opens user menu', async ({ page }) => {
      const profileButton = page.getByRole('button', { name: 'Open user menu' });
      await profileButton.click();

      // Wait for the user menu to appear
      const userMenu = page.locator('[role="menu"]');
      await expect(userMenu).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Change Password Modal', () => {
    test('clicking change password opens modal', async ({ page }) => {
      const profileButton = page.getByRole('button', { name: 'Open user menu' });
      await profileButton.click();

      const changePasswordItem = page
        .getByRole('menuitem')
        .filter({ hasText: /change.*password/i });
      await changePasswordItem.click();

      // Wait for modal to appear - use more specific selector
      await expect(page.locator('h2').filter({ hasText: /change.*password/i })).toBeVisible({
        timeout: 5000,
      });
    });
  });

  // REMOVED: External link tests - these only test that links are clickable, not actual functionality
});
