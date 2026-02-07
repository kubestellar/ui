/**
 * ServiceAccount Status Card Configuration
 *
 * Displays Kubernetes ServiceAccounts using the unified card system.
 */

import type { UnifiedCardConfig } from '../../lib/unified/types'

export const serviceAccountStatusConfig: UnifiedCardConfig = {
  type: 'service_account_status',
  title: 'Service Accounts',
  category: 'security',
  description: 'Kubernetes ServiceAccounts across clusters',

  // Appearance
  icon: 'UserCircle',
  iconColor: 'text-emerald-400',
  defaultWidth: 6,
  defaultHeight: 3,

  // Data source
  dataSource: {
    type: 'hook',
    hook: 'useServiceAccounts',
  },

  // Filters
  filters: [
    {
      field: 'search',
      type: 'text',
      placeholder: 'Search service accounts...',
      searchFields: ['name', 'namespace', 'cluster'],
      storageKey: 'service-account-status',
    },
    {
      field: 'cluster',
      type: 'cluster-select',
      label: 'Cluster',
      storageKey: 'service-account-status-cluster',
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
        field: 'secretCount',
        header: 'Secrets',
        render: 'number',
        align: 'right',
        width: 70,
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
    icon: 'UserCircle',
    title: 'No Service Accounts',
    message: 'No ServiceAccounts found in the selected clusters',
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

export default serviceAccountStatusConfig
