/**
 * Event Stream Card Configuration
 *
 * Shows recent Kubernetes events across clusters.
 */

import type { UnifiedCardConfig } from '../../lib/unified/types'

export const eventStreamConfig: UnifiedCardConfig = {
  type: 'event_stream',
  title: 'Event Stream',
  category: 'live-trends',
  description: 'Real-time stream of Kubernetes events across clusters',

  // Appearance
  icon: 'Activity',
  iconColor: 'text-purple-400',
  defaultWidth: 6,
  defaultHeight: 4,

  // Data source
  dataSource: {
    type: 'hook',
    hook: 'useCachedEvents',
  },

  // Filters
  filters: [
    {
      field: 'search',
      type: 'text',
      placeholder: 'Search events...',
      searchFields: ['reason', 'message', 'involvedObject.name', 'involvedObject.kind'],
      storageKey: 'event-stream',
    },
    {
      field: 'type',
      type: 'chips',
      label: 'Type',
      options: [
        { value: 'Warning', label: 'Warning', color: 'text-yellow-400' },
        { value: 'Normal', label: 'Normal', color: 'text-blue-400' },
      ],
    },
    {
      field: 'cluster',
      type: 'cluster-select',
      label: 'Cluster',
      storageKey: 'event-stream-cluster',
    },
  ],

  // Content - List visualization
  content: {
    type: 'list',
    pageSize: 10,
    itemClick: 'drill',
    columns: [
      {
        field: 'type',
        header: 'Type',
        render: 'status-badge',
        width: 80,
      },
      {
        field: 'lastTimestamp',
        header: 'Time',
        render: 'relative-time',
        width: 80,
      },
      {
        field: 'involvedObject.kind',
        header: 'Kind',
        width: 80,
      },
      {
        field: 'involvedObject.name',
        header: 'Object',
        primary: true,
        render: 'truncate',
      },
      {
        field: 'reason',
        header: 'Reason',
        width: 120,
      },
      {
        field: 'message',
        header: 'Message',
        render: 'truncate',
      },
    ],
  },

  // Drill-down
  drillDown: {
    action: 'drillToEvent',
    params: ['cluster', 'namespace', 'involvedObject.name', 'involvedObject.kind'],
    context: {
      reason: 'reason',
      message: 'message',
      type: 'type',
    },
  },

  // Empty state
  emptyState: {
    icon: 'Activity',
    title: 'No recent events',
    message: 'Cluster activity will appear here',
    variant: 'info',
  },

  // Loading state
  loadingState: {
    type: 'list',
    rows: 5,
    showSearch: true,
  },

  // Metadata
  isDemoData: false,
  isLive: true,
}

export default eventStreamConfig
