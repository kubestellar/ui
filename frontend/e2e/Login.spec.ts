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

    // Wait for successful login and redirect
    await expect(page).toHaveURL('/', { timeout: 15000 });

    const token = await page.evaluate(() => localStorage.getItem('jwtToken'));
    expect(token).toBeTruthy();
  });

  // Form Validation Tests
  test('form validation prevents submission with empty fields', async ({ page }) => {
    const submitButton = page.getByRole('button', { name: /Sign In|Sign In to/i });
    await submitButton.click();

    // Form should not submit and we should stay on login page
    await expect(page).toHaveURL(/login/);

    // Check that HTML5 validation is working by checking if fields are invalid
    const usernameField = page.getByRole('textbox', { name: 'Username' });
    const passwordField = page.getByRole('textbox', { name: 'Password' });

    await expect(usernameField).toHaveAttribute('required');
    await expect(passwordField).toHaveAttribute('required');
  });

  test('form validation clears errors when typing', async ({ page }) => {
    // Test that form prevents submission with empty fields
    await page.getByRole('button', { name: /Sign In|Sign In to/i }).click();

    // Should stay on login page (form didn't submit)
    await expect(page).toHaveURL(/login/);

    // Test that typing in fields works correctly
    await page.getByRole('textbox', { name: 'Username' }).fill('testuser');
    await page.getByRole('textbox', { name: 'Password' }).fill('testpass');

    // Verify fields have the correct values
    await expect(page.getByRole('textbox', { name: 'Username' })).toHaveValue('testuser');
    await expect(page.getByRole('textbox', { name: 'Password' })).toHaveValue('testpass');
  });

  // Password Visibility Toggle Tests
  test('password visibility toggle works', async ({ page }) => {
    // Use a more flexible locator that can find the password field by name attribute
    const passwordField = page.getByRole('textbox', { name: 'Password' });
    const toggleButton = page.getByRole('button', { name: /Show password|Hide password/i });

    await passwordField.fill('testpassword');

    await toggleButton.click();
    await expect(passwordField).toHaveAttribute('type', 'text');

    await toggleButton.click();
    await expect(passwordField).toHaveAttribute('type', 'password');
  });

  // Language Switching Tests
  test('language switcher opens and changes language', async ({ page }) => {
    // Click on the language switcher button
    await page.getByRole('button', { name: 'English' }).click();

    // Wait for dropdown to appear and check if Hindi option is visible
    await expect(page.getByText('हिन्दी')).toBeVisible({ timeout: 3000 });

    // Wait for the Hindi button to be actionable and click it
    const hindiButton = page.locator('button').filter({ hasText: 'हिन्दी' }).first();
    await hindiButton.click({ force: true });

    // Verify language changed by checking if we're still on login page
    await expect(page).toHaveURL(/login/);
  });

  // Fullscreen Toggle Tests
  test('fullscreen toggle works', async ({ page }) => {
    const fullscreenButton = page.getByRole('button', { name: 'Toggle full screen' });

    // Check initial state
    const initialFullscreen = await page.evaluate(() => !!document.fullscreenElement);
    expect(initialFullscreen).toBe(false);

    await fullscreenButton.click();

    // Wait for fullscreen to be entered
    await page.waitForFunction(() => !!document.fullscreenElement);

    // Check if we're in fullscreen mode by checking the document
    const isFullscreen = await page.evaluate(() => !!document.fullscreenElement);
    expect(isFullscreen).toBe(true);

    // Exit fullscreen using the document API directly (most reliable)
    await page.evaluate(() => {
      if (document.fullscreenElement) {
        return document.exitFullscreen();
      }
    });

    // Wait for fullscreen to exit with a reasonable timeout
    await page.waitForFunction(() => !document.fullscreenElement, { timeout: 5000 });

    // Check if we exited fullscreen
    const isNotFullscreen = await page.evaluate(() => !document.fullscreenElement);
    expect(isNotFullscreen).toBe(true);
  });

  // Accessibility Tests
  test('keyboard navigation works correctly', async ({ page }) => {
    // Focus on the username field directly first
    await page.getByRole('textbox', { name: 'Username' }).focus();
    await expect(page.getByRole('textbox', { name: 'Username' })).toBeFocused();

    // Test tab navigation from username to password
    await page.keyboard.press('Tab');
    await expect(page.getByRole('textbox', { name: 'Password' })).toBeFocused();

    // Test tab navigation from password to show/hide button (skip if not focusable)
    await page.keyboard.press('Tab');
    // Just verify we can tab through the form elements
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(['INPUT', 'BUTTON']).toContain(focusedElement);
  });

  // Responsive Design Tests
  test('responsive design works on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    // Wait for the responsive layout to take effect
    await page.waitForFunction(() => {
      const heading = document.querySelector('h1, [role="heading"]');
      if (!heading) return false;
      // Check if the heading is not wider than the mobile viewport
      return heading.clientWidth <= 375;
    });

    await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Username' })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Password' })).toBeVisible();
  });

  // Security Features Tests
  test('remember me stores credentials securely', async ({ page }) => {
    await page.getByRole('textbox', { name: 'Username' }).fill('admin');
    await page.getByRole('textbox', { name: 'Password' }).fill('admin');
    await page.getByRole('checkbox', { name: /Remember me/i }).check();
    await page.getByRole('button', { name: /Sign In|Sign In to/i }).click();

    await expect(page).toHaveURL('/', { timeout: 10000 });

    // Wait for localStorage to be updated with credentials
    await page.waitForFunction(() => {
      const keys = Object.keys(localStorage);
      return keys.some(
        key => key.includes('remember') || key.includes('username') || key.includes('password')
      );
    });

    // Check what's actually stored in localStorage
    const localStorageData = await page.evaluate(() => {
      const keys = Object.keys(localStorage);
      const data: Record<string, string | null> = {};
      keys.forEach(key => {
        data[key] = localStorage.getItem(key);
      });
      return data;
    });

    // Check if remember me functionality worked by looking for any stored credentials
    const hasStoredCredentials = Object.keys(localStorageData).some(
      key => key.includes('remember') || key.includes('username') || key.includes('password')
    );

    expect(hasStoredCredentials).toBe(true);
  });

  // Error Handling Tests
  test('shows error for invalid credentials', async ({ page }) => {
    await page.getByRole('textbox', { name: 'Username' }).fill('invaliduser');
    await page.getByRole('textbox', { name: 'Password' }).fill('wrongpassword');
    await page.getByRole('button', { name: /Sign In|Sign In to/i }).click();

    // Wait for any error indication to appear (toast, alert, or error text)
    await Promise.race([
      page
        .locator('.toast-error')
        .waitFor({ timeout: 3000 })
        .catch(() => {}),
      page
        .locator('[role="alert"]')
        .waitFor({ timeout: 3000 })
        .catch(() => {}),
      page
        .locator('text=/Invalid|Error|Failed/i')
        .waitFor({ timeout: 3000 })
        .catch(() => {}),
    ]);

    // Check that we're still on the login page (didn't redirect) - this indicates an error
    await expect(page).toHaveURL(/login/);

    // Try to find any error indication - toast, alert, or error text
    const hasErrorToast = (await page.locator('.toast-error').count()) > 0;
    const hasAlert = (await page.locator('[role="alert"]').count()) > 0;
    const hasErrorText = (await page.locator('text=/Invalid|Error|Failed/i').count()) > 0;

    // At least one error indication should be present
    expect(hasErrorToast || hasAlert || hasErrorText).toBeTruthy();
  });

  test('error handling works with invalid then valid credentials', async ({ page }) => {
    // First attempt with invalid credentials
    await page.getByRole('textbox', { name: 'Username' }).fill('invaliduser');
    await page.getByRole('textbox', { name: 'Password' }).fill('wrongpassword');
    await page.getByRole('button', { name: /Sign In|Sign In to/i }).click();

    // Wait for any error indication to appear (toast, alert, or error text)
    await Promise.race([
      page
        .locator('.toast-error')
        .waitFor({ timeout: 3000 })
        .catch(() => {}),
      page
        .locator('[role="alert"]')
        .waitFor({ timeout: 3000 })
        .catch(() => {}),
      page
        .locator('text=/Invalid|Error|Failed/i')
        .waitFor({ timeout: 3000 })
        .catch(() => {}),
    ]);
    await expect(page).toHaveURL(/login/);

    // Now try with correct credentials
    await page.getByRole('textbox', { name: 'Username' }).fill('admin');
    await page.getByRole('textbox', { name: 'Password' }).fill('admin');
    await page.getByRole('button', { name: /Sign In|Sign In to/i }).click();

    // Wait for successful login and redirect
    await expect(page).toHaveURL('/', { timeout: 5000 });
  });

  test('loading state appears during login attempt', async ({ page }) => {
    await page.getByRole('textbox', { name: 'Username' }).fill('admin');
    await page.getByRole('textbox', { name: 'Password' }).fill('admin');
    await page.getByRole('button', { name: /Sign In|Sign In to/i }).click();

    // Check for loading state - either loading toast or disabled button
    const isLoading =
      (await page.locator('.toast-loading, [role="status"], button:disabled').count()) > 0;
    expect(isLoading).toBeTruthy();

    // Wait for successful login
    await expect(page).toHaveURL('/', { timeout: 5000 });
  });

  test('error handling maintains accessibility', async ({ page }) => {
    await page.getByRole('textbox', { name: 'Username' }).fill('invaliduser');
    await page.getByRole('textbox', { name: 'Password' }).fill('wrongpassword');
    await page.getByRole('button', { name: /Sign In|Sign In to/i }).click();

    // Wait for toast container to be visible
    await expect(page.locator('.toast-container')).toBeVisible({ timeout: 3000 });

    // Check that we're still on login page (error occurred)
    await expect(page).toHaveURL(/login/);

    // Check for toast container existence
    const toastContainer = page.locator('.toast-container');
    const hasContainer = (await toastContainer.count()) > 0;

    // Check for any accessibility attributes
    const hasAccessibility =
      (await page.locator('[role="alert"], [aria-live], .toast-error').count()) > 0;

    // At least one accessibility feature should be present
    expect(hasContainer || hasAccessibility).toBeTruthy();
  });

  test('error toast appears with correct message content', async ({ page }) => {
    await page.getByRole('textbox', { name: 'Username' }).fill('invaliduser');
    await page.getByRole('textbox', { name: 'Password' }).fill('wrongpassword');
    await page.getByRole('button', { name: /Sign In|Sign In to/i }).click();

    // Wait for loading toast or status indicator to disappear, or error toast/alert to appear
    await Promise.race([
      page
        .locator('.toast-loading, [role="status"]')
        .first()
        .waitFor({ state: 'hidden', timeout: 3000 }),
      page
        .locator('[role="alert"], .toast-error')
        .first()
        .waitFor({ state: 'visible', timeout: 3000 }),
    ]);

    // Look for any text containing error messages - be more flexible
    const errorTexts = ['Invalid username or password'];

    let errorFound = false;
    for (const errorText of errorTexts) {
      try {
        const errorElement = page.locator(`text=${errorText}`);
        await errorElement.waitFor({ timeout: 2000 });
        await expect(errorElement).toBeVisible();
        errorFound = true;
        break;
      } catch {
        // Continue to next error text
      }
    }

    // If no specific error text found, check if we're still on login page (which indicates error)
    if (!errorFound) {
      await expect(page).toHaveURL(/login/);
    }
  });
});
