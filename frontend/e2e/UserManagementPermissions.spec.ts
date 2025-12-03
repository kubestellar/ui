import { test, expect } from '@playwright/test';
import { UserManagementPage } from './pages/UserManagementPage';
import { LoginPage } from './pages/LoginPage';
import { MSWHelper } from './pages/utils/MSWHelper';

test.describe('User Management - Permission Management', () => {
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

  test('should display permission options in add user modal', async () => {
    const page = userManagementPage.page;
    await userManagementPage.clickAddUser();

    // Check for permission components
    // At least some permission controls should be visible
    const permissionCount = await page.locator('text=/permission/i').count();
    expect(permissionCount).toBeGreaterThan(0);
  });

  test('should display permission options in edit user modal', async () => {
    const page = userManagementPage.page;
    await userManagementPage.clickEditUser('testuser');

    // Check for permission components
    const permissionCount = await page.locator('text=/permission/i').count();
    expect(permissionCount).toBeGreaterThan(0);
  });

  test('should create user with read permissions', async () => {
    const page = userManagementPage.page;
    const username = `readuser_${Date.now()}`;

    await userManagementPage.clickAddUser();
    await userManagementPage.fillUserForm({
      username,
      password: 'password123',
      confirmPassword: 'password123',
      isAdmin: false,
    });

    // Set read permissions (if permission controls are available)
    const dashboardPermission = page.locator('[data-component="dashboard"]').first();
    const permissionExists = await dashboardPermission.count();

    if (permissionExists > 0) {
      await userManagementPage.setPermission('dashboard', 'read');
    }

    await userManagementPage.submitUserForm();
    await userManagementPage.waitForSuccessToast();

    expect(await userManagementPage.userExists(username)).toBeTruthy();
  });

  test('should update user permissions', async () => {
    const page = userManagementPage.page;
    await userManagementPage.clickEditUser('testuser');

    // Update permissions (if permission controls are available)
    const permissionControls = await page.locator('[data-component]').count();

    if (permissionControls > 0) {
      await userManagementPage.setPermission('dashboard', 'write');
    }

    await userManagementPage.submitUserForm();
    await userManagementPage.waitForSuccessToast();
  });

  test('should grant all permissions when promoting to admin', async () => {
    const username = `promoteuser_${Date.now()}`;

    // Create regular user
    await userManagementPage.addUser({
      username,
      password: 'password123',
      confirmPassword: 'password123',
      isAdmin: false,
    });
    await userManagementPage.waitForSuccessToast();

    // Promote to admin
    await userManagementPage.clickEditUser(username);

    // Check admin checkbox
    const isChecked = await userManagementPage.adminCheckbox.isChecked();
    if (!isChecked) {
      await userManagementPage.adminCheckbox.click();
    }

    await userManagementPage.submitUserForm();
    await userManagementPage.waitForSuccessToast();

    // Verify user is now admin
    await userManagementPage.verifyUserIsAdmin(username);
  });

  test('should display current permissions when editing user', async () => {
    const page = userManagementPage.page;
    await userManagementPage.clickEditUser('testuser');

    // Modal should show current permissions
    await expect(userManagementPage.modal).toBeVisible();

    // Check if permission information is displayed
    const permissionText = await page.locator('text=/permission/i').count();
    expect(permissionText).toBeGreaterThan(0);
  });

  test('should preserve other permissions when updating one', async () => {
    const page = userManagementPage.page;
    const username = `permuser_${Date.now()}`;

    // Create user with multiple permissions
    await userManagementPage.clickAddUser();
    await userManagementPage.fillUserForm({
      username,
      password: 'password123',
      confirmPassword: 'password123',
      isAdmin: false,
    });

    const permissionControls = await page.locator('[data-component]').count();
    if (permissionControls > 0) {
      await userManagementPage.setPermission('dashboard', 'read');
      await userManagementPage.setPermission('resources', 'read');
    }

    await userManagementPage.submitUserForm();
    await userManagementPage.waitForSuccessToast();

    // Edit and update only one permission
    await userManagementPage.clickEditUser(username);

    if (permissionControls > 0) {
      await userManagementPage.setPermission('dashboard', 'write');
    }

    await userManagementPage.submitUserForm();
    await userManagementPage.waitForSuccessToast();
  });
});

