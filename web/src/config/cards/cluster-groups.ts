/**
 * Cluster Groups Card Configuration
 */
import type { UnifiedCardConfig } from '../../lib/unified/types'

export const clusterGroupsConfig: UnifiedCardConfig = {
  type: 'cluster_groups',
  title: 'Cluster Groups',
  category: 'cluster-health',
  description: 'Manage cluster groupings',
  icon: 'Layers',
  iconColor: 'text-indigo-400',
  defaultWidth: 4,
  defaultHeight: 3,
  dataSource: { type: 'hook', hook: 'useClusterGroups' },
  content: {
    type: 'list',
    pageSize: 8,
    columns: [
      { field: 'name', header: 'Group', primary: true, render: 'truncate' },
      { field: 'clusterCount', header: 'Clusters', render: 'number', width: 70 },
      { field: 'status', header: 'Status', render: 'status-badge', width: 80 },
    ],
  },
  emptyState: { icon: 'Layers', title: 'No Groups', message: 'No cluster groups defined', variant: 'info' },
  loadingState: { type: 'list', rows: 4 },
  isDemoData: false,
  isLive: true,
}
export default clusterGroupsConfig
