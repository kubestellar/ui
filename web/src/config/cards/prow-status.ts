/**
 * Prow Status Card Configuration
 */
import type { UnifiedCardConfig } from '../../lib/unified/types'

export const prowStatusConfig: UnifiedCardConfig = {
  type: 'prow_status',
  title: 'Prow Status',
  category: 'ci-cd',
  description: 'Prow CI system status',
  icon: 'Activity',
  iconColor: 'text-green-400',
  defaultWidth: 4,
  defaultHeight: 3,
  dataSource: { type: 'hook', hook: 'useProwStatus' },
  content: {
    type: 'stats-grid',
    stats: [
      { field: 'running', label: 'Running', color: 'blue' },
      { field: 'passed', label: 'Passed', color: 'green' },
      { field: 'failed', label: 'Failed', color: 'red' },
      { field: 'pending', label: 'Pending', color: 'yellow' },
    ],
  },
  emptyState: { icon: 'Activity', title: 'No Status', message: 'Prow status unavailable', variant: 'info' },
  loadingState: { type: 'stats', count: 4 },
  isDemoData: false,
  isLive: true,
}
export default prowStatusConfig
