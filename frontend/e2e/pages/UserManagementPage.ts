import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base/BasePage';

export class UserManagementPage extends BasePage {
  readonly pageHeading: Locator;
  readonly addUserButton: Locator;
  readonly searchInput: Locator;
  readonly filterButton: Locator;
  readonly refreshButton: Locator;
  readonly userTable: Locator;
  readonly loadingSpinner: Locator;

  readonly filterPanel: Locator;
  readonly roleFilter: Locator;
  readonly permissionFilter: Locator;
  readonly permissionLevelFilter: Locator;
  readonly sortByFilter: Locator;
  readonly sortDirectionButton: Locator;
  readonly clearFiltersButton: Locator;
  readonly closeFiltersButton: Locator;

  readonly userRows: Locator;
  readonly emptyState: Locator;

  readonly modal: Locator;
  readonly modalTitle: Locator;
  readonly modalCloseButton: Locator;
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly adminCheckbox: Locator;
  readonly submitButton: Locator;
  readonly cancelButton: Locator;

  readonly deleteModal: Locator;
  readonly deleteConfirmButton: Locator;
  readonly deleteCancelButton: Locator;

  readonly successToast: Locator;
  readonly errorToast: Locator;

  constructor(page: Page) {
    super(page);

    this.pageHeading = page.getByTestId('user-management-title');
    this.addUserButton = page.getByTestId('add-user-button');
    this.searchInput = page.getByTestId('user-search-input');
    this.filterButton = page.getByTestId('filter-toggle-button');
    this.refreshButton = page.getByTestId('refresh-users-button');
    this.userTable = page.getByTestId('user-table');
    this.loadingSpinner = page.locator('[data-testid="loading"], .loading, .spinner');

    this.filterPanel = page.getByTestId('filter-panel');
    this.roleFilter = page.getByTestId('role-filter');
    this.permissionFilter = page.getByTestId('permission-filter');
    this.permissionLevelFilter = page.getByTestId('permission-level-filter');
    this.sortByFilter = page.getByTestId('sort-by-filter');
    this.sortDirectionButton = page.getByTestId('sort-direction-button');
    this.clearFiltersButton = page.getByRole('button', { name: /Reset/i });
    this.closeFiltersButton = page.getByRole('button', { name: /Close Filters|Filters/i }).first();

    this.userRows = page.locator('[data-testid="user-row"]');
    this.emptyState = page.getByText(/No users/i);

    this.modal = page.getByTestId('user-form-modal');
    this.modalTitle = this.modal.locator('h3, h2');
    this.modalCloseButton = this.modal.locator('button[aria-label="Close"]');
    this.usernameInput = this.modal.locator('input#username');
    this.passwordInput = this.modal.locator('input#password');
    this.confirmPasswordInput = this.modal.locator('input#confirmPassword');
    this.adminCheckbox = this.modal.locator('input#isAdmin');
    this.submitButton = this.modal.locator('button[type="submit"]');
    this.cancelButton = this.modal.locator('button:has-text("Cancel")');

    this.deleteModal = page.locator('[data-testid="delete-user-modal"]');
    this.deleteConfirmButton = this.deleteModal.locator('button:has-text("Delete")');
    this.deleteCancelButton = this.deleteModal.locator('button:has-text("Cancel")');

    this.successToast = page.locator('.toast-success, [role="status"]:has-text("success")').first();
    this.errorToast = page.locator('.toast-error, [role="alert"]').first();
  }

  async goto() {
    await super.goto('/admin/users');
    await this.waitForPageLoad();
  }

