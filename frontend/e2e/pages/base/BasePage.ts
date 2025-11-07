import { Page, Locator, expect } from '@playwright/test';
import { BASE_URL } from '../constants';

/**
 * Base Page Object Model class
 * Provides common functionality for all page objects
 */
export class BasePage {
  readonly page: Page;
  readonly BASE_URL = BASE_URL;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Navigate to a specific URL
   */
  async goto(url: string = '/') {
    await this.page.goto(`${this.BASE_URL}${url}`);
  }

  /**
   * Wait for page to load completely
   */
  async waitForLoadState(state: 'load' | 'domcontentloaded' | 'networkidle' = 'networkidle') {
    await this.page.waitForLoadState(state);
  }

  /**
   * Wait for URL to match pattern
   */
  async waitForURL(url: string | RegExp, timeout: number = 10000) {
    await expect(this.page).toHaveURL(url, { timeout });
  }

  /**
   * Get current URL
   */
  getCurrentURL(): string {
    return this.page.url();
  }

  /**
   * Check if element is visible
   */
  async isVisible(locator: Locator, timeout: number = 5000): Promise<boolean> {
    try {
      await locator.waitFor({ state: 'visible', timeout });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Wait for element to be visible
   */
  async waitForVisible(locator: Locator, timeout: number = 5000) {
    await locator.waitFor({ state: 'visible', timeout });
  }

  /**
   * Get page title
   */
  async getTitle(): Promise<string> {
    return await this.page.title();
  }

  /**
   * Take a screenshot
   */
  async takeScreenshot(path: string) {
    await this.page.screenshot({ path });
  }
}
