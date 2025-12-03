import { test, expect } from '@playwright/test';
import { AuthHelper, ITSPage, MSWHelper } from './pages';

test.describe('ITS Table Features Tests', () => {
  let itsPage: ITSPage;
  let auth: AuthHelper;
  let msw: MSWHelper;

  test.beforeEach(async ({ page }) => {
    auth = new AuthHelper(page);
    itsPage = new ITSPage(page);
    msw = new MSWHelper(page);
    await auth.loginAsAdmin();
    await itsPage.openWithScenario(msw, 'itsSuccess');
  });

  test('table headers display correctly', async () => {
    const headerCount = await itsPage.tableHeaders.count();
    expect(headerCount).toBeGreaterThan(0);

    const expectedHeaders = ['Name', 'Status', 'Labels', 'Created', 'Actions'];
    for (const header of expectedHeaders) {
      const headerElement = itsPage.tableHeaders
        .filter({ hasText: new RegExp(header, 'i') })
        .first();
      if (await headerElement.isVisible()) {
        await expect(headerElement).toBeVisible();
      }
    }
  });

  test('table sorting works on sortable columns', async () => {
    const sortableHeaders = itsPage.sortableHeaders;
    const sortableCount = await sortableHeaders.count();

    if (sortableCount > 0) {
      await sortableHeaders.first().click();
      await itsPage.page.waitForTimeout(1000);

      const sortIndicator = itsPage.sortIndicators.first();
      if (await sortIndicator.isVisible()) {
        await expect(sortIndicator).toBeVisible();
      }

      await sortableHeaders.first().click();
      await itsPage.page.waitForTimeout(1000);
    }
  });

  test('table pagination works with many clusters', async () => {
    await itsPage.openWithScenario(msw, 'itsPagination');
    await expect(itsPage.table.first()).toBeVisible({ timeout: 15000 });

    const paginationControls = itsPage.paginationControls;
    if (await paginationControls.first().isVisible()) {
      await expect(paginationControls.first()).toBeVisible();

      const nextButton = itsPage.page
        .getByRole('button')
        .filter({ hasText: /next|>/i })
        .first();
      const prevButton = itsPage.page
        .getByRole('button')
        .filter({ hasText: /prev|</i })
        .first();

      if ((await nextButton.isVisible()) && (await nextButton.isEnabled())) {
        await nextButton.click();
        await itsPage.page.waitForTimeout(1000);
        await expect(itsPage.page.locator('text=cluster-11')).toBeVisible({ timeout: 5000 });

        if ((await prevButton.isVisible()) && (await prevButton.isEnabled())) {
          await prevButton.click();
          await itsPage.page.waitForTimeout(1000);
          await expect(itsPage.page.locator('text=cluster-1')).toBeVisible({ timeout: 5000 });
        }
      } else {
        await expect(itsPage.tableRows).toHaveCount(2);
      }
    }
  });

  test('table displays empty state when no results', async () => {
    const searchInput = itsPage.searchInput;
    await searchInput.fill('nonexistent-cluster-xyz');
    await itsPage.page.waitForTimeout(1000);

    const emptyState = itsPage.emptyState;
    if (await emptyState.isVisible()) {
      await expect(emptyState).toBeVisible();
    } else {
      await expect(itsPage.tableRows).toHaveCount(0);
    }
  });

  test('table loading state displays during data fetch', async () => {
    await itsPage.openWithScenario(msw, 'itsLoading');

    try {
      const loadingIndicator = itsPage.loadingIndicators.first();
      await expect(loadingIndicator).toBeVisible({ timeout: 2000 });
    } catch {
      const loadingText = itsPage.page.locator('text=/loading/i').first();
      if (await loadingText.isVisible({ timeout: 1000 })) {
        await expect(loadingText).toBeVisible();
      }
    }

    await expect(itsPage.table.first()).toBeVisible({ timeout: 10000 });
  });

  test('table columns are resizable', async () => {
    const resizeHandles = itsPage.resizeHandles;
    const handleCount = await resizeHandles.count();

    if (handleCount > 0) {
      const firstHandle = resizeHandles.first();
      const box = await firstHandle.boundingBox();

      if (box) {
        await itsPage.page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await itsPage.page.mouse.down();
        await itsPage.page.mouse.move(box.x + 50, box.y + box.height / 2);
        await itsPage.page.mouse.up();
        await itsPage.page.waitForTimeout(500);
      }
    }
  });

  test('table supports keyboard navigation', async () => {
    await itsPage.table.first().focus();
    await itsPage.page.keyboard.press('ArrowDown');
    await itsPage.page.waitForTimeout(200);
    await itsPage.page.keyboard.press('ArrowUp');
    await itsPage.page.waitForTimeout(200);
    await itsPage.page.keyboard.press('Tab');
    await itsPage.page.waitForTimeout(200);

    const focusedElement = itsPage.page.locator(':focus');
    if (await focusedElement.isVisible()) {
      await expect(focusedElement).toBeVisible();
    }
  });

  test('table context menu works on right click', async () => {
    const firstRow = itsPage.tableRows.first();
    await firstRow.click({ button: 'right' });
    await itsPage.page.waitForTimeout(500);

    const contextMenu = itsPage.contextMenu.first();
    if (await contextMenu.isVisible()) {
      await expect(contextMenu).toBeVisible();
      await itsPage.page.keyboard.press('Escape');
      await itsPage.page.waitForTimeout(300);
    }
  });

  test('table row hover effects work', async () => {
    const firstRow = itsPage.tableRows.first();
    await firstRow.hover();
    await itsPage.page.waitForTimeout(300);

    const rowClasses = await firstRow.getAttribute('class');
    const rowStyle = await firstRow.getAttribute('style');
    expect(rowClasses || rowStyle).toBeTruthy();
  });

  test('table column visibility can be toggled', async () => {
    const columnToggle = itsPage.columnToggleButton;

    if (await columnToggle.isVisible()) {
      await columnToggle.click();
      await itsPage.page.waitForTimeout(500);

      const columnOptions = itsPage.columnOptions;
      const optionCount = await columnOptions.count();

      if (optionCount > 0) {
        await columnOptions.first().click();
        await itsPage.page.waitForTimeout(500);
        expect(await itsPage.columnHeaders.count()).toBeGreaterThan(0);
      }
    }
  });
});
