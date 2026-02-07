/**
 * StatefulSet Status Card Configuration
 *
 * Displays Kubernetes StatefulSets using the unified card system.
 */

import type { UnifiedCardConfig } from '../../lib/unified/types'

export const statefulSetStatusConfig: UnifiedCardConfig = {
  type: 'statefulset_status',
  title: 'StatefulSets',
  category: 'workloads',
  description: 'Kubernetes StatefulSets across clusters',

  // Appearance
  icon: 'Database',
  iconColor: 'text-purple-400',
  defaultWidth: 6,
  defaultHeight: 3,

  // Data source
  dataSource: {
    type: 'hook',
    hook: 'useStatefulSets',
  },

  // Filters
  filters: [
    {
      field: 'search',
      type: 'text',
      placeholder: 'Search statefulsets...',
      searchFields: ['name', 'namespace', 'cluster'],
      storageKey: 'statefulset-status',
    },
    {
      field: 'cluster',
      type: 'cluster-select',
      label: 'Cluster',
      storageKey: 'statefulset-status-cluster',
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
        render: 'replica-count',
        width: 70,
      },
      {
        field: 'replicas',
        header: 'Desired',
        render: 'number',
        align: 'right',
        width: 60,
      },
      {
        field: 'creationTimestamp',
        header: 'Age',
        render: 'relative-time',
        width: 80,
      },
    ],
  },

  // Empty state
  emptyState: {
    icon: 'Database',
    title: 'No StatefulSets',
    message: 'No StatefulSets found in the selected clusters',
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

export default statefulSetStatusConfig
