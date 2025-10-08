import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:5173';

test.describe('Login Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/login`);
  });

  test('login page shows UI elements', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Username' })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Password' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Sign In|Sign In to/i })).toBeVisible();
    await expect(page.getByRole('checkbox', { name: /Remember me/i })).toBeVisible();
    await expect(page.getByText('Seamless Multi-Cluster')).toBeVisible();
    await expect(page.getByText('Built for the Future.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Toggle full screen' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'English' })).toBeVisible();

    const browserName = page.context().browser()?.browserType().name();
    const isFirefox = browserName === 'firefox';

    if (isFirefox) {
      await expect(page.getByTestId('canvas-disabled-placeholder')).toBeVisible();
      await expect(page.getByTestId('canvas-disabled-title')).toBeVisible();
      await expect(page.getByTestId('canvas-disabled-subtitle')).toBeVisible();
    } else {
      await expect(page.locator('canvas')).toBeVisible();
    }
  });

  test('success with admin/admin logs in and redirects', async ({ page }) => {
    await page.getByRole('textbox', { name: 'Username' }).fill('admin');
    await page.getByRole('textbox', { name: 'Password' }).fill('admin');
    await page.getByRole('button', { name: /Sign In|Sign In to/i }).click();

    await expect(page).toHaveURL('/', { timeout: 10000 });
  });

  test('remember me checkbox persists behavior', async ({ page }) => {
    await page.getByRole('textbox', { name: 'Username' }).fill('admin');
    await page.getByRole('textbox', { name: 'Password' }).fill('admin');
    await page.getByRole('checkbox', { name: /Remember me/i }).check();
    await page.getByRole('button', { name: /Sign In|Sign In to/i }).click();

    await expect(page).toHaveURL('/', { timeout: 10000 });

    const token = await page.evaluate(() => localStorage.getItem('jwtToken'));
    expect(token).toBeTruthy();
  });
});
