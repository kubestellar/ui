/**
 * Cluster Resource Tree Card Configuration
 */
import type { UnifiedCardConfig } from '../../lib/unified/types'

export const clusterResourceTreeConfig: UnifiedCardConfig = {
  type: 'cluster_resource_tree',
  title: 'Resource Tree',
  category: 'cluster-health',
  description: 'Hierarchical view of cluster resources',
  icon: 'GitBranch',
  iconColor: 'text-purple-400',
  defaultWidth: 12,
  defaultHeight: 5,
  dataSource: { type: 'hook', hook: 'useClusterResourceTree' },
  content: {
    type: 'custom',
    component: 'ResourceTree',
  },
  emptyState: { icon: 'GitBranch', title: 'No Resources', message: 'Select a cluster to view resources', variant: 'info' },
  loadingState: { type: 'custom' },
  isDemoData: false,
  isLive: true,
}
export default clusterResourceTreeConfig