  async waitForPageLoad() {
    await this.page.waitForLoadState('domcontentloaded');
    await Promise.race([
      this.userRows
        .first()
        .waitFor({ state: 'visible', timeout: 10000 })
        .catch(() => {}),
      this.emptyState.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {}),
      this.userTable.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {}),
    ]);
  }

  async searchUsers(searchTerm: string) {
    await this.searchInput.fill(searchTerm);
    await this.page.waitForTimeout(500); // Wait for debounce
  }

  async clearSearch() {
    await this.searchInput.clear();
    await this.page.waitForTimeout(500);
  }

  async clickAddUser() {
    await this.addUserButton.click();
    await this.modal.waitFor({ state: 'visible' });
  }

  async clickRefresh() {
    await this.refreshButton.click();
  }

  async openFilters() {
    const isVisible = await this.filterPanel.isVisible().catch(() => false);
    if (!isVisible) {
      await this.filterButton.click();
      await this.filterPanel.waitFor({ state: 'visible' });
    }
  }

  async closeFilters() {
    const isVisible = await this.filterPanel.isVisible().catch(() => false);
    if (isVisible) {
      await this.filterButton.click();
      await this.filterPanel.waitFor({ state: 'hidden' }).catch(() => {});
    }
  }

  async setRoleFilter(role: 'all' | 'admin' | 'user') {
    await this.openFilters();
    await this.roleFilter.click();
    await this.page.getByText(role, { exact: true }).click();
  }

  async clearFilters() {
    await this.openFilters();
    await this.clearFiltersButton.click();
  }

  async fillUserForm(data: {
    username: string;
    password?: string;
    confirmPassword?: string;
    isAdmin?: boolean;
  }) {
    await this.usernameInput.fill(data.username);

    if (data.password) {
      await this.passwordInput.fill(data.password);
    }

    if (data.confirmPassword) {
      await this.confirmPasswordInput.fill(data.confirmPassword);
    }

    if (data.isAdmin !== undefined) {
      const isChecked = await this.adminCheckbox.isChecked();
      if (isChecked !== data.isAdmin) {
        await this.adminCheckbox.click();
      }
    }
  }

  async submitUserForm() {
    await this.submitButton.click();
    await this.modal.waitFor({ state: 'hidden', timeout: 10000 });
  }

  async cancelUserForm() {
    await this.cancelButton.click();
    await this.modal.waitFor({ state: 'hidden' });
  }

  async addUser(data: {
    username: string;
    password: string;
    confirmPassword: string;
    isAdmin?: boolean;
  }) {
    await this.clickAddUser();
    await this.fillUserForm(data);
    await this.submitUserForm();
  }

  getUserRow(username: string): Locator {
    return this.page.locator(`[data-testid="user-row"][data-username="${username}"]`);
  }

  async clickEditUser(username: string) {
    const userRow = this.getUserRow(username);
    await userRow.getByRole('button', { name: /Edit/i }).click();
    await this.modal.waitFor({ state: 'visible' });
  }

  async clickDeleteUser(username: string) {
    const userRow = this.getUserRow(username);
    await userRow.getByRole('button', { name: /Delete/i }).click();
    await this.deleteModal.waitFor({ state: 'visible' });
  }

  async confirmDeleteUser() {
    await this.deleteConfirmButton.click();
    await this.deleteModal.waitFor({ state: 'hidden', timeout: 10000 });
  }

  async cancelDeleteUser() {
    await this.deleteCancelButton.click();
    await this.deleteModal.waitFor({ state: 'hidden' });
  }

  async deleteUser(username: string) {
    await this.clickDeleteUser(username);
    await this.confirmDeleteUser();
  }

  async editUser(
    username: string,
    data: {
      username?: string;
      password?: string;
      confirmPassword?: string;
      isAdmin?: boolean;
    }
  ) {
    await this.clickEditUser(username);
    await this.fillUserForm({
      username: data.username || username,
      password: data.password,
      confirmPassword: data.confirmPassword,
      isAdmin: data.isAdmin,
    });
    await this.submitUserForm();
  }

  async userExists(username: string): Promise<boolean> {
    try {
      await this.getUserRow(username).waitFor({ state: 'visible', timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  async getUserCount(): Promise<number> {
    const rows = await this.userRows.count();
    return rows;
  }

  async waitForSuccessToast(timeout: number = 5000) {
    await this.successToast.waitFor({ state: 'visible', timeout });
  }

  async waitForErrorToast(timeout: number = 5000) {
    await this.errorToast.waitFor({ state: 'visible', timeout });
  }

  async isLoading(): Promise<boolean> {
    return await this.loadingSpinner.isVisible().catch(() => false);
  }

  async waitForLoadingToFinish(timeout: number = 10000) {
    await this.loadingSpinner.waitFor({ state: 'hidden', timeout }).catch(() => {});
  }

  async getVisibleUsernames(): Promise<string[]> {
    const rows = await this.userRows.all();
    const usernames: string[] = [];

    for (const row of rows) {
      const text = await row.textContent();
      if (text) {
        const match = text.match(/^(\w+)/);
        if (match) {
          usernames.push(match[1]);
        }
      }
    }

    return usernames;
  }

  async verifyUserIsAdmin(username: string) {
    const userRow = this.getUserRow(username);
    await expect(userRow.locator('[data-testid="user-role-badge"]')).toContainText(/admin/i);
  }

  async verifyUserIsNotAdmin(username: string) {
    const userRow = this.getUserRow(username);
    const roleBadges = userRow.locator('[data-testid="user-role-badge"]');
    await expect(roleBadges).not.toContainText(/admin/i);
  }

  async setPermission(component: string, level: 'read' | 'write') {
    const permissionContainer = this.modal.locator(`[data-component="${component}"]`);
    await permissionContainer.waitFor({ state: 'visible', timeout: 5000 });

    const option = permissionContainer.locator(`input[data-permission-level="${level}"]`);
    await option.waitFor({ state: 'visible', timeout: 5000 });
    await option.scrollIntoViewIfNeeded();
    await option.check({ force: true });
  }

  async verifyPageElements() {
    await expect(this.pageHeading).toBeVisible();
    await expect(this.addUserButton).toBeVisible();
    await expect(this.searchInput).toBeVisible();
    await expect(this.filterButton).toBeVisible();
    await expect(this.refreshButton).toBeVisible();
  }

  async verifyEmptyState() {
    await expect(this.emptyState).toBeVisible();
  }

  async verifyUserTableVisible() {
    await expect(this.userTable).toBeVisible();
  }
}
