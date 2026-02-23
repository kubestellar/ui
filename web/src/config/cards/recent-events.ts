/**
 * Recent Events Card Configuration
 *
 * Displays Kubernetes events from the last hour using the unified card system.
 */

import type { UnifiedCardConfig } from '../../lib/unified/types'

export const recentEventsConfig: UnifiedCardConfig = {
  type: 'recent_events',
  title: 'Recent Events',
  category: 'live-trends',
  description: 'Kubernetes events from the last hour',

  // Appearance
  icon: 'Clock',
  iconColor: 'text-blue-400',
  defaultWidth: 6,
  defaultHeight: 3,

  // Data source
  dataSource: {
    type: 'hook',
    hook: 'useRecentEvents',
  },

  // Filters
  filters: [
    {
      field: 'search',
      type: 'text',
      placeholder: 'Search events...',
      searchFields: ['reason', 'message', 'object', 'namespace'],
      storageKey: 'recent-events',
    },
    {
      field: 'cluster',
      type: 'cluster-select',
      label: 'Cluster',
      storageKey: 'recent-events-cluster',
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
        field: 'type',
        header: 'Type',
        render: 'status-badge',
        width: 80,
      },
      {
        field: 'reason',
        header: 'Reason',
        width: 100,
      },
      {
        field: 'object',
        header: 'Object',
        primary: true,
        render: 'truncate',
      },
      {
        field: 'lastSeen',
        header: 'Time',
        render: 'relative-time',
        width: 80,
      },
    ],
  },

  // Empty state
  emptyState: {
    icon: 'Activity',
    title: 'No recent events',
    message: 'No events in the last hour',
    variant: 'info',
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

export default recentEventsConfig
