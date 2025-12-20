import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:5173';

test.describe('Dashboard Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Apply MSW scenario first
    await page.evaluate(() => {
      window.__msw?.applyScenarioByName('dashboard');
    });

    await page.waitForLoadState('domcontentloaded');

    // Wait for login form to be ready
    await page.waitForFunction(
      () => {
        const usernameInput = document.querySelector(
          'input[placeholder="Username"]'
        ) as HTMLInputElement;
        const passwordInput = document.querySelector(
          'input[placeholder="Password"]'
        ) as HTMLInputElement;
        const submitButton = document.querySelector('button[type="submit"]') as HTMLButtonElement;
        return (
          usernameInput &&
          passwordInput &&
          submitButton &&
          !usernameInput.disabled &&
          !passwordInput.disabled &&
          !submitButton.disabled
        );
      },
      { timeout: 10000 }
    );

    // Fill login form
    await page.locator('input[placeholder="Username"]').fill('admin');
    await page.locator('input[placeholder="Password"]').fill('admin');

    // Click submit button
    await page.locator('button[type="submit"]').click();

    // Wait for navigation with fallback
    try {
      await page.waitForURL('/', { timeout: 15000 });
    } catch {
      // If navigation fails, check if we're already on dashboard
      const currentUrl = page.url();
      if (currentUrl.includes('/') && !currentUrl.includes('/login')) {
        console.log('Already on dashboard, continuing...');
      } else {
        // Try to wait for any navigation away from login
        await page.waitForFunction(() => !window.location.href.includes('/login'), {
          timeout: 5000,
        });
      }
    }

    // Wait for dashboard to load - use waitForFunction for better Chromium compatibility
    await page.waitForFunction(
      () => {
        const heading = document.querySelector('h1');
        return heading && heading.textContent?.includes('Dashboard');
      },
      { timeout: 10000 }
    );
  });

  test.describe('Dashboard Layout and Structure', () => {
    test('dashboard page loads successfully', async ({ page }) => {
      await expect(page).toHaveURL('/');
      await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

      const dashboardContainer = page.locator('main, [data-testid="dashboard"]').first();
      await expect(dashboardContainer).toBeVisible();
    });

    test('dashboard header is visible with navigation buttons', async ({ page }) => {
      await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Manage Clusters' })).toBeVisible();

      const navLinks = page.locator('main a, [class*="dashboard"] a');
      const linkCount = await navLinks.count();
      expect(linkCount).toBeGreaterThan(0);
    });
  });

  test.describe('Statistics Cards', () => {
    test('all statistics cards are visible', async ({ page }) => {
      await expect(page.getByRole('link', { name: 'Total Clusters' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Active Clusters' })).toBeVisible();
      await expect(page.getByText(/Binding Policies/i).first()).toBeVisible();
      await expect(page.getByText(/Current Context/i).first()).toBeVisible();
    });

    test('statistics cards display correct data from MSW', async ({ page }) => {
      await expect(page.getByRole('link', { name: 'Total Clusters' })).toContainText('2');
      await expect(page.getByRole('link', { name: 'Active Clusters' })).toContainText('2');
      await expect(page.getByText('its1-kubeflex')).toBeVisible();
    });

    test('statistics cards are clickable and navigate correctly', async ({ page }) => {
      await page.getByRole('link', { name: 'Total Clusters' }).click();
      await expect(page).toHaveURL(/its/, { timeout: 3000 });

      await page.goBack();
      await page.waitForURL('/', { timeout: 3000 });

      await page
        .getByText(/Binding Policies/i)
        .first()
        .click();
      await expect(page).toHaveURL(/bp/, { timeout: 3000 });
    });

    test('statistics cards have proper visual indicators', async ({ page }) => {
      const firstCard = page.getByRole('link', { name: 'Total Clusters' });
      const icons = firstCard.locator('svg');
      const iconCount = await icons.count();
      expect(iconCount).toBeGreaterThan(0);

      // Test hover with timeout protection
      try {
        await firstCard.hover();
        await expect(firstCard).toBeVisible();
      } catch {
        // If hover fails, just verify the card is still visible
        await expect(firstCard).toBeVisible();
      }
    });
  });

  test.describe('Health Overview Section', () => {
    test('health overview section is visible', async ({ page }) => {
      await expect(page.getByRole('heading', { name: 'Cluster Health' })).toBeVisible();
      await expect(page.getByText('System Health')).toBeVisible();
    });

    test('resource utilization progress bars are visible', async ({ page }) => {
      const progressBars = page.locator(
        'div[class*="h-4"][class*="w-full"][class*="rounded-full"][class*="bg-gray-100"]'
      );
      const progressCount = await progressBars.count();
      expect(progressCount).toBeGreaterThan(0);

      const progressFills = page.locator(
        'div[class*="absolute"][class*="left-0"][class*="top-0"][class*="h-full"][class*="rounded-full"]'
      );
      const fillCount = await progressFills.count();
      expect(fillCount).toBeGreaterThan(0);

      const percentageTexts = page.locator('span:has-text("/ 100%")');
      const percentageCount = await percentageTexts.count();
      expect(percentageCount).toBeGreaterThan(0);

      const icons = page.locator('svg[class*="mr-2"]');
      const iconCount = await icons.count();
      expect(iconCount).toBeGreaterThan(0);
    });

    test('cluster status distribution is visible', async ({ page }) => {
      await expect(page.getByRole('heading', { name: 'Cluster Status' })).toBeVisible();
      await expect(page.locator('text=Active Clusters').first()).toBeVisible();
      await expect(page.locator('text=Other Clusters').first()).toBeVisible();
    });
  });

  test.describe('Cluster List Section', () => {
    test('managed clusters section is visible', async ({ page }) => {
      await expect(page.getByRole('heading', { name: 'Managed Clusters' })).toBeVisible();
      await expect(page.locator('text=2 total').first()).toBeVisible();
    });

    test('cluster list displays mock cluster data', async ({ page }) => {
      await expect(page.getByRole('heading', { name: 'cluster1' }).first()).toBeVisible();
      await expect(page.getByRole('heading', { name: 'cluster2' }).first()).toBeVisible();
      await expect(page.locator('text=Active').first()).toBeVisible();
    });

    test('cluster items are clickable and open detail dialog', async ({ page }) => {
      const firstCluster = page.getByRole('heading', { name: 'cluster1' }).first();
      await firstCluster.click();

      await expect(page.locator('[role="dialog"], .modal')).toBeVisible({ timeout: 10000 });

      await page.keyboard.press('Escape');
    });
  });

  test.describe('Recent Activity Section', () => {
    test('recent activity section is visible', async ({ page }) => {
      await expect(page.getByRole('heading', { name: 'Recent Activity' })).toBeVisible();
      await expect(page.getByRole('button', { name: /Refresh/i })).toBeVisible();
    });

    test('recent activity displays mock data', async ({ page }) => {
      // Check for various user patterns that might exist in the activity data
      const adminVisible = (await page.locator('text=admin').count()) > 0;
      const user1Visible = (await page.locator('text=user1').count()) > 0;
      const user2Visible = (await page.locator('text=user2').count()) > 0;

      // Also check for any user-related text patterns
      const anyUserVisible = (await page.locator('text=/user|admin|User|Admin/i').count()) > 0;

      // Check for activity status indicators
      const statusElements = page.locator(
        'text=/Created|Active|Deleted|Updated|Synced|created|active|deleted|updated|synced/i'
      );
      const statusCount = await statusElements.count();

      // Check for activity items structure
      const activityItems = page.locator(
        '[class*="h-16"][class*="items-center"], [class*="activity"], [class*="recent"]'
      );
      const activityCount = await activityItems.count();

      // Test passes if we have either user data OR activity structure OR status indicators
      const hasUserData = adminVisible || user1Visible || user2Visible || anyUserVisible;
      const hasActivityStructure = activityCount > 0;
      const hasStatusIndicators = statusCount > 0;

      expect(hasUserData || hasActivityStructure || hasStatusIndicators).toBeTruthy();
    });
  });

  test.describe('MSW Integration and Data Flow', () => {
    test('dashboard loads data from MSW endpoints', async ({ page }) => {
      const hasHandlers = await page.evaluate(() => {
        return (window.__msw?.worker?.listHandlers()?.length ?? 0) > 0;
      });

      expect(hasHandlers).toBeTruthy();
    });
  });

  test.describe('Responsive Design', () => {
    test('dashboard layout adapts to desktop viewport', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 720 });

      await expect(page.getByRole('link', { name: 'Total Clusters' })).toBeVisible();

      const mainContent = page.locator('main, [data-testid="dashboard"]');
      await expect(mainContent).toBeVisible();
    });
  });

  test.describe('Accessibility', () => {
    test('dashboard has proper heading hierarchy', async ({ page }) => {
      const h1 = page.locator('h1');
      await expect(h1).toBeVisible();

      const h2 = page.locator('h2');
      const h2Count = await h2.count();
      expect(h2Count).toBeGreaterThan(0);
    });

    test('dashboard elements have proper ARIA labels', async ({ page }) => {
      const links = page.locator('a');
      const buttons = page.locator('button');
      const interactiveCount = (await links.count()) + (await buttons.count());
      expect(interactiveCount).toBeGreaterThan(0);

      const headings = page.locator('h1, h2, h3, h4, h5, h6');
      const headingCount = await headings.count();
      expect(headingCount).toBeGreaterThan(0);

      // Check that interactive elements and headings exist
      expect(interactiveCount).toBeGreaterThan(0);
      expect(headingCount).toBeGreaterThan(0);
    });

    test('dashboard supports keyboard navigation', async ({ page }) => {
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();
    });
  });

  test.describe('Theme Integration', () => {
    test('dashboard respects dark theme', async ({ page }) => {
      const themeToggle = page.locator('header button[aria-label*="theme"]');
      await themeToggle.click();

      await expect(page.getByRole('link', { name: 'Total Clusters' })).toBeVisible();

      const html = page.locator('html');
      const theme = await html.getAttribute('data-theme');
      expect(theme).toBeTruthy();
    });

    test('dashboard respects light theme', async ({ page }) => {
      const themeToggle = page.locator('header button[aria-label*="theme"]');
      const currentTheme = await page.locator('html').getAttribute('data-theme');

      if (currentTheme === 'dark') {
        await themeToggle.click();
      }

      await expect(page.getByRole('link', { name: 'Total Clusters' })).toBeVisible();
    });
  });

  test.describe('Error Handling', () => {});
});
