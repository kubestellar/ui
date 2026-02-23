/**
 * ResourceQuota Status Card Configuration
 *
 * Displays Kubernetes ResourceQuotas using the unified card system.
 */

import type { UnifiedCardConfig } from '../../lib/unified/types'

export const resourceQuotaStatusConfig: UnifiedCardConfig = {
  type: 'resource_quota_status',
  title: 'Resource Quotas',
  category: 'namespaces',
  description: 'Kubernetes ResourceQuotas across clusters',

  // Appearance
  icon: 'Gauge',
  iconColor: 'text-rose-400',
  defaultWidth: 6,
  defaultHeight: 3,

  // Data source
  dataSource: {
    type: 'hook',
    hook: 'useResourceQuotas',
  },

  // Filters
  filters: [
    {
      field: 'search',
      type: 'text',
      placeholder: 'Search quotas...',
      searchFields: ['name', 'namespace', 'cluster'],
      storageKey: 'resource-quota-status',
    },
    {
      field: 'cluster',
      type: 'cluster-select',
      label: 'Cluster',
      storageKey: 'resource-quota-status-cluster',
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
        field: 'cpuUsed',
        header: 'CPU Used',
        render: 'text',
        width: 80,
      },
      {
        field: 'memoryUsed',
        header: 'Memory Used',
        render: 'text',
        width: 100,
      },
    ],
  },

  // Empty state
  emptyState: {
    icon: 'Gauge',
    title: 'No Resource Quotas',
    message: 'No ResourceQuotas found in the selected clusters',
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

export default resourceQuotaStatusConfig
