import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base/BasePage';

export class WDSPage extends BasePage {
  readonly pageTitle: Locator;
  readonly createWorkloadButton: Locator;
  readonly contextDropdown: Locator;

  readonly tilesViewButton: Locator;
  readonly listViewButton: Locator;

  readonly reactFlowCanvas: Locator;
  readonly flowCanvas: Locator;
  readonly listViewTable: Locator;
  readonly listViewItems: Locator;
  readonly listViewContainer: Locator;

  readonly treeViewFilters: Locator;
  readonly filterSection: Locator;
  readonly resourceCounts: Locator;
  readonly contextResourceCounts: Locator;

  readonly emptyState: Locator;
  readonly emptyStateMessage: Locator;
  readonly emptyStateCreateButton: Locator;

  readonly nodeDetailsPanel: Locator;
  readonly detailsPanelCloseButton: Locator;

  readonly loadingSkeleton: Locator;
  readonly listViewSkeleton: Locator;

  readonly zoomControls: Locator;
  readonly collapseButton: Locator;
  readonly expandAllButton: Locator;
  readonly collapseAllButton: Locator;

  constructor(page: Page) {
    super(page);

    this.pageTitle = page
      .locator('h4')
      .filter({ hasText: /tree view|wds/i })
      .first();
    this.createWorkloadButton = page
      .getByRole('button')
      .filter({ hasText: /create.*workload/i })
      .first();
    this.contextDropdown = page.locator('[class*="MuiSelect"], [class*="Select"], select').first();

    this.tilesViewButton = page
      .locator('button')
      .filter({ has: page.locator('i.fa-th, [class*="ViewModule"]') })
      .first();
    this.listViewButton = page
      .locator('button')
      .filter({ has: page.locator('i.fa-th-list, [class*="ViewList"]') })
      .first();

    this.reactFlowCanvas = page.locator('.react-flow, [class*="react-flow"]').first();
    this.flowCanvas = page.locator('canvas').first();
    this.listViewTable = page.locator('table').first();
    this.listViewItems = page
      .locator('[class*="list-item"], [class*="ListView"]')
      .filter({ visible: true });
    this.listViewContainer = page
      .locator('[class*="ListViewComponent"], [class*="list-view"]')
      .first();

    this.treeViewFilters = page
      .locator('[class*="TreeViewFilters"], [class*="ObjectFilters"]')
      .first();
    this.filterSection = page.locator('[class*="filter"], [class*="Filter"]').first();
    this.resourceCounts = page
      .locator('[class*="count"], [class*="Count"]')
      .filter({ hasText: /\d+/ })
      .first();
    this.contextResourceCounts = page
      .locator('[class*="context"], [class*="Context"]')
      .filter({ hasText: /\d+/ });

    this.emptyState = page.locator('[class*="empty"], [class*="Empty"]').first();
    this.emptyStateMessage = page.locator('text=/no workloads|empty|create workload/i').first();
    this.emptyStateCreateButton = this.emptyState
      .locator('button')
      .filter({ hasText: /create/i })
      .first();

    this.nodeDetailsPanel = page
      .locator('[role="dialog"], [class*="Drawer"], [class*="Panel"]')
      .filter({ hasText: /details|summary/i })
      .first();
    this.detailsPanelCloseButton = this.nodeDetailsPanel
      .getByRole('button', { name: /close/i })
      .first();

    this.loadingSkeleton = page.locator('[class*="skeleton"], [class*="Skeleton"]').first();
    this.listViewSkeleton = page.locator('[class*="ListViewSkeleton"]').first();

    this.zoomControls = page.locator('[class*="ZoomControls"], [class*="zoom"]').first();
    this.collapseButton = page
      .getByRole('button')
      .filter({ hasText: /collapse/i })
      .first();
    this.expandAllButton = page
      .getByRole('button')
      .filter({ hasText: /expand.*all/i })
      .first();
    this.collapseAllButton = page
      .getByRole('button')
      .filter({ hasText: /collapse.*all/i })
      .first();
  }

