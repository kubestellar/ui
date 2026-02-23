/**
 * Kubecost Overview Card Configuration
 */
import type { UnifiedCardConfig } from '../../lib/unified/types'

export const kubecostOverviewConfig: UnifiedCardConfig = {
  type: 'kubecost_overview',
  title: 'Kubecost',
  category: 'cost',
  description: 'Kubecost cost allocation',
  icon: 'Wallet',
  iconColor: 'text-blue-400',
  defaultWidth: 8,
  defaultHeight: 3,
  dataSource: { type: 'hook', hook: 'useKubecostOverview' },
  content: {
    type: 'chart',
    chartType: 'donut',
    dataKey: 'breakdown',
    valueKey: 'cost',
    labelKey: 'category',
    colors: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'],
  },
  emptyState: { icon: 'Wallet', title: 'No Cost Data', message: 'Kubecost not configured', variant: 'info' },
  loadingState: { type: 'chart' },
  isDemoData: true,
  isLive: false,
}
export default kubecostOverviewConfig
