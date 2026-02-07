/**
 * Cluster Network Card Configuration
 */
import type { UnifiedCardConfig } from '../../lib/unified/types'

export const clusterNetworkConfig: UnifiedCardConfig = {
  type: 'cluster_network',
  title: 'Cluster Network',
  category: 'network',
  description: 'Network topology visualization',
  icon: 'Network',
  iconColor: 'text-cyan-400',
  defaultWidth: 8,
  defaultHeight: 4,
  dataSource: { type: 'hook', hook: 'useClusterNetwork' },
  content: {
    type: 'custom',
    component: 'NetworkTopology',
  },
  emptyState: { icon: 'Network', title: 'No Network Data', message: 'Network data not available', variant: 'info' },
  loadingState: { type: 'custom' },
  isDemoData: true,
  isLive: false,
}
export default clusterNetworkConfig
