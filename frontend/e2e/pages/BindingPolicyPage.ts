import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base/BasePage';

/**
 * Binding Policy Page Object Model
 * Encapsulates all interactions with the binding policy page
 */
export class BindingPolicyPage extends BasePage {
  // Header elements
  readonly pageHeading: Locator;
  readonly createPolicyButton: Locator;
  readonly viewToggle: Locator;
  readonly searchInput: Locator;
  readonly filterButton: Locator;

  // Tabs
  readonly tableTab: Locator;
  readonly visualizationTab: Locator;

  // Table elements
  readonly table: Locator;
  readonly tableRows: Locator;
  readonly tableHeaders: Locator;
  readonly selectAllCheckbox: Locator;
  readonly policyCheckbox: (policyName: string) => Locator;

  // Pagination
  readonly paginationContainer: Locator;
  readonly nextPageButton: Locator;
  readonly prevPageButton: Locator;
  readonly pageInfo: Locator;

  // Action buttons
  readonly editButton: Locator;
  readonly deleteButton: Locator;
  readonly bulkDeleteButton: Locator;
  readonly refreshButton: Locator;

  // Create/Edit Dialog elements
  readonly createDialog: Locator;
  readonly dialogTitle: Locator;
  readonly policyNameInput: Locator;
  readonly selectionTab: Locator;
  readonly yamlTab: Locator;
  readonly uploadTab: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;
  readonly previewButton: Locator;

  // Visualization elements
  readonly canvas: Locator;
  readonly canvasContainer: Locator;
  readonly clusterNodes: Locator;
  readonly workloadNodes: Locator;
  readonly policyNodes: Locator;

  // Filter elements
  readonly statusFilter: Locator;
  readonly activeFilter: Locator;
  readonly inactiveFilter: Locator;
  readonly clearFiltersButton: Locator;

  // Empty state
  readonly emptyState: Locator;
  readonly emptyStateTitle: Locator;
  readonly emptyStateButton: Locator;

  // Toast/Snackbar
  readonly successToast: Locator;
  readonly errorToast: Locator;
  readonly toastMessage: Locator;

  // Delete confirmation dialog
  readonly deleteDialog: Locator;
  readonly confirmDeleteButton: Locator;
  readonly cancelDeleteButton: Locator;

