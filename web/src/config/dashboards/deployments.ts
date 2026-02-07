/**
 * Deployments Dashboard Configuration
 */
import type { UnifiedDashboardConfig } from '../../lib/unified/types'

export const deploymentsDashboardConfig: UnifiedDashboardConfig = {
  id: 'deployments',
  name: 'Deployments',
  subtitle: 'Deployment status and rollout management',
  route: '/deployments',
  statsType: 'deployments',
  cards: [
    { id: 'deployment-status-1', cardType: 'deployment_status', position: { w: 8, h: 4 } },
    { id: 'deployment-issues-1', cardType: 'deployment_issues', position: { w: 4, h: 3 } },
    { id: 'deployment-progress-1', cardType: 'deployment_progress', position: { w: 6, h: 3 } },
    { id: 'replicaset-status-1', cardType: 'replicaset_status', position: { w: 6, h: 3 } },
    { id: 'hpa-status-1', cardType: 'hpa_status', position: { w: 6, h: 3 } },
    { id: 'workload-deployment-1', cardType: 'workload_deployment', position: { w: 6, h: 3 } },
  ],
  features: {
    dragDrop: true,
    addCard: true,
    autoRefresh: true,
    autoRefreshInterval: 15000,
  },
  storageKey: 'deployments-dashboard-cards',
}

export default deploymentsDashboardConfig
