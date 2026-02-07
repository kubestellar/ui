/**
 * Event Summary Card Configuration
 */
import type { UnifiedCardConfig } from '../../lib/unified/types'

export const eventSummaryConfig: UnifiedCardConfig = {
  type: 'event_summary',
  title: 'Event Summary',
  category: 'events',
  description: 'Summary of Kubernetes events',
  icon: 'Activity',
  iconColor: 'text-cyan-400',
  defaultWidth: 6,
  defaultHeight: 3,
  dataSource: { type: 'hook', hook: 'useEventSummary' },
  content: {
    type: 'stats-grid',
    stats: [
      { field: 'total', label: 'Total', color: 'blue' },
      { field: 'normal', label: 'Normal', color: 'green' },
      { field: 'warning', label: 'Warning', color: 'yellow' },
      { field: 'error', label: 'Error', color: 'red' },
    ],
  },
  emptyState: { icon: 'Activity', title: 'No Events', message: 'No events recorded', variant: 'info' },
  loadingState: { type: 'stats', count: 4 },
  isDemoData: false,
  isLive: true,
}
export default eventSummaryConfig
