/**
 * Active Alerts Card Configuration
 *
 * Displays currently firing alerts from Prometheus/Alertmanager.
 */

import type { UnifiedCardConfig } from '../../lib/unified/types'

export const activeAlertsConfig: UnifiedCardConfig = {
  type: 'active_alerts',
  title: 'Active Alerts',
  category: 'alerting',
  description: 'Currently firing alerts across clusters',
  icon: 'Bell',
  iconColor: 'text-yellow-400',
  defaultWidth: 4,
  defaultHeight: 3,

  isDemoData: true, // Uses demo data hook in registerHooks.ts

  dataSource: {
    type: 'hook',
    hook: 'useActiveAlerts',
  },

  stats: [
    {
      id: 'critical',
      icon: 'AlertTriangle',
      color: 'red',
      label: 'Critical',
      bgColor: 'bg-red-500',
      valueSource: { type: 'count', filter: 'severity=critical' },
    },
    {
      id: 'warning',
      icon: 'AlertCircle',
      color: 'yellow',
      label: 'Warning',
      bgColor: 'bg-yellow-500',
      valueSource: { type: 'count', filter: 'severity=warning' },
    },
  ],

  content: {
    type: 'list',
    columns: [
      {
        field: 'severity',
        header: '',
        width: 32,
        render: 'status-badge',
      },
      {
        field: 'alertname',
        header: 'Alert',
        primary: true,
      },
      {
        field: 'duration',
        header: 'Duration',
        width: 80,
        render: 'relative-time',
      },
    ],
    pageSize: 6,
  },

  emptyState: {
    icon: 'BellOff',
    title: 'No active alerts',
    message: 'All systems operating normally',
    variant: 'success',
  },

  footer: {
    showTotal: true,
    text: 'alerts firing',
  },
}
