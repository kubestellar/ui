/**
 * Falco Alerts Card Configuration
 */
import type { UnifiedCardConfig } from '../../lib/unified/types'

export const falcoAlertsConfig: UnifiedCardConfig = {
  type: 'falco_alerts',
  title: 'Falco Alerts',
  category: 'security',
  description: 'Runtime security alerts from Falco',
  icon: 'AlertTriangle',
  iconColor: 'text-red-400',
  defaultWidth: 4,
  defaultHeight: 3,
  dataSource: { type: 'hook', hook: 'useFalcoAlerts' },
  content: {
    type: 'stats-grid',
    stats: [
      { field: 'critical', label: 'Critical', color: 'red' },
      { field: 'warning', label: 'Warning', color: 'yellow' },
      { field: 'notice', label: 'Notice', color: 'blue' },
    ],
  },
  emptyState: { icon: 'AlertTriangle', title: 'No Alerts', message: 'No Falco alerts', variant: 'success' },
  loadingState: { type: 'stats', count: 3 },
  isDemoData: true,
  isLive: false,
}
export default falcoAlertsConfig
