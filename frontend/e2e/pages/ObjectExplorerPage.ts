import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base/BasePage';

export class ObjectExplorerPage extends BasePage {
  readonly pageTitle: Locator;
  readonly pageDescription: Locator;
  readonly refreshButton: Locator;
  readonly filterToggleButton: Locator;
  readonly autoRefreshSwitch: Locator;

  readonly gridViewButton: Locator;
  readonly listViewButton: Locator;
  readonly tableViewButton: Locator;

  readonly filterSection: Locator;
  readonly kindAutocomplete: Locator;
  readonly kindInput: Locator;
  readonly namespaceSelect: Locator;
  readonly quickSearchInput: Locator;
  readonly quickSearchClearButton: Locator;

  readonly resultsSection: Locator;
  readonly resultsHeader: Locator;
  readonly resultsCount: Locator;
  readonly sortBySelect: Locator;

  readonly resourceCards: Locator;
  readonly resourceListItems: Locator;
  readonly resourceTableRows: Locator;

  readonly paginationContainer: Locator;
  readonly previousPageButton: Locator;
  readonly nextPageButton: Locator;
  readonly pageNumbers: Locator;

  readonly bulkActionsBar: Locator;
  readonly clearSelectionButton: Locator;
  readonly bulkViewButton: Locator;
  readonly bulkExportButton: Locator;

  readonly detailsPanel: Locator;
  readonly detailsPanelCloseButton: Locator;

  readonly errorAlert: Locator;
  readonly loadingSpinner: Locator;

  readonly summaryTab: Locator;
  readonly editTab: Locator;
  readonly logsTab: Locator;
  readonly yamlEditor: Locator;
  readonly logsContainer: Locator;

  constructor(page: Page) {
    super(page);
    this.pageTitle = page
      .locator('h1, h4')
      .filter({ hasText: /resources|object/i })
      .first();
    this.pageDescription = page.locator('text=/explore.*resources|filter.*objects/i').first();
    this.refreshButton = page.getByRole('button', { name: /refresh/i });
    this.filterToggleButton = page
      .getByRole('button')
      .filter({ has: page.locator('[data-testid="TuneIcon"]') })
      .first();
    this.autoRefreshSwitch = page.getByRole('checkbox', { name: /auto.*refresh/i });
    this.gridViewButton = page.locator('[value="grid"]').first();
    this.listViewButton = page.locator('[value="list"]').first();
    this.tableViewButton = page.locator('[value="table"]').first();
    this.filterSection = page
      .locator('div')
      .filter({ hasText: /object selection|filters/i })
      .first();
    this.kindAutocomplete = page.locator('[role="combobox"]').first();
    this.kindInput = page.locator('input[role="combobox"]').first();
    this.namespaceSelect = page.getByRole('combobox', { name: 'Select Namespace' });
    this.quickSearchInput = page.getByRole('textbox', { name: 'Quick search objects...' });
    this.quickSearchClearButton = this.quickSearchInput.locator('..').getByRole('button').last();
    this.resultsSection = page.locator('[class*="results"]').first();
    this.resultsHeader = page.locator('text=/results/i').first();
    this.resultsCount = page
      .locator('.MuiChip-root')
      .filter({ hasText: /\d+\s*object/i })
      .first();
    this.sortBySelect = page
      .locator('select, [role="combobox"]')
      .filter({ hasText: /name|kind|namespace/i })
      .first();
    this.resourceCards = page
      .locator('.MuiGrid-item .MuiCard-root, .MuiGrid-item .MuiPaper-root')
      .filter({ visible: true });
    this.resourceListItems = page
      .locator('[class*="list-item"]')
      .filter({ has: page.locator('text=/pod|deployment|service/i') });
    this.resourceTableRows = page.locator('tbody tr');
    this.paginationContainer = page.locator('[class*="pagination"]').first();
    this.previousPageButton = page.getByRole('button', { name: /previous|prev/i });
    this.nextPageButton = page.getByRole('button', { name: /next/i });
    this.pageNumbers = page.locator('[class*="page"]').filter({ hasText: /^\d+$/ });
    this.bulkActionsBar = page
      .locator('.MuiPaper-root')
      .filter({ hasText: /selected|bulk/i })
      .first();
    this.clearSelectionButton = page.getByRole('button', { name: /clear.*selection/i });
    this.bulkViewButton = page.getByRole('button', { name: /view.*details/i });
    this.bulkExportButton = page.getByRole('button', { name: /export/i });
    this.errorAlert = page.locator('[role="alert"]').filter({ hasText: /error|failed/i });
    this.loadingSpinner = page.locator('[class*="loading"], [class*="spinner"]').first();
    this.detailsPanel = page.locator('[role="dialog"], .MuiDrawer-root, .details-panel').first();
    this.detailsPanelCloseButton = this.detailsPanel.getByRole('button', { name: /close/i });
    this.summaryTab = page
      .locator('[role="tab"]')
      .filter({ hasText: /summary/i })
      .first();
    this.editTab = page.locator('[role="tab"]').filter({ hasText: /edit/i }).first();
    this.logsTab = page.locator('[role="tab"]').filter({ hasText: /logs/i }).first();
    this.yamlEditor = page.locator('.monaco-editor, textarea, pre').first();
    this.logsContainer = page.locator('.xterm, .terminal, textarea, pre').first();
  }

