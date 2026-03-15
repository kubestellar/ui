/**
 * Operator Status Card Configuration
 *
 * Displays Kubernetes Operators using the unified card system.
 */

import type { UnifiedCardConfig } from '../../lib/unified/types'

export const operatorStatusConfig: UnifiedCardConfig = {
  type: 'operator_status',
  title: 'Operator Status',
  category: 'operators',
  description: 'OLM-managed Operators across clusters',

  // Appearance
  icon: 'Package',
  iconColor: 'text-purple-400',
  defaultWidth: 6,
  defaultHeight: 3,

  // Data source
  dataSource: {
    type: 'hook',
    hook: 'useOperators',
  },

  // Filters
  filters: [
    {
      field: 'search',
      type: 'text',
      placeholder: 'Search operators...',
      searchFields: ['name', 'namespace', 'version', 'cluster'],
      storageKey: 'operator-status',
    },
    {
      field: 'cluster',
      type: 'cluster-select',
      label: 'Cluster',
      storageKey: 'operator-status-cluster',
    },
  ],

  // Content - List visualization
  content: {
    type: 'list',
    pageSize: 5,
    columns: [
      {
        field: 'cluster',
        header: 'Cluster',
        render: 'cluster-badge',
        width: 100,
      },
      {
        field: 'name',
        header: 'Operator',
        primary: true,
        render: 'truncate',
      },
      {
        field: 'namespace',
        header: 'Namespace',
        render: 'namespace-badge',
        width: 100,
      },
      {
        field: 'status',
        header: 'Status',
        render: 'status-badge',
        width: 100,
      },
      {
        field: 'version',
        header: 'Version',
        render: 'text',
        width: 90,
      },
    ],
  },

  // Drill-down configuration
  drillDown: {
    action: 'drillToOperator',
    params: ['cluster', 'namespace', 'name'],
    context: {
      status: 'status',
      version: 'version',
      upgradeAvailable: 'upgradeAvailable',
    },
  },

  // Empty state
  emptyState: {
    icon: 'Package',
    title: 'No operators found',
    message: 'No OLM-managed Operators in the selected clusters',
    variant: 'info',
  },

  // Loading state
  loadingState: {
    type: 'list',
    rows: 3,
    showSearch: true,
  },

  // Metadata
  isDemoData: false,
  isLive: true,
}

export default operatorStatusConfig
