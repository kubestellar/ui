/**
 * Deployment Progress Card Configuration
 */
import type { UnifiedCardConfig } from '../../lib/unified/types'

export const deploymentProgressConfig: UnifiedCardConfig = {
  type: 'deployment_progress',
  title: 'Deployment Progress',
  category: 'workloads',
  description: 'Track deployment rollout progress',
  icon: 'RefreshCw',
  iconColor: 'text-blue-400',
  defaultWidth: 5,
  defaultHeight: 3,
  dataSource: { type: 'hook', hook: 'useDeploymentProgress' },
  content: {
    type: 'list',
    pageSize: 8,
    columns: [
      { field: 'name', header: 'Deployment', primary: true, render: 'truncate' },
      { field: 'namespace', header: 'Namespace', render: 'namespace-badge', width: 100 },
      { field: 'progress', header: 'Progress', render: 'progress-bar', width: 120 },
      { field: 'status', header: 'Status', render: 'status-badge', width: 80 },
    ],
  },
  emptyState: { icon: 'RefreshCw', title: 'No Rollouts', message: 'No deployments in progress', variant: 'info' },
  loadingState: { type: 'list', rows: 5 },
  isDemoData: false,
  isLive: true,
}
export default deploymentProgressConfig
