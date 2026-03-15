/**
 * Role Status Card Configuration
 *
 * Displays Kubernetes Roles and ClusterRoles using the unified card system.
 */

import type { UnifiedCardConfig } from '../../lib/unified/types'

export const roleStatusConfig: UnifiedCardConfig = {
  type: 'role_status',
  title: 'Roles',
  category: 'security',
  description: 'Kubernetes Roles and ClusterRoles across clusters',

  // Appearance
  icon: 'Key',
  iconColor: 'text-amber-400',
  defaultWidth: 6,
  defaultHeight: 3,

  // Data source
  dataSource: {
    type: 'hook',
    hook: 'useK8sRoles',
  },

  // Filters
  filters: [
    {
      field: 'search',
      type: 'text',
      placeholder: 'Search roles...',
      searchFields: ['name', 'namespace', 'cluster'],
      storageKey: 'role-status',
    },
    {
      field: 'cluster',
      type: 'cluster-select',
      label: 'Cluster',
      storageKey: 'role-status-cluster',
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
        field: 'isCluster',
        header: 'Scope',
        render: 'text',
        width: 80,
      },
      {
        field: 'ruleCount',
        header: 'Rules',
        render: 'number',
        align: 'right',
        width: 60,
      },
    ],
  },

  // Empty state
  emptyState: {
    icon: 'Key',
    title: 'No Roles',
    message: 'No Roles found in the selected clusters',
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

export default roleStatusConfig