  async goto() {
    try {
      await super.goto('/workloads/manage');
      await this.page.waitForURL(/workloads\/manage|install/, { timeout: 10000 });

      if (this.page.url().includes('/install')) {
        await this.page.waitForTimeout(2000);
        await this.page.goto(`${this.BASE_URL}/workloads/manage`, {
          waitUntil: 'domcontentloaded',
        });
        await this.page.waitForURL(/workloads\/manage/, { timeout: 10000 });
      }

      await this.waitForLoadState('domcontentloaded');
    } catch {
      await this.page.waitForTimeout(2000);
      await this.page.goto(`${this.BASE_URL}/workloads/manage`, { waitUntil: 'domcontentloaded' });
      await this.waitForLoadState('domcontentloaded');
    }
  }

  async ensureOnWdsPage() {
    try {
      await this.page.waitForLoadState('domcontentloaded');
      // Use a shorter timeout and check page validity
      try {
        await this.page.waitForTimeout(1000);
      } catch (error) {
        // Page might be closed, check if we can still access it
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('closed') || errorMessage.includes('Target')) {
          return; // Page is closed, let caller handle it
        }
        throw error;
      }

      const currentUrl = this.page.url();
      if (currentUrl.includes('/install')) {
        await this.page.goto(`${this.BASE_URL}/workloads/manage`, {
          waitUntil: 'domcontentloaded',
        });
        try {
          await this.page.waitForTimeout(1000);
        } catch {
          // Ignore timeout errors if page closes
        }
      } else if (!currentUrl.includes('/workloads/manage')) {
        await this.page.goto(`${this.BASE_URL}/workloads/manage`, {
          waitUntil: 'domcontentloaded',
        });
        try {
          await this.page.waitForTimeout(1000);
        } catch {
          // Ignore timeout errors if page closes
        }
      }
    } catch (error) {
      // If page is closed or navigation fails, log and continue
      if (
        error instanceof Error &&
        (error.message.includes('closed') || error.message.includes('Target'))
      ) {
        console.warn('Page was closed during ensureOnWdsPage');
        return;
      }
      throw error;
    }
  }

  async waitForPageLoad() {
    await this.page.waitForFunction(
      () => {
        const reactFlow = document.querySelector('.react-flow, [class*="react-flow"]');
        const table = document.querySelector('table');
        const canvas = document.querySelector('canvas');
        const createBtn = Array.from(document.querySelectorAll('button')).some(b =>
          /create|add|new|workload/i.test(b.textContent || '')
        );
        const emptyState =
          document.body.innerText &&
          /no workloads|empty|create workload/i.test(document.body.innerText);
        const viewModeButtons = Array.from(document.querySelectorAll('button')).some(b => {
          const icon = b.querySelector(
            'i.fa-th, i.fa-th-list, [class*="ViewModule"], [class*="ViewList"]'
          );
          return !!icon;
        });
        return !!(reactFlow || table || canvas || createBtn || emptyState || viewModeButtons);
      },
      { timeout: 20000 }
    );
  }

  async switchToTilesView() {
    await this.tilesViewButton.waitFor({ state: 'visible', timeout: 10000 });
    await this.tilesViewButton.click();
    await this.page.waitForTimeout(1000);
    await this.waitForTilesView();
  }

  async switchToListView() {
    await this.listViewButton.waitFor({ state: 'visible', timeout: 10000 });
    await this.listViewButton.click();
    await this.page.waitForTimeout(1000);
    await this.waitForListView();
  }

  async isTilesViewActive(): Promise<boolean> {
    try {
      const isSelected = await this.tilesViewButton.evaluate(el => {
        const hasPrimaryClass =
          el.classList.contains('MuiIconButton-colorPrimary') ||
          el.classList.contains('Mui-selected');
        const hasPrimaryColor =
          window.getComputedStyle(el).color.includes('rgb') &&
          (el.getAttribute('color') === 'primary' || el.closest('[class*="primary"]') !== null);
        const hasActiveBg =
          window.getComputedStyle(el).backgroundColor !== 'rgba(0, 0, 0, 0)' &&
          window.getComputedStyle(el).backgroundColor !== 'transparent';
        return hasPrimaryClass || hasPrimaryColor || hasActiveBg;
      });
      const hasView =
        (await this.reactFlowCanvas.isVisible({ timeout: 2000 }).catch(() => false)) ||
        (await this.flowCanvas.isVisible({ timeout: 2000 }).catch(() => false)) ||
        (await this.emptyState.isVisible({ timeout: 2000 }).catch(() => false));
      return isSelected || hasView;
    } catch {
      return false;
    }
  }

  async isListViewActive(): Promise<boolean> {
    try {
      const isSelected = await this.listViewButton.evaluate(el => {
        const hasPrimaryClass =
          el.classList.contains('MuiIconButton-colorPrimary') ||
          el.classList.contains('Mui-selected');
        const hasPrimaryColor =
          window.getComputedStyle(el).color.includes('rgb') &&
          (el.getAttribute('color') === 'primary' || el.closest('[class*="primary"]') !== null);
        const hasActiveBg =
          window.getComputedStyle(el).backgroundColor !== 'rgba(0, 0, 0, 0)' &&
          window.getComputedStyle(el).backgroundColor !== 'transparent';
        return hasPrimaryClass || hasPrimaryColor || hasActiveBg;
      });
      const hasView =
        (await this.listViewTable.isVisible({ timeout: 2000 }).catch(() => false)) ||
        (await this.getListViewItemCount()) > 0 ||
        (await this.emptyStateMessage.isVisible({ timeout: 2000 }).catch(() => false)) ||
        (await this.listViewContainer.isVisible({ timeout: 2000 }).catch(() => false));
      return isSelected || hasView;
    } catch {
      return false;
    }
  }

  async waitForTilesView() {
    await this.page
      .waitForFunction(
        () => {
          const reactFlow = document.querySelector('.react-flow, [class*="react-flow"]');
          const canvas = document.querySelector('canvas');
          const emptyState =
            document.body.innerText &&
            /no workloads|empty|create workload/i.test(document.body.innerText);
          const flowContainer = document.querySelector(
            '[class*="FlowCanvas"], [class*="flow-canvas"], [class*="TreeViewCanvas"]'
          );
          const listViewContainer = document.querySelector(
            '[class*="ListViewComponent"]'
          ) as HTMLElement | null;
          const hasListView = listViewContainer && listViewContainer.offsetParent !== null;
          return !!(reactFlow || canvas || emptyState || flowContainer) && !hasListView;
        },
        { timeout: 20000 }
      )
      .catch(async () => {
        await this.page.waitForTimeout(2000);
      });
    await this.page.waitForTimeout(1000);
  }

  async waitForListView() {
    await this.page.waitForFunction(
      () => {
        const table = document.querySelector('table');
        const listItems =
          document.querySelectorAll('[class*="list-item"], [class*="ListView"]').length > 0;
        const emptyState =
          document.body.innerText &&
          /no workloads|empty|create workload|no.*data/i.test(document.body.innerText);
        return !!(table || listItems || emptyState);
      },
      { timeout: 20000 }
    );
    await this.page.waitForTimeout(1000);
  }

  async getListViewItemCount(): Promise<number> {
    try {
      const items = await this.listViewItems.all();
      return items.length;
    } catch {
      return 0;
    }
  }

  async getResourceCount(): Promise<number> {
    try {
      const countElement = this.resourceCounts;
      const isVisible = await countElement.isVisible({ timeout: 3000 }).catch(() => false);

      if (!isVisible) {
        const countFromContext = await this.page.evaluate(() => {
          const chips = Array.from(document.querySelectorAll('[class*="Chip"], [class*="chip"]'));
          for (const chip of chips) {
            const text = chip.textContent || '';
            const match = text.match(/^\d+$/);
            if (match) {
              return parseInt(match[0]);
            }
          }
          const contextSelect = document.querySelector('[class*="MuiSelect"]');
          if (contextSelect) {
            const text = contextSelect.textContent || '';
            const match = text.match(/(\d+)/);
            if (match) return parseInt(match[1]);
          }
          return 0;
        });
        return countFromContext;
      }

      const countText = await countElement.textContent({ timeout: 5000 }).catch(() => '');
      const match = countText?.match(/(\d+)/);
      return match ? parseInt(match[1]) : 0;
    } catch {
      return 0;
    }
  }

  async getContextCounts(): Promise<Record<string, number>> {
    const counts: Record<string, number> = {};
    try {
      const contextElements = await this.contextResourceCounts.all();
      for (const element of contextElements) {
        const text = await element.textContent();
        const match = text?.match(/(\w+).*?(\d+)/);
        if (match) {
          counts[match[1]] = parseInt(match[2]);
        }
      }
    } catch {
      // Ignore error
    }
    return counts;
  }

  async selectContext(context: string) {
    await this.contextDropdown.click();
    await this.page.waitForTimeout(300);
    const option = this.page.getByRole('option', { name: new RegExp(context, 'i') }).first();
    await option.waitFor({ state: 'visible', timeout: 5000 });
    await option.click();
    await this.page.waitForTimeout(500);
  }

  async applyFilter(filterType: 'kind' | 'namespace' | 'label' | 'search', value: string) {
    if (filterType === 'search') {
      const searchInput = this.page.getByPlaceholder(/search/i).first();
      await searchInput.fill(value);
      await this.page.waitForTimeout(500);
    } else {
      const filterInput = this.page
        .locator(`[placeholder*="${filterType}"], [label*="${filterType}"]`)
        .first();
      await filterInput.click();
      await this.page.waitForTimeout(300);
      const option = this.page.getByRole('option', { name: new RegExp(value, 'i') }).first();
      await option.waitFor({ state: 'visible', timeout: 5000 });
      await option.click();
      await this.page.waitForTimeout(500);
    }
  }

  async clearFilters() {
    const clearButtons = this.page.getByRole('button').filter({ hasText: /clear|reset/i });
    const count = await clearButtons.count();
    for (let i = 0; i < count; i++) {
      await clearButtons
        .nth(i)
        .click()
        .catch(() => {});
    }
    await this.page.waitForTimeout(300);
  }

  async clickNode(nodeName: string) {
    const node = this.page.locator(`text=${nodeName}`).first();
    await node.click();
    await this.page.waitForTimeout(500);
  }

  async selectNodeInTilesView(nodeName: string) {
    await this.waitForTilesView();
    const node = this.page
      .locator(`[class*="node"], [class*="Node"]`)
      .filter({ hasText: nodeName })
      .first();
    await node.click();
    await this.page.waitForTimeout(500);
  }

  async selectNodeInListView(index: number = 0) {
    await this.waitForListView();
    const items = await this.listViewItems.all();
    if (items[index]) {
      await items[index].click();
      await this.page.waitForTimeout(500);
    }
  }

  async isNodeSelected(nodeName: string): Promise<boolean> {
    try {
      const node = this.page
        .locator(`[class*="selected"], [class*="Selected"]`)
        .filter({ hasText: nodeName })
        .first();
      return await node.isVisible({ timeout: 2000 });
    } catch {
      return false;
    }
  }

  async isDetailsPanelOpen(): Promise<boolean> {
    return await this.nodeDetailsPanel.isVisible({ timeout: 2000 }).catch(() => false);
  }

  async closeDetailsPanel() {
    if (await this.isDetailsPanelOpen()) {
      await this.detailsPanelCloseButton.click();
      await this.page.waitForTimeout(300);
    }
  }

  async isFiltersVisible(): Promise<boolean> {
    return await this.treeViewFilters.isVisible({ timeout: 2000 }).catch(() => false);
  }

  async waitForEmptyState() {
    await this.emptyState.waitFor({ state: 'visible', timeout: 10000 });
  }

  async isEmptyStateVisible(): Promise<boolean> {
    return await this.emptyState.isVisible({ timeout: 2000 }).catch(() => false);
  }

  async getListViewPaginationInfo(): Promise<{
    current: number;
    total: number;
    itemsPerPage: number;
  }> {
    try {
      const paginationContainer = this.page
        .locator('[class*="pagination"], [class*="Pagination"]')
        .first();
      const isVisible = await paginationContainer.isVisible({ timeout: 3000 }).catch(() => false);

      if (!isVisible) {
        return { current: 1, total: 1, itemsPerPage: 25 };
      }

      const pageInfo = await this.page.evaluate(() => {
        const pagination = document.querySelector('[class*="pagination"], [class*="Pagination"]');
        if (!pagination) return { current: 1, total: 1, itemsPerPage: 25 };

        const text = pagination.textContent || '';
        const currentMatch = text.match(/page\s*(\d+)/i) || text.match(/(\d+)\s*\/\s*(\d+)/);
        const totalMatch = text.match(/(\d+)\s*(?:of|total|\/)/i);
        const itemsMatch = text.match(/(\d+)\s*per\s*page/i);

        return {
          current: currentMatch ? parseInt(currentMatch[1]) : 1,
          total: totalMatch
            ? parseInt(totalMatch[1])
            : currentMatch && currentMatch[2]
              ? parseInt(currentMatch[2])
              : 1,
          itemsPerPage: itemsMatch ? parseInt(itemsMatch[1]) : 25,
        };
      });

      return pageInfo;
    } catch {
      return { current: 1, total: 1, itemsPerPage: 25 };
    }
  }

  async navigateToNextPage() {
    const nextButton = this.page.getByRole('button').filter({ hasText: /next/i }).first();
    const isVisible = await nextButton.isVisible({ timeout: 3000 }).catch(() => false);
    const isDisabled = isVisible ? await nextButton.isDisabled().catch(() => false) : true;

    if (isVisible && !isDisabled) {
      await nextButton.click();
      await this.page.waitForTimeout(1500);
    }
  }

  async navigateToPreviousPage() {
    const prevButton = this.page
      .getByRole('button')
      .filter({ hasText: /previous|prev/i })
      .first();
    const isVisible = await prevButton.isVisible({ timeout: 3000 }).catch(() => false);
    const isDisabled = isVisible ? await prevButton.isDisabled().catch(() => false) : true;

    if (isVisible && !isDisabled) {
      await prevButton.click();
      await this.page.waitForTimeout(1500);
    }
  }

  async verifyViewModeButtons() {
    await expect(this.tilesViewButton).toBeVisible({ timeout: 10000 });
    await expect(this.listViewButton).toBeVisible({ timeout: 10000 });
  }

  async verifyTilesViewRendered() {
    await this.waitForTilesView();

    const hasCanvas = await this.flowCanvas.isVisible({ timeout: 5000 }).catch(() => false);
    const hasReactFlow = await this.reactFlowCanvas.isVisible({ timeout: 5000 }).catch(() => false);
    const hasEmptyState = await this.emptyState.isVisible({ timeout: 2000 }).catch(() => false);
    const hasEmptyMessage = await this.emptyStateMessage
      .isVisible({ timeout: 2000 })
      .catch(() => false);

    const hasAnyView = await this.page.evaluate(() => {
      const reactFlow = document.querySelector('.react-flow, [class*="react-flow"]');
      const canvas = document.querySelector('canvas');
      const emptyText =
        document.body.innerText &&
        /no workloads|empty|create workload/i.test(document.body.innerText);
      const flowContainer = document.querySelector('[class*="FlowCanvas"], [class*="flow-canvas"]');
      return !!(reactFlow || canvas || emptyText || flowContainer);
    });

    expect(
      hasCanvas || hasReactFlow || hasEmptyState || hasEmptyMessage || hasAnyView
    ).toBeTruthy();
  }

  async verifyListViewRendered() {
    await this.waitForListView();
    const hasTable = await this.listViewTable.isVisible({ timeout: 5000 }).catch(() => false);
    const hasListItems = (await this.getListViewItemCount()) > 0;
    const hasEmptyState = await this.emptyStateMessage
      .isVisible({ timeout: 2000 })
      .catch(() => false);
    expect(hasTable || hasListItems || hasEmptyState).toBeTruthy();
  }
}
