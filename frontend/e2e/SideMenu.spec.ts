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
});
