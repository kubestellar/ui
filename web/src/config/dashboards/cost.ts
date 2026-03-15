/**
 * Cost Dashboard Configuration
 */
import type { UnifiedDashboardConfig } from '../../lib/unified/types'

export const costDashboardConfig: UnifiedDashboardConfig = {
  id: 'cost',
  name: 'Cost Management',
  subtitle: 'Cluster cost analysis and optimization',
  route: '/cost',
  statsType: 'cost',
  cards: [
    { id: 'cluster-costs-1', cardType: 'cluster_costs', position: { w: 8, h: 4 } },
    { id: 'kubecost-overview-1', cardType: 'kubecost_overview', position: { w: 4, h: 3 } },
    { id: 'opencost-overview-1', cardType: 'opencost_overview', position: { w: 4, h: 3 } },
    { id: 'resource-capacity-1', cardType: 'resource_capacity', position: { w: 6, h: 3 } },
    { id: 'resource-trend-1', cardType: 'resource_trend', position: { w: 6, h: 3 } },
  ],
  features: {
    dragDrop: true,
    addCard: true,
    autoRefresh: true,
    autoRefreshInterval: 300000, // 5 minutes
  },
  storageKey: 'cost-dashboard-cards',
}

export default costDashboardConfig
