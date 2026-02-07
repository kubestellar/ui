/**
 * Helm Dashboard Configuration
 */
import type { UnifiedDashboardConfig } from '../../lib/unified/types'

export const helmDashboardConfig: UnifiedDashboardConfig = {
  id: 'helm',
  name: 'Helm Releases',
  subtitle: 'Helm chart versions, releases, and values',
  route: '/helm',
  statsType: 'helm',
  cards: [
    { id: 'helm-release-status-1', cardType: 'helm_release_status', position: { w: 8, h: 4 } },
    { id: 'chart-versions-1', cardType: 'chart_versions', position: { w: 4, h: 3 } },
    { id: 'helm-history-1', cardType: 'helm_history', position: { w: 6, h: 3 } },
    { id: 'helm-values-diff-1', cardType: 'helm_values_diff', position: { w: 6, h: 4 } },
  ],
  features: {
    dragDrop: true,
    addCard: true,
    autoRefresh: true,
    autoRefreshInterval: 60000,
  },
  storageKey: 'helm-dashboard-cards',
}

export default helmDashboardConfig
