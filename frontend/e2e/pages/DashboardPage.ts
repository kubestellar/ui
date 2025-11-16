import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base/BasePage';
import { MSWHelper } from './utils/MSWHelper';

/**
 * Dashboard Page Object Model
 * Encapsulates all interactions with the Dashboard page
 */
export class DashboardPage extends BasePage {
  // MSW Helper
  readonly mswHelper: MSWHelper;

  // Main page elements
  readonly dashboardHeading: Locator;
  readonly dashboardContainer: Locator;

  // Navigation elements
  readonly manageClustersLink: Locator;

  // Statistics Cards
  readonly totalClustersCard: Locator;
  readonly activeClustersCard: Locator;
  readonly bindingPoliciesCard: Locator;
  readonly currentContextCard: Locator;

  // Health Overview Section
  readonly healthOverviewSection: Locator;
  readonly clusterHealthHeading: Locator;
  readonly systemHealthText: Locator;
  readonly progressBars: Locator;
  readonly cpuProgress: Locator;
  readonly memoryProgress: Locator;
  readonly podProgress: Locator;
  readonly progressPercentages: Locator;
  readonly tooltipTriggers: Locator;

  // Cluster Status Distribution
  readonly clusterStatusHeading: Locator;
  readonly activeClustersText: Locator;
  readonly otherClustersText: Locator;

  // Cluster List Section
  readonly managedClustersSection: Locator;
  readonly managedClustersHeading: Locator;
  readonly clusterCountText: Locator;
  readonly clusterItems: Locator;

  // Recent Activity Section
  readonly recentActivitySection: Locator;
  readonly recentActivityHeading: Locator;
  readonly refreshButton: Locator;
  readonly activityItems: Locator;

  constructor(page: Page) {
    super(page);
    this.mswHelper = new MSWHelper(page);

    // Main page elements
    this.dashboardHeading = page.getByRole('heading', { name: 'Dashboard' });
    this.dashboardContainer = page.locator('main, [data-testid="dashboard"]').first();

    // Navigation elements
    this.manageClustersLink = page.getByRole('link', { name: 'Manage Clusters' });

    // Statistics Cards - using role-based selectors for better reliability
    this.totalClustersCard = page.getByRole('link', { name: 'Total Clusters' });
    this.activeClustersCard = page.getByRole('link', { name: 'Active Clusters' });
    this.bindingPoliciesCard = page.getByText(/Binding Policies/i).first();
    this.currentContextCard = page.getByText(/Current Context/i).first();

    // Health Overview Section
    this.healthOverviewSection = page.locator('[class*="health"], [class*="overview"]').first();
    this.clusterHealthHeading = page.getByRole('heading', { name: 'Cluster Health' });
    this.systemHealthText = page.getByText('System Health');
    this.progressBars = page.locator(
      'div[class*="h-4"][class*="w-full"][class*="rounded-full"][class*="bg-gray-100"]'
    );
    this.cpuProgress = page.locator('div').filter({ hasText: /CPU|cpu/i }).locator('xpath=ancestor::div[contains(@class, "progress")]').first();
    this.memoryProgress = page.locator('div').filter({ hasText: /Memory|memory/i }).locator('xpath=ancestor::div[contains(@class, "progress")]').first();
    this.podProgress = page.locator('div').filter({ hasText: /Pod|pod/i }).locator('xpath=ancestor::div[contains(@class, "progress")]').first();
    this.progressPercentages = page.locator('span:has-text("/ 100%")');
    this.tooltipTriggers = page.locator('svg[width="12"][height="12"]');

    // Cluster Status Distribution
    this.clusterStatusHeading = page.getByRole('heading', { name: 'Cluster Status' });
    this.activeClustersText = page.locator('text=Active Clusters').first();
    this.otherClustersText = page.locator('text=Other Clusters').first();

    // Cluster List Section
    this.managedClustersSection = page.locator('[class*="managed"], [class*="cluster"]').first();
    this.managedClustersHeading = page.getByRole('heading', { name: 'Managed Clusters' });
    this.clusterCountText = page.locator('text=/\\d+ total/').first();
    this.clusterItems = page.locator('[class*="h-16"][class*="items-center"], [class*="cluster"], [class*="item"]');

    // Recent Activity Section
    this.recentActivitySection = page.locator('[class*="activity"], [class*="recent"]').first();
    this.recentActivityHeading = page.getByRole('heading', { name: 'Recent Activity' });
    this.refreshButton = page.getByRole('button', { name: /Refresh/i });
    this.activityItems = page.locator(
      '[class*="h-16"][class*="items-center"], [class*="activity"], [class*="recent"]'
    );
  }

  /**
   * Navigate to dashboard page
   */
  async goto() {
    await super.goto('/');
  }

  /**
   * Wait for dashboard to fully load
   */
  async waitForLoad() {
    await this.page.waitForLoadState('domcontentloaded');
    await expect(this.dashboardHeading).toBeVisible({ timeout: 10000 });

    // Wait for dashboard to load - use waitForFunction for better Chromium compatibility
    await this.page.waitForFunction(
      () => {
        const heading = document.querySelector('h1');
        return heading && heading.textContent?.includes('Dashboard');
      },
      { timeout: 10000 }
    );
  }

  /**
   * Apply MSW scenario
   */
  async applyMSWScenario(scenarioName: string) {
    await this.mswHelper.applyScenario(scenarioName);
  }

  // ===== STATISTICS CARDS METHODS =====

  /**
   * Get total clusters stat card
   */
  getTotalClustersCard(): Locator {
    return this.totalClustersCard;
  }

