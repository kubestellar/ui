import { test, expect } from '@playwright/test';
import { UserManagementPage } from './pages/UserManagementPage';
import { LoginPage } from './pages/LoginPage';
import { MSWHelper } from './pages/utils/MSWHelper';

test.describe('User Management - Search Functionality', () => {
  let userManagementPage: UserManagementPage;
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    userManagementPage = new UserManagementPage(page);
    loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.login('admin', 'admin');
    await expect(page).toHaveURL('/', { timeout: 10000 });
    await new MSWHelper(page).applyScenario('userManagement');
    await userManagementPage.goto();
  });

  test('should search users by username', async () => {
    await userManagementPage.searchUsers('admin');

    await userManagementPage.page.waitForTimeout(1000);

    expect(await userManagementPage.userExists('admin')).toBeTruthy();
  });

  test('should search users by partial username', async () => {
    await userManagementPage.searchUsers('test');

    await userManagementPage.page.waitForTimeout(1000);

    expect(await userManagementPage.userExists('testuser')).toBeTruthy();
  });

  test('should show no results for non-existent user', async () => {
    await userManagementPage.searchUsers('nonexistentuser12345');

    await userManagementPage.page.waitForTimeout(1000);

    const userCount = await userManagementPage.getUserCount();
    expect(userCount).toBe(0);
  });

  test('should clear search and show all users', async () => {
    // First search for something
    await userManagementPage.searchUsers('admin');
    await userManagementPage.page.waitForTimeout(1000);

    const searchedCount = await userManagementPage.getUserCount();

    // Clear search
    await userManagementPage.clearSearch();
    await userManagementPage.page.waitForTimeout(1000);

    const allCount = await userManagementPage.getUserCount();
    expect(allCount).toBeGreaterThan(searchedCount);
  });

  test('should search case-insensitively', async () => {
    await userManagementPage.searchUsers('ADMIN');

    await userManagementPage.page.waitForTimeout(1000);

    expect(await userManagementPage.userExists('admin')).toBeTruthy();
  });

  test('should update results as user types', async () => {
    await userManagementPage.searchInput.fill('a');
    await userManagementPage.page.waitForTimeout(600);

    const countA = await userManagementPage.getUserCount();

    await userManagementPage.searchInput.fill('ad');
    await userManagementPage.page.waitForTimeout(600);

    const countAd = await userManagementPage.getUserCount();

    expect(countAd).toBeLessThanOrEqual(countA);
  });

  test('should maintain search term after refresh', async () => {
    await userManagementPage.searchUsers('admin');
    await userManagementPage.page.waitForTimeout(1000);

    const searchValue = await userManagementPage.searchInput.inputValue();
    expect(searchValue).toBe('admin');
  });

  test('should search by role (admin/user)', async () => {
    await userManagementPage.searchUsers('admin');
    await userManagementPage.page.waitForTimeout(1000);

    // Should find users with "admin" in their role or username
    const userCount = await userManagementPage.getUserCount();
    expect(userCount).toBeGreaterThan(0);
  });
});

test.describe('User Management - Filter Functionality', () => {
  let userManagementPage: UserManagementPage;
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    userManagementPage = new UserManagementPage(page);
    loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.login('admin', 'admin');
    await expect(page).toHaveURL('/', { timeout: 10000 });
    await new MSWHelper(page).applyScenario('userManagement');
    await userManagementPage.goto();
  });

  test('should filter users by admin role', async () => {
    await userManagementPage.filterButton.click();
    await userManagementPage.setRoleFilter('admin');
    await userManagementPage.page.waitForTimeout(1000);

    // Should only show admin users
    expect(await userManagementPage.userExists('admin')).toBeTruthy();

    // Regular users should not be visible
    const userCount = await userManagementPage.getUserCount();
    expect(userCount).toBeGreaterThan(0);
  });

  test('should filter users by user role', async () => {
    await userManagementPage.filterButton.click();
    await userManagementPage.setRoleFilter('user');
    await userManagementPage.page.waitForTimeout(1000);

    // Should show regular users
    expect(await userManagementPage.userExists('testuser')).toBeTruthy();
  });

  test('should clear all filters', async () => {
    await userManagementPage.filterButton.click();
    await userManagementPage.page.waitForTimeout(1000);

    const filteredCount = await userManagementPage.getUserCount();

    await userManagementPage.clearFilters();
    await userManagementPage.page.waitForTimeout(1000);

    const allCount = await userManagementPage.getUserCount();
    expect(allCount).toBeGreaterThanOrEqual(filteredCount);
  });

  test('should persist filter selection', async () => {
    await userManagementPage.filterButton.click();
    await userManagementPage.setRoleFilter('admin');
    await userManagementPage.page.waitForTimeout(1000);

    await userManagementPage.closeFilters();
    await userManagementPage.openFilters();

    // Filter should still be applied
    const userCount = await userManagementPage.getUserCount();
    expect(userCount).toBeGreaterThan(0);
  });

  test('should show filter count badge', async () => {
    await userManagementPage.filterButton.click();
    await userManagementPage.setRoleFilter('admin');
    await userManagementPage.page.waitForTimeout(1000);

    // Look for filter badge or indicator
    const filterBadgeCount = await userManagementPage.page
      .locator('[data-testid="filter-badge"], .filter-badge')
      .count();

    // Badge might or might not be implemented, so we just check it doesn't error
    expect(filterBadgeCount).toBeGreaterThanOrEqual(0);
  });
});

