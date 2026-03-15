/**
 * Deployment Missions Card Configuration
 */
import type { UnifiedCardConfig } from '../../lib/unified/types'

export const deploymentMissionsConfig: UnifiedCardConfig = {
  type: 'deployment_missions',
  title: 'Deployment Missions',
  category: 'workloads',
  description: 'Track deployment progress',
  icon: 'Target',
  iconColor: 'text-purple-400',
  defaultWidth: 5,
  defaultHeight: 3,
  dataSource: { type: 'hook', hook: 'useDeploymentMissions' },
  content: {
    type: 'list',
    pageSize: 8,
    columns: [
      { field: 'name', header: 'Mission', primary: true, render: 'truncate' },
      { field: 'progress', header: 'Progress', render: 'progress-bar', width: 100 },
      { field: 'status', header: 'Status', render: 'status-badge', width: 80 },
    ],
  },
  emptyState: { icon: 'Target', title: 'No Missions', message: 'No active deployment missions', variant: 'info' },
  loadingState: { type: 'list', rows: 4 },
  isDemoData: false,
  isLive: true,
}
export default deploymentMissionsConfig
