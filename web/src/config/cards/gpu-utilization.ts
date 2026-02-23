/**
 * GPU Utilization Card Configuration
 */
import type { UnifiedCardConfig } from '../../lib/unified/types'

export const gpuUtilizationConfig: UnifiedCardConfig = {
  type: 'gpu_utilization',
  title: 'GPU Utilization',
  category: 'live-trends',
  description: 'Real-time GPU utilization chart',
  icon: 'TrendingUp',
  iconColor: 'text-green-400',
  defaultWidth: 8,
  defaultHeight: 3,
  dataSource: { type: 'hook', hook: 'useGPUUtilization' },
  content: {
    type: 'chart',
    chartType: 'line',
    dataKey: 'timeseries',
    xAxis: 'timestamp',
    yAxis: ['utilization'],
    colors: ['#10b981'],
  },
  emptyState: { icon: 'TrendingUp', title: 'No Data', message: 'No GPU utilization data', variant: 'info' },
  loadingState: { type: 'chart' },
  isDemoData: true,
  isLive: true,
}
export default gpuUtilizationConfig
