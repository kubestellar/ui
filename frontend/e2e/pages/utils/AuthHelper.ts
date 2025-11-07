import { Page } from '@playwright/test';
import { LoginPage } from '../LoginPage';
import { DEFAULT_CREDENTIALS } from '../constants';

/**
 * Authentication Helper
 * Provides utilities for authentication flows in tests
 */
export class AuthHelper {
  constructor(private page: Page) {}

  /**
   * Login with default admin credentials
   */
  async loginAsAdmin(): Promise<void> {
    const loginPage = new LoginPage(this.page);
    await loginPage.goto();
    await loginPage.login(DEFAULT_CREDENTIALS.username, DEFAULT_CREDENTIALS.password);
  }

  /**
   * Login with custom credentials
   */
  async login(username: string, password: string): Promise<void> {
    const loginPage = new LoginPage(this.page);
    await loginPage.goto();
    await loginPage.login(username, password);
  }

  /**
   * Login with remember me enabled
   */
  async loginWithRememberMe(
    username: string = DEFAULT_CREDENTIALS.username,
    password: string = DEFAULT_CREDENTIALS.password
  ): Promise<void> {
    const loginPage = new LoginPage(this.page);
    await loginPage.goto();
    await loginPage.fillUsername(username);
    await loginPage.fillPassword(password);
    await loginPage.checkRememberMe();
    await loginPage.clickSignIn();
    await loginPage.waitForRedirect();
  }

  /**
   * Check if user is logged in (by checking for JWT token)
   */
  async isLoggedIn(): Promise<boolean> {
    const token = await this.page.evaluate(() => localStorage.getItem('jwtToken'));
    return token !== null;
  }

  /**
   * Get JWT token from localStorage
   */
  async getToken(): Promise<string | null> {
    return await this.page.evaluate(() => localStorage.getItem('jwtToken'));
  }

  /**
   * Logout (clear localStorage)
   */
  async logout(): Promise<void> {
    await this.page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  }
}
