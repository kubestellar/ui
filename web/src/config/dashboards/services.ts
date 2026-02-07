/**
 * Services Dashboard Configuration
 */
import type { UnifiedDashboardConfig } from '../../lib/unified/types'

export const servicesDashboardConfig: UnifiedDashboardConfig = {
  id: 'services',
  name: 'Services',
  subtitle: 'Service status and configuration',
  route: '/services',
  statsType: 'services',
  cards: [
    { id: 'service-status-1', cardType: 'service_status', position: { w: 8, h: 4 } },
    { id: 'ingress-status-1', cardType: 'ingress_status', position: { w: 4, h: 3 } },
    { id: 'gateway-status-1', cardType: 'gateway_status', position: { w: 6, h: 3 } },
    { id: 'service-exports-1', cardType: 'service_exports', position: { w: 6, h: 3 } },
    { id: 'service-imports-1', cardType: 'service_imports', position: { w: 6, h: 3 } },
    { id: 'service-topology-1', cardType: 'service_topology', position: { w: 6, h: 4 } },
  ],
  features: {
    dragDrop: true,
    addCard: true,
    autoRefresh: true,
    autoRefreshInterval: 30000,
  },
  storageKey: 'services-dashboard-cards',
}

export default servicesDashboardConfig
