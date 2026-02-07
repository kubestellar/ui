/**
 * App Status Card Configuration
 */
import type { UnifiedCardConfig } from '../../lib/unified/types'

export const appStatusConfig: UnifiedCardConfig = {
  type: 'app_status',
  title: 'Application Status',
  category: 'workloads',
  description: 'Application deployment status overview',
  icon: 'Package',
  iconColor: 'text-blue-400',
  defaultWidth: 4,
  defaultHeight: 3,
  dataSource: { type: 'hook', hook: 'useAppStatus' },
  content: {
    type: 'stats-grid',
    stats: [
      { field: 'running', label: 'Running', color: 'green' },
      { field: 'pending', label: 'Pending', color: 'yellow' },
      { field: 'failed', label: 'Failed', color: 'red' },
    ],
  },
  emptyState: { icon: 'Package', title: 'No Apps', message: 'No applications found', variant: 'info' },
  loadingState: { type: 'stats', count: 3 },
  isDemoData: false,
  isLive: true,
}
export default appStatusConfig
