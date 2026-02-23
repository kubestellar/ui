/**
 * Cluster Focus Card Configuration
 */
import type { UnifiedCardConfig } from '../../lib/unified/types'

export const clusterFocusConfig: UnifiedCardConfig = {
  type: 'cluster_focus',
  title: 'Cluster Focus',
  category: 'cluster-health',
  description: 'Focused view of selected cluster',
  icon: 'Target',
  iconColor: 'text-purple-400',
  defaultWidth: 8,
  defaultHeight: 3,
  dataSource: { type: 'hook', hook: 'useClusterFocus' },
  content: {
    type: 'stats-grid',
    stats: [
      { field: 'nodes', label: 'Nodes', color: 'blue' },
      { field: 'pods', label: 'Pods', color: 'green' },
      { field: 'cpu', label: 'CPU %', color: 'orange', format: 'percentage' },
      { field: 'memory', label: 'Memory %', color: 'purple', format: 'percentage' },
    ],
  },
  emptyState: { icon: 'Target', title: 'Select Cluster', message: 'Select a cluster to view details', variant: 'info' },
  loadingState: { type: 'stats', count: 4 },
  isDemoData: false,
  isLive: true,
}
export default clusterFocusConfig