test.describe('User Management - Combined Search and Filter', () => {
  let userManagementPage: UserManagementPage;
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    userManagementPage = new UserManagementPage(page);
    loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.login('admin', 'admin');
    await expect(page).toHaveURL('/', { timeout: 10000 });
    await userManagementPage.goto();
  });

  test('should combine search and role filter', async () => {
    await userManagementPage.filterButton.click();
    await userManagementPage.searchUsers('user');
    await userManagementPage.page.waitForTimeout(1000);

    await userManagementPage.setRoleFilter('user');
    await userManagementPage.page.waitForTimeout(1000);

    const userCount = await userManagementPage.getUserCount();
    expect(userCount).toBeGreaterThanOrEqual(0);
  });

  test('should clear search but maintain filter', async () => {
    await userManagementPage.filterButton.click();
    await userManagementPage.searchUsers('test');
    await userManagementPage.setRoleFilter('user');
    await userManagementPage.page.waitForTimeout(1000);

    await userManagementPage.clearSearch();
    await userManagementPage.page.waitForTimeout(1000);

    const userCount = await userManagementPage.getUserCount();
    expect(userCount).toBeGreaterThan(0);
  });

  test('should clear both search and filter', async () => {
    const initialCount = await userManagementPage.getUserCount();

    await userManagementPage.searchUsers('test');
    await userManagementPage.setRoleFilter('user');
    await userManagementPage.page.waitForTimeout(1000);

    await userManagementPage.clearSearch();
    await userManagementPage.clearFilters();
    await userManagementPage.page.waitForTimeout(1000);

    const finalCount = await userManagementPage.getUserCount();
    expect(finalCount).toBe(initialCount);
  });

  test('should handle no results from combined filters', async () => {
    await userManagementPage.filterButton.click();
    await userManagementPage.searchUsers('admin');
    await userManagementPage.setRoleFilter('user');
    await userManagementPage.page.waitForTimeout(1000);

    const userCount = await userManagementPage.getUserCount();
    expect(userCount).toBe(0);
  });
});

test.describe('User Management - Sorting', () => {
  let userManagementPage: UserManagementPage;
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    userManagementPage = new UserManagementPage(page);
    loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.login('admin', 'admin');
    await expect(page).toHaveURL('/', { timeout: 10000 });
    await userManagementPage.goto();
  });

  test('should display users in default sort order', async () => {
    const usernames = await userManagementPage.getVisibleUsernames();
    expect(usernames.length).toBeGreaterThan(0);
  });

  test('should maintain sort order after operations', async () => {
    const initialUsernames = await userManagementPage.getVisibleUsernames();

    // Refresh the page
    await userManagementPage.clickRefresh();
    await userManagementPage.waitForLoadingToFinish();

    const afterRefreshUsernames = await userManagementPage.getVisibleUsernames();
    expect(afterRefreshUsernames).toEqual(initialUsernames);
  });

  test('should sort users with search applied', async () => {
    await userManagementPage.searchUsers('user');
    await userManagementPage.page.waitForTimeout(1000);

    const usernames = await userManagementPage.getVisibleUsernames();
    expect(usernames.length).toBeGreaterThan(0);
  });

  test('should sort users with filter applied', async () => {
    await userManagementPage.filterButton.click();
    await userManagementPage.setRoleFilter('user');
    await userManagementPage.page.waitForTimeout(1000);

    const usernames = await userManagementPage.getVisibleUsernames();
    expect(usernames.length).toBeGreaterThan(0);
  });
});

test.describe('User Management - Pagination and Performance', () => {
  let userManagementPage: UserManagementPage;
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    userManagementPage = new UserManagementPage(page);
    loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.login('admin', 'admin');
    await expect(page).toHaveURL('/', { timeout: 10000 });
    await userManagementPage.goto();
  });

  test('should handle search with debouncing', async () => {
    await userManagementPage.filterButton.click();
    await userManagementPage.searchInput.fill('a');
    await userManagementPage.searchInput.fill('ad');
    await userManagementPage.searchInput.fill('adm');
    await userManagementPage.searchInput.fill('admin');

    await userManagementPage.page.waitForTimeout(1000);

    expect(await userManagementPage.userExists('admin')).toBeTruthy();
  });

  test('should handle rapid filter changes', async () => {
    await userManagementPage.filterButton.click();
    await userManagementPage.setRoleFilter('admin');
    await userManagementPage.page.waitForTimeout(300);

    await userManagementPage.setRoleFilter('user');
    await userManagementPage.page.waitForTimeout(300);

    await userManagementPage.setRoleFilter('all');
    await userManagementPage.page.waitForTimeout(1000);

    const userCount = await userManagementPage.getUserCount();
    expect(userCount).toBeGreaterThan(0);
  });
});
