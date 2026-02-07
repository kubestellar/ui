/**
 * Chart Versions Card Configuration
 */
import type { UnifiedCardConfig } from '../../lib/unified/types'

export const chartVersionsConfig: UnifiedCardConfig = {
  type: 'chart_versions',
  title: 'Chart Versions',
  category: 'gitops',
  description: 'Available Helm chart versions',
  icon: 'Package',
  iconColor: 'text-blue-400',
  defaultWidth: 6,
  defaultHeight: 3,
  dataSource: { type: 'hook', hook: 'useChartVersions' },
  content: {
    type: 'list',
    pageSize: 10,
    columns: [
      { field: 'name', header: 'Chart', primary: true, render: 'truncate' },
      { field: 'version', header: 'Version', render: 'text', width: 80 },
      { field: 'appVersion', header: 'App Ver', render: 'text', width: 80 },
      { field: 'created', header: 'Created', render: 'relative-time', width: 100 },
    ],
  },
  emptyState: { icon: 'Package', title: 'No Charts', message: 'No chart versions found', variant: 'info' },
  loadingState: { type: 'list', rows: 5 },
  isDemoData: true,
  isLive: false,
}
export default chartVersionsConfig
