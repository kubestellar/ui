/**
 * CI/CD Dashboard Configuration
 */
import type { UnifiedDashboardConfig } from '../../lib/unified/types'

export const ciCdDashboardConfig: UnifiedDashboardConfig = {
  id: 'ci-cd',
  name: 'CI/CD',
  subtitle: 'Continuous integration and deployment pipelines',
  route: '/ci-cd',
  statsType: 'ci-cd',
  cards: [
    // Top row: Prow overview cards
    { id: 'prow-status-1', cardType: 'prow_status', title: 'Prow Status', position: { w: 4, h: 3 } },
    { id: 'prow-jobs-1', cardType: 'prow_jobs', title: 'Prow Jobs', position: { w: 5, h: 4 } },
    { id: 'prow-ci-monitor-1', cardType: 'prow_ci_monitor', title: 'Prow CI Monitor', position: { w: 6, h: 4 } },
    // Second row: History and GitHub integration
    { id: 'prow-history-1', cardType: 'prow_history', title: 'Prow History', position: { w: 4, h: 3 } },
    { id: 'github-ci-monitor-1', cardType: 'github_ci_monitor', title: 'GitHub CI Monitor', position: { w: 6, h: 4 } },
    { id: 'github-activity-1', cardType: 'github_activity', title: 'GitHub Activity', position: { w: 5, h: 4 } },
  ],
  features: {
    dragDrop: true,
    addCard: true,
    autoRefresh: true,
    autoRefreshInterval: 60000,
  },
  storageKey: 'ci-cd-dashboard-cards',
}

export default ciCdDashboardConfig
