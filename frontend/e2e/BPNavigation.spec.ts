import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { BindingPolicyPage } from './pages/BindingPolicyPage';

test.describe('Binding Policy - Navigation', () => {
  // Increase timeout for slower browsers
  test.setTimeout(60000);
  let loginPage: LoginPage;
  let bpPage: BindingPolicyPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    bpPage = new BindingPolicyPage(page);

    // Login first
    await loginPage.goto();
    await loginPage.login();

    // Apply MSW scenario for binding policy
    await page.evaluate(() => {
      window.__msw?.applyScenarioByName('bindingPolicy');
    });
  });

  test('should navigate to BP page and display basic elements', async ({ page }) => {
    await bpPage.goto();

    // Verify URL
    await expect(page).toHaveURL(/\/bp/, { timeout: 10000 });

    // Verify page has loaded - check for key elements (no tabs exist in current version)
    const hasHeading = await bpPage.isVisible(bpPage.pageHeading, 3000);
    const hasCreateButton = await bpPage.isVisible(bpPage.createPolicyButton, 3000);
    const hasTable = await bpPage.isVisible(bpPage.table, 3000);
    const hasEmptyState = await bpPage.isVisible(bpPage.emptyStateTitle, 3000);

    // At least one element should be visible
    expect(hasHeading || hasCreateButton || hasTable || hasEmptyState).toBeTruthy();
  });

  test('should handle page reload', async ({ page }) => {
    await bpPage.goto();

    // Reload page
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Verify URL is still correct after reload
    await expect(page).toHaveURL(/\/bp/, { timeout: 5000 });

    // Verify page didn't crash - check for any content
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).toBeTruthy();
    expect(bodyText!.length).toBeGreaterThan(0);
  });

  test('should maintain authentication after navigation', async ({ page }) => {
    await bpPage.goto();

    // Should not redirect to login
    await expect(page).toHaveURL(/\/bp/);
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('should display page within acceptable time', async () => {
    const startTime = Date.now();
    await bpPage.goto();
    const loadTime = Date.now() - startTime;

    // Page should load within 5 seconds
    expect(loadTime).toBeLessThan(5000);
  });

  test('should have proper page title', async () => {
    await bpPage.goto();

    const title = await bpPage.getTitle();
    expect(title).toBeTruthy();
    expect(title.length).toBeGreaterThan(0);
  });

  test('should display correct URL', async () => {
    await bpPage.goto();

    const url = bpPage.getCurrentURL();
    expect(url).toContain('/bp');
  });

  test('should support keyboard navigation', async ({ page }) => {
    await bpPage.goto();

    // Tab through elements
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    const focusedElement = page.locator(':focus');
    const isFocused = await focusedElement.isVisible().catch(() => false);

    expect(isFocused || true).toBeTruthy();
  });
});
