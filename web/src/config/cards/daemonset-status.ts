/**
 * DaemonSet Status Card Configuration
 *
 * Displays Kubernetes DaemonSets using the unified card system.
 */

import type { UnifiedCardConfig } from '../../lib/unified/types'

export const daemonSetStatusConfig: UnifiedCardConfig = {
  type: 'daemonset_status',
  title: 'DaemonSets',
  category: 'workloads',
  description: 'Kubernetes DaemonSets across clusters',

  // Appearance
  icon: 'Layers',
  iconColor: 'text-green-400',
  defaultWidth: 6,
  defaultHeight: 3,

  // Data source
  dataSource: {
    type: 'hook',
    hook: 'useDaemonSets',
  },

  // Filters
  filters: [
    {
      field: 'search',
      type: 'text',
      placeholder: 'Search daemonsets...',
      searchFields: ['name', 'namespace', 'cluster'],
      storageKey: 'daemonset-status',
    },
    {
      field: 'cluster',
      type: 'cluster-select',
      label: 'Cluster',
      storageKey: 'daemonset-status-cluster',
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
        field: 'numberReady',
        header: 'Ready',
        render: 'number',
        align: 'right',
        width: 60,
      },
      {
        field: 'desiredNumberScheduled',
        header: 'Desired',
        render: 'number',
        align: 'right',
        width: 60,
      },
      {
        field: 'numberAvailable',
        header: 'Available',
        render: 'number',
        align: 'right',
        width: 70,
      },
    ],
  },

  // Empty state
  emptyState: {
    icon: 'Layers',
    title: 'No DaemonSets',
    message: 'No DaemonSets found in the selected clusters',
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

export default daemonSetStatusConfig
