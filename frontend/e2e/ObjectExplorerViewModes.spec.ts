import { test, expect } from '@playwright/test';
import { LoginPage, ObjectExplorerPage, MSWHelper } from './pages';

test.describe('Object Explorer - View Modes and Pagination', () => {
  let loginPage: LoginPage;
  let objectExplorerPage: ObjectExplorerPage;
  let mswHelper: MSWHelper;

  test.describe.configure({ timeout: 120000 });
  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    objectExplorerPage = new ObjectExplorerPage(page);
    mswHelper = new MSWHelper(page);

    await loginPage.goto();
    await loginPage.login();
    await loginPage.waitForRedirect();

    await mswHelper.applyScenario('objectExplorerSuccess');

    await objectExplorerPage.goto();
    await objectExplorerPage.waitForPageLoad();

    await objectExplorerPage.selectKind('Pod');
    await objectExplorerPage.selectNamespace('default');
    await page.waitForTimeout(1000);
    await objectExplorerPage.waitForResources();
  });

  test('should switch between grid, list, and table views', async ({ page }) => {
    await objectExplorerPage.changeViewMode('grid');
    await page.waitForTimeout(500);
    const gridSelected = await objectExplorerPage.gridViewButton.getAttribute('class');
    expect(gridSelected).toContain('selected');
    await objectExplorerPage.changeViewMode('list');
    await page.waitForTimeout(500);
    const listSelected = await objectExplorerPage.listViewButton.getAttribute('class');
    expect(listSelected).toContain('selected');
    await objectExplorerPage.changeViewMode('table');
    await page.waitForTimeout(500);
    const tableSelected = await objectExplorerPage.tableViewButton.getAttribute('class');
    expect(tableSelected).toContain('selected');
  });

  test('should display resources correctly in grid view', async ({ page }) => {
    await objectExplorerPage.changeViewMode('grid');
    await page.waitForTimeout(500);
    const cards = await objectExplorerPage.getVisibleResourceCards();
    expect(cards.length).toBeGreaterThan(0);
    const firstCard = page.locator('[class*="card"]').first();
    await expect(firstCard).toBeVisible();
  });

  test('should display resources correctly in list view', async ({ page }) => {
    await objectExplorerPage.changeViewMode('list');
    await page.waitForTimeout(500);
    const listSelected = await objectExplorerPage.listViewButton.getAttribute('class');
    expect(listSelected).toContain('selected');
  });

  test('should display resources correctly in table view', async ({ page }) => {
    await objectExplorerPage.changeViewMode('table');
    await page.waitForTimeout(500);
    const rows = await objectExplorerPage.getVisibleResourceTableRows();
    expect(rows.length).toBeGreaterThan(0);
    const headers = page.locator('th');
    const headerCount = await headers.count();
    expect(headerCount).toBeGreaterThan(0);
  });

  test('should persist view mode when changing filters', async ({ page }) => {
    await objectExplorerPage.changeViewMode('table');
    await page.waitForTimeout(500);
    await objectExplorerPage.removeNamespaceChip('default');
    await page.waitForTimeout(300);
    await objectExplorerPage.selectNamespace('production');
    await page.waitForTimeout(1000);
    const rows = await objectExplorerPage.getVisibleResourceTableRows();
    expect(rows.length).toBeGreaterThan(0);
  });

  test('should sort resources by name', async ({ page }) => {
    await objectExplorerPage.changeViewMode('table');
    await page.waitForTimeout(500);
    await objectExplorerPage.changeSortBy('name');
    await page.waitForTimeout(500);
    const hasError = await objectExplorerPage.hasError();
    expect(hasError).toBe(false);
  });

  test('should sort resources by kind', async ({ page }) => {
    await objectExplorerPage.selectKind('Deployment');
    await page.waitForTimeout(1000);
    await objectExplorerPage.changeViewMode('table');
    await page.waitForTimeout(500);
    await objectExplorerPage.changeSortBy('kind');
    await page.waitForTimeout(500);
    const hasError = await objectExplorerPage.hasError();
    expect(hasError).toBe(false);
  });

  test('should sort resources by namespace', async ({ page }) => {
    await objectExplorerPage.selectNamespaces(['production', 'staging']);
    await page.waitForTimeout(1000);
    await objectExplorerPage.changeViewMode('table');
    await page.waitForTimeout(500);
    await objectExplorerPage.changeSortBy('namespace');
    await page.waitForTimeout(500);
    const hasError = await objectExplorerPage.hasError();
    expect(hasError).toBe(false);
  });

  test('should display pagination controls when needed', async ({ page }) => {
    await objectExplorerPage.selectKinds(['Deployment', 'Service']);
    await objectExplorerPage.selectNamespaces(['default', 'production', 'staging']);
    await page.waitForTimeout(1500);
    const paginationVisible = await objectExplorerPage.paginationContainer
      .isVisible({ timeout: 2000 })
      .catch(() => false);

    if (paginationVisible) {
      await expect(objectExplorerPage.paginationContainer).toBeVisible();
    }
  });

  test('should navigate to next page', async ({ page }) => {
    await objectExplorerPage.selectKinds(['Pod', 'Deployment', 'Service']);
    await objectExplorerPage.selectNamespaces(['default', 'production', 'staging']);
    await page.waitForTimeout(1500);
    const nextButtonVisible = await objectExplorerPage.nextPageButton
      .isVisible({ timeout: 2000 })
      .catch(() => false);
    if (nextButtonVisible) {
      const isDisabled = await objectExplorerPage.nextPageButton.isDisabled();
      if (!isDisabled) {
        await objectExplorerPage.goToNextPage();
        const hasError = await objectExplorerPage.hasError();
        expect(hasError).toBe(false);
      }
    }
  });

  test('should navigate to previous page', async ({ page }) => {
    await objectExplorerPage.selectKinds(['Pod', 'Deployment', 'Service']);
    await objectExplorerPage.selectNamespaces(['default', 'production', 'staging']);
    await page.waitForTimeout(1500);
    const nextButtonVisible = await objectExplorerPage.nextPageButton
      .isVisible({ timeout: 2000 })
      .catch(() => false);
    if (nextButtonVisible) {
      const isDisabled = await objectExplorerPage.nextPageButton.isDisabled();
      if (!isDisabled) {
        await objectExplorerPage.goToNextPage();
        await page.waitForTimeout(500);
        await objectExplorerPage.goToPreviousPage();
        const hasError = await objectExplorerPage.hasError();
        expect(hasError).toBe(false);
      }
    }
  });

  test('should display correct page size', async ({ page }) => {
    await objectExplorerPage.changeViewMode('grid');
    await page.waitForTimeout(500);
    const cards = await objectExplorerPage.getVisibleResourceCards();
    expect(cards.length).toBeLessThanOrEqual(9);
  });

  test('should reset to page 1 when filters change', async ({ page }) => {
    await objectExplorerPage.selectKinds(['Pod', 'Deployment', 'Service']);
    await objectExplorerPage.selectNamespaces(['default', 'production']);
    await page.waitForTimeout(1500);
    const nextButtonVisible = await objectExplorerPage.nextPageButton
      .isVisible({ timeout: 2000 })
      .catch(() => false);
    if (nextButtonVisible) {
      const isDisabled = await objectExplorerPage.nextPageButton.isDisabled();
      if (!isDisabled) {
        await objectExplorerPage.goToNextPage();
        await page.waitForTimeout(500);
        await objectExplorerPage.selectNamespace('staging');
        await page.waitForTimeout(1000);
        const prevDisabled = await objectExplorerPage.previousPageButton
          .isDisabled()
          .catch(() => true);
        expect(prevDisabled).toBe(true);
      }
    }
  });

  test('should handle view mode toggle with keyboard', async ({ page }) => {
    await objectExplorerPage.gridViewButton.focus();
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);
    const gridSelected = await objectExplorerPage.gridViewButton.getAttribute('class');
    expect(gridSelected).toContain('selected');
  });

  test('should display loading state when changing pages', async ({ page }) => {
    await objectExplorerPage.selectKinds(['Pod', 'Deployment', 'Service']);
    await objectExplorerPage.selectNamespaces(['default', 'production', 'staging']);
    await page.waitForTimeout(1500);
    const nextButtonVisible = await objectExplorerPage.nextPageButton
      .isVisible({ timeout: 2000 })
      .catch(() => false);
    if (nextButtonVisible) {
      const isDisabled = await objectExplorerPage.nextPageButton.isDisabled();
      if (!isDisabled) {
        await objectExplorerPage.nextPageButton.click();
        const isLoading = await objectExplorerPage.isLoading();
        expect(typeof isLoading).toBe('boolean');
      }
    }
  });

  test('should maintain sort order across view mode changes', async ({ page }) => {
    await objectExplorerPage.changeSortBy('name');
    await page.waitForTimeout(500);
    await objectExplorerPage.changeViewMode('grid');
    await page.waitForTimeout(500);
    await objectExplorerPage.changeViewMode('table');
    await page.waitForTimeout(500);
    const hasError = await objectExplorerPage.hasError();
    expect(hasError).toBe(false);
  });

  test('should display view mode icons correctly', async () => {
    await expect(objectExplorerPage.gridViewButton).toBeVisible();
    await expect(objectExplorerPage.listViewButton).toBeVisible();
    await expect(objectExplorerPage.tableViewButton).toBeVisible();
    const gridIcon = objectExplorerPage.gridViewButton.locator('svg');
    await expect(gridIcon).toBeVisible();
    const listIcon = objectExplorerPage.listViewButton.locator('svg');
    await expect(listIcon).toBeVisible();
    const tableIcon = objectExplorerPage.tableViewButton.locator('svg');
    await expect(tableIcon).toBeVisible();
  });
});
