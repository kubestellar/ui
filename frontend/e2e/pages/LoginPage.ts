import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base/BasePage';

/**
 * Login Page Object Model
 * Encapsulates all interactions with the login page
 */
export class LoginPage extends BasePage {
  // Form elements
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly signInButton: Locator;
  readonly rememberMeCheckbox: Locator;
  readonly passwordToggle: Locator;

  // UI elements
  readonly welcomeHeading: Locator;
  readonly seamlessText: Locator;
  readonly builtForText: Locator;
  readonly fullscreenButton: Locator;
  readonly languageButton: Locator;

  // Canvas elements (for Firefox compatibility)
  readonly canvas: Locator;
  readonly canvasPlaceholder: Locator;
  readonly canvasTitle: Locator;
  readonly canvasSubtitle: Locator;

  // Error/Toast elements
  readonly errorToast: Locator;
  readonly errorAlert: Locator;
  readonly errorText: Locator;
  readonly toastContainer: Locator;
  readonly loadingToast: Locator;

  constructor(page: Page) {
    super(page);
    // Form elements
    this.usernameInput = page.getByRole('textbox', { name: 'Username' });
    this.passwordInput = page.getByRole('textbox', { name: 'Password' });
    this.signInButton = page.getByRole('button', { name: /Sign In|Sign In to/i });
    this.rememberMeCheckbox = page.getByRole('checkbox', { name: /Remember me/i });
    this.passwordToggle = page.getByRole('button', { name: /Show password|Hide password/i });

    // UI elements
    this.welcomeHeading = page.getByRole('heading', { name: 'Welcome Back' });
    this.seamlessText = page.getByText('Seamless Multi-Cluster');
    this.builtForText = page.getByText('Built for the Future.');
    this.fullscreenButton = page.getByRole('button', { name: 'Toggle full screen' });
    this.languageButton = page.getByRole('button', { name: 'English' });

    // Canvas elements
    this.canvas = page.locator('canvas');
    this.canvasPlaceholder = page.getByTestId('canvas-disabled-placeholder');
    this.canvasTitle = page.getByTestId('canvas-disabled-title');
    this.canvasSubtitle = page.getByTestId('canvas-disabled-subtitle');

    // Error/Toast elements
    this.errorToast = page.locator('.toast-error');
    this.errorAlert = page.locator('[role="alert"]');
    this.errorText = page.locator('text=/Invalid|Error|Failed/i');
    this.toastContainer = page.locator('.toast-container');
    this.loadingToast = page.locator('.toast-loading, [role="status"], button:disabled');
  }

  /**
   * Navigate to login page
   */
  async goto() {
    await super.goto('/login');
  }

  /**
   * Fill username field
   */
  async fillUsername(username: string) {
    await this.usernameInput.fill(username);
  }

  /**
   * Fill password field
   */
  async fillPassword(password: string) {
    await this.passwordInput.fill(password);
  }

  /**
   * Click sign in button
   */
  async clickSignIn() {
    await this.signInButton.click();
  }

  /**
   * Complete login flow
   */
  async login(username: string = 'admin', password: string = 'admin') {
    await this.fillUsername(username);
    await this.fillPassword(password);
    await this.clickSignIn();
    await this.waitForRedirect();
  }

  /**
   * Wait for successful login redirect
   */
  async waitForRedirect(timeout: number = 10000) {
    await this.waitForURL('/', timeout);
  }

  /**
   * Check remember me checkbox
   */
  async checkRememberMe() {
    await this.rememberMeCheckbox.check();
  }

  /**
   * Uncheck remember me checkbox
   */
  async uncheckRememberMe() {
    await this.rememberMeCheckbox.uncheck();
  }

  /**
   * Toggle password visibility
   */
  async togglePasswordVisibility() {
    await this.passwordToggle.click();
  }

  /**
   * Check if password is visible (type="text")
   */
  async isPasswordVisible(): Promise<boolean> {
    const type = await this.passwordInput.getAttribute('type');
    return type === 'text';
  }

