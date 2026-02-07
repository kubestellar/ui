/**
 * ReplicaSet Status Card Configuration
 *
 * Displays Kubernetes ReplicaSets using the unified card system.
 */

import type { UnifiedCardConfig } from '../../lib/unified/types'

export const replicaSetStatusConfig: UnifiedCardConfig = {
  type: 'replicaset_status',
  title: 'ReplicaSets',
  category: 'workloads',
  description: 'Kubernetes ReplicaSets across clusters',

  // Appearance
  icon: 'Copy',
  iconColor: 'text-indigo-400',
  defaultWidth: 6,
  defaultHeight: 3,

  // Data source
  dataSource: {
    type: 'hook',
    hook: 'useReplicaSets',
  },

  // Filters
  filters: [
    {
      field: 'search',
      type: 'text',
      placeholder: 'Search replicasets...',
      searchFields: ['name', 'namespace', 'cluster'],
      storageKey: 'replicaset-status',
    },
    {
      field: 'cluster',
      type: 'cluster-select',
      label: 'Cluster',
      storageKey: 'replicaset-status-cluster',
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
        field: 'namespace',
        header: 'Namespace',
        render: 'namespace-badge',
        width: 100,
      },
      {
        field: 'name',
        header: 'Name',
        primary: true,
        render: 'truncate',
      },
      {
        field: 'readyReplicas',
        header: 'Ready',
        render: 'number',
        align: 'right',
        width: 60,
      },
      {
        field: 'replicas',
        header: 'Desired',
        render: 'number',
        align: 'right',
        width: 60,
      },
    ],
  },

  // Empty state
  emptyState: {
    icon: 'Copy',
    title: 'No ReplicaSets',
    message: 'No ReplicaSets found in the selected clusters',
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

export default replicaSetStatusConfig
