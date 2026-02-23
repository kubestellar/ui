/**
 * Operator Subscription Status Card Configuration
 *
 * Displays OLM Operator Subscriptions using the unified card system.
 */

import type { UnifiedCardConfig } from '../../lib/unified/types'

export const operatorSubscriptionStatusConfig: UnifiedCardConfig = {
  type: 'operator_subscription_status',
  title: 'Operator Subscriptions',
  category: 'operators',
  description: 'OLM Operator Subscriptions across clusters',

  // Appearance
  icon: 'RefreshCw',
  iconColor: 'text-violet-400',
  defaultWidth: 6,
  defaultHeight: 3,

  // Data source
  dataSource: {
    type: 'hook',
    hook: 'useOperatorSubscriptions',
  },

  // Filters
  filters: [
    {
      field: 'search',
      type: 'text',
      placeholder: 'Search subscriptions...',
      searchFields: ['name', 'namespace', 'cluster', 'channel'],
      storageKey: 'operator-subscription-status',
    },
    {
      field: 'cluster',
      type: 'cluster-select',
      label: 'Cluster',
      storageKey: 'operator-subscription-status-cluster',
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
        field: 'channel',
        header: 'Channel',
        render: 'text',
        width: 80,
      },
      {
        field: 'installPlanApproval',
        header: 'Approval',
        render: 'status-badge',
        width: 90,
      },
    ],
  },

  // Empty state
  emptyState: {
    icon: 'RefreshCw',
    title: 'No Subscriptions',
    message: 'No Operator Subscriptions found in the selected clusters',
    variant: 'info',
  },

  // Loading state
  loadingState: {
    type: 'list',
    rows: 5,
    showSearch: true,
  },

  // Metadata
  isDemoData: false,
  isLive: true,
}

export default operatorSubscriptionStatusConfig
