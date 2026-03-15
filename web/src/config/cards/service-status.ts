/**
 * Service Status Card Configuration
 *
 * Displays Kubernetes Services using the unified card system.
 */

import type { UnifiedCardConfig } from '../../lib/unified/types'

export const serviceStatusConfig: UnifiedCardConfig = {
  type: 'service_status',
  title: 'Service Status',
  category: 'network',
  description: 'Kubernetes Services across clusters',

  // Appearance
  icon: 'Network',
  iconColor: 'text-blue-400',
  defaultWidth: 6,
  defaultHeight: 3,

  // Data source
  dataSource: {
    type: 'hook',
    hook: 'useServices',
  },

  // Filters
  filters: [
    {
      field: 'search',
      type: 'text',
      placeholder: 'Search services...',
      searchFields: ['name', 'namespace', 'cluster', 'type'],
      storageKey: 'service-status-unified',
    },
    {
      field: 'cluster',
      type: 'cluster-select',
      label: 'Cluster',
      storageKey: 'service-status-unified-cluster',
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
        render: 'status-badge',
        width: 100,
      },
      {
        field: 'clusterIP',
        header: 'Cluster IP',
        render: 'text',
        width: 120,
      },
      {
        field: 'ports',
        header: 'Ports',
        render: 'text',
        width: 100,
      },
    ],
  },

  // Empty state
  emptyState: {
    icon: 'Network',
    title: 'No services found',
    message: 'No Services in the selected clusters',
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

export default serviceStatusConfig
