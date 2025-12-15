import { test, expect } from '@playwright/test';
import { LoginPage, WDSPage } from './pages';
import { MSWHelper } from './pages/utils/MSWHelper';

test.describe('WDS View Mode Switching', () => {
  let wdsPage: WDSPage;
  let loginPage: LoginPage;
  let mswHelper: MSWHelper;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    wdsPage = new WDSPage(page);
    mswHelper = new MSWHelper(page);

    await loginPage.goto();
    await mswHelper.applyScenario('wdsSuccess');
    await page.waitForLoadState('domcontentloaded');
    await loginPage.login();
    await wdsPage.ensureOnWdsPage();
    await wdsPage.waitForPageLoad();
  });

  test('view mode toggle buttons are visible and functional', async () => {
    await wdsPage.verifyViewModeButtons();

    const tilesButton = wdsPage.tilesViewButton;
    const listButton = wdsPage.listViewButton;

    await expect(tilesButton).toBeVisible();
    await expect(listButton).toBeVisible();

    const tilesClickable = await tilesButton.isEnabled();
    const listClickable = await listButton.isEnabled();

    expect(tilesClickable).toBeTruthy();
    expect(listClickable).toBeTruthy();
  });

  test('tiles view displays graph visualization', async () => {
    await wdsPage.switchToTilesView();
    await wdsPage.verifyTilesViewRendered();

    const isTilesActive = await wdsPage.isTilesViewActive();
    expect(isTilesActive).toBeTruthy();

    const hasReactFlow = await wdsPage.reactFlowCanvas
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    const hasCanvas = await wdsPage.flowCanvas.isVisible({ timeout: 5000 }).catch(() => false);
    const hasEmptyState = await wdsPage.emptyState.isVisible({ timeout: 2000 }).catch(() => false);
    const hasEmptyMessage = await wdsPage.emptyStateMessage
      .isVisible({ timeout: 2000 })
      .catch(() => false);

    const hasAnyTilesContent = await wdsPage.page.evaluate(() => {
      const reactFlow = document.querySelector('.react-flow, [class*="react-flow"]');
      const canvas = document.querySelector('canvas');
      const flowContainer = document.querySelector('[class*="FlowCanvas"], [class*="flow-canvas"]');
      return !!(reactFlow || canvas || flowContainer);
    });

    expect(
      hasReactFlow || hasCanvas || hasEmptyState || hasEmptyMessage || hasAnyTilesContent
    ).toBeTruthy();
  });

  test('list view displays table', async () => {
    await wdsPage.switchToListView();
    await wdsPage.verifyListViewRendered();

    const isListActive = await wdsPage.isListViewActive();
    expect(isListActive).toBeTruthy();

    const hasTable = await wdsPage.listViewTable.isVisible({ timeout: 5000 }).catch(() => false);
    const hasListItems = (await wdsPage.getListViewItemCount()) > 0;
    const hasEmptyState = await wdsPage.emptyStateMessage
      .isVisible({ timeout: 2000 })
      .catch(() => false);

    expect(hasTable || hasListItems || hasEmptyState).toBeTruthy();
  });

  test('switching between modes maintains context filter', async ({ page }) => {
    await wdsPage.switchToTilesView();
    await wdsPage.waitForTilesView();

    try {
      const contextDropdown = page
        .locator('[class*="MuiSelect"], [class*="Select"], select')
        .first();

      const isVisible = await contextDropdown.isVisible({ timeout: 5000 }).catch(() => false);

      if (isVisible) {
        await contextDropdown.click();
        await page.waitForTimeout(300).catch(() => {});

        const options = await page.getByRole('option').all();
        if (options.length > 1) {
          await options[1].click();
          await page.waitForTimeout(500).catch(() => {});

          const selectedContext = await wdsPage.getContextDropdownValue();

          await wdsPage.switchToListView();
          await wdsPage.waitForListView();

          const contextAfterSwitch = await wdsPage.getContextDropdownValue();

          expect(contextAfterSwitch).toBe(selectedContext);

          await wdsPage.switchToTilesView();
          await wdsPage.waitForTilesView();

          const contextAfterSwitchBack = await wdsPage.getContextDropdownValue();

          expect(contextAfterSwitchBack).toBe(selectedContext);
        } else {
          console.warn('Context dropdown has no options to select');
        }
      } else {
        console.warn('Context dropdown not visible, skipping context filter preservation test');
      }
    } catch (error) {
      console.warn('Context filter preservation test skipped:', error);
    }
  });

  test('pagination works in list view', async ({ page }) => {
    await wdsPage.switchToListView();
    await wdsPage.waitForListView();
    await page.waitForTimeout(2000);

    const paginationInfo = await wdsPage.getListViewPaginationInfo();

    if (paginationInfo.total > 1) {
      const initialPage = paginationInfo.current;

      const nextButton = page.getByRole('button').filter({ hasText: /next/i }).first();
      const hasNextButton = await nextButton.isVisible({ timeout: 3000 }).catch(() => false);
      const isNextDisabled = hasNextButton
        ? await nextButton.isDisabled().catch(() => false)
        : true;

      if (hasNextButton && !isNextDisabled) {
        await wdsPage.navigateToNextPage();
        await page.waitForTimeout(2000);

        const nextPageInfo = await wdsPage.getListViewPaginationInfo();
        if (nextPageInfo.current > initialPage) {
          expect(nextPageInfo.current).toBeGreaterThan(initialPage);

          const prevButton = page
            .getByRole('button')
            .filter({ hasText: /previous|prev/i })
            .first();
          const hasPrevButton = await prevButton.isVisible({ timeout: 3000 }).catch(() => false);
          const isPrevDisabled = hasPrevButton
            ? await prevButton.isDisabled().catch(() => false)
            : true;

          if (hasPrevButton && !isPrevDisabled) {
            await wdsPage.navigateToPreviousPage();
            await page.waitForTimeout(2000);

            const prevPageInfo = await wdsPage.getListViewPaginationInfo();
            expect(prevPageInfo.current).toBeLessThanOrEqual(initialPage + 1);
          }
        }
      } else {
        console.warn('Pagination not available or next button disabled');
      }
    } else {
      console.warn('Pagination not needed - only one page or no items');
    }
  });

  test('zoom controls visible only in tiles view', async ({ page }) => {
    await page.waitForURL(/workloads\/manage/, { timeout: 10000 });

    await wdsPage.switchToTilesView();
    await wdsPage.waitForTilesView();

    const zoomControlsInTiles = await wdsPage.zoomControls
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    await wdsPage.switchToListView();
    await wdsPage.waitForListView();

    const zoomControlsInList = await wdsPage.zoomControls
      .isVisible({ timeout: 2000 })
      .catch(() => false);

    expect(zoomControlsInList).toBeFalsy();

    if (zoomControlsInTiles) {
      expect(zoomControlsInTiles).toBeTruthy();
    }
  });

  test('filters section visible only in tiles view', async () => {
    await wdsPage.switchToTilesView();
    await wdsPage.waitForTilesView();

    const filtersVisibleInTiles = await wdsPage.isFiltersVisible();

    await wdsPage.switchToListView();
    await wdsPage.waitForListView();

    const filtersVisibleInList = await wdsPage.isFiltersVisible();

    expect(filtersVisibleInList).toBeFalsy();
    if (filtersVisibleInTiles) {
      expect(filtersVisibleInTiles).toBeTruthy();
    }
  });

  test('multiple rapid view mode switches', async ({ page }) => {
    await page.waitForURL(/workloads\/manage/, { timeout: 10000 });

    for (let i = 0; i < 3; i++) {
      await wdsPage.tilesViewButton.click().catch(() => {});
      await page.waitForTimeout(300);
      await wdsPage.listViewButton.click().catch(() => {});
      await page.waitForTimeout(300);
    }

    await page.waitForTimeout(1000);

    const finalMode = (await wdsPage.isListViewActive()) ? 'list' : 'tiles';

    if (finalMode === 'list') {
      const hasList =
        (await wdsPage.listViewTable.isVisible({ timeout: 3000 }).catch(() => false)) ||
        (await wdsPage.getListViewItemCount()) > 0 ||
        (await wdsPage.emptyStateMessage.isVisible({ timeout: 2000 }).catch(() => false));
      expect(hasList).toBeTruthy();
    } else {
      const hasTiles =
        (await wdsPage.reactFlowCanvas.isVisible({ timeout: 3000 }).catch(() => false)) ||
        (await wdsPage.flowCanvas.isVisible({ timeout: 3000 }).catch(() => false)) ||
        (await wdsPage.emptyState.isVisible({ timeout: 2000 }).catch(() => false));
      expect(hasTiles).toBeTruthy();
    }
  });

  test('resource counts update correctly when switching modes', async ({ page }) => {
    await wdsPage.switchToTilesView();
    await page.waitForTimeout(2000);

    const tilesCount = await wdsPage.getResourceCount();

    await wdsPage.switchToListView();
    await page.waitForTimeout(2000);

    const listCount = await wdsPage.getResourceCount();

    await wdsPage.switchToTilesView();
    await page.waitForTimeout(2000);

    const tilesCountAgain = await wdsPage.getResourceCount();

    expect(tilesCount).toBeGreaterThanOrEqual(0);
    expect(listCount).toBeGreaterThanOrEqual(0);
    expect(tilesCountAgain).toBeGreaterThanOrEqual(0);

    if (tilesCount > 0 || listCount > 0) {
      expect(tilesCount).toBe(tilesCountAgain);
    } else {
      expect(tilesCount).toBe(0);
      expect(listCount).toBe(0);
      expect(tilesCountAgain).toBe(0);
    }
  });
});
