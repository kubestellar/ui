/**
 * Node Status Card Configuration
 *
 * Displays Kubernetes Nodes using the unified card system.
 */

import type { UnifiedCardConfig } from '../../lib/unified/types'

export const nodeStatusConfig: UnifiedCardConfig = {
  type: 'node_status',
  title: 'Node Status',
  category: 'compute',
  description: 'Kubernetes Nodes across clusters',

  // Appearance
  icon: 'Server',
  iconColor: 'text-purple-400',
  defaultWidth: 6,
  defaultHeight: 3,

  // Data source
  dataSource: {
    type: 'hook',
    hook: 'useNodes',
  },

  // Filters
  filters: [
    {
      field: 'search',
      type: 'text',
      placeholder: 'Search nodes...',
      searchFields: ['name', 'cluster', 'status'],
      storageKey: 'node-status',
    },
    {
      field: 'cluster',
      type: 'cluster-select',
      label: 'Cluster',
      storageKey: 'node-status-cluster',
    },
  ],

  // Content - List visualization
  content: {
    type: 'list',
    pageSize: 10,
    columns: [
      {
        field: 'cluster',
        header: 'Cluster',
        render: 'cluster-badge',
        width: 100,
      },
      {
        field: 'name',
        header: 'Name',
        primary: true,
        render: 'truncate',
      },
      {
        field: 'status',
        header: 'Status',
        render: 'status-badge',
        width: 80,
      },
      {
        field: 'roles',
        header: 'Roles',
        render: 'text',
        width: 100,
      },
      {
        field: 'cpuCapacity',
        header: 'CPU',
        render: 'text',
        align: 'right',
        width: 60,
      },
      {
        field: 'memoryCapacity',
        header: 'Memory',
        render: 'text',
        align: 'right',
        width: 80,
      },
    ],
  },

  // Empty state
  emptyState: {
    icon: 'Server',
    title: 'No Nodes',
    message: 'No Nodes found in the selected clusters',
    variant: 'info',
  },

  // Loading state
  loadingState: {
    type: 'list',
    rows: 5,
    showSearch: true,
  },

  // Metadata
  isDemoData: true,
  isLive: true,
}

export default nodeStatusConfig