  /**
   * Verify all UI elements are visible
   */
  async verifyUIElements() {
    await expect(this.welcomeHeading).toBeVisible();
    await expect(this.usernameInput).toBeVisible();
    await expect(this.passwordInput).toBeVisible();
    await expect(this.signInButton).toBeVisible();
    await expect(this.rememberMeCheckbox).toBeVisible();
    await expect(this.seamlessText).toBeVisible();
    await expect(this.builtForText).toBeVisible();
    await expect(this.fullscreenButton).toBeVisible();
    await expect(this.languageButton).toBeVisible();
  }

  /**
   * Verify canvas elements (with Firefox compatibility)
   */
  async verifyCanvasElements() {
    const browserName = this.page.context().browser()?.browserType().name();
    const isFirefox = browserName === 'firefox';

    if (isFirefox) {
      await expect(this.canvasPlaceholder).toBeVisible();
      await expect(this.canvasTitle).toBeVisible();
      await expect(this.canvasSubtitle).toBeVisible();
    } else {
      await expect(this.canvas).toBeVisible();
    }
  }

  /**
   * Verify form validation (required fields)
   */
  async verifyFormValidation() {
    await expect(this.usernameInput).toHaveAttribute('required');
    await expect(this.passwordInput).toHaveAttribute('required');
  }

  /**
   * Submit form without filling fields (to test validation)
   */
  async submitEmptyForm() {
    await this.clickSignIn();
  }

  /**
   * Check if still on login page (useful for error scenarios)
   */
  async isOnLoginPage(): Promise<boolean> {
    const url = this.getCurrentURL();
    return url.includes('/login');
  }

  /**
   * Wait for error message to appear
   */
  async waitForError(timeout: number = 3000) {
    await Promise.race([
      this.errorToast.waitFor({ timeout }).catch(() => {}),
      this.errorAlert.waitFor({ timeout }).catch(() => {}),
      this.errorText.waitFor({ timeout }).catch(() => {}),
    ]);
  }

  /**
   * Check if error is displayed
   */
  async hasError(): Promise<boolean> {
    const hasErrorToast = (await this.errorToast.count()) > 0;
    const hasAlert = (await this.errorAlert.count()) > 0;
    const hasErrorText = (await this.errorText.count()) > 0;
    return hasErrorToast || hasAlert || hasErrorText;
  }

  /**
   * Get error message text
   */
  async getErrorMessage(): Promise<string | null> {
    if (await this.errorToast.isVisible({ timeout: 1000 }).catch(() => false)) {
      return await this.errorToast.textContent();
    }
    if (await this.errorAlert.isVisible({ timeout: 1000 }).catch(() => false)) {
      return await this.errorAlert.textContent();
    }
    if (await this.errorText.isVisible({ timeout: 1000 }).catch(() => false)) {
      return await this.errorText.textContent();
    }
    return null;
  }

  /**
   * Check if loading state is visible
   */
  async hasLoadingState(): Promise<boolean> {
    return (await this.loadingToast.count()) > 0;
  }

  /**
   * Wait for loading state to appear
   */
  async waitForLoading(timeout: number = 3000) {
    try {
      await this.loadingToast.first().waitFor({ timeout });
    } catch {
      // Loading might be too fast to catch
    }
  }

  /**
   * Open language switcher dropdown
   */
  async openLanguageDropdown() {
    await this.languageButton.click();
  }