  constructor(page: Page) {
    super(page);

    // Header elements - be flexible with heading text
    this.pageHeading = page.locator('h1, h2').first();
    // Create button - try multiple strategies to find it
    this.createPolicyButton = page
      .locator('button:has-text("Create"), button:has-text("create")')
      .first();
    this.viewToggle = page.locator('[role="tablist"]').first();
    this.searchInput = page.getByPlaceholder(/Search|Filter/i);
    this.filterButton = page.getByRole('button', { name: /Filter/i });

    // Tabs
    this.tableTab = page.getByRole('tab', { name: /Table|List/i });
    this.visualizationTab = page.getByRole('tab', { name: /Visualization|Visual|Canvas/i });

    // Table elements
    this.table = page.locator('table').first();
    this.tableRows = page.locator('tbody tr');
    this.tableHeaders = page.locator('thead th');
    this.selectAllCheckbox = page.locator('thead input[type="checkbox"]').first();
    this.policyCheckbox = (policyName: string) =>
      page.locator(`tr:has-text("${policyName}") input[type="checkbox"]`);

    // Pagination
    this.paginationContainer = page.locator('[class*="pagination"], nav[aria-label*="pagination"]');
    this.nextPageButton = page.getByRole('button', { name: /Next|>/i });
    this.prevPageButton = page.getByRole('button', { name: /Previous|</i });
    this.pageInfo = page.locator('text=/Page \\d+ of \\d+|\\d+-\\d+ of \\d+/');

    // Action buttons
    this.editButton = page.getByRole('button', { name: /Edit/i }).first();
    this.deleteButton = page.getByRole('button', { name: /Delete/i }).first();
    this.bulkDeleteButton = page.getByRole('button', { name: /Delete Selected/i });
    this.refreshButton = page.getByRole('button', { name: /Refresh/i });

    // Create/Edit Dialog elements
    this.createDialog = page.locator('[role="dialog"]');
    this.dialogTitle = page.locator('[role="dialog"] h2, [role="dialog"] [class*="DialogTitle"]');
    this.policyNameInput = page.locator('input[name="policyName"], input[placeholder*="name"]');
    this.selectionTab = page.getByRole('tab', { name: /Selection|Select/i });
    this.yamlTab = page.getByRole('tab', { name: /YAML|Editor/i });
    this.uploadTab = page.getByRole('tab', { name: /Upload|File/i });
    this.saveButton = page.getByRole('button', { name: /Save|Create|Submit/i });
    this.cancelButton = page.getByRole('button', { name: /Cancel/i });
    this.previewButton = page.getByRole('button', { name: /Preview/i });

    // Visualization elements
    this.canvas = page.locator('canvas').first();
    this.canvasContainer = page.locator('[class*="canvas"], [data-testid*="canvas"]');
    this.clusterNodes = page.locator('[data-type="cluster"], [class*="cluster-node"]');
    this.workloadNodes = page.locator('[data-type="workload"], [class*="workload-node"]');
    this.policyNodes = page.locator('[data-type="policy"], [class*="policy-node"]');

    // Filter elements
    this.statusFilter = page.locator('[class*="filter"], [data-testid="status-filter"]');
    this.activeFilter = page.getByRole('button', { name: /Active/i });
    this.inactiveFilter = page.getByRole('button', { name: /Inactive/i });
    this.clearFiltersButton = page.getByRole('button', { name: /Clear.*Filter/i });

    // Empty state
    this.emptyState = page.locator('[class*="empty"], [data-testid="empty-state"]');
    this.emptyStateTitle = page.locator('text=/No.*Policies|No.*Found/i');
    this.emptyStateButton = page.locator('[class*="empty"] button').first();

    // Toast/Snackbar
    this.successToast = page.locator('[class*="success"], [role="alert"]:has-text("success")');
    this.errorToast = page.locator('[class*="error"], [role="alert"]:has-text("error")');
    this.toastMessage = page.locator('[role="alert"]');

    // Delete confirmation dialog
    this.deleteDialog = page.locator('[role="dialog"]:has-text("Delete")');
    this.confirmDeleteButton = page
      .locator('[role="dialog"]')
      .getByRole('button', { name: /Confirm|Delete|Yes/i });
    this.cancelDeleteButton = page
      .locator('[role="dialog"]')
      .getByRole('button', { name: /Cancel|No/i });
  }

  /**
   * Navigate to binding policy page
   */
  async goto() {
    await super.goto('/bp');
    await this.waitForPageLoad();
  }

  /**
   * Wait for page to load
   */
  async waitForPageLoad() {
    await this.page.waitForLoadState('domcontentloaded');
    // Wait a bit for content to render
    await this.page.waitForTimeout(1000);
  }

  /**
   * Click create policy button
   */
  async clickCreatePolicy() {
    await this.createPolicyButton.click();
    await this.waitForDialog();
  }

  /**
   * Wait for dialog to appear
   */
  async waitForDialog() {
    await expect(this.createDialog).toBeVisible({ timeout: 5000 });
  }

  /**
   * Switch to table view
   */
  async switchToTableView() {
    await this.tableTab.click();
    await expect(this.table).toBeVisible({ timeout: 3000 });
  }

  /**
   * Switch to visualization view
   */
  async switchToVisualizationView() {
    await this.visualizationTab.click();
    await this.page.waitForTimeout(1000); // Wait for canvas to render
  }

  /**
   * Get number of policies in table
   */
  async getPolicyCount(): Promise<number> {
    return await this.tableRows.count();
  }

  /**
   * Search for policy
   */
  async searchPolicy(searchTerm: string) {
    await this.searchInput.fill(searchTerm);
    await this.page.waitForTimeout(500); // Wait for debounce
  }

  /**
   * Select policy by name
   */
  async selectPolicy(policyName: string) {
    await this.policyCheckbox(policyName).check();
  }

  /**
   * Select all policies
   */
  async selectAllPolicies() {
    await this.selectAllCheckbox.check();
  }

  /**
   * Click edit button for first policy
   */
  async clickEditPolicy() {
    await this.editButton.click();
    await this.waitForDialog();
  }

  /**
   * Click delete button for first policy
   */
  async clickDeletePolicy() {
    await this.deleteButton.click();
    await expect(this.deleteDialog).toBeVisible({ timeout: 3000 });
  }

  /**
   * Confirm delete action
   */
  async confirmDelete() {
    await this.confirmDeleteButton.click();
    await this.waitForToast();
  }

