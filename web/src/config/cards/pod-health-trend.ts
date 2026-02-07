/**
 * Pod Health Trend Card Configuration
 */
import type { UnifiedCardConfig } from '../../lib/unified/types'

export const podHealthTrendConfig: UnifiedCardConfig = {
  type: 'pod_health_trend',
  title: 'Pod Health Trend',
  category: 'live-trends',
  description: 'Pod health over time',
  icon: 'HeartPulse',
  iconColor: 'text-red-400',
  defaultWidth: 8,
  defaultHeight: 3,
  dataSource: { type: 'hook', hook: 'usePodHealthTrend' },
  content: {
    type: 'chart',
    chartType: 'area',
    dataKey: 'timeseries',
    xAxis: 'timestamp',
    yAxis: ['healthy', 'unhealthy'],
    colors: ['#10b981', '#ef4444'],
  },
  emptyState: { icon: 'HeartPulse', title: 'No Data', message: 'No pod health data', variant: 'info' },
  loadingState: { type: 'chart' },
  isDemoData: false,
  isLive: true,
}
export default podHealthTrendConfig
