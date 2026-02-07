/**
 * Cluster Health Monitor Card Configuration
 */
import type { UnifiedCardConfig } from '../../lib/unified/types'

export const clusterHealthMonitorConfig: UnifiedCardConfig = {
  type: 'cluster_health_monitor',
  title: 'Cluster Monitor',
  category: 'cluster-health',
  description: 'Comprehensive cluster health',
  icon: 'HeartPulse',
  iconColor: 'text-red-400',
  defaultWidth: 6,
  defaultHeight: 3,
  dataSource: { type: 'hook', hook: 'useClusterHealthMonitor' },
  content: { type: 'custom', component: 'ClusterHealthView' },
  emptyState: { icon: 'HeartPulse', title: 'No Clusters', message: 'No clusters to monitor', variant: 'info' },
  loadingState: { type: 'custom' },
  isDemoData: false,
  isLive: true,
}
export default clusterHealthMonitorConfig
