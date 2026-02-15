/**
 * ConfigMap Status Card Configuration
 *
 * Displays Kubernetes ConfigMaps using the unified card system.
 */

import type { UnifiedCardConfig } from '../../lib/unified/types'

export const configMapStatusConfig: UnifiedCardConfig = {
  type: 'configmap_status',
  title: 'ConfigMaps',
  category: 'workloads',
  description: 'Kubernetes ConfigMaps across clusters',

  // Appearance
  icon: 'FileText',
  iconColor: 'text-cyan-400',
  defaultWidth: 6,
  defaultHeight: 3,

  // Data source
  dataSource: {
    type: 'hook',
    hook: 'useConfigMaps',
  },

  // Filters
  filters: [
    {
      field: 'search',
      type: 'text',
      placeholder: 'Search configmaps...',
      searchFields: ['name', 'namespace', 'cluster'],
      storageKey: 'configmap-status',
    },
    {
      field: 'cluster',
      type: 'cluster-select',
      label: 'Cluster',
      storageKey: 'configmap-status-cluster',
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
        field: 'dataKeys',
        header: 'Keys',
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
    icon: 'FileText',
    title: 'No ConfigMaps',
    message: 'No ConfigMaps found in the selected clusters',
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

export default configMapStatusConfig