  /**
   * Get active clusters stat card
   */
  getActiveClustersCard(): Locator {
    return this.activeClustersCard;
  }

  /**
   * Get binding policies card
   */
  getBindingPoliciesCard(): Locator {
    return this.bindingPoliciesCard;
  }

  /**
   * Get current context card
   */
  getCurrentContextCard(): Locator {
    return this.currentContextCard;
  }

  /**
   * Click on stat card to navigate
   */
  async clickStatCard(cardName: string) {
    const cardMap: Record<string, Locator> = {
      'Total Clusters': this.totalClustersCard,
      'Active Clusters': this.activeClustersCard,
      'Binding Policies': this.bindingPoliciesCard,
      'Current Context': this.currentContextCard,
    };

    const card = cardMap[cardName];
    if (!card) {
      throw new Error(`Unknown stat card: ${cardName}`);
    }

    await card.click();
  }

  /**
   * Get value from stat card
   */
  async getStatCardValue(cardName: string): Promise<string | null> {
    const cardMap: Record<string, Locator> = {
      'Total Clusters': this.totalClustersCard,
      'Active Clusters': this.activeClustersCard,
    };

    const card = cardMap[cardName];
    if (!card) {
      throw new Error(`Stat card value not available for: ${cardName}`);
    }

    return await card.textContent();
  }

  // ===== HEALTH OVERVIEW METHODS =====

  /**
   * Get health overview section
   */
  getHealthOverview(): Locator {
    return this.healthOverviewSection;
  }

  /**
   * Get all resource utilization progress bars
   */
  getProgressBars(): Locator {
    return this.progressBars;
  }

  /**
   * Get CPU utilization progress
   */
  getCPUProgress(): Locator {
    return this.cpuProgress;
  }

  /**
   * Get memory utilization progress
   */
  getMemoryProgress(): Locator {
    return this.memoryProgress;
  }

  /**
   * Get pod utilization progress
   */
  getPodProgress(): Locator {
    return this.podProgress;
  }

  /**
   * Get progress bar percentage value
   */
  async getProgressBarValue(resourceType: string): Promise<string | null> {
    const resourceMap: Record<string, Locator> = {
      'CPU': this.cpuProgress,
      'Memory': this.memoryProgress,
      'Pod': this.podProgress,
    };

    const resourceElement = resourceMap[resourceType];
    if (!resourceElement) {
      throw new Error(`Unknown resource type: ${resourceType}`);
    }

    // Find the percentage text within or near the resource element
    const percentageText = resourceElement.locator('span:has-text("/ 100%")').first();
    return await percentageText.textContent();
  }

  // ===== CLUSTER LIST METHODS =====

  /**
   * Get managed clusters section
   */
  getClusterList(): Locator {
    return this.managedClustersSection;
  }

  /**
   * Get total cluster count
   */
  async getClusterCount(): Promise<number> {
    const countText = await this.clusterCountText.textContent();
    if (!countText) return 0;

    const match = countText.match(/(\d+)\s*total/);
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * Click cluster to view details
   */
  async clickCluster(clusterName: string) {
    const clusterHeading = this.page.getByRole('heading', { name: clusterName });
    await clusterHeading.click();
  }

  /**
   * Get cluster status
   */
  async getClusterStatus(clusterName: string): Promise<string | null> {
    const clusterItem = this.page.locator(`[class*="cluster"], [class*="item"]`).filter({ hasText: clusterName });
    const statusElement = clusterItem.locator('text=/Active|Inactive|Pending|Error/i').first();
    return await statusElement.textContent();
  }

  /**
   * Get cluster capacity info
   */
  async getClusterCapacity(clusterName: string): Promise<string[]> {
    const clusterItem = this.page.locator(`[class*="cluster"], [class*="item"]`).filter({ hasText: clusterName });
    const capacityElements = clusterItem.locator(
      'text=/\\d+\\s*(GB|MB|Ki|Mi|Gi)|\\d+\\s*cpu|\\d+\\s*pods/i'
    );

    const capacityInfo: string[] = [];
    const count = await capacityElements.count();

    for (let i = 0; i < count; i++) {
      const text = await capacityElements.nth(i).textContent();
      if (text) {
        capacityInfo.push(text);
      }
    }

    return capacityInfo;
  }

  // ===== RECENT ACTIVITY METHODS =====

  /**
   * Get recent activity section
   */
  getRecentActivity(): Locator {
    return this.recentActivitySection;
  }

  /**
   * Click refresh button
   */
  async refreshActivity() {
    await this.refreshButton.click();
  }

  /**
   * Get all activity items
   */
  getActivityItems(): Locator {
    return this.activityItems;
  }

  /**
   * Get activity item count
   */
  async getActivityCount(): Promise<number> {
    return await this.activityItems.count();
  }

  // ===== CLUSTER STATUS DISTRIBUTION METHODS =====

  /**
   * Get cluster status distribution
   */
  getStatusDistribution(): Locator {
    return this.page.locator('[class*="status"], [class*="distribution"]').first();
  }

  /**
   * Get active clusters count
   */
  async getActiveClustersCount(): Promise<number> {
    const activeText = await this.activeClustersText.textContent();
    if (!activeText) return 0;

    // Extract number from text like "Active Clusters: 2" or just "2"
    const match = activeText.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * Get other clusters count
   */
  async getOtherClustersCount(): Promise<number> {
    const otherText = await this.otherClustersText.textContent();
    if (!otherText) return 0;

    // Extract number from text like "Other Clusters: 0" or just "0"
    const match = otherText.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }
}
