/**
 * OpenCost Overview Card Configuration
 */
import type { UnifiedCardConfig } from '../../lib/unified/types'

export const opencostOverviewConfig: UnifiedCardConfig = {
  type: 'opencost_overview',
  title: 'OpenCost',
  category: 'cost',
  description: 'OpenCost cost allocation',
  icon: 'DollarSign',
  iconColor: 'text-green-400',
  defaultWidth: 8,
  defaultHeight: 3,
  dataSource: { type: 'hook', hook: 'useOpenCostOverview' },
  content: {
    type: 'chart',
    chartType: 'bar',
    dataKey: 'namespaces',
    xAxis: 'namespace',
    yAxis: ['cpu', 'memory', 'storage'],
    colors: ['#3b82f6', '#10b981', '#f59e0b'],
  },
  emptyState: { icon: 'DollarSign', title: 'No Cost Data', message: 'OpenCost not configured', variant: 'info' },
  loadingState: { type: 'chart' },
  isDemoData: true,
  isLive: false,
}
export default opencostOverviewConfig