  /**
   * Select language from dropdown
   */
  async selectLanguage(languageText: string) {
    // Open dropdown if not already open
    const dropdown = this.page.locator('[role="listbox"]');
    const isDropdownVisible = await this.isVisible(dropdown, 1000);

    if (!isDropdownVisible) {
      await this.openLanguageDropdown();
      // Wait for dropdown to appear
      await dropdown.waitFor({ state: 'visible', timeout: 3000 });
    }

    // Wait for the language option to be visible and attached
    // Use role="option" for better reliability
    const languageOption = this.page
      .locator('[role="option"]')
      .filter({ hasText: languageText })
      .first();

    // Wait for element to be visible and stable
    await languageOption.waitFor({ state: 'visible', timeout: 3000 });

    // Ensure element is attached to DOM by checking it's still visible
    await this.page.waitForFunction(
      text => {
        const options = Array.from(document.querySelectorAll('[role="option"]'));
        return options.some(opt => opt.textContent?.includes(text));
      },
      languageText,
      { timeout: 2000 }
    );

    // Use a more reliable click approach - wait for element to be actionable
    await languageOption.waitFor({ state: 'attached', timeout: 2000 });
    await this.page.waitForTimeout(100); // Small wait for stability

    // Click with retry handling
    try {
      await languageOption.click({ timeout: 5000 });
    } catch {
      // If element was detached, try finding it again
      const retryOption = this.page
        .locator('[role="option"]')
        .filter({ hasText: languageText })
        .first();
      await retryOption.waitFor({ state: 'visible', timeout: 2000 });
      await retryOption.click({ timeout: 5000 });
    }
  }

  /**
   * Toggle fullscreen mode
   */
  async toggleFullscreen() {
    await this.fullscreenButton.click();
  }

  /**
   * Enter fullscreen mode
   */
  async enterFullscreen() {
    const isFullscreen = await this.page.evaluate(() => !!document.fullscreenElement);
    if (!isFullscreen) {
      await this.toggleFullscreen();
      await this.page.waitForFunction(() => !!document.fullscreenElement);
    }
  }

  /**
   * Exit fullscreen mode
   */
  async exitFullscreen() {
    await this.page.evaluate(() => {
      if (document.fullscreenElement) {
        return document.exitFullscreen();
      }
    });
    await this.page.waitForFunction(() => !document.fullscreenElement, { timeout: 5000 });
  }

  /**
   * Check if in fullscreen mode
   */
  async isFullscreen(): Promise<boolean> {
    return await this.page.evaluate(() => !!document.fullscreenElement);
  }

  /**
   * Test keyboard navigation
   */
  async testKeyboardNavigation() {
    await this.usernameInput.focus();
    await expect(this.usernameInput).toBeFocused();

    await this.page.keyboard.press('Tab');
    await expect(this.passwordInput).toBeFocused();

    await this.page.keyboard.press('Tab');
    const focusedElement = await this.page.evaluate(() => document.activeElement?.tagName);
    expect(['INPUT', 'BUTTON']).toContain(focusedElement);
  }

  /**
   * Test responsive design on mobile
   */
  async testMobileView() {
    await this.page.setViewportSize({ width: 375, height: 667 });
    await this.page.waitForFunction(() => {
      const heading = document.querySelector('h1, [role="heading"]');
      if (!heading) return false;
      return heading.clientWidth <= 375;
    });
    await expect(this.welcomeHeading).toBeVisible();
    await expect(this.usernameInput).toBeVisible();
    await expect(this.passwordInput).toBeVisible();
  }

  /**
   * Check if remember me stored credentials
   */
  async hasStoredCredentials(): Promise<boolean> {
    const localStorageData = await this.page.evaluate(() => {
      const keys = Object.keys(localStorage);
      const data: Record<string, string | null> = {};
      keys.forEach(key => {
        data[key] = localStorage.getItem(key);
      });
      return data;
    });

    return Object.keys(localStorageData).some(
      key => key.includes('remember') || key.includes('username') || key.includes('password')
    );
  }

  /**
   * Get JWT token from localStorage
   */
  async getJWTToken(): Promise<string | null> {
    return await this.page.evaluate(() => localStorage.getItem('jwtToken'));
  }

  /**
   * Verify toast container is visible (for accessibility)
   */
  async verifyToastContainer() {
    await expect(this.toastContainer).toBeVisible({ timeout: 3000 });
  }

  /**
   * Check if accessibility attributes are present
   */
  async hasAccessibilityAttributes(): Promise<boolean> {
    return (await this.page.locator('[role="alert"], [aria-live], .toast-error').count()) > 0;
  }
}
