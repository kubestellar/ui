import { test, expect } from '@playwright/test';

// Test suite for InstallationPage comprehensive testing
test.describe('InstallationPage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/install');
    await page.waitForLoadState('networkidle');
  });

  test('should display main page elements and navigation', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Welcome to KubeStellar' })).toBeVisible();
    await expect(
      page.getByText('Get started with KubeStellar by setting up your development environment')
    ).toBeVisible();

    await expect(
      page.locator('img[alt="KubeStellar Logo"], img[src*="KubeStellar"]').first()
    ).toBeVisible();

    await expect(page.getByRole('link', { name: 'GitHub' }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Documentation' }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Help' })).toBeVisible();

    await expect(
      page.locator('button[aria-label*="theme"], button:has([data-testid="theme-icon"])').first()
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Switch language' })).toBeVisible();
  });

  test('should display quick stats cards', async ({ page }) => {
    await expect(
      page
        .locator('.text-sm')
        .filter({ hasText: /Prerequisites/ })
        .first()
    ).toBeVisible();
    await expect(page.getByText('Platform')).toBeVisible();
    await expect(
      page.locator('.text-2xl.font-semibold.capitalize').filter({ hasText: 'kind' })
    ).toBeVisible();
    await expect(page.getByText('Status')).toBeVisible();
  });

  test('should display sidebar steps and documentation links', async ({ page }) => {
    await expect(page.getByText('Installation Steps')).toBeVisible();
    await expect(page.getByText('Check Prerequisites')).toBeVisible();
    await expect(page.getByText('Install KubeStellar')).toBeVisible();
    await expect(page.getByText('Start Using KubeStellar')).toBeVisible();

    await expect(
      page.locator('a[href*="docs.kubestellar.io/latest/direct/pre-reqs/"]')
    ).toBeVisible();
  });

  test('should test prerequisites tab functionality', async ({ page }) => {
    await expect(page.locator('button:has-text("Prerequisites")').first()).toBeVisible();
    await expect(page.locator('button:has-text("Prerequisites")').first()).toHaveClass(
      /bg-blue-600/
    );

    await expect(page.getByRole('heading', { name: 'System Prerequisites' })).toBeVisible();
    await expect(
      page.getByText('Ensure these tools are installed before proceeding')
    ).toBeVisible();

    await expect(
      page
        .locator('.text-xs')
        .filter({ hasText: /Success/ })
        .first()
    ).toBeVisible();
    await expect(
      page
        .locator('.text-xs')
        .filter({ hasText: /Warnings/ })
        .first()
    ).toBeVisible();
    await expect(
      page
        .locator('.text-xs')
        .filter({ hasText: /Missing/ })
        .first()
    ).toBeVisible();

    await expect(page.getByText('Core Requirements')).toBeVisible();

    await expect(page.getByRole('heading', { name: 'KubeFlex' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'OCM CLI' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Helm' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'kubectl' })).toBeVisible();

    await expect(page.getByText('Demo Environment Requirements')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'kind' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Docker' })).toBeVisible();

    await expect(page.getByRole('button').filter({ hasText: /Refresh|refresh/ })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Next: Installation' })).toBeVisible();
  });

  test('should expand prerequisite cards and show details with links', async ({ page }) => {
    const prereqCards = page
      .locator('.cursor-pointer')
      .filter({ hasText: /KubeFlex|OCM CLI|Helm|kubectl|kind|Docker/ });

    await expect(prereqCards.first()).toBeVisible();

    const cardCount = await prereqCards.count();

    if (cardCount > 0) {
      await prereqCards.first().click();
      await expect(page.locator('.border-t.p-4.pt-0')).toBeVisible();

      const viewGuideLinks = page
        .locator('a')
        .filter({ hasText: /View guide|View Guide|view guide/ });
      const guideLinkCount = await viewGuideLinks.count();

      if (guideLinkCount > 0) {
        const firstGuideLink = viewGuideLinks.first();
        await expect(firstGuideLink).toBeVisible();
        await expect(firstGuideLink).toHaveAttribute('target', '_blank');
        await expect(firstGuideLink).toHaveAttribute('rel', 'noopener noreferrer');
        const href = await firstGuideLink.getAttribute('href');
        expect(href).toMatch(/^https?:\/\//);
      }
    }
  });

  test('should test copy functionality in code blocks', async ({ page }) => {
    const copyButton = page
      .locator('button[aria-label="Copy code"], button:has-text("Copy")')
      .first();

    if (await copyButton.isVisible()) {
      await copyButton.click();
      await expect(
        page.locator('.text-emerald-300, .text-green-700, [data-testid="copy-success"]')
      ).toBeVisible();
    }
  });

  test('should test installation tab functionality', async ({ page }) => {
    await page.getByRole('button', { name: 'Installation' }).first().click();

    await expect(page.getByRole('button', { name: 'Installation' }).first()).toHaveClass(
      /bg-blue-600/
    );

    await expect(page.locator('h2').filter({ hasText: 'Install KubeStellar' })).toBeVisible();

    await expect(page.getByText('Install Prerequisites First')).toBeVisible();
    await expect(page.getByRole('link', { name: 'View Install Prerequisites' })).toBeVisible();

    await expect(page.getByRole('heading', { name: 'Platform' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'kind' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'k3d' })).toBeVisible();

    await expect(page.getByRole('heading', { name: 'Installation Script' })).toBeVisible();

    await expect(page.getByRole('button', { name: 'Back: Prerequisites' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Start Installation' })).toBeVisible();
  });

  test('should test platform selection', async ({ page }) => {
    await page.getByRole('button', { name: 'Installation' }).first().click();

    await expect(page.getByRole('button', { name: 'kind' })).toHaveClass(/bg-blue-600/);

    await page.getByRole('button', { name: 'k3d' }).click();
    await expect(page.getByRole('button', { name: 'k3d' })).toHaveClass(/bg-blue-600/);
    await expect(page.getByRole('button', { name: 'kind' })).not.toHaveClass(/bg-blue-600/);

    await page.getByRole('button', { name: 'kind' }).click();
    await expect(page.getByRole('button', { name: 'kind' })).toHaveClass(/bg-blue-600/);
    await expect(page.getByRole('button', { name: 'k3d' })).not.toHaveClass(/bg-blue-600/);
  });

  test('should display installation script with correct platform', async ({ page }) => {
    await page.getByRole('button', { name: 'Installation' }).first().click();

    await expect(page.locator('pre.whitespace-pre-wrap.break-all.font-mono')).toBeVisible();

    const scriptElement = page.locator('pre.whitespace-pre-wrap.break-all.font-mono');
    await expect(scriptElement).toBeVisible();
    const scriptText = await scriptElement.textContent();
    expect(scriptText).toContain('--platform kind');

    await page.getByRole('button', { name: 'k3d' }).click();

    const updatedScriptText = await scriptElement.textContent();
    expect(updatedScriptText).toContain('--platform k3d');
  });

  test('should test complete installation flow', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Prerequisites' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Prerequisites' })).toHaveClass(/bg-blue-600/);

    const nextButton = page.getByRole('button', { name: 'Next: Installation' });
    if (await nextButton.isEnabled()) {
      await nextButton.click();

      await expect(page.getByRole('button', { name: 'Installation' }).first()).toHaveClass(
        /bg-blue-600/
      );

      await page.getByRole('button', { name: 'k3d' }).click();

      await page.getByRole('button', { name: 'Start Installation' }).click();

      const messageVisible = await page
        .getByText(/Follow the CLI installation|Preparing instructions|Installing/)
        .isVisible();
      expect(messageVisible).toBeTruthy();
    }
  });

  test('should test back navigation from installation to prerequisites', async ({ page }) => {
    await page.getByRole('button', { name: 'Installation' }).first().click();

    await page.getByRole('button', { name: 'Back: Prerequisites' }).click();

    await expect(page.getByRole('button', { name: 'Prerequisites' }).first()).toHaveClass(
      /bg-blue-600/
    );
    await expect(page.getByRole('button', { name: 'Installation' }).first()).not.toHaveClass(
      /bg-blue-600/
    );
  });

  test('should test all external links and navigation buttons', async ({ page }) => {
    const githubLink = page.getByRole('link', { name: 'GitHub' }).first();
    await expect(githubLink).toBeVisible();
    await expect(githubLink).toHaveAttribute('href', 'https://github.com/kubestellar/kubestellar');
    await expect(githubLink).toHaveAttribute('target', '_blank');
    await expect(githubLink).toHaveAttribute('rel', 'noopener noreferrer');

    const docLink = page.getByRole('link', { name: 'Documentation' }).first();
    await expect(docLink).toBeVisible();
    await expect(docLink).toHaveAttribute(
      'href',
      'https://docs.kubestellar.io/latest/direct/get-started/'
    );
    await expect(docLink).toHaveAttribute('target', '_blank');
    await expect(docLink).toHaveAttribute('rel', 'noopener noreferrer');

    const helpButton = page.getByRole('link', { name: 'Help' });
    await expect(helpButton).toBeVisible();
    await expect(helpButton).toHaveAttribute('href', 'https://kubestellar.io');
    await expect(helpButton).toHaveAttribute('target', '_blank');
    await expect(helpButton).toHaveAttribute('rel', 'noopener noreferrer');
    await expect(helpButton).toHaveClass(/gradient-to-r/);

    const themeButton = page
      .locator('button[aria-label*="theme"], button:has([data-testid="theme-icon"])')
      .first();
    if (await themeButton.isVisible()) {
      await themeButton.click();
      await themeButton.click();
    }

    const languageButton = page.getByRole('button', { name: 'Switch language' });
    await expect(languageButton).toBeVisible();

    const footerGithubLink = page
      .locator('a[href="https://github.com/kubestellar/kubestellar"]')
      .last();
    await expect(footerGithubLink).toBeVisible();

    const footerDocLink = page.locator('a[href="https://docs.kubestellar.io"]');
    await expect(footerDocLink).toBeVisible();

    const sidebarDocLink = page.locator('a[href*="docs.kubestellar.io/latest/direct/pre-reqs/"]');
    await expect(sidebarDocLink).toBeVisible();
  });

  test('should test installation tab links and buttons', async ({ page }) => {
    await page.getByRole('button', { name: 'Installation' }).first().click();

    const viewPrereqsButton = page.getByRole('link', { name: 'View Install Prerequisites' });
    await expect(viewPrereqsButton).toBeVisible();
    await expect(viewPrereqsButton).toHaveAttribute(
      'href',
      'https://docs.kubestellar.io/latest/direct/pre-reqs/'
    );
    await expect(viewPrereqsButton).toHaveAttribute('target', '_blank');
    await expect(viewPrereqsButton).toHaveAttribute('rel', 'noopener noreferrer');

    const kindButton = page.getByRole('button', { name: 'kind' });
    const k3dButton = page.getByRole('button', { name: 'k3d' });
    await expect(kindButton).toBeVisible();
    await expect(k3dButton).toBeVisible();

    const backButton = page.getByRole('button', { name: 'Back: Prerequisites' });
    const installButton = page.getByRole('button', { name: 'Start Installation' });
    await expect(backButton).toBeVisible();
    await expect(installButton).toBeVisible();

    await expect(installButton).toHaveClass(/gradient-to-r/);
  });

  test('should test responsive design elements', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await expect(page.getByRole('heading', { name: 'Welcome to KubeStellar' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Prerequisites' }).first()).toBeVisible();

    await page.setViewportSize({ width: 768, height: 1024 });

    await expect(page.getByRole('heading', { name: 'Welcome to KubeStellar' })).toBeVisible();

    await page.setViewportSize({ width: 1920, height: 1080 });

    await expect(page.getByRole('heading', { name: 'Welcome to KubeStellar' })).toBeVisible();
  });

  test('should test loading and error states', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Welcome to KubeStellar' })).toBeVisible();

    const loadingElements = page.locator('.animate-spin, .animate-pulse');
    const loadingCount = await loadingElements.count();

    if (loadingCount > 0) {
      await expect(loadingElements.first()).toBeVisible();
    }
  });

  test('should test prerequisite status badges', async ({ page }) => {
    const statusBadges = page.locator('[data-testid="status-badge"], .rounded-full, .inline-flex');
    const badgeCount = await statusBadges.count();

    if (badgeCount > 0) {
      const badgeTexts = await statusBadges.allTextContents();
      const expectedStatuses = [
        'Installed',
        'Missing',
        'Checking',
        'Version Mismatch',
        'Installed',
        'Missing',
      ];

      const hasExpectedStatus = badgeTexts.some(text =>
        expectedStatuses.some(status => text.includes(status))
      );
      expect(hasExpectedStatus).toBeTruthy();
    } else {
      await expect(page.getByRole('heading', { name: 'Welcome to KubeStellar' })).toBeVisible();
    }
  });

  test('should test installation process information boxes', async ({ page }) => {
    await page.getByRole('button', { name: 'Installation' }).first().click();

    await expect(page.getByText('Installation Process:')).toBeVisible();
    await expect(page.getByText('Important Notes:')).toBeVisible();
    await expect(page.getByText('After Installation:')).toBeVisible();
  });

  test('should test refresh prerequisites functionality', async ({ page }) => {
    const refreshButton = page.getByRole('button').filter({ hasText: /Refresh|refresh/ });
    await expect(refreshButton).toBeVisible();

    if (await refreshButton.isVisible()) {
      await refreshButton.click();

      // Use more specific selector for the refresh button's loading spinner
      const loadingSpinner = refreshButton.locator('svg.animate-spin');
      const hasLoadingSpinner = await loadingSpinner.isVisible();

      if (hasLoadingSpinner) {
        await expect(loadingSpinner).not.toBeVisible({ timeout: 5000 });
      } else {
        await expect(refreshButton).toBeVisible();
      }
    } else {
      await expect(page.getByRole('heading', { name: 'Welcome to KubeStellar' })).toBeVisible();
    }
  });

  test('should test installation button states', async ({ page }) => {
    await page.getByRole('button', { name: 'Installation' }).first().click();
    await expect(page.getByRole('button', { name: 'Installation' }).first()).toHaveClass(
      /bg-blue-600/
    );

    const installButton = page.getByRole('button', { name: 'Start Installation' });
    await expect(installButton).toBeVisible();

    await installButton.click();

    const loadingSpinner = installButton.locator('.animate-spin');
    const hasLoadingSpinner = await loadingSpinner.isVisible();

    if (hasLoadingSpinner) {
      await expect(loadingSpinner).not.toBeVisible({ timeout: 5000 });
    }

    await expect(
      page.getByText(/Follow the CLI installation|Installation complete|Preparing instructions/)
    ).toBeVisible();
  });

  test('should test all tab navigation functionality', async ({ page }) => {
    const prerequisitesTab = page.getByRole('button', { name: 'Prerequisites' }).first();
    const installationTab = page.getByRole('button', { name: 'Installation' }).first();

    await expect(prerequisitesTab).toBeVisible();
    await expect(installationTab).toBeVisible();
    await expect(prerequisitesTab).toHaveClass(/bg-blue-600/);
    await expect(installationTab).not.toHaveClass(/bg-blue-600/);

    await installationTab.click();
    await expect(installationTab).toHaveClass(/bg-blue-600/);
    await expect(prerequisitesTab).not.toHaveClass(/bg-blue-600/);

    await expect(page.locator('h2').filter({ hasText: 'Install KubeStellar' })).toBeVisible();

    await prerequisitesTab.click();
    await expect(prerequisitesTab).toHaveClass(/bg-blue-600/);
    await expect(installationTab).not.toHaveClass(/bg-blue-600/);

    await expect(page.getByRole('heading', { name: 'System Prerequisites' })).toBeVisible();
  });
});
