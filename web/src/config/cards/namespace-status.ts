/**
 * Namespace Status Card Configuration
 *
 * Displays Kubernetes Namespaces using the unified card system.
 */

import type { UnifiedCardConfig } from '../../lib/unified/types'

export const namespaceStatusConfig: UnifiedCardConfig = {
  type: 'namespace_status',
  title: 'Namespaces',
  category: 'namespaces',
  description: 'Kubernetes Namespaces across clusters',

  // Appearance
  icon: 'FolderOpen',
  iconColor: 'text-sky-400',
  defaultWidth: 6,
  defaultHeight: 3,

  // Data source
  dataSource: {
    type: 'hook',
    hook: 'useNamespaces',
  },

  // Filters
  filters: [
    {
      field: 'search',
      type: 'text',
      placeholder: 'Search namespaces...',
      searchFields: ['name', 'cluster', 'status'],
      storageKey: 'namespace-status',
    },
    {
      field: 'cluster',
      type: 'cluster-select',
      label: 'Cluster',
      storageKey: 'namespace-status-cluster',
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
        field: 'creationTimestamp',
        header: 'Age',
        render: 'relative-time',
        width: 80,
      },
    ],
  },

  // Empty state
  emptyState: {
    icon: 'FolderOpen',
    title: 'No Namespaces',
    message: 'No Namespaces found in the selected clusters',
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

export default namespaceStatusConfig
