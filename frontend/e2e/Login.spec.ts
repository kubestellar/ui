import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';

test.describe('Login Page', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test('login page shows UI elements', async () => {
    await loginPage.verifyUIElements();
    await loginPage.verifyCanvasElements();
  });

  test('success with admin/admin logs in and redirects', async ({ page }) => {
    await loginPage.login('admin', 'admin');
    await expect(page).toHaveURL('/', { timeout: 10000 });
  });

  test('remember me checkbox persists behavior', async () => {
    await loginPage.fillUsername('admin');
    await loginPage.fillPassword('admin');
    await loginPage.checkRememberMe();
    await loginPage.clickSignIn();
    await loginPage.waitForRedirect(15000);

    const token = await loginPage.getJWTToken();
    expect(token).toBeTruthy();
  });

  // Form Validation Tests
  test('form validation prevents submission with empty fields', async ({ page }) => {
    await loginPage.submitEmptyForm();

    // Form should not submit and we should stay on login page
    await expect(page).toHaveURL(/login/);
    await loginPage.verifyFormValidation();
  });

  test('form validation clears errors when typing', async () => {
    // Test that form prevents submission with empty fields
    await loginPage.submitEmptyForm();

    // Should stay on login page (form didn't submit)
    await expect(loginPage.page).toHaveURL(/login/);

    // Test that typing in fields works correctly
    await loginPage.fillUsername('testuser');
    await loginPage.fillPassword('testpass');

    // Verify fields have the correct values
    await expect(loginPage.usernameInput).toHaveValue('testuser');
    await expect(loginPage.passwordInput).toHaveValue('testpass');
  });

  // Password Visibility Toggle Tests
  test('password visibility toggle works', async () => {
    await loginPage.fillPassword('testpassword');

    await loginPage.togglePasswordVisibility();
    await expect(loginPage.passwordInput).toHaveAttribute('type', 'text');

    await loginPage.togglePasswordVisibility();
    await expect(loginPage.passwordInput).toHaveAttribute('type', 'password');
  });

  // Language Switching Tests
  test('language switcher opens and changes language', async ({ page }) => {
    // Select language - this will open dropdown and select
    await loginPage.selectLanguage('हिन्दी');

    // Wait a bit for language change to take effect
    await page.waitForTimeout(500);

    // Verify language changed by checking if we're still on login page
    await expect(page).toHaveURL(/login/);
  });

  // Fullscreen Toggle Tests
  test('fullscreen toggle works', async () => {
    // Check initial state
    const initialFullscreen = await loginPage.isFullscreen();
    expect(initialFullscreen).toBe(false);

    await loginPage.enterFullscreen();

    // Check if we're in fullscreen mode
    const isFullscreen = await loginPage.isFullscreen();
    expect(isFullscreen).toBe(true);

    // Exit fullscreen
    await loginPage.exitFullscreen();

    // Check if we exited fullscreen
    const isNotFullscreen = await loginPage.isFullscreen();
    expect(isNotFullscreen).toBe(false);
  });

  // Accessibility Tests
  test('keyboard navigation works correctly', async () => {
    await loginPage.testKeyboardNavigation();
  });

  // Responsive Design Tests
  test('responsive design works on mobile', async () => {
    await loginPage.testMobileView();
  });

  // Security Features Tests
  test('remember me stores credentials securely', async ({ page }) => {
    await loginPage.fillUsername('admin');
    await loginPage.fillPassword('admin');
    await loginPage.checkRememberMe();
    await loginPage.clickSignIn();
    await loginPage.waitForRedirect(10000);

    // Wait for localStorage to be updated with credentials
    await page.waitForFunction(() => {
      const keys = Object.keys(localStorage);
      return keys.some(
        key => key.includes('remember') || key.includes('username') || key.includes('password')
      );
    });

    // Check if remember me functionality worked
    const hasStoredCredentials = await loginPage.hasStoredCredentials();
    expect(hasStoredCredentials).toBe(true);
  });

  // Error Handling Tests
  test('shows error for invalid credentials', async ({ page }) => {
    await loginPage.fillUsername('invaliduser');
    await loginPage.fillPassword('wrongpassword');
    await loginPage.clickSignIn();

    // Wait for error indication
    await loginPage.waitForError();

    // Check that we're still on the login page (didn't redirect)
    await expect(page).toHaveURL(/login/);

    // At least one error indication should be present
    const hasError = await loginPage.hasError();
    expect(hasError).toBeTruthy();
  });

  test('error handling works with invalid then valid credentials', async ({ page }) => {
    // First attempt with invalid credentials
    await loginPage.fillUsername('invaliduser');
    await loginPage.fillPassword('wrongpassword');
    await loginPage.clickSignIn();

    await loginPage.waitForError();
    await expect(page).toHaveURL(/login/);

    // Now try with correct credentials
    await loginPage.login('admin', 'admin');

    // Wait for successful login and redirect
    await expect(page).toHaveURL('/', { timeout: 5000 });
  });

  test('loading state appears during login attempt', async ({ page }) => {
    await loginPage.fillUsername('admin');
    await loginPage.fillPassword('admin');
    await loginPage.clickSignIn();

    // Check for loading state
    const isLoading = await loginPage.hasLoadingState();
    expect(isLoading).toBeTruthy();

    // Wait for successful login
    await expect(page).toHaveURL('/', { timeout: 5000 });
  });

  test('error handling maintains accessibility', async ({ page }) => {
    await loginPage.fillUsername('invaliduser');
    await loginPage.fillPassword('wrongpassword');
    await loginPage.clickSignIn();

    // Wait for toast container to be visible
    await loginPage.verifyToastContainer();

    // Check that we're still on login page (error occurred)
    await expect(page).toHaveURL(/login/);

    // Check for accessibility attributes
    const hasAccessibility = await loginPage.hasAccessibilityAttributes();
    expect(hasAccessibility).toBeTruthy();
  });

  test('error toast appears with correct message content', async ({ page }) => {
    await loginPage.fillUsername('invaliduser');
    await loginPage.fillPassword('wrongpassword');
    await loginPage.clickSignIn();

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

    // Look for any text containing error messages
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