  async goto() {
    try {
      await super.goto('/resources');
      await this.waitForLoadState();
    } catch (error) {
      console.warn('Navigation timeout, retrying...', error);
      await this.page.goto(`${this.BASE_URL}/resources`, { timeout: 60000 });
      await this.waitForLoadState();
    }
  }

  async waitForPageLoad() {
    await this.pageTitle.waitFor({ state: 'visible', timeout: 10000 });
    await this.kindInput.waitFor({ state: 'visible', timeout: 5000 });
  }

  async closeModals() {
    await this.page.keyboard.press('Escape');
    await this.page.waitForTimeout(300);
    const backdrop = this.page.locator('.MuiBackdrop-root').first();
    if (await backdrop.isVisible().catch(() => false)) {
      await backdrop.click();
      await this.page.waitForTimeout(300);
    }
  }

  async selectKind(kind: string) {
    await this.closeModals();
    await this.kindInput.click();
    await this.page.waitForTimeout(500);
    await this.kindInput.fill(kind);
    await this.page.waitForTimeout(500);
    const listbox = this.page.locator('[role="listbox"]');
    await listbox.waitFor({ state: 'visible', timeout: 3000 });
    await this.page.waitForTimeout(300);
    const option = this.page
      .getByRole('option')
      .filter({ hasText: new RegExp(kind, 'i') })
      .first();
    await option.waitFor({ state: 'visible', timeout: 3000 });
    await option.click();
    await this.page.waitForTimeout(1500);
  }

  async selectKinds(kinds: string[]) {
    for (const kind of kinds) {
      await this.selectKind(kind);
    }
  }

  async selectNamespace(namespace: string) {
    await this.closeModals();
    await this.namespaceSelect.click();
    await this.page.waitForTimeout(500);
    const menu = this.page.locator('[role="listbox"], [role="menu"]');
    await menu.waitFor({ state: 'visible', timeout: 3000 }).catch(() => {});
    const escapedNamespace = namespace.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const option = this.page
      .locator('[role="option"], li')
      .filter({ hasText: new RegExp(`^${escapedNamespace}$`, 'i') })
      .first();
    await option.waitFor({ state: 'visible', timeout: 5000 });
    await option.click();
    await this.page.waitForTimeout(500);
    await this.page.keyboard.press('Escape');
    await this.page.waitForTimeout(1000);
  }

  async selectNamespaces(namespaces: string[]) {
    await this.closeModals();
    if (this.page.isClosed()) return;
    const menu = this.page.locator('[role="listbox"], [role="menu"]');
    for (const namespace of namespaces) {
      try {
        if (this.page.isClosed()) break;

        const isMenuVisible = await menu.isVisible().catch(() => false);
        if (!isMenuVisible) {
          await this.namespaceSelect.click();
          await this.page.waitForTimeout(300);
          await menu.waitFor({ state: 'visible', timeout: 3000 }).catch(() => {});
        }

        const escapedNamespace = namespace.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&');
        const option = this.page
          .locator('[role="option"], li')
          .filter({ hasText: new RegExp(`^${escapedNamespace}$`, 'i') })
          .first();
        await option.waitFor({ state: 'visible', timeout: 5000 });
        await option.click();
        await this.page.waitForTimeout(200);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (message.includes('Target page, context or browser has been closed')) {
          break;
        }
        console.warn(`Failed to select namespace ${namespace}:`, error);
      }
    }
    if (!this.page.isClosed()) {
      try {
        await this.page.keyboard.press('Escape');
        await this.page.waitForTimeout(1000);
      } catch {
        // ignore errors if page is closing
      }
    }
  }

  async removeKindChip(kind: string) {
    const kindChip = this.page
      .locator('.MuiAutocomplete-root')
      .locator('.MuiChip-root')
      .filter({ hasText: kind })
      .first();
    if (await kindChip.isVisible().catch(() => false)) {
      const deleteButton = kindChip
        .locator('.MuiChip-deleteIcon, [data-testid="CancelIcon"]')
        .first();
      await deleteButton.waitFor({ state: 'visible', timeout: 5000 });
      await deleteButton.click();
    } else {
      const generalChip = this.page.locator('.MuiChip-root').filter({ hasText: kind }).first();
      const deleteButton = generalChip
        .locator('.MuiChip-deleteIcon, [data-testid="CancelIcon"]')
        .first();
      await deleteButton.waitFor({ state: 'visible', timeout: 5000 });
      await deleteButton.click();
    }
    await this.page.waitForTimeout(500);
  }

