/**
 * GPU Usage Trend Card Configuration
 */
import type { UnifiedCardConfig } from '../../lib/unified/types'

export const gpuUsageTrendConfig: UnifiedCardConfig = {
  type: 'gpu_usage_trend',
  title: 'GPU Usage Trend',
  category: 'live-trends',
  description: 'Historical GPU usage over time',
  icon: 'BarChart2',
  iconColor: 'text-green-400',
  defaultWidth: 8,
  defaultHeight: 3,
  dataSource: { type: 'hook', hook: 'useGPUUsageTrend' },
  content: {
    type: 'chart',
    chartType: 'area',
    dataKey: 'timeseries',
    xAxis: 'timestamp',
    yAxis: ['memory', 'compute'],
    colors: ['#10b981', '#3b82f6'],
  },
  emptyState: { icon: 'BarChart2', title: 'No Data', message: 'No GPU trend data', variant: 'info' },
  loadingState: { type: 'chart' },
  isDemoData: true,
  isLive: true,
}
export default gpuUsageTrendConfig
