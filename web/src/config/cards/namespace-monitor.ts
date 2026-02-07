/**
 * Namespace Monitor Card Configuration
 */
import type { UnifiedCardConfig } from '../../lib/unified/types'

export const namespaceMonitorConfig: UnifiedCardConfig = {
  type: 'namespace_monitor',
  title: 'Namespace Monitor',
  category: 'namespaces',
  description: 'Real-time namespace health monitoring',
  icon: 'Monitor',
  iconColor: 'text-green-400',
  defaultWidth: 8,
  defaultHeight: 3,
  dataSource: { type: 'hook', hook: 'useNamespaceMonitor' },
  content: {
    type: 'stats-grid',
    stats: [
      { field: 'healthy', label: 'Healthy', color: 'green' },
      { field: 'warning', label: 'Warning', color: 'yellow' },
      { field: 'critical', label: 'Critical', color: 'red' },
      { field: 'unknown', label: 'Unknown', color: 'gray' },
    ],
  },
  emptyState: { icon: 'Monitor', title: 'No Data', message: 'Select a namespace to monitor', variant: 'info' },
  loadingState: { type: 'stats', count: 4 },
  isDemoData: false,
  isLive: true,
}
export default namespaceMonitorConfig
