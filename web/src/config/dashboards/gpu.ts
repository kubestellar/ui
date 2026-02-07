/**
 * GPU Dashboard Configuration
 */
import type { UnifiedDashboardConfig } from '../../lib/unified/types'

export const gpuDashboardConfig: UnifiedDashboardConfig = {
  id: 'gpu',
  name: 'GPU Reservations',
  subtitle: 'GPU resource allocation and utilization',
  route: '/gpu-reservations',
  statsType: 'gpu',
  cards: [
    { id: 'gpu-overview-1', cardType: 'gpu_overview', position: { w: 4, h: 3 } },
    { id: 'gpu-status-1', cardType: 'gpu_status', position: { w: 8, h: 4 } },
    { id: 'gpu-inventory-1', cardType: 'gpu_inventory', position: { w: 6, h: 3 } },
    { id: 'gpu-utilization-1', cardType: 'gpu_utilization', position: { w: 6, h: 3 } },
    { id: 'gpu-usage-trend-1', cardType: 'gpu_usage_trend', position: { w: 6, h: 3 } },
    { id: 'gpu-workloads-1', cardType: 'gpu_workloads', position: { w: 6, h: 3 } },
    { id: 'hardware-health-1', cardType: 'hardware_health', title: 'Hardware Health', position: { w: 6, h: 3 } },
  ],
  features: {
    dragDrop: true,
    addCard: true,
    autoRefresh: true,
    autoRefreshInterval: 30000,
  },
  storageKey: 'gpu-dashboard-cards',
}

export default gpuDashboardConfig
