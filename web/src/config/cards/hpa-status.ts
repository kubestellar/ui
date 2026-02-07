/**
 * HPA Status Card Configuration
 *
 * Displays Kubernetes HorizontalPodAutoscalers using the unified card system.
 */

import type { UnifiedCardConfig } from '../../lib/unified/types'

export const hpaStatusConfig: UnifiedCardConfig = {
  type: 'hpa_status',
  title: 'Autoscalers',
  category: 'workloads',
  description: 'Kubernetes HorizontalPodAutoscalers across clusters',

  // Appearance
  icon: 'TrendingUp',
  iconColor: 'text-cyan-400',
  defaultWidth: 6,
  defaultHeight: 3,

  // Data source
  dataSource: {
    type: 'hook',
    hook: 'useHPAs',
  },

  // Filters
  filters: [
    {
      field: 'search',
      type: 'text',
      placeholder: 'Search HPAs...',
      searchFields: ['name', 'namespace', 'cluster', 'targetRef'],
      storageKey: 'hpa-status',
    },
    {
      field: 'cluster',
      type: 'cluster-select',
      label: 'Cluster',
      storageKey: 'hpa-status-cluster',
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
        field: 'targetRef',
        header: 'Target',
        render: 'text',
        width: 100,
      },
      {
        field: 'currentReplicas',
        header: 'Current',
        render: 'number',
        align: 'right',
        width: 60,
      },
      {
        field: 'minReplicas',
        header: 'Min',
        render: 'number',
        align: 'right',
        width: 50,
      },
      {
        field: 'maxReplicas',
        header: 'Max',
        render: 'number',
        align: 'right',
        width: 50,
      },
    ],
  },

  // Empty state
  emptyState: {
    icon: 'TrendingUp',
    title: 'No Autoscalers',
    message: 'No HPAs found in the selected clusters',
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

export default hpaStatusConfig
