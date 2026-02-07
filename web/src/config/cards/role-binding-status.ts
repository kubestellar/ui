/**
 * Role Binding Status Card Configuration
 *
 * Displays Kubernetes RoleBindings and ClusterRoleBindings using the unified card system.
 */

import type { UnifiedCardConfig } from '../../lib/unified/types'

export const roleBindingStatusConfig: UnifiedCardConfig = {
  type: 'role_binding_status',
  title: 'Role Bindings',
  category: 'security',
  description: 'Kubernetes RoleBindings and ClusterRoleBindings across clusters',

  // Appearance
  icon: 'Link',
  iconColor: 'text-orange-400',
  defaultWidth: 6,
  defaultHeight: 3,

  // Data source
  dataSource: {
    type: 'hook',
    hook: 'useK8sRoleBindings',
  },

  // Filters
  filters: [
    {
      field: 'search',
      type: 'text',
      placeholder: 'Search bindings...',
      searchFields: ['name', 'namespace', 'cluster', 'roleName'],
      storageKey: 'role-binding-status',
    },
    {
      field: 'cluster',
      type: 'cluster-select',
      label: 'Cluster',
      storageKey: 'role-binding-status-cluster',
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
        field: 'roleName',
        header: 'Role',
        render: 'text',
        width: 100,
      },
      {
        field: 'isCluster',
        header: 'Scope',
        render: 'text',
        width: 80,
      },
    ],
  },

  // Empty state
  emptyState: {
    icon: 'Link',
    title: 'No Role Bindings',
    message: 'No RoleBindings found in the selected clusters',
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

export default roleBindingStatusConfig
