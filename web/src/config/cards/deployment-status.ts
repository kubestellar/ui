/**
 * Deployment Status Card Configuration
 *
 * Shows deployment health and replica status across clusters.
 */

import type { UnifiedCardConfig } from '../../lib/unified/types'

export const deploymentStatusConfig: UnifiedCardConfig = {
  type: 'deployment_status',
  title: 'Deployment Status',
  category: 'workloads',
  description: 'Status of deployments showing replica counts and health',

  // Appearance
  icon: 'Layers',
  iconColor: 'text-blue-400',
  defaultWidth: 6,
  defaultHeight: 3,

  // Data source
  dataSource: {
    type: 'hook',
    hook: 'useCachedDeployments',
  },

  // Filters
  filters: [
    {
      field: 'search',
      type: 'text',
      placeholder: 'Search deployments...',
      searchFields: ['name', 'namespace', 'cluster'],
      storageKey: 'deployment-status',
    },
    {
      field: 'cluster',
      type: 'cluster-select',
      label: 'Cluster',
      storageKey: 'deployment-status-cluster',
    },
  ],

  // Content - Table visualization
  content: {
    type: 'table',
    pageSize: 10,
    sortable: true,
    defaultSort: 'name',
    defaultDirection: 'asc',
    columns: [
      {
        field: 'cluster',
        header: 'Cluster',
        render: 'cluster-badge',
        width: 120,
        sortable: true,
      },
      {
        field: 'namespace',
        header: 'Namespace',
        render: 'namespace-badge',
        width: 120,
        sortable: true,
      },
      {
        field: 'name',
        header: 'Deployment',
        primary: true,
        sortable: true,
      },
      {
        field: 'readyReplicas',
        header: 'Ready',
        render: 'number',
        align: 'center',
        width: 70,
        sortable: true,
      },
      {
        field: 'replicas',
        header: 'Total',
        render: 'number',
        align: 'center',
        width: 70,
        sortable: true,
      },
      {
        field: 'status',
        header: 'Status',
        render: 'status-badge',
        width: 100,
        sortable: true,
      },
    ],
  },

  // Drill-down
  drillDown: {
    action: 'drillToDeployment',
    params: ['cluster', 'namespace', 'name'],
    context: {
      replicas: 'replicas',
      readyReplicas: 'readyReplicas',
    },
  },

  // Empty state
  emptyState: {
    icon: 'Layers',
    title: 'No deployments found',
    message: 'No deployments in selected clusters',
    variant: 'neutral',
  },

  // Loading state
  loadingState: {
    type: 'table',
    rows: 5,
    showSearch: true,
  },

  // Metadata
  isDemoData: false,
  isLive: true,
}

export default deploymentStatusConfig
