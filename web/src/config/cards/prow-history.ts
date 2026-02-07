/**
 * Prow History Card Configuration
 */
import type { UnifiedCardConfig } from '../../lib/unified/types'

export const prowHistoryConfig: UnifiedCardConfig = {
  type: 'prow_history',
  title: 'Prow History',
  category: 'ci-cd',
  description: 'Prow job execution history',
  icon: 'History',
  iconColor: 'text-purple-400',
  defaultWidth: 6,
  defaultHeight: 3,
  dataSource: { type: 'hook', hook: 'useProwHistory' },
  content: {
    type: 'list',
    pageSize: 10,
    columns: [
      { field: 'job', header: 'Job', primary: true, render: 'truncate' },
      { field: 'result', header: 'Result', render: 'status-badge', width: 80 },
      { field: 'duration', header: 'Duration', render: 'duration', width: 80 },
      { field: 'finished', header: 'Finished', render: 'relative-time', width: 100 },
    ],
  },
  emptyState: { icon: 'History', title: 'No History', message: 'No Prow history available', variant: 'info' },
  loadingState: { type: 'list', rows: 5 },
  isDemoData: false,
  isLive: true,
}
export default prowHistoryConfig
