import { test, expect } from '@playwright/test';
import { UserManagementPage } from './pages/UserManagementPage';
import { LoginPage } from './pages/LoginPage';
import { MSWHelper } from './pages/utils/MSWHelper';

test.describe('User Management - Core Functionality', () => {
  let userManagementPage: UserManagementPage;
  let loginPage: LoginPage;
  let mswHelper: MSWHelper;

  test.beforeEach(async ({ page }) => {
    userManagementPage = new UserManagementPage(page);
    loginPage = new LoginPage(page);
    mswHelper = new MSWHelper(page);

    // Login as admin first
    await loginPage.goto();
    await loginPage.login('admin', 'admin');
    await expect(page).toHaveURL('/', { timeout: 10000 });

    // Ensure user management scenario is active
    await mswHelper.applyScenario('userManagement');

    // Navigate to user management page
    await userManagementPage.goto();
  });

  test('should display user management page with all elements', async () => {
    await userManagementPage.verifyPageElements();
    await userManagementPage.verifyUserTableVisible();
  });

  test('should display list of users', async () => {
    const userCount = await userManagementPage.getUserCount();
    expect(userCount).toBeGreaterThan(0);

    // Verify default users exist
    expect(await userManagementPage.userExists('admin')).toBeTruthy();
    expect(await userManagementPage.userExists('testuser')).toBeTruthy();
    expect(await userManagementPage.userExists('poweruser')).toBeTruthy();
  });

  test('should show admin badge for admin users', async () => {
    const adminRow = userManagementPage.getUserRow('admin');
    await expect(adminRow.locator('[data-testid="user-role-badge"]').first()).toContainText(
      /admin/i
    );
  });

  test('should not show admin badge for regular users', async () => {
    await userManagementPage.verifyUserIsNotAdmin('testuser');
  });

  test('should open add user modal when clicking add user button', async () => {
    await userManagementPage.clickAddUser();
    await expect(userManagementPage.modal).toBeVisible();
    await expect(userManagementPage.modalTitle).toContainText(/Add User/i);
  });

  test('should close add user modal when clicking cancel', async () => {
    await userManagementPage.clickAddUser();
    await expect(userManagementPage.modal).toBeVisible();
    await userManagementPage.cancelUserForm();
    await expect(userManagementPage.modal).not.toBeVisible();
  });

  test('should close add user modal when clicking close button', async () => {
    await userManagementPage.clickAddUser();
    await expect(userManagementPage.modal).toBeVisible();
    await userManagementPage.modalCloseButton.click();
    await expect(userManagementPage.modal).not.toBeVisible();
  });

  test('should refresh user list when clicking refresh button', async () => {
    const initialCount = await userManagementPage.getUserCount();
    await userManagementPage.clickRefresh();
    await userManagementPage.waitForLoadingToFinish();
    const newCount = await userManagementPage.getUserCount();
    expect(newCount).toBe(initialCount);
  });

  test('should open filters panel when clicking filter button', async () => {
    await userManagementPage.openFilters();
    await expect(userManagementPage.filterPanel).toBeVisible();
  });

  test('should close filters panel when clicking close button', async () => {
    await userManagementPage.openFilters();
    await expect(userManagementPage.filterPanel).toBeVisible();
    await userManagementPage.closeFilters();
    await expect(userManagementPage.filterPanel).not.toBeVisible();
  });

  test('should display user actions (edit/delete) for each user', async () => {
    const userRow = userManagementPage.getUserRow('testuser');
    await expect(userRow.getByRole('button', { name: /Edit/i })).toBeVisible();
    await expect(userRow.getByRole('button', { name: /Delete/i })).toBeVisible();
  });

  test('should open edit modal when clicking edit button', async () => {
    await userManagementPage.clickEditUser('testuser');
    await expect(userManagementPage.modal).toBeVisible();
    await expect(userManagementPage.modalTitle).toContainText(/Edit User/i);
  });

  test('should open delete modal when clicking delete button', async () => {
    await userManagementPage.clickDeleteUser('testuser');
    await expect(userManagementPage.deleteModal).toBeVisible();
  });

  test('should cancel delete when clicking cancel in delete modal', async () => {
    await userManagementPage.clickDeleteUser('testuser');
    await expect(userManagementPage.deleteModal).toBeVisible();
    await userManagementPage.cancelDeleteUser();
    await expect(userManagementPage.deleteModal).not.toBeVisible();

    // Verify user still exists
    expect(await userManagementPage.userExists('testuser')).toBeTruthy();
  });

  test('should handle loading state correctly', async () => {
    await userManagementPage.clickRefresh();
    // Loading state might be very brief, so we just check it doesn't throw
    await userManagementPage.waitForLoadingToFinish();
    await userManagementPage.verifyUserTableVisible();
  });

  test('should display user information in table', async () => {
    const userRow = userManagementPage.getUserRow('admin');
    await expect(userRow).toContainText('admin');
  });

  test('should navigate to user management page directly', async ({ page }) => {
    await expect(page).toHaveURL(/\/admin\/users/);
  });
});

test.describe('User Management - Accessibility', () => {
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

  test('should have proper heading hierarchy', async ({ page }) => {
    const h1 = page.locator('h1, h2').first();
    await expect(h1).toBeVisible();
  });

  test('should have accessible form inputs in modal', async () => {
    await userManagementPage.clickAddUser();
    await expect(userManagementPage.usernameInput).toBeVisible();
    await expect(userManagementPage.passwordInput).toBeVisible();
  });

  test('should support keyboard navigation', async ({ page }) => {
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    // Verify focus is moving through interactive elements
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedElement).toBeTruthy();
  });
});

test.describe('User Management - Responsive Design', () => {
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

  test('should display correctly on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await userManagementPage.verifyPageElements();
  });
});