  async removeNamespaceChip(namespace: string) {
    const namespaceChip = this.page
      .locator('.MuiSelect-root')
      .locator('.MuiChip-root')
      .filter({ hasText: namespace })
      .first();
    if (await namespaceChip.isVisible().catch(() => false)) {
      const deleteButton = namespaceChip
        .locator('.MuiChip-deleteIcon, [data-testid="CancelIcon"]')
        .first();
      await deleteButton.waitFor({ state: 'visible', timeout: 5000 });
      await deleteButton.click();
    } else {
      const generalChip = this.page.locator('.MuiChip-root').filter({ hasText: namespace }).first();
      const deleteButton = generalChip
        .locator('.MuiChip-deleteIcon, [data-testid="CancelIcon"]')
        .first();
      await deleteButton.waitFor({ state: 'visible', timeout: 5000 });
      await deleteButton.click();
    }
    await this.page.waitForTimeout(500);
  }

  async quickSearch(query: string) {
    await this.quickSearchInput.fill(query);
    await this.page.waitForTimeout(500);
  }

  async clearQuickSearch() {
    if (await this.quickSearchClearButton.isVisible()) {
      await this.quickSearchClearButton.click();
    } else {
      await this.quickSearchInput.clear();
    }
    await this.page.waitForTimeout(300);
  }

  async toggleFilters() {
    await this.filterToggleButton.click();
    await this.page.waitForTimeout(300);
  }

  async changeViewMode(mode: 'grid' | 'list' | 'table') {
    const button =
      mode === 'grid'
        ? this.gridViewButton
        : mode === 'list'
          ? this.listViewButton
          : this.tableViewButton;
    await button.waitFor({ state: 'visible', timeout: 10000 });
    await button.click();
    await this.page.waitForTimeout(500);
  }

  async refresh() {
    await this.refreshButton.click();
    await this.page.waitForTimeout(1000);
  }

  async toggleAutoRefresh() {
    await this.autoRefreshSwitch.click();
    await this.page.waitForTimeout(300);
  }

  async waitForResources(timeout: number = 10000) {
    await Promise.race([
      this.resultsCount.waitFor({ state: 'visible', timeout }),
      this.page.waitForTimeout(timeout),
    ]).catch(() => {});
    await this.page.waitForTimeout(1000);
  }

  async getResourceCount(): Promise<number> {
    await this.waitForResources(15000);
    try {
      const text = await this.resultsCount.textContent({ timeout: 5000 });
      const match = text?.match(/(\d+)/);
      return match ? parseInt(match[1]) : 0;
    } catch {
      return 0;
    }
  }

  async getVisibleResourceCards() {
    await this.waitForResources(15000);
    try {
      return await this.resourceCards.all();
    } catch {
      return [];
    }
  }

  async getVisibleResourceListItems() {
    return await this.resourceListItems.all();
  }

  async getVisibleResourceTableRows() {
    return await this.resourceTableRows.all();
  }

  async clickResourceByName(name: string) {
    const resource = this.page.locator('text=' + name).first();
    await resource.click();
    await this.page.waitForTimeout(500);
  }

  async selectResourceCheckbox(index: number) {
    await this.waitForResources();
    const cards = this.resourceCards;
    await cards.nth(index).click();
    await this.page.waitForTimeout(500);
  }

  async isBulkActionsVisible(): Promise<boolean> {
    return await this.bulkActionsBar.isVisible({ timeout: 2000 }).catch(() => false);
  }

  async clearBulkSelection() {
    await this.clearSelectionButton.click();
    await this.page.waitForTimeout(300);
  }

  async goToNextPage() {
    await this.nextPageButton.click();
    await this.page.waitForTimeout(1000);
  }

  async goToPreviousPage() {
    await this.previousPageButton.click();
    await this.page.waitForTimeout(1000);
  }

  async goToPage(pageNumber: number) {
    const pageButton = this.page.getByRole('button', { name: pageNumber.toString() });
    await pageButton.click();
    await this.page.waitForTimeout(1000);
  }

  async hasError(): Promise<boolean> {
    return await this.errorAlert.isVisible({ timeout: 2000 }).catch(() => false);
  }

