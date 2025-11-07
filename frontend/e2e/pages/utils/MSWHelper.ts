import { Page } from '@playwright/test';

/**
 * MSW (Mock Service Worker) Helper
 * Provides utilities for managing MSW scenarios in tests
 */
export class MSWHelper {
  constructor(private page: Page) {}

  /**
   * Apply an MSW scenario by name
   */
  async applyScenario(scenarioName: string) {
    await this.page.evaluate((name: string) => {
      if (window.__msw) {
        window.__msw.applyScenarioByName(name);
      }
    }, scenarioName);
  }

  /**
   * Reset MSW handlers
   */
  async resetHandlers() {
    await this.page.evaluate(() => {
      if (window.__msw?.worker) {
        window.__msw.worker.resetHandlers();
      }
    });
  }

  /**
   * Check if MSW is available
   */
  async isMSWAvailable(): Promise<boolean> {
    return await this.page.evaluate(() => {
      return typeof window.__msw !== 'undefined';
    });
  }
}
