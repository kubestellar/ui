/**
 * Cluster Metrics Card Configuration
 *
 * Shows cluster performance metrics over time using line/area charts.
 */

import type { UnifiedCardConfig } from '../../lib/unified/types'

export const clusterMetricsConfig: UnifiedCardConfig = {
  type: 'cluster_metrics',
  title: 'Cluster Metrics',
  category: 'compute',
  description: 'CPU and memory metrics over time',

  // Appearance
  icon: 'Activity',
  iconColor: 'text-blue-400',
  defaultWidth: 6,
  defaultHeight: 4,

  // Data source
  dataSource: {
    type: 'hook',
    hook: 'useCachedClusterMetrics',
  },

  // Inline stats
  stats: [
    {
      id: 'currentCpu',
      icon: 'Cpu',
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/10',
      label: 'CPU',
      valueSource: { type: 'computed', expression: 'latest:cpu' },
    },
    {
      id: 'currentMemory',
      icon: 'MemoryStick',
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
      label: 'Memory',
      valueSource: { type: 'computed', expression: 'latest:memory' },
    },
  ],

  // Content - Line chart visualization
  content: {
    type: 'chart',
    chartType: 'area',
    height: 250,
    showLegend: true,
    xAxis: {
      field: 'time',
      label: 'Time',
    },
    yAxis: {
      label: 'Usage %',
    },
    series: [
      {
        field: 'cpu',
        label: 'CPU Usage',
        color: '#06b6d4', // cyan
      },
      {
        field: 'memory',
        label: 'Memory Usage',
        color: '#a855f7', // purple
      },
    ],
  },

  // Empty state
  emptyState: {
    icon: 'Activity',
    title: 'No metrics data',
    message: 'Cluster metrics will appear here once data is available',
    variant: 'neutral',
  },

  // Loading state
  loadingState: {
    type: 'chart',
    rows: 1,
    showSearch: false,
  },

  // Metadata
  isDemoData: false,
  isLive: true,
}

export default clusterMetricsConfig
