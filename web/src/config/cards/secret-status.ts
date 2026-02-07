/**
 * Secret Status Card Configuration
 *
 * Displays Kubernetes Secrets using the unified card system.
 */

import type { UnifiedCardConfig } from '../../lib/unified/types'

export const secretStatusConfig: UnifiedCardConfig = {
  type: 'secret_status',
  title: 'Secrets',
  category: 'security',
  description: 'Kubernetes Secrets across clusters',

  // Appearance
  icon: 'Key',
  iconColor: 'text-yellow-400',
  defaultWidth: 6,
  defaultHeight: 3,

  // Data source
  dataSource: {
    type: 'hook',
    hook: 'useSecrets',
  },

  // Filters
  filters: [
    {
      field: 'search',
      type: 'text',
      placeholder: 'Search secrets...',
      searchFields: ['name', 'namespace', 'cluster', 'type'],
      storageKey: 'secret-status',
    },
    {
      field: 'cluster',
      type: 'cluster-select',
      label: 'Cluster',
      storageKey: 'secret-status-cluster',
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
        field: 'type',
        header: 'Type',
        render: 'text',
        width: 120,
      },
      {
        field: 'dataKeys',
        header: 'Keys',
        render: 'number',
        align: 'right',
        width: 60,
      },
    ],
  },

  // Empty state
  emptyState: {
    icon: 'Key',
    title: 'No Secrets',
    message: 'No Secrets found in the selected clusters',
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

export default secretStatusConfig
