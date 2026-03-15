/**
 * NetworkPolicy Status Card Configuration
 *
 * Displays Kubernetes NetworkPolicies using the unified card system.
 */

import type { UnifiedCardConfig } from '../../lib/unified/types'

export const networkPolicyStatusConfig: UnifiedCardConfig = {
  type: 'network_policy_status',
  title: 'Network Policies',
  category: 'network',
  description: 'Kubernetes NetworkPolicies across clusters',

  // Appearance
  icon: 'Shield',
  iconColor: 'text-red-400',
  defaultWidth: 6,
  defaultHeight: 3,

  // Data source
  dataSource: {
    type: 'hook',
    hook: 'useNetworkPolicies',
  },

  // Filters
  filters: [
    {
      field: 'search',
      type: 'text',
      placeholder: 'Search network policies...',
      searchFields: ['name', 'namespace', 'cluster'],
      storageKey: 'network-policy-status',
    },
    {
      field: 'cluster',
      type: 'cluster-select',
      label: 'Cluster',
      storageKey: 'network-policy-status-cluster',
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
        field: 'podSelector',
        header: 'Pod Selector',
        render: 'text',
        width: 120,
      },
      {
        field: 'policyTypes',
        header: 'Types',
        render: 'text',
        width: 100,
      },
    ],
  },

  // Empty state
  emptyState: {
    icon: 'Shield',
    title: 'No Network Policies',
    message: 'No NetworkPolicies found in the selected clusters',
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

export default networkPolicyStatusConfig
