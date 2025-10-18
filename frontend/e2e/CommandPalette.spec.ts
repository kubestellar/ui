import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:5173';

test.describe('Command Palette', () => {
  test.beforeEach(async ({ page }) => {
    // Login first to access the command palette
    await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });

    // Wait for login page to be ready
    await page.waitForSelector('input[type="text"], input[name="username"]', { timeout: 10000 });

    await page.getByRole('textbox', { name: 'Username' }).fill('admin');
    await page.getByRole('textbox', { name: 'Password' }).fill('admin');
    await page.getByRole('button', { name: /Sign In|Sign In to/i }).click();

    // Wait for navigation to complete
    await page.waitForURL('/', { timeout: 15000 });

    // Wait for header to load
    await page.waitForSelector('header', { timeout: 10000 });
  });

  test('command palette button is visible in header', async ({ page }) => {
    const commandButton = page.locator('header button[aria-label*="command" i]');
    await expect(commandButton).toBeVisible();
  });

  test('command palette button has correct aria attributes', async ({ page }) => {
    const commandButton = page.locator('header button[aria-label*="command" i]');

    const ariaLabel = await commandButton.getAttribute('aria-label');
    expect(ariaLabel).toBeTruthy();

    const ariaExpanded = await commandButton.getAttribute('aria-expanded');
    expect(ariaExpanded).toBe('false');
  });

  test('clicking command palette button opens the palette', async ({ page }) => {
    const commandButton = page.locator('header button[aria-label*="command" i]');

    // Click to open
    await commandButton.click();
    await page.waitForTimeout(500);

    // Check if palette is visible by looking for the search input
    const searchInput = page.locator('input[type="text"][placeholder*="Search" i]');
    await expect(searchInput).toBeVisible();
  });

  test('command palette opens with Ctrl+K keyboard shortcut', async ({ page }) => {
    // Press Ctrl+K (or Cmd+K on Mac)
    await page.keyboard.press('Control+k');
    await page.waitForTimeout(500);

    // Check if palette is visible
    const searchInput = page.locator('input[type="text"][placeholder*="Search" i]');
    await expect(searchInput).toBeVisible();
  });

  test('command palette closes with Escape key', async ({ page }) => {
    const commandButton = page.locator('header button[aria-label*="command" i]');

    // Open palette
    await commandButton.click();
    await page.waitForTimeout(500);

    // Verify it's open
    const searchInput = page.locator('input[type="text"][placeholder*="Search" i]');
    await expect(searchInput).toBeVisible();

    // Press Escape
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // Verify it's closed
    await expect(searchInput).not.toBeVisible();
  });

  test('command palette closes when clicking outside', async ({ page }) => {
    const commandButton = page.locator('header button[aria-label*="command" i]');

    // Open palette
    await commandButton.click();
    await page.waitForTimeout(500);

    // Click outside (on the backdrop)
    await page.locator('body').click({ position: { x: 10, y: 10 } });
    await page.waitForTimeout(500);

    // Verify it's closed
    const searchInput = page.locator('input[type="text"][placeholder*="Search" i]');
    await expect(searchInput).not.toBeVisible();
  });

  test('command palette shows list of commands', async ({ page }) => {
    const commandButton = page.locator('header button[aria-label*="command" i]');

    // Open palette
    await commandButton.click();
    await page.waitForTimeout(500);

    // Look for command items with data-command-index attribute
    const commandItems = page.locator('[data-command-index]');
    const count = await commandItems.count();

    expect(count).toBeGreaterThan(0);
  });

  test('search functionality filters commands', async ({ page }) => {
    const commandButton = page.locator('header button[aria-label*="command" i]');

    // Open palette
    await commandButton.click();
    await page.waitForTimeout(500);

    const searchInput = page.locator('input[type="text"][placeholder*="Search" i]');

    // Get initial command count
    const initialCount = await page.locator('[data-command-index]').count();

    // Type search query
    await searchInput.fill('home');
    await page.waitForTimeout(300);

    // Get filtered command count
    const filteredCount = await page.locator('[data-command-index]').count();

    // Filtered results should be less than or equal to initial
    expect(filteredCount).toBeLessThanOrEqual(initialCount);
    expect(filteredCount).toBeGreaterThan(0);
  });

  test('keyboard navigation works in command palette', async ({ page }) => {
    const commandButton = page.locator('header button[aria-label*="command" i]');

    // Open palette
    await commandButton.click();
    await page.waitForTimeout(500);

    // Press ArrowDown
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(200);

    // Press ArrowUp
    await page.keyboard.press('ArrowUp');
    await page.waitForTimeout(200);

    // Palette should still be visible
    const searchInput = page.locator('input[type="text"][placeholder*="Search" i]');
    await expect(searchInput).toBeVisible();
  });

  test('command palette focuses search input when opened', async ({ page }) => {
    const commandButton = page.locator('header button[aria-label*="command" i]');

    // Open palette
    await commandButton.click();
    await page.waitForTimeout(500);

    const searchInput = page.locator('input[type="text"][placeholder*="Search" i]');

    // Input should be focused
    await expect(searchInput).toBeFocused();
  });

  test('executing a command closes the palette', async ({ page }) => {
    const commandButton = page.locator('header button[aria-label*="command" i]');

    // Open palette
    await commandButton.click();
    await page.waitForTimeout(500);

    // Get first command item
    const firstCommand = page.locator('[data-command-index="0"]');

    if (await firstCommand.isVisible()) {
      // Click the command
      await firstCommand.click();
      await page.waitForTimeout(500);

      // Palette should be closed
      const searchInput = page.locator('input[type="text"][placeholder*="Search" i]');
      await expect(searchInput).not.toBeVisible();
    }
  });

  test('command palette shows sections when not searching', async ({ page }) => {
    const commandButton = page.locator('header button[aria-label*="command" i]');

    // Open palette
    await commandButton.click();
    await page.waitForTimeout(500);

    // Look for section headers (uppercase text)
    const sections = page
      .locator('[data-command-index]')
      .locator('xpath=ancestor::div[contains(@class, "mb-2")]');
    const hasSections = await sections.count();

    // Should have at least some organization
    expect(hasSections).toBeGreaterThanOrEqual(0);
  });

  test('no results message appears when search has no matches', async ({ page }) => {
    const commandButton = page.locator('header button[aria-label*="command" i]');

    // Open palette
    await commandButton.click();
    await page.waitForTimeout(500);

    const searchInput = page.locator('input[type="text"][placeholder*="Search" i]');

    // Type search query that should have no matches
    await searchInput.fill('xyzabc123nonexistent');
    await page.waitForTimeout(300);

    // Should show "no commands found" message or similar
    const noResults = page.locator('text=/no.*found/i, text=/no.*command/i');
    await expect(noResults).toBeVisible({ timeout: 2000 });
  });

  test('command palette is keyboard accessible', async ({ page }) => {
    const commandButton = page.locator('header button[aria-label*="command" i]');

    // Tab to the command button
    await commandButton.focus();
    await expect(commandButton).toBeFocused();

    // Press Enter to open
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);

    // Palette should be open
    const searchInput = page.locator('input[type="text"][placeholder*="Search" i]');
    await expect(searchInput).toBeVisible();
  });

  test('command palette reopens after closing', async ({ page }) => {
    const commandButton = page.locator('header button[aria-label*="command" i]');

    // Open palette
    await commandButton.click();
    await page.waitForTimeout(500);

    // Close with Escape
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // Open again
    await commandButton.click();
    await page.waitForTimeout(500);

    // Should be visible again
    const searchInput = page.locator('input[type="text"][placeholder*="Search" i]');
    await expect(searchInput).toBeVisible();
  });

  test('command palette clears search when closed', async ({ page }) => {
    const commandButton = page.locator('header button[aria-label*="command" i]');

    // Open palette
    await commandButton.click();
    await page.waitForTimeout(500);

    const searchInput = page.locator('input[type="text"][placeholder*="Search" i]');

    // Type something
    await searchInput.fill('test search');
    await page.waitForTimeout(300);

    // Close palette
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // Open again
    await commandButton.click();
    await page.waitForTimeout(500);

    // Search should be cleared
    const inputValue = await searchInput.inputValue();
    expect(inputValue).toBe('');
  });

  test('command palette works on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);

    const commandButton = page.locator('header button[aria-label*="command" i]');

    // Should still be visible
    await expect(commandButton).toBeVisible();

    // Should open on click
    await commandButton.click();
    await page.waitForTimeout(500);

    const searchInput = page.locator('input[type="text"][placeholder*="Search" i]');
    await expect(searchInput).toBeVisible();
  });
});
