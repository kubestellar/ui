/**
 * Resource Capacity Card Configuration
 */
import type { UnifiedCardConfig } from '../../lib/unified/types'

export const resourceCapacityConfig: UnifiedCardConfig = {
  type: 'resource_capacity',
  title: 'Resource Capacity',
  category: 'compute',
  description: 'Cluster resource capacity overview',
  icon: 'BarChart3',
  iconColor: 'text-blue-400',
  defaultWidth: 8,
  defaultHeight: 3,
  dataSource: { type: 'hook', hook: 'useResourceCapacity' },
  content: {
    type: 'chart',
    chartType: 'bar',
    dataKey: 'clusters',
    xAxis: 'cluster',
    yAxis: ['cpu', 'memory', 'storage'],
    colors: ['#3b82f6', '#10b981', '#f59e0b'],
  },
  emptyState: { icon: 'BarChart3', title: 'No Data', message: 'No capacity data available', variant: 'info' },
  loadingState: { type: 'chart' },
  isDemoData: true,
  isLive: false,
}
export default resourceCapacityConfig
