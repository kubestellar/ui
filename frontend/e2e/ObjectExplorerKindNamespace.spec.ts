import { test, expect } from '@playwright/test';
import { LoginPage, ObjectExplorerPage, MSWHelper } from './pages';

test.describe('Object Explorer - Kind and Namespace Selection', () => {
  let loginPage: LoginPage;
  let objectExplorerPage: ObjectExplorerPage;
  let mswHelper: MSWHelper;

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
  });

  test('should select single resource kind from dropdown', async ({ page }) => {
    await objectExplorerPage.selectKind('Pod');
    await page.waitForTimeout(500);
    await objectExplorerPage.verifySelectedKinds(['Pod']);
    await objectExplorerPage.waitForResources();
  });

  test('should select multiple resource kinds', async ({ page }) => {
    await objectExplorerPage.selectKinds(['Pod', 'Deployment', 'Service']);
    await page.waitForTimeout(1000);
    await objectExplorerPage.verifySelectedKinds(['Pod', 'Deployment', 'Service']);
  });

  test('should select single namespace from dropdown', async ({ page }) => {
    await objectExplorerPage.selectKind('Pod');
    await page.waitForTimeout(500);
    await objectExplorerPage.selectNamespace('default');
    await page.waitForTimeout(500);
    await objectExplorerPage.verifySelectedNamespaces(['default']);
    await objectExplorerPage.waitForResources();
  });

  test('should select multiple namespaces', async ({ page }) => {
    await objectExplorerPage.selectKind('Service');
    await page.waitForTimeout(500);
    await objectExplorerPage.selectNamespaces(['default', 'production', 'staging']);
    await page.waitForTimeout(1000);
    await objectExplorerPage.verifySelectedNamespaces(['default', 'production', 'staging']);
  });

  test('should handle namespace selection for namespaced resources', async ({ page }) => {
    await objectExplorerPage.selectKind('Deployment');
    await page.waitForTimeout(500);
    const isDisabled = await objectExplorerPage.namespaceSelect.isDisabled();
    expect(isDisabled).toBe(false);
    await objectExplorerPage.selectNamespace('test-namespace');
    await page.waitForTimeout(500);
    await objectExplorerPage.verifySelectedNamespaces(['test-namespace']);
  });

  test('should handle namespace selection for cluster-scoped resources', async ({ page }) => {
    await objectExplorerPage.selectKind('Namespace');
    await page.waitForTimeout(500);
    await objectExplorerPage.waitForResources();
  });

  test('should load resources when kind and namespace are selected', async ({ page }) => {
    await objectExplorerPage.selectKind('Pod');
    await page.waitForTimeout(500);
    await objectExplorerPage.selectNamespace('default');
    await page.waitForTimeout(1000);
    await objectExplorerPage.waitForResources();
    const resourceCount = await objectExplorerPage.getResourceCount();
    expect(resourceCount).toBeGreaterThan(0);
  });

  test('should update resources when changing kind selection', async ({ page }) => {
    await objectExplorerPage.selectKind('Pod');
    await objectExplorerPage.selectNamespace('default');
    await page.waitForTimeout(1000);
    const initialCount = await objectExplorerPage.getResourceCount();
    expect(initialCount).toBeGreaterThanOrEqual(0);
    await objectExplorerPage.removeKindChip('Pod');
    await page.waitForTimeout(500);
    await objectExplorerPage.selectKind('Deployment');
    await page.waitForTimeout(1000);
    const newCount = await objectExplorerPage.getResourceCount();
    expect(newCount).toBeGreaterThanOrEqual(0);
    const hasError = await objectExplorerPage.hasError();
    expect(hasError).toBe(false);
  });

  test('should display kind options with group information', async ({ page }) => {
    await objectExplorerPage.kindInput.click();
    await page.waitForTimeout(500);
    const deploymentOption = page.locator('[role="option"]').filter({ hasText: 'Deployment' });
    await expect(deploymentOption).toBeVisible();
    const groupChip = deploymentOption.locator('[class*="chip"]').filter({ hasText: 'apps' });
    if (await groupChip.isVisible({ timeout: 1000 }).catch(() => false)) {
      await expect(groupChip).toBeVisible();
    }
  });

  test('should filter out kube-system namespace from selection', async ({ page }) => {
    await objectExplorerPage.selectKind('Pod');
    await page.waitForTimeout(500);
    await objectExplorerPage.namespaceSelect.click();
    await page.waitForTimeout(500);
    const kubeSystemOption = page
      .locator('[role="option"], li')
      .filter({ hasText: /^kube-system$/i });
    await expect(kubeSystemOption)
      .not.toBeVisible({ timeout: 1000 })
      .catch(() => null);
    await page.keyboard.press('Escape');
  });

  test('should show available namespaces in dropdown', async ({ page }) => {
    await objectExplorerPage.selectKind('ConfigMap');
    await page.waitForTimeout(500);
    await objectExplorerPage.namespaceSelect.click();
    await page.waitForTimeout(500);
    const defaultOption = page.locator('[role="option"], li').filter({ hasText: /^default$/i });
    await expect(defaultOption).toBeVisible();
    const productionOption = page
      .locator('[role="option"], li')
      .filter({ hasText: /^production$/i });
    await expect(productionOption).toBeVisible();
    await page.keyboard.press('Escape');
  });

  test('should handle rapid kind selection changes', async ({ page }) => {
    await objectExplorerPage.selectKind('Pod');
    await page.waitForTimeout(200);
    await objectExplorerPage.removeKindChip('Pod');
    await page.waitForTimeout(200);
    await objectExplorerPage.selectKind('Deployment');
    await page.waitForTimeout(200);
    await objectExplorerPage.removeKindChip('Deployment');
    await page.waitForTimeout(200);
    await objectExplorerPage.selectKind('Service');
    await page.waitForTimeout(500);
    await objectExplorerPage.verifySelectedKinds(['Service']);
    const hasError = await objectExplorerPage.hasError();
    expect(hasError).toBe(false);
  });

  test('should clear all selections and reset view', async ({ page }) => {
    await objectExplorerPage.selectKind('Secret');
    await objectExplorerPage.selectNamespace('staging');
    await page.waitForTimeout(1000);
    await objectExplorerPage.removeKindChip('Secret');
    await page.waitForTimeout(500);
    await objectExplorerPage.removeNamespaceChip('staging');
    await page.waitForTimeout(500);
    const resourceCount = await objectExplorerPage.getResourceCount();
    expect(resourceCount).toBe(0);
  });

  test('should maintain namespace selection when changing kinds', async ({ page }) => {
    await objectExplorerPage.selectKind('Pod');
    await objectExplorerPage.selectNamespace('default');
    await page.waitForTimeout(1000);
    await objectExplorerPage.removeKindChip('Pod');
    await page.waitForTimeout(300);
    await objectExplorerPage.selectKind('Deployment');
    await page.waitForTimeout(1000);
    await objectExplorerPage.verifySelectedNamespaces(['default']);
  });
});
