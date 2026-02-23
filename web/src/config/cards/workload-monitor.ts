/**
 * Workload Monitor Card Configuration
 */
import type { UnifiedCardConfig } from '../../lib/unified/types'

export const workloadMonitorConfig: UnifiedCardConfig = {
  type: 'workload_monitor',
  title: 'Workload Monitor',
  category: 'workloads',
  description: 'Live workload health monitoring',
  icon: 'Monitor',
  iconColor: 'text-green-400',
  defaultWidth: 8,
  defaultHeight: 4,
  dataSource: { type: 'hook', hook: 'useWorkloadMonitor' },
  content: { type: 'custom', component: 'WorkloadMonitorView' },
  emptyState: { icon: 'Monitor', title: 'No Workloads', message: 'No workloads to monitor', variant: 'info' },
  loadingState: { type: 'custom' },
  isDemoData: false,
  isLive: true,
}
export default workloadMonitorConfig
