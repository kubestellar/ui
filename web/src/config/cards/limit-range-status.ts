/**
 * LimitRange Status Card Configuration
 *
 * Displays Kubernetes LimitRanges using the unified card system.
 */

import type { UnifiedCardConfig } from '../../lib/unified/types'

export const limitRangeStatusConfig: UnifiedCardConfig = {
  type: 'limit_range_status',
  title: 'Limit Ranges',
  category: 'namespaces',
  description: 'Kubernetes LimitRanges across clusters',

  // Appearance
  icon: 'Sliders',
  iconColor: 'text-teal-400',
  defaultWidth: 6,
  defaultHeight: 3,

  // Data source
  dataSource: {
    type: 'hook',
    hook: 'useLimitRanges',
  },

  // Filters
  filters: [
    {
      field: 'search',
      type: 'text',
      placeholder: 'Search limit ranges...',
      searchFields: ['name', 'namespace', 'cluster'],
      storageKey: 'limit-range-status',
    },
    {
      field: 'cluster',
      type: 'cluster-select',
      label: 'Cluster',
      storageKey: 'limit-range-status-cluster',
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
        width: 100,
      },
    ],
  },

  // Empty state
  emptyState: {
    icon: 'Sliders',
    title: 'No Limit Ranges',
    message: 'No LimitRanges found in the selected clusters',
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

export default limitRangeStatusConfig
