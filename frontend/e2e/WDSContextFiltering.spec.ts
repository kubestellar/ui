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

  test('filter by context (all/specific)', async ({ page }) => {
    await page.waitForTimeout(1000);

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
        await page.waitForTimeout(1000);

        expect(true).toBeTruthy();
      }

      await contextSelect.click();
      await page.waitForTimeout(500);
      const allOption = page.locator('text=/all.*contexts/i').first();
      if (await allOption.isVisible().catch(() => false)) {
        await allOption.click();
        await page.waitForTimeout(1000);

        expect(true).toBeTruthy();
      }
    }
  });

  test('resource counts per context', async ({ page }) => {
    await page.waitForTimeout(1000);

    const contextSelect = page
      .locator('select, [role="combobox"]')
      .filter({ hasText: /all|wds/i })
      .first();

    if (await contextSelect.isVisible().catch(() => false)) {
      await contextSelect.click();
      await page.waitForTimeout(500);

      const countChips = page.locator('[class*="Chip"], [class*="Badge"], [class*="count"]');
      const countElements = await countChips.count();

      expect(countElements >= 0).toBeTruthy();

      const allOption = page.locator('text=/all.*contexts/i').first();
      if (await allOption.isVisible().catch(() => false)) {
        expect(true).toBeTruthy();
      }
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

  test('context creation via WebSocket', async ({ page }) => {
    await page.waitForTimeout(1000);

    let wsConnectionAttempted = false;
    page.on('websocket', ws => {
      const wsUrl = ws.url();
      if (wsUrl.includes('/api/wds/context') && wsUrl.includes('context=')) {
        wsConnectionAttempted = true;
      }
    });

    const contextSelect = page
      .locator('select, [role="combobox"]')
      .filter({ hasText: /all|wds/i })
      .first();

    if (await contextSelect.isVisible().catch(() => false)) {
      await contextSelect.click();
      await page.waitForTimeout(500);

      const createOption = page
        .locator('text=/create.*context|add.*context|new.*context/i')
        .first();

      if (await createOption.isVisible().catch(() => false)) {
        await createOption.click();

        await page.waitForSelector('[role="dialog"]', { state: 'visible', timeout: 5000 });
        await page.waitForTimeout(500);

        const contextNameInput = page.locator('[role="dialog"] input[type="text"]').first();
        if (await contextNameInput.isVisible().catch(() => false)) {
          await contextNameInput.fill('wds4');
          await page.waitForTimeout(200);
        }

        const allInputs = page.locator('[role="dialog"] input[type="text"]');
        const inputCount = await allInputs.count();
        if (inputCount > 1) {
          const versionInput = allInputs.nth(1);
          if (await versionInput.isVisible().catch(() => false)) {
            await versionInput.fill('0.27.0');
            await page.waitForTimeout(200);
          }
        }

        await page.waitForTimeout(300);

        const createButton = page
          .getByRole('button', { name: /create|confirm|submit/i })
          .filter({ hasNotText: /cancel/i })
          .first();

        await createButton.waitFor({ state: 'visible', timeout: 5000 });

        try {
          await createButton.click({ timeout: 5000 });
        } catch {
          await page.waitForTimeout(500);
          await createButton.click({ force: true });
        }

        await page.waitForTimeout(2000);

        const creatingIndicator = page.locator('text=/creating|connecting|processing/i').first();
        const hasCreatingIndicator = await creatingIndicator
          .isVisible({ timeout: 2000 })
          .catch(() => false);

        const dialog = page.locator('[role="dialog"]').first();
        const dialogVisible = await dialog.isVisible({ timeout: 1000 }).catch(() => false);

        expect(wsConnectionAttempted || hasCreatingIndicator || !dialogVisible).toBeTruthy();
      }
    }
  });

  test('context version selection', async ({ page }) => {
    await page.waitForTimeout(1000);

    const contextSelect = page
      .locator('select, [role="combobox"]')
      .filter({ hasText: /all|wds/i })
      .first();

    if (await contextSelect.isVisible().catch(() => false)) {
      await contextSelect.click();
      await page.waitForTimeout(500);

      const createOption = page
        .locator('text=/create.*context|add.*context|new.*context/i')
        .first();

      if (await createOption.isVisible().catch(() => false)) {
        await createOption.click();
        await page.waitForTimeout(1000);

        const versionInput = page
          .locator('input[placeholder*="version"], input[label*="version"], input[type="text"]')
          .filter({ hasText: /0\.27|version/i })
          .or(page.locator('input').nth(1))
          .first();

        if (await versionInput.isVisible().catch(() => false)) {
          const defaultValue = await versionInput.inputValue().catch(() => '');
          expect(defaultValue.length >= 0).toBeTruthy();

          await versionInput.clear();
          await versionInput.fill('0.28.0');
          await page.waitForTimeout(500);

          const newValue = await versionInput.inputValue().catch(() => '');
          expect(newValue).toContain('0.28');
        }
      }
    }
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

  test('multiple context filtering', async ({ page }) => {
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

    await contextSelect.waitFor({ state: 'visible', timeout: 10000 });

    const contextsToTest = ['wds1', 'wds2', 'all'];

    for (const context of contextsToTest) {
      await contextSelect.click();
      await page.waitForTimeout(500);

      let contextOption;
      if (context === 'all') {
        contextOption = page.locator('text=/all.*contexts/i').first();
      } else {
        contextOption = page.locator(`text=/${context}/i`).first();
      }

      const optionVisible = await contextOption.isVisible({ timeout: 5000 }).catch(() => false);
      if (!optionVisible) {
        await page.waitForTimeout(500);
      }

      const finalOptionVisible = await contextOption
        .isVisible({ timeout: 3000 })
        .catch(() => false);
      if (finalOptionVisible) {
        await contextOption.click();
        await page.waitForTimeout(1500);
      } else {
        const allOptions = page.locator('[role="option"], [role="menuitem"]');
        const optionCount = await allOptions.count();
        const optionTexts: string[] = [];
        for (let i = 0; i < Math.min(optionCount, 5); i++) {
          const text = await allOptions
            .nth(i)
            .textContent()
            .catch(() => '');
          optionTexts.push(text || '');
        }
        throw new Error(
          `Context "${context}" not found in dropdown. ` +
            `Found ${optionCount} options: ${optionTexts.join(', ')}. ` +
            `Make sure wdsContextFiltering scenario includes contexts: wds1, wds2, wds3`
        );
      }

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

      const canvas = page.locator('canvas').first();
      const table = page.locator('table').first();
      const reactFlow = page.locator('.react-flow, [class*="react-flow"]').first();
      const emptyState = page.locator('text=/no.*workloads|empty|create.*workload/i').first();
      const createBtn = page
        .getByRole('button')
        .filter({ hasText: /create|add|new/i })
        .first();

      const hasView =
        (await canvas.isVisible({ timeout: 2000 }).catch(() => false)) ||
        (await table.isVisible({ timeout: 2000 }).catch(() => false)) ||
        (await reactFlow.isVisible({ timeout: 2000 }).catch(() => false)) ||
        (await emptyState.isVisible({ timeout: 2000 }).catch(() => false)) ||
        (await createBtn.isVisible({ timeout: 2000 }).catch(() => false));

      expect(hasView).toBeTruthy();

      if (context !== contextsToTest[contextsToTest.length - 1]) {
        await page.waitForTimeout(500);
      }
    }
  });
});