  /**
   * Cancel delete action
   */
  async cancelDelete() {
    await this.cancelDeleteButton.click();
  }

  /**
   * Wait for toast message
   */
  async waitForToast() {
    await expect(this.toastMessage).toBeVisible({ timeout: 5000 });
  }

  /**
   * Get toast message text
   */
  async getToastMessage(): Promise<string | null> {
    return await this.toastMessage.textContent();
  }

  /**
   * Check if policy exists in table
   */
  async policyExists(policyName: string): Promise<boolean> {
    const count = await this.page.locator(`text="${policyName}"`).count();
    return count > 0;
  }

  /**
   * Fill policy name in dialog
   */
  async fillPolicyName(name: string) {
    await this.policyNameInput.fill(name);
  }

  /**
   * Click save button in dialog
   */
  async clickSave() {
    await this.saveButton.click();
  }

  /**
   * Click cancel button in dialog
   */
  async clickCancel() {
    await this.cancelButton.click();
  }

  /**
   * Create a simple policy (quick flow)
   */
  async createSimplePolicy(policyName: string) {
    await this.clickCreatePolicy();
    await this.fillPolicyName(policyName);
    await this.clickSave();
    await this.waitForToast();
  }

  /**
   * Switch to YAML tab in dialog
   */
  async switchToYamlTab() {
    await this.yamlTab.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Switch to selection tab in dialog
   */
  async switchToSelectionTab() {
    await this.selectionTab.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Switch to upload tab in dialog
   */
  async switchToUploadTab() {
    await this.uploadTab.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Check if empty state is visible
   */
  async isEmptyStateVisible(): Promise<boolean> {
    return await this.isVisible(this.emptyStateTitle, 5000);
  }

  /**
   * Click next page
   */
  async clickNextPage() {
    await this.nextPageButton.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Click previous page
   */
  async clickPrevPage() {
    await this.prevPageButton.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Get current page info
   */
  async getPageInfo(): Promise<string | null> {
    return await this.pageInfo.textContent();
  }

  /**
   * Apply status filter
   */
  async filterByStatus(status: 'Active' | 'Inactive') {
    if (status === 'Active') {
      await this.activeFilter.click();
    } else {
      await this.inactiveFilter.click();
    }
    await this.page.waitForTimeout(500);
  }

  /**
   * Clear all filters
   */
  async clearFilters() {
    const isVisible = await this.isVisible(this.clearFiltersButton, 1000);
    if (isVisible) {
      await this.clearFiltersButton.click();
      await this.page.waitForTimeout(500);
    }
  }

  /**
   * Refresh the page
   */
  async refresh() {
    const isVisible = await this.isVisible(this.refreshButton, 1000);
    if (isVisible) {
      await this.refreshButton.click();
      await this.page.waitForTimeout(1000);
    }
  }

  /**
   * Get policy row by name
   */
  getPolicyRow(policyName: string): Locator {
    return this.page.locator(`tr:has-text("${policyName}")`);
  }

  /**
   * Click on policy row to view details
   */
  async clickPolicyRow(policyName: string) {
    await this.getPolicyRow(policyName).click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Check if table is visible
   */
  async isTableVisible(): Promise<boolean> {
    return await this.isVisible(this.table, 5000);
  }

  /**
   * Check if visualization canvas is visible
   */
  async isCanvasVisible(): Promise<boolean> {
    return await this.isVisible(this.canvas, 2000);
  }

  /**
   * Get number of cluster nodes in visualization
   */
  async getClusterNodeCount(): Promise<number> {
    return await this.clusterNodes.count();
  }

  /**
   * Get number of workload nodes in visualization
   */
  async getWorkloadNodeCount(): Promise<number> {
    return await this.workloadNodes.count();
  }

  /**
   * Bulk delete selected policies
   */
  async bulkDeletePolicies() {
    await this.bulkDeleteButton.click();
    await expect(this.deleteDialog).toBeVisible({ timeout: 3000 });
    await this.confirmDelete();
  }

  /**
   * Check if success toast is visible
   */
  async hasSuccessToast(): Promise<boolean> {
    return await this.isVisible(this.successToast, 3000);
  }

  /**
   * Check if error toast is visible
   */
  async hasErrorToast(): Promise<boolean> {
    return await this.isVisible(this.errorToast, 3000);
  }
}
