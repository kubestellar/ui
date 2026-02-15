/**
 * Cluster Comparison Card Configuration
 */
import type { UnifiedCardConfig } from '../../lib/unified/types'

export const clusterComparisonConfig: UnifiedCardConfig = {
  type: 'cluster_comparison',
  title: 'Cluster Comparison',
  category: 'cluster-health',
  description: 'Compare metrics across clusters',
  icon: 'GitCompare',
  iconColor: 'text-blue-400',
  defaultWidth: 12,
  defaultHeight: 4,
  dataSource: { type: 'hook', hook: 'useClusterComparison' },
  content: {
    type: 'table',
    columns: [
      { field: 'cluster', header: 'Cluster', primary: true, render: 'cluster-badge' },
      { field: 'nodes', header: 'Nodes', render: 'number', align: 'right' },
      { field: 'pods', header: 'Pods', render: 'number', align: 'right' },
      { field: 'cpu', header: 'CPU %', render: 'percentage', align: 'right' },
      { field: 'memory', header: 'Memory %', render: 'percentage', align: 'right' },
      { field: 'status', header: 'Status', render: 'status-badge' },
    ],
  },
  emptyState: { icon: 'GitCompare', title: 'No Clusters', message: 'No clusters to compare', variant: 'info' },
  loadingState: { type: 'table', rows: 4 },
  isDemoData: false,
  isLive: true,
}
export default clusterComparisonConfig
