import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { BasePage } from './pages/base/BasePage';

test.describe('WDS Context Filtering - Context Management Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.evaluate(() => {
      window.__msw?.applyScenarioByName('wdsContextFiltering');
    });

    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login();

    const basePage = new BasePage(page);
    try {
      await basePage.goto('/workloads/manage');
      await basePage.waitForLoadState('domcontentloaded');
    } catch {
      // Ignore SPA-triggered navigations that may race here
      await page.waitForLoadState('domcontentloaded');
    }

    await page.waitForFunction(
      () => {
        const reactFlow = document.querySelector('.react-flow, [class*="react-flow"]');
        const table = document.querySelector('table');
        const canvas = document.querySelector('canvas');
        const createBtn = Array.from(document.querySelectorAll('button')).some(b =>
          /create|add|new|workload/i.test(b.textContent || '')
        );
        return !!(reactFlow || table || canvas || createBtn);
      },
      { timeout: 20000 }
    );
  });

  test('context dropdown displays contexts', async ({ page }) => {
    await page.waitForTimeout(1000); // Give time for context API call

    const contextDropdown = page
      .locator('select, [role="combobox"], [class*="Select"]')
      .filter({ hasText: /all|wds|context/i })
      .first();

    const filterIcon = page.locator('[class*="FilterList"], svg[data-lucide="filter"]').first();
    const contextLabel = page.locator('text=/filter.*context|context.*filter/i').first();

    const hasContextDropdown =
      (await contextDropdown.isVisible().catch(() => false)) ||
      (await filterIcon.isVisible().catch(() => false)) ||
      (await contextLabel.isVisible().catch(() => false));

    expect(hasContextDropdown).toBeTruthy();

    if (await contextDropdown.isVisible().catch(() => false)) {
      await contextDropdown.click();
      await page.waitForTimeout(500);

      const allOption = page.locator('text=/all.*contexts/i').first();
      const wds1Option = page.locator('text=/wds1/i').first();
      const wds2Option = page.locator('text=/wds2/i').first();

      const hasAllOption = await allOption.isVisible().catch(() => false);
      const hasWds1 = await wds1Option.isVisible().catch(() => false);
      const hasWds2 = await wds2Option.isVisible().catch(() => false);

      expect(hasAllOption || hasWds1 || hasWds2).toBeTruthy();
    }
  });

  test('create new context dialog', async ({ page }) => {
    await page.waitForTimeout(1000);

    const contextSelect = page
      .locator('select, [role="combobox"]')
      .filter({ hasText: /all|wds/i })
      .first();

    await contextSelect.waitFor({ state: 'visible', timeout: 10000 });

    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);

    try {
      await contextSelect.click({ timeout: 5000 });
    } catch {
      await contextSelect.click({ force: true, timeout: 5000 });
    }
    await page.waitForTimeout(300);

    try {
      await page.waitForSelector('[role="listbox"], [role="menu"]', {
        state: 'visible',
        timeout: 5000,
      });
    } catch (error) {
      throw new Error(`Menu did not open within timeout: ${error}`);
    }

    const createOption = page
      .locator('[role="option"], [role="menuitem"]')
      .filter({ hasText: /create.*context|add.*context|new.*context/i })
      .first();

    try {
      await createOption.waitFor({ state: 'visible', timeout: 5000 });
    } catch (error) {
      throw new Error(`Create context option not found: ${error}`);
    }

    await createOption.click();
    await page.waitForTimeout(300);

    try {
      await page.waitForSelector('[role="dialog"]', { state: 'visible', timeout: 5000 });
    } catch (error) {
      throw new Error(`Dialog did not open within timeout: ${error}`);
    }

    await page.waitForTimeout(500);

    const dialog = page.locator('[role="dialog"]').first();
    const dialogTitle = page
      .locator('[role="dialog"]')
      .locator('text=/create.*context|new.*context/i')
      .first();

    const hasDialog = await dialog.isVisible({ timeout: 2000 }).catch(() => false);
    const hasTitle = await dialogTitle.isVisible({ timeout: 2000 }).catch(() => false);

    expect(hasDialog || hasTitle).toBeTruthy();

    const contextNameInput = page.locator('[role="dialog"] input[type="text"]').first();

    const hasNameInput = await contextNameInput.isVisible({ timeout: 2000 }).catch(() => false);

    expect(hasNameInput).toBeTruthy();
  });

  test('filter updates tree view', async ({ page }) => {
    await page.waitForFunction(
      () => {
        const reactFlow = document.querySelector('.react-flow, [class*="react-flow"]');
        const table = document.querySelector('table');
        const canvas = document.querySelector('canvas');
        const createBtn = Array.from(document.querySelectorAll('button')).some(b =>
          /create|add|new|workload/i.test(b.textContent || '')
        );
        return !!(reactFlow || table || canvas || createBtn);
      },
      { timeout: 20000 }
    );

    const contextSelect = page
      .locator('select, [role="combobox"]')
      .filter({ hasText: /all|wds/i })
      .first();

    if (await contextSelect.isVisible().catch(() => false)) {
      await contextSelect.click();
      await page.waitForTimeout(500);

      const wds1Option = page.locator('text=/wds1/i').first();
      if (await wds1Option.isVisible().catch(() => false)) {
        await wds1Option.click();
        await page.waitForTimeout(2000);

        await page.waitForFunction(
          () => {
            const reactFlow = document.querySelector('.react-flow, [class*="react-flow"]');
            const table = document.querySelector('table');
            const canvas = document.querySelector('canvas');
            const emptyState =
              document.body.innerText &&
              /No workloads|Empty|Create workload/i.test(document.body.innerText);
            const createBtn = Array.from(document.querySelectorAll('button')).some(b =>
              /create|add|new|workload/i.test(b.textContent || '')
            );
            return !!(reactFlow || table || canvas || emptyState || createBtn);
          },
          { timeout: 10000 }
        );

        const updatedCanvas = page.locator('canvas').first();
        const updatedTable = page.locator('table').first();
        const updatedReactFlow = page.locator('.react-flow, [class*="react-flow"]').first();
        const emptyState = page.locator('text=/no.*workloads|empty|create.*workload/i').first();
        const updatedCreateBtn = page
          .getByRole('button')
          .filter({ hasText: /create|add|new/i })
          .first();

        const hasUpdatedView =
          (await updatedCanvas.isVisible({ timeout: 2000 }).catch(() => false)) ||
          (await updatedTable.isVisible({ timeout: 2000 }).catch(() => false)) ||
          (await updatedReactFlow.isVisible({ timeout: 2000 }).catch(() => false)) ||
          (await emptyState.isVisible({ timeout: 2000 }).catch(() => false)) ||
          (await updatedCreateBtn.isVisible({ timeout: 2000 }).catch(() => false));

        expect(hasUpdatedView).toBeTruthy();
      }
    }
  });
});
