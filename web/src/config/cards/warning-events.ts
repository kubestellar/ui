/**
 * Warning Events Card Configuration
 *
 * Displays Kubernetes warning events using the unified card system.
 */

import type { UnifiedCardConfig } from '../../lib/unified/types'

export const warningEventsConfig: UnifiedCardConfig = {
  type: 'warning_events',
  title: 'Warning Events',
  category: 'live-trends',
  description: 'Kubernetes warning events requiring attention',

  // Appearance
  icon: 'AlertTriangle',
  iconColor: 'text-yellow-400',
  defaultWidth: 6,
  defaultHeight: 3,

  // Data source
  dataSource: {
    type: 'hook',
    hook: 'useWarningEvents',
  },

  // Filters
  filters: [
    {
      field: 'search',
      type: 'text',
      placeholder: 'Search warnings...',
      searchFields: ['reason', 'message', 'object', 'namespace'],
      storageKey: 'warning-events',
    },
    {
      field: 'cluster',
      type: 'cluster-select',
      label: 'Cluster',
      storageKey: 'warning-events-cluster',
    },
  ],

  // Content - List visualization
  content: {
    type: 'list',
    pageSize: 5,
    columns: [
      {
        field: 'cluster',
        header: 'Cluster',
        render: 'cluster-badge',
        width: 100,
      },
      {
        field: 'namespace',
        header: 'Namespace',
        render: 'namespace-badge',
        width: 100,
      },
      {
        field: 'reason',
        header: 'Reason',
        render: 'status-badge',
        width: 120,
      },
      {
        field: 'object',
        header: 'Object',
        primary: true,
        render: 'truncate',
      },
      {
        field: 'count',
        header: 'Count',
        render: 'number',
        align: 'right',
        width: 60,
      },
      {
        field: 'lastSeen',
        header: 'Last Seen',
        render: 'relative-time',
        width: 80,
      },
    ],
  },

  // Empty state
  emptyState: {
    icon: 'CheckCircle',
    title: 'No warnings',
    message: 'All systems operating normally',
    variant: 'success',
  },

  // Loading state
  loadingState: {
    type: 'list',
    rows: 3,
    showSearch: true,
  },

  // Metadata
  isDemoData: false,
  isLive: true,
}

export default warningEventsConfig