  async openResourceDetails(index: number = 0) {
    const cards = this.resourceCards;
    await cards.nth(index).click();
    await this.page.waitForTimeout(1000);
    let detailsOpened = false;
    const detailsPanel = this.page
      .locator('[role="dialog"], .MuiDrawer-root, .details-panel, .MuiModal-root')
      .first();
    detailsOpened = await detailsPanel.isVisible().catch(() => false);
    if (!detailsOpened) {
      await cards.nth(index).dblclick();
      await this.page.waitForTimeout(1000);
      detailsOpened = await detailsPanel.isVisible().catch(() => false);
    }
    if (!detailsOpened) {
      const viewButton = cards
        .nth(index)
        .locator('button')
        .filter({
          has: this.page.locator('[data-testid="VisibilityIcon"], .fa-eye, [class*="eye"]'),
        })
        .first();
      if (await viewButton.isVisible().catch(() => false)) {
        await viewButton.click();
        await this.page.waitForTimeout(1000);
        detailsOpened = await detailsPanel.isVisible().catch(() => false);
      }
    }
    if (!detailsOpened) {
      const hasDetailsContent = await this.page
        .locator('text=/summary|edit|logs|yaml|overview/i')
        .first()
        .isVisible()
        .catch(() => false);
      const hasTabs = await this.page
        .locator('[role="tab"], .MuiTab-root')
        .first()
        .isVisible()
        .catch(() => false);
      detailsOpened = hasDetailsContent || hasTabs;
    }
    if (!detailsOpened) {
      console.warn('Resource details panel did not open - feature may not be implemented');
    }
  }

  async closeResourceDetails() {
    const closeButton = this.detailsPanelCloseButton;
    await closeButton.click();
    await this.page.waitForTimeout(500);
  }

  async switchToTab(tabName: 'summary' | 'edit' | 'logs') {
    const tab =
      tabName === 'summary' ? this.summaryTab : tabName === 'edit' ? this.editTab : this.logsTab;
    await tab.click();
    await this.page.waitForTimeout(1000);
  }

  async getYamlContent(): Promise<string> {
    await this.switchToTab('edit');
    return (await this.yamlEditor.textContent()) || '';
  }

  async getLogsContent(): Promise<string> {
    await this.switchToTab('logs');
    await this.page.waitForTimeout(2000);
    return (await this.logsContainer.textContent()) || '';
  }

  async monitorWebSocketConnections(): Promise<string[]> {
    const wsConnections: string[] = [];
    this.page.on('websocket', ws => {
      wsConnections.push(ws.url());
    });

    return wsConnections;
  }

  async monitorAPIRequests(): Promise<string[]> {
    const apiRequests: string[] = [];
    this.page.on('request', request => {
      const url = request.url();
      if (url.includes('/api/') || url.includes('/yaml') || url.includes('/logs')) {
        apiRequests.push(url);
      }
    });

    return apiRequests;
  }

  async getErrorMessage(): Promise<string | null> {
    if (await this.hasError()) {
      return await this.errorAlert.textContent();
    }
    return null;
  }

  async isLoading(): Promise<boolean> {
    return await this.loadingSpinner.isVisible({ timeout: 1000 }).catch(() => false);
  }

  async verifyPageElements() {
    await expect(this.pageTitle).toBeVisible();
    await expect(this.kindInput).toBeVisible();
    await expect(this.namespaceSelect).toBeVisible();
    await expect(this.quickSearchInput).toBeVisible();
  }

  async verifySelectedKinds(kinds: string[]) {
    for (const kind of kinds) {
      const kindChip = this.page
        .locator('.MuiAutocomplete-root')
        .locator('.MuiChip-root')
        .filter({ hasText: kind });
      await this.page.waitForTimeout(1000);
      if (!(await kindChip.isVisible().catch(() => false))) {
        const generalChip = this.page.locator('.MuiChip-root').filter({ hasText: kind });
        await expect(generalChip.first()).toBeVisible({ timeout: 10000 });
      } else {
        await expect(kindChip.first()).toBeVisible();
      }
    }
  }

  async verifySelectedNamespaces(namespaces: string[]) {
    for (const namespace of namespaces) {
      const namespaceChip = this.page
        .locator('.MuiSelect-root')
        .locator('.MuiChip-root')
        .filter({ hasText: namespace });
      await this.page.waitForTimeout(1000);
      if (!(await namespaceChip.isVisible().catch(() => false))) {
        const generalChip = this.page.locator('.MuiChip-root').filter({ hasText: namespace });
        await expect(generalChip.first()).toBeVisible({ timeout: 10000 });
      } else {
        await expect(namespaceChip.first()).toBeVisible();
      }
    }
  }

  async changeSortBy(sortBy: string) {
    await this.sortBySelect.click();
    await this.page.waitForTimeout(300);

    const option = this.page.locator('[role="option"]').filter({ hasText: sortBy }).first();
    await option.click();
    await this.page.waitForTimeout(500);
  }
}
