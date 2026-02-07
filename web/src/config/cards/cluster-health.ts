/**
 * Cluster Health Card Configuration
 *
 * Displays cluster health status across all connected clusters.
 */

import type { UnifiedCardConfig } from '../../lib/unified/types'

export const clusterHealthConfig: UnifiedCardConfig = {
  type: 'cluster_health',
  title: 'Cluster Health',
  category: 'cluster-health',
  description: 'Health status of all connected Kubernetes clusters',

  // Appearance
  icon: 'Activity',
  iconColor: 'text-green-400',
  defaultWidth: 4,
  defaultHeight: 3,

  // Data source
  dataSource: {
    type: 'hook',
    hook: 'useClusters',
  },

  // Inline stats at top of card
  stats: [
    {
      id: 'healthy',
      icon: 'CheckCircle',
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
      label: 'Healthy',
      valueSource: { type: 'computed', expression: 'filter:healthy|count' },
    },
    {
      id: 'unhealthy',
      icon: 'XCircle',
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/10',
      label: 'Unhealthy',
      valueSource: { type: 'computed', expression: 'filter:!healthy&!unreachable|count' },
    },
    {
      id: 'offline',
      icon: 'WifiOff',
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10',
      label: 'Offline',
      valueSource: { type: 'computed', expression: 'filter:unreachable|count' },
    },
  ],

  // Filters
  filters: [
    {
      field: 'search',
      type: 'text',
      placeholder: 'Search clusters...',
      searchFields: ['name', 'context', 'server'],
      storageKey: 'cluster-health',
    },
  ],

  // Content - List visualization
  content: {
    type: 'list',
    pageSize: 10,
    itemClick: 'drill',
    columns: [
      {
        field: 'healthy',
        header: 'Status',
        render: 'status-badge',
        width: 80,
      },
      {
        field: 'name',
        header: 'Cluster',
        primary: true,
        render: 'truncate',
      },
      {
        field: 'nodeCount',
        header: 'Nodes',
        render: 'number',
        align: 'right',
        width: 60,
      },
      {
        field: 'podCount',
        header: 'Pods',
        render: 'number',
        align: 'right',
        width: 60,
      },
    ],
  },

  // Drill-down
  drillDown: {
    action: 'openClusterDetail',
    params: ['name'],
  },

  // Empty state
  emptyState: {
    icon: 'Server',
    title: 'No clusters connected',
    message: 'Connect a cluster to get started',
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

export default clusterHealthConfig
