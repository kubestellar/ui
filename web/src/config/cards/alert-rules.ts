/**
 * Alert Rules Card Configuration
 */
import type { UnifiedCardConfig } from '../../lib/unified/types'

export const alertRulesConfig: UnifiedCardConfig = {
  type: 'alert_rules',
  title: 'Alert Rules',
  category: 'alerts',
  description: 'Prometheus/Alertmanager alert rules',
  icon: 'Bell',
  iconColor: 'text-orange-400',
  defaultWidth: 6,
  defaultHeight: 3,
  dataSource: { type: 'hook', hook: 'useAlertRules' },
  filters: [
    { field: 'search', type: 'text', placeholder: 'Search rules...', searchFields: ['name', 'severity'], storageKey: 'alert-rules' },
  ],
  content: {
    type: 'list',
    pageSize: 10,
    columns: [
      { field: 'name', header: 'Rule', primary: true, render: 'truncate' },
      { field: 'severity', header: 'Severity', render: 'status-badge', width: 80 },
      { field: 'state', header: 'State', render: 'status-badge', width: 80 },
      { field: 'alertsCount', header: 'Alerts', render: 'number', width: 60 },
    ],
  },
  emptyState: { icon: 'Bell', title: 'No Alert Rules', message: 'No alert rules configured', variant: 'info' },
  loadingState: { type: 'list', rows: 5 },
  isDemoData: true,
  isLive: false,
}
export default alertRulesConfig
