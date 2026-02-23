/**
 * Top Pods Card Configuration
 *
 * Displays pods with highest resource consumption.
 */

import type { UnifiedCardConfig } from '../../lib/unified/types'

export const topPodsConfig: UnifiedCardConfig = {
  type: 'top_pods',
  title: 'Top Pods',
  category: 'workloads',
  description: 'Pods consuming the most resources',
  icon: 'TrendingUp',
  iconColor: 'text-orange-400',
  defaultWidth: 6,
  defaultHeight: 3,

  isDemoData: true, // Uses demo data hook in registerHooks.ts

  dataSource: {
    type: 'hook',
    hook: 'useTopPods',
  },

  filters: [
    {
      field: 'metric',
      label: 'Sort By',
      type: 'select',
      options: [
        { value: 'cpu', label: 'CPU' },
        { value: 'memory', label: 'Memory' },
      ],
    },
  ],

  content: {
    type: 'table',
    columns: [
      {
        field: 'name',
        header: 'Pod',
        primary: true,
      },
      {
        field: 'namespace',
        header: 'Namespace',
        width: 120,
      },
      {
        field: 'cpu',
        header: 'CPU',
        width: 80,
        render: 'percentage',
      },
      {
        field: 'memory',
        header: 'Memory',
        width: 80,
        render: 'percentage',
      },
      {
        field: 'cluster',
        header: 'Cluster',
        width: 100,
        render: 'cluster-badge',
      },
    ],
    sortable: true,
  },

  emptyState: {
    icon: 'Box',
    title: 'No pod data',
    message: 'Pod metrics not available',
    variant: 'neutral',
  },

  drillDown: {
    action: 'showPodDetails',
    params: ['name', 'namespace', 'cluster'],
  },
}
