/**
 * Resource Trend Card Configuration
 */
import type { UnifiedCardConfig } from '../../lib/unified/types'

export const resourceTrendConfig: UnifiedCardConfig = {
  type: 'resource_trend',
  title: 'Resource Trend',
  category: 'live-trends',
  description: 'Resource usage over time',
  icon: 'TrendingUp',
  iconColor: 'text-blue-400',
  defaultWidth: 8,
  defaultHeight: 3,
  dataSource: { type: 'hook', hook: 'useResourceTrend' },
  content: {
    type: 'chart',
    chartType: 'line',
    dataKey: 'timeseries',
    xAxis: 'timestamp',
    yAxis: ['cpu', 'memory'],
    colors: ['#f59e0b', '#3b82f6'],
  },
  emptyState: { icon: 'TrendingUp', title: 'No Data', message: 'No resource trend data', variant: 'info' },
  loadingState: { type: 'chart' },
  isDemoData: false,
  isLive: true,
}
export default resourceTrendConfig
