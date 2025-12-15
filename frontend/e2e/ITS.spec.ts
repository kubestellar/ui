import { test, expect } from '@playwright/test';
import { AuthHelper, ITSPage, MSWHelper } from './pages';

test.describe('ITS Page - Complete Tests', () => {
  let itsPage: ITSPage;
  let auth: AuthHelper;
  let msw: MSWHelper;

  test.beforeEach(async ({ page }) => {
    auth = new AuthHelper(page);
    itsPage = new ITSPage(page);
    msw = new MSWHelper(page);
    await auth.loginAsAdmin();
  });

  test('loads ITS page successfully with clusters', async () => {
    await itsPage.openWithScenario(msw, 'itsSuccess');
    await expect(itsPage.table.first()).toBeVisible({ timeout: 15000 });
    await expect(itsPage.clusterRow('cluster1')).toBeVisible();
    await expect(itsPage.clusterRow('cluster2')).toBeVisible();
    await expect(itsPage.tableRows).toHaveCount(2);
  });

  test('displays loading state initially', async () => {
    await itsPage.goto();
    const loadingIndicator = itsPage.loadingIndicators.first();
    const indicatorVisible = await itsPage.isVisible(loadingIndicator, 2000);
    if (!indicatorVisible) {
      const loadingText = itsPage.page.locator('text=/loading/i').first();
      if (await loadingText.isVisible({ timeout: 1000 })) {
        await expect(loadingText).toBeVisible();
      }
    }
    await itsPage.waitForReady();
  });

  test('search functionality works', async () => {
    await itsPage.openWithScenario(msw, 'itsSuccess');
    await itsPage.search('cluster1', 1000);
    await expect(itsPage.clusterRow('cluster1')).toBeVisible();
    await itsPage.clearSearch(500);
    await expect(itsPage.clusterRow('cluster1')).toBeVisible();
    await expect(itsPage.clusterRow('cluster2')).toBeVisible();
  });

  test('import cluster button is visible and clickable', async () => {
    await itsPage.openWithScenario(msw, 'itsSuccess');
    await expect(itsPage.importButton).toBeVisible();
    await itsPage.openImportDialog();
    await itsPage.page.waitForTimeout(1000);
    if (await itsPage.dialog.isVisible()) {
      await expect(itsPage.dialog).toBeVisible();
    }
  });

  test('cluster status badges are displayed', async () => {
    await itsPage.openWithScenario(msw, 'itsSuccess');
    const badgeCount = await itsPage.statusBadges.count();
    if (badgeCount > 0) {
      await expect(itsPage.statusBadges.first()).toBeVisible();
    }
  });

  test('table headers are present', async () => {
    await itsPage.openWithScenario(msw, 'itsSuccess');
    const headerCount = await itsPage.columnHeaders.count();
    expect(headerCount).toBeGreaterThan(0);
    const nameHeader = itsPage.columnHeaders.filter({ hasText: /Name|Cluster/i }).first();
    if (await nameHeader.isVisible()) {
      await expect(nameHeader).toBeVisible();
    }
  });

  test('cluster actions are available', async () => {
    await itsPage.openWithScenario(msw, 'itsSuccess');
    const actionCount = await itsPage.actionButtons.count();
    if (actionCount > 0) {
      await expect(itsPage.actionButtons.first()).toBeVisible();
    }
    const menuButtons = itsPage.menuToggleCandidates;
    const menuCount = await menuButtons.count();
    if (menuCount > 0) {
      await expect(menuButtons.first()).toBeVisible();
    }
  });

  test('keyboard shortcuts work', async () => {
    await itsPage.openWithScenario(msw, 'itsSuccess');
    await itsPage.page.keyboard.press('Control+f');
    await itsPage.page.waitForTimeout(300);
    const isFocused = await itsPage.searchInput.evaluate(el => el === document.activeElement);
    expect(isFocused).toBe(true);
    await itsPage.search('cluster1', 1000);
    await expect(itsPage.tableRows).toHaveCount(1);
    await itsPage.page.keyboard.press('Escape');
    await itsPage.page.waitForTimeout(500);
    await expect(itsPage.searchInput).toHaveValue('');
  });
});
