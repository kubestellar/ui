/**
 * Namespace Events Card Configuration
 */
import type { UnifiedCardConfig } from '../../lib/unified/types'

export const namespaceEventsConfig: UnifiedCardConfig = {
  type: 'namespace_events',
  title: 'Namespace Events',
  category: 'events',
  description: 'Events in selected namespace',
  icon: 'Activity',
  iconColor: 'text-cyan-400',
  defaultWidth: 6,
  defaultHeight: 3,
  dataSource: { type: 'hook', hook: 'useNamespaceEvents' },
  content: {
    type: 'list',
    pageSize: 10,
    columns: [
      { field: 'type', header: 'Type', render: 'status-badge', width: 80 },
      { field: 'reason', header: 'Reason', render: 'text', width: 100 },
      { field: 'message', header: 'Message', primary: true, render: 'truncate' },
      { field: 'lastTimestamp', header: 'Time', render: 'relative-time', width: 80 },
    ],
  },
  emptyState: { icon: 'Activity', title: 'No Events', message: 'No events in namespace', variant: 'info' },
  loadingState: { type: 'list', rows: 5 },
  isDemoData: false,
  isLive: true,
}
export default namespaceEventsConfig
