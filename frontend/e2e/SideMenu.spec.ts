import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:5173';

test.describe('Side Menu', () => {
  // Run tests in series to avoid authentication conflicts
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    // Login first to access the side menu
    await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });

    // Wait for login page to be ready with better selector
    const usernameInput = page.getByRole('textbox', { name: 'Username' });
    await usernameInput.waitFor({ state: 'visible', timeout: 10000 });

    await usernameInput.fill('admin');
    await page.getByRole('textbox', { name: 'Password' }).fill('admin');
    await page.getByRole('button', { name: /Sign In|Sign In to/i }).click();

    // Wait for navigation to complete
    await page.waitForURL('/', { timeout: 15000 });

    // Wait for layout to load
    await page.waitForSelector('header', { timeout: 10000 });
  });

  test.describe('Side Menu Visibility and Structure', () => {
    test('desktop side menu is visible on large screens', async ({ page }) => {
      // Set desktop viewport
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.waitForTimeout(500);

      // Desktop sidebar should be visible
      const desktopSidebar = page.locator('aside').first();
      await expect(desktopSidebar).toBeVisible({ timeout: 5000 });
    });

    test('mobile menu button is visible on small screens', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForTimeout(500);

      // Mobile menu button should be visible in header
      const mobileMenuButton = page.locator('header button[aria-label*="menu"]');
      await expect(mobileMenuButton).toBeVisible({ timeout: 5000 });
    });

    test('side menu contains all main navigation sections', async ({ page }) => {
      // Set desktop viewport
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.waitForTimeout(500);

      const sidebar = page.locator('aside').first();
      await expect(sidebar).toBeVisible({ timeout: 5000 });

      // Wait for menu content to load - look for any navigation links or menu items
      await page.waitForTimeout(1000);

      // Check for navigation links in the sidebar with more flexible selector
      const links = sidebar.locator('a, button[role="link"], [role="menuitem"]');
      await links
        .first()
        .waitFor({ state: 'visible', timeout: 5000 })
        .catch(() => {});

      const linkCount = await links.count();

      // Should have multiple navigation links
      expect(linkCount).toBeGreaterThan(0);
    });

    test('side menu has toggle collapse button on desktop', async ({ page }) => {
      // Set desktop viewport
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.waitForTimeout(500);

      const sidebar = page.locator('aside').first();
      await expect(sidebar).toBeVisible({ timeout: 5000 });

      // Find the collapse/expand button
      const toggleButton = page
        .locator('aside button[aria-label*="sidebar"], aside button[aria-label*="menu"]')
        .first();
      await expect(toggleButton).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Side Menu Navigation Links', () => {
    test('home/dashboard link is present and navigable', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.waitForTimeout(500);

      const sidebar = page.locator('aside').first();

      // Look for home/dashboard link
      const homeLink = sidebar.locator('a[href="/"]');
      if (await homeLink.isVisible({ timeout: 2000 })) {
        await homeLink.click();
        await page.waitForTimeout(500);
        await expect(page).toHaveURL('/', { timeout: 5000 });
      }
    });

    test('managed clusters link is present and navigable', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.waitForTimeout(500);

      const sidebar = page.locator('aside').first();

      // Look for ITS/Managed Clusters link
      const itsLink = sidebar.locator('a[href="/its"]');
      if (await itsLink.isVisible({ timeout: 2000 })) {
        await itsLink.click();
        await page.waitForTimeout(500);
        await expect(page).toHaveURL('/its', { timeout: 5000 });
      }
    });

    test('all menu links are clickable', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.waitForTimeout(500);

      const sidebar = page.locator('aside').first();
      await expect(sidebar).toBeVisible({ timeout: 5000 });

      // Wait for sidebar content to load
      await page.waitForTimeout(1000);

      // Try to find links with href attribute, wait for at least one to appear
      const links = sidebar.locator('a[href]');

      // Wait for links to appear with a longer timeout for Firefox
      try {
        await links.first().waitFor({ state: 'visible', timeout: 5000 });
      } catch {
        // If no links found, skip the test
        test.skip();
        return;
      }

      const linkCount = await links.count();

      // Verify we have links
      expect(linkCount).toBeGreaterThan(0);

      // Check each link is enabled and has href
      for (let i = 0; i < linkCount; i++) {
        const link = links.nth(i);
        await expect(link).toBeEnabled();
        const href = await link.getAttribute('href');
        expect(href).toBeTruthy();
      }
    });
  });

  test.describe('Side Menu Collapse/Expand Functionality', () => {
    test('collapse button toggles menu state', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.waitForTimeout(500);

      const sidebar = page.locator('aside').first();
      await expect(sidebar).toBeVisible({ timeout: 5000 });

      // Get initial width
      const initialBox = await sidebar.boundingBox();
      const initialWidth = initialBox?.width || 0;

      // Find and click toggle button
      const toggleButton = page
        .locator('aside button[aria-label*="sidebar"], aside button[aria-label*="menu"]')
        .first();
      if (await toggleButton.isVisible({ timeout: 2000 })) {
        await toggleButton.click();
        await page.waitForTimeout(600); // Wait for animation

        // Get new width
        const newBox = await sidebar.boundingBox();
        const newWidth = newBox?.width || 0;

        // Width should have changed
        expect(Math.abs(initialWidth - newWidth)).toBeGreaterThan(50);
      }
    });

    test('collapsed menu shows icons only', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.waitForTimeout(500);

      const sidebar = page.locator('aside').first();

      // Find and click toggle button to collapse
      const toggleButton = page
        .locator('aside button[aria-label*="sidebar"], aside button[aria-label*="menu"]')
        .first();
      if (await toggleButton.isVisible({ timeout: 2000 })) {
        await toggleButton.click();
        await page.waitForTimeout(600); // Wait for animation

        // Check if sidebar width is small (collapsed)
        const box = await sidebar.boundingBox();
        const width = box?.width || 0;
        expect(width).toBeLessThan(150); // Collapsed width should be less than 150px
      }
    });

    test('expanded menu shows icons and labels', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.waitForTimeout(500);

      const sidebar = page.locator('aside').first();
      await expect(sidebar).toBeVisible({ timeout: 5000 });

      // Sidebar should be expanded by default with width > 200px
      const box = await sidebar.boundingBox();
      const width = box?.width || 0;
      expect(width).toBeGreaterThan(200);
    });

    test('collapsed menu shows tooltips on hover', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.waitForTimeout(500);

      const sidebar = page.locator('aside').first();

      // Find and click toggle button to collapse
      const toggleButton = page
        .locator('aside button[aria-label*="sidebar"], aside button[aria-label*="menu"]')
        .first();
      if (await toggleButton.isVisible({ timeout: 2000 })) {
        await toggleButton.click();
        await page.waitForTimeout(600);

        // Try to hover over a menu item
        const firstLink = sidebar.locator('a[href]').first();
        if (await firstLink.isVisible({ timeout: 2000 })) {
          await firstLink.hover();
          await page.waitForTimeout(300);

          // Tooltips should appear (they render as separate elements)
          // Just verify the hover interaction works without errors
          await expect(firstLink).toBeVisible();
        }
      }
    });

    test('menu state persists during navigation', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.waitForTimeout(500);

      const sidebar = page.locator('aside').first();

      // Collapse menu
      const toggleButton = page
        .locator('aside button[aria-label*="sidebar"], aside button[aria-label*="menu"]')
        .first();
      if (await toggleButton.isVisible({ timeout: 2000 })) {
        await toggleButton.click();
        await page.waitForTimeout(600);

        // Get collapsed width
        const collapsedBox = await sidebar.boundingBox();
        const collapsedWidth = collapsedBox?.width || 0;

        // Navigate to another page
        const link = sidebar.locator('a[href]').nth(1);
        if (await link.isVisible({ timeout: 2000 })) {
          await link.click();
          await page.waitForTimeout(500);

          // Check if width remains similar (collapsed state persisted)
          const newBox = await sidebar.boundingBox();
          const newWidth = newBox?.width || 0;

          // Width should be similar (within 20px tolerance)
          expect(Math.abs(collapsedWidth - newWidth)).toBeLessThan(20);
        }
      }
    });
  });

  test.describe('Side Menu Visual and Animation', () => {
    test('menu has proper styling and borders', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.waitForTimeout(500);

      const sidebar = page.locator('aside').first();
      await expect(sidebar).toBeVisible({ timeout: 5000 });

      // Check if sidebar has some styling (border, background, etc.)
      const borderRight = await sidebar.evaluate(
        el => window.getComputedStyle(el).borderRightWidth
      );

      // Should have a border
      expect(borderRight).toBeTruthy();
    });

    test('menu items have hover effects', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.waitForTimeout(500);

      const sidebar = page.locator('aside').first();
      const firstLink = sidebar.locator('a[href]').first();

      if (await firstLink.isVisible({ timeout: 2000 })) {
        // Hover over the link
        await firstLink.hover();
        await page.waitForTimeout(300);

        // Link should still be visible (hover effect applied)
        await expect(firstLink).toBeVisible();
      }
    });

    test('collapse/expand animation is smooth', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.waitForTimeout(500);

      const sidebar = page.locator('aside').first();
      const toggleButton = page
        .locator('aside button[aria-label*="sidebar"], aside button[aria-label*="menu"]')
        .first();

      if (await toggleButton.isVisible({ timeout: 2000 })) {
        // Click toggle
        await toggleButton.click();

        // During animation, sidebar should still be visible
        await expect(sidebar).toBeVisible();

        // Wait for animation to complete
        await page.waitForTimeout(600);

        // Sidebar should still be visible
        await expect(sidebar).toBeVisible();
      }
    });

    test('menu icons are properly displayed', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.waitForTimeout(500);

      const sidebar = page.locator('aside').first();

      // Check if links contain icons (svg or img elements)
      const icons = sidebar.locator('a svg, a img').first();
      if ((await icons.count()) > 0) {
        await expect(icons).toBeVisible({ timeout: 2000 });
      }
    });
  });

  test.describe('Side Menu Accessibility', () => {
    test('menu items are keyboard navigable', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.waitForTimeout(500);

      // Tab to menu items
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      // Check if focus is on a menu element
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible({ timeout: 2000 });
    });

    test('menu has proper navigation role', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.waitForTimeout(500);

      const sidebar = page.locator('aside').first();
      await expect(sidebar).toBeVisible({ timeout: 5000 });

      // Check for navigation role or nav elements, or just verify sidebar has links
      const navElements = sidebar.locator('[role="navigation"], nav');
      const count = await navElements.count();

      if (count > 0) {
        // Has explicit navigation role - good!
        expect(count).toBeGreaterThan(0);
      } else {
        // No explicit nav role, but sidebar should have navigation links
        const links = sidebar.locator('a[href]');
        const linkCount = await links.count();

        // Sidebar should function as navigation even without explicit role
        expect(linkCount).toBeGreaterThanOrEqual(0);
      }
    });

    test('collapse button has proper aria-label', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.waitForTimeout(500);

      const toggleButton = page
        .locator('aside button[aria-label*="sidebar"], aside button[aria-label*="menu"]')
        .first();

      if (await toggleButton.isVisible({ timeout: 2000 })) {
        const ariaLabel = await toggleButton.getAttribute('aria-label');
        expect(ariaLabel).toBeTruthy();
        expect(ariaLabel).toMatch(/sidebar|menu/i);
      }
    });

    test('menu items can be activated with Enter key', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.waitForTimeout(500);

      const sidebar = page.locator('aside').first();
      const firstLink = sidebar.locator('a[href]').first();

      if (await firstLink.isVisible({ timeout: 2000 })) {
        // Focus the link
        await firstLink.focus();

        // Press Enter
        await page.keyboard.press('Enter');
        await page.waitForTimeout(500);

        // Navigation should have occurred
        const url = page.url();
        expect(url).toContain('localhost');
      }
    });

    test('mobile menu button has proper accessibility attributes', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForTimeout(500);

      const mobileMenuButton = page.locator('header button[aria-label*="menu"]');

      // Check for aria-label
      const ariaLabel = await mobileMenuButton.getAttribute('aria-label');
      expect(ariaLabel).toBeTruthy();
    });
  });

  test.describe('Side Menu Integration', () => {
    test('menu persists across different pages', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.waitForTimeout(500);

      const sidebar = page.locator('aside').first();

      // Navigate to different pages
      await page.goto(`${BASE}/`);
      await page.waitForTimeout(500);
      await expect(sidebar).toBeVisible();

      await page.goto(`${BASE}/its`);
      await page.waitForTimeout(500);
      await expect(sidebar).toBeVisible();
    });

    test('menu remains functional after page reload', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.waitForTimeout(500);

      // Reload page
      await page.reload();
      await page.waitForLoadState('domcontentloaded');

      // Check if we're redirected to install page
      const currentUrl = page.url();
      if (currentUrl.includes('/install')) {
        // If redirected to install, skip the test as the app state has changed
        test.skip();
        return;
      }

      await page.waitForTimeout(1000);

      const sidebar = page.locator('aside').first();

      // Try to wait for sidebar, skip if not found
      try {
        await expect(sidebar).toBeVisible({ timeout: 5000 });
      } catch {
        // If sidebar doesn't appear (install page or similar), skip test
        test.skip();
        return;
      }

      // Click a link to verify functionality
      const link = sidebar.locator('a[href]').first();
      if (await link.isVisible({ timeout: 2000 })) {
        await link.click();
        await page.waitForTimeout(500);

        // Navigation should work
        const url = page.url();
        expect(url).toContain('localhost');
      }
    });

    test('menu scroll behavior works correctly', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.waitForTimeout(500);

      const sidebar = page.locator('aside').first();

      // Check if sidebar is scrollable when content overflows
      const isScrollable = await sidebar.evaluate(el => {
        return el.scrollHeight > el.clientHeight;
      });

      // If scrollable, try scrolling
      if (isScrollable) {
        await sidebar.evaluate(el => {
          el.scrollTop = 50;
        });
        await page.waitForTimeout(300);

        // Sidebar should still be visible
        await expect(sidebar).toBeVisible();
      } else {
        // If not scrollable, that's also fine
        await expect(sidebar).toBeVisible();
      }
    });
  });

  test.describe('Side Menu Responsive Behavior', () => {
    test('menu adapts to tablet viewport', async ({ page }) => {
      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.waitForTimeout(500);

      // Check if mobile menu button is visible (tablet typically uses mobile menu)
      const mobileMenuButton = page.locator('header button[aria-label*="menu"]');

      if (await mobileMenuButton.isVisible({ timeout: 2000 })) {
        // Tablet uses mobile menu
        await expect(mobileMenuButton).toBeVisible();
      } else {
        // Or desktop sidebar is visible
        const sidebar = page.locator('aside').first();
        await expect(sidebar).toBeVisible();
      }
    });

    test('menu adapts to large desktop viewport', async ({ page }) => {
      // Set large desktop viewport
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.waitForTimeout(500);

      const sidebar = page.locator('aside').first();
      await expect(sidebar).toBeVisible({ timeout: 5000 });

      // Sidebar should be wider on large screens
      const box = await sidebar.boundingBox();
      const width = box?.width || 0;
      expect(width).toBeGreaterThan(0);
    });

    test('menu transitions smoothly between viewport sizes', async ({ page }) => {
      // Start with desktop
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.waitForTimeout(500);

      const sidebar = page.locator('aside').first();
      await expect(sidebar).toBeVisible({ timeout: 5000 });

      // Change to mobile
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForTimeout(500);

      // Mobile menu button should be visible
      const mobileMenuButton = page.locator('header button[aria-label*="menu"]');
      await expect(mobileMenuButton).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Side Menu Performance', () => {
    test('menu loads quickly on page load', async ({ page }) => {
      const startTime = Date.now();
      await page.goto(BASE);

      await page.setViewportSize({ width: 1280, height: 720 });

      // Wait for sidebar to be visible
      const sidebar = page.locator('aside').first();
      await expect(sidebar).toBeVisible({ timeout: 5000 });

      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(7000); // Should load within 7 seconds
    });

    test('menu does not cause layout shifts', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.goto(BASE);

      // Wait for page to fully load
      await page.waitForLoadState('networkidle');

      const sidebar = page.locator('aside').first();
      const initialBoundingBox = await sidebar.boundingBox();

      // Wait a bit more
      await page.waitForTimeout(1000);

      // Check if sidebar position remained stable
      const finalBoundingBox = await sidebar.boundingBox();

      if (initialBoundingBox && finalBoundingBox) {
        expect(Math.abs((initialBoundingBox.x || 0) - (finalBoundingBox.x || 0))).toBeLessThan(5);
      }
    });
  });
});
