/**
 * Helm History Card Configuration
 */
import type { UnifiedCardConfig } from '../../lib/unified/types'

export const helmHistoryConfig: UnifiedCardConfig = {
  type: 'helm_history',
  title: 'Helm History',
  category: 'gitops',
  description: 'Helm release revision history',
  icon: 'History',
  iconColor: 'text-blue-400',
  defaultWidth: 8,
  defaultHeight: 3,
  dataSource: { type: 'hook', hook: 'useHelmHistory' },
  content: {
    type: 'list',
    pageSize: 10,
    columns: [
      { field: 'revision', header: 'Rev', render: 'number', width: 50 },
      { field: 'chart', header: 'Chart', primary: true, render: 'truncate' },
      { field: 'appVersion', header: 'App Ver', render: 'text', width: 80 },
      { field: 'status', header: 'Status', render: 'status-badge', width: 80 },
      { field: 'updated', header: 'Updated', render: 'relative-time', width: 100 },
    ],
  },
  emptyState: { icon: 'History', title: 'No History', message: 'No release history available', variant: 'info' },
  loadingState: { type: 'list', rows: 5 },
  isDemoData: false,
  isLive: false,
}
export default helmHistoryConfig