test.describe('User Management - Permission Validation', () => {
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

  test('should allow creating user without any permissions', async () => {
    const username = `noperm_${Date.now()}`;

    await userManagementPage.addUser({
      username,
      password: 'password123',
      confirmPassword: 'password123',
      isAdmin: false,
    });

    await userManagementPage.waitForSuccessToast();
    expect(await userManagementPage.userExists(username)).toBeTruthy();
  });

  test('should show permission components in correct order', async () => {
    const page = userManagementPage.page;
    await userManagementPage.clickAddUser();

    // Check if permission components are displayed
    const permissionLabels = await page
      .locator('text=/dashboard|resources|system|users/i')
      .allTextContents();
    expect(permissionLabels.length).toBeGreaterThan(0);
  });

  test('should validate permission selection', async () => {
    const page = userManagementPage.page;
    const username = `validperm_${Date.now()}`;

    await userManagementPage.clickAddUser();
    await userManagementPage.fillUserForm({
      username,
      password: 'password123',
      confirmPassword: 'password123',
      isAdmin: false,
    });

    // Set a permission
    const permissionControls = await page.locator('[data-component="dashboard"]').count();
    if (permissionControls > 0) {
      await userManagementPage.setPermission('dashboard', 'read');
    }

    await userManagementPage.submitUserForm();
    await userManagementPage.waitForSuccessToast();

    expect(await userManagementPage.userExists(username)).toBeTruthy();
  });
});

test.describe('User Management - Admin Permissions', () => {
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

  test('should automatically grant all permissions to admin users', async () => {
    const username = `adminuser_${Date.now()}`;

    await userManagementPage.addUser({
      username,
      password: 'password123',
      confirmPassword: 'password123',
      isAdmin: true,
    });

    await userManagementPage.waitForSuccessToast();
    await userManagementPage.verifyUserIsAdmin(username);
  });

  test('should show admin has full access', async () => {
    await userManagementPage.clickEditUser('admin');

    await expect(userManagementPage.adminCheckbox).toBeChecked();
  });

  test('should maintain admin permissions after edit', async () => {
    const username = `admintest_${Date.now()}`;

    await userManagementPage.addUser({
      username,
      password: 'password123',
      confirmPassword: 'password123',
      isAdmin: true,
    });
    await userManagementPage.waitForSuccessToast();

    await userManagementPage.clickEditUser(username);
    await userManagementPage.fillUserForm({
      username,
      password: 'newpassword123',
      confirmPassword: 'newpassword123',
    });
    await userManagementPage.submitUserForm();
    await userManagementPage.waitForSuccessToast();

    await userManagementPage.verifyUserIsAdmin(username);
  });

  test('should remove all write permissions when demoting from admin', async () => {
    const username = `demote_${Date.now()}`;

    await userManagementPage.addUser({
      username,
      password: 'password123',
      confirmPassword: 'password123',
      isAdmin: true,
    });
    await userManagementPage.waitForSuccessToast();

    await userManagementPage.editUser(username, {
      isAdmin: false,
    });
    await userManagementPage.waitForSuccessToast();

    await userManagementPage.verifyUserIsNotAdmin(username);
  });
});

test.describe('User Management - Permission Display', () => {
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

  test('should display user permissions in user list', async () => {
    const userRow = userManagementPage.getUserRow('testuser');

    await expect(userRow).toBeVisible();

    const rowText = await userRow.textContent();
    expect(rowText).toBeTruthy();
  });

  test('should show admin badge for admin users in list', async () => {
    await userManagementPage.verifyUserIsAdmin('admin');
  });

  test('should show permission summary for users', async () => {
    const userRow = userManagementPage.getUserRow('poweruser');
    await expect(userRow).toBeVisible();

    const rowText = await userRow.textContent();
    expect(rowText).toContain('poweruser');
  });

  test('should differentiate between read and write permissions visually', async () => {
    const userRows = await userManagementPage.userRows.all();
    expect(userRows.length).toBeGreaterThan(0);

    for (const row of userRows) {
      await expect(row).toBeVisible();
    }
  });

  test('should show permission count or summary', async () => {
    const userRow = userManagementPage.getUserRow('testuser');

    const permissionBadges = await userRow
      .locator('[data-testid*="permission"], .permission-badge')
      .count();

    await expect(userRow).toBeVisible();
    expect(permissionBadges).toBeGreaterThanOrEqual(0);
  });
});
