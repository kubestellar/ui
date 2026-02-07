/**
 * Pods Dashboard Configuration
 */
import type { UnifiedDashboardConfig } from '../../lib/unified/types'

export const podsDashboardConfig: UnifiedDashboardConfig = {
  id: 'pods',
  name: 'Pods',
  subtitle: 'Pod status, logs, and troubleshooting',
  route: '/pods',
  statsType: 'pods',
  cards: [
    { id: 'pod-issues-1', cardType: 'pod_issues', position: { w: 8, h: 4 } },
    { id: 'pod-health-trend-1', cardType: 'pod_health_trend', position: { w: 4, h: 3 } },
    { id: 'top-pods-1', cardType: 'top_pods', position: { w: 6, h: 3 } },
    { id: 'warning-events-1', cardType: 'warning_events', position: { w: 6, h: 3 } },
    { id: 'resource-usage-1', cardType: 'resource_usage', position: { w: 6, h: 3 } },
    { id: 'namespace-overview-1', cardType: 'namespace_overview', position: { w: 6, h: 3 } },
  ],
  features: {
    dragDrop: true,
    addCard: true,
    autoRefresh: true,
    autoRefreshInterval: 15000,
  },
  storageKey: 'pods-dashboard-cards',
}

export default podsDashboardConfig
