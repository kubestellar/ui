/**
 * Nodes Dashboard Configuration
 */
import type { UnifiedDashboardConfig } from '../../lib/unified/types'

export const nodesDashboardConfig: UnifiedDashboardConfig = {
  id: 'nodes',
  name: 'Nodes',
  subtitle: 'Node status, capacity, and management',
  route: '/nodes',
  statsType: 'nodes',
  cards: [
    { id: 'node-status-1', cardType: 'node_status', position: { w: 12, h: 4 } },
    { id: 'resource-usage-1', cardType: 'resource_usage', position: { w: 6, h: 3 } },
    { id: 'resource-capacity-1', cardType: 'resource_capacity', position: { w: 6, h: 3 } },
    { id: 'top-pods-1', cardType: 'top_pods', position: { w: 6, h: 3 } },
    { id: 'upgrade-status-1', cardType: 'upgrade_status', position: { w: 6, h: 3 } },
  ],
  features: {
    dragDrop: true,
    addCard: true,
    autoRefresh: true,
    autoRefreshInterval: 30000,
  },
  storageKey: 'nodes-dashboard-cards',
}

export default nodesDashboardConfig
