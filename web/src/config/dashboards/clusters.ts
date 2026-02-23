/**
 * Clusters Dashboard Configuration
 */
import type { UnifiedDashboardConfig } from '../../lib/unified/types'

export const clustersDashboardConfig: UnifiedDashboardConfig = {
  id: 'clusters',
  name: 'My Clusters',
  subtitle: 'Multi-cluster overview and management',
  route: '/clusters',
  statsType: 'clusters',
  cards: [
    { id: 'offline-detection-1', cardType: 'console_ai_offline_detection', position: { w: 6, h: 3 } },
    { id: 'hardware-health-1', cardType: 'hardware_health', position: { w: 6, h: 3 } },
    { id: 'cluster-health-1', cardType: 'cluster_health', position: { w: 8, h: 4 } },
    { id: 'cluster-groups-1', cardType: 'cluster_groups', position: { w: 4, h: 4 } },
    { id: 'cluster-metrics-1', cardType: 'cluster_metrics', position: { w: 6, h: 3 } },
    { id: 'cluster-comparison-1', cardType: 'cluster_comparison', position: { w: 6, h: 3 } },
    { id: 'provider-health-1', cardType: 'provider_health', position: { w: 4, h: 3 } },
    { id: 'cluster-locations-1', cardType: 'cluster_locations', position: { w: 8, h: 4 } },
  ],
  features: {
    dragDrop: true,
    addCard: true,
    autoRefresh: true,
    autoRefreshInterval: 30000,
  },
  storageKey: 'clusters-dashboard-cards',
}

export default clustersDashboardConfig
