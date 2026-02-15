/**
 * Resource Usage Card Configuration
 *
 * Shows CPU and memory usage across clusters.
 */

import type { UnifiedCardConfig } from '../../lib/unified/types'

export const resourceUsageConfig: UnifiedCardConfig = {
  type: 'resource_usage',
  title: 'Resource Usage',
  category: 'compute',
  description: 'CPU and memory utilization across clusters',

  // Appearance
  icon: 'Cpu',
  iconColor: 'text-cyan-400',
  defaultWidth: 4,
  defaultHeight: 3,

  // Data source
  dataSource: {
    type: 'hook',
    hook: 'useCachedResourceUsage',
  },

  // Inline stats
  stats: [
    {
      id: 'avgCpu',
      icon: 'Cpu',
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/10',
      label: 'Avg CPU',
      valueSource: { type: 'computed', expression: 'avg:cpuPercent' },
    },
    {
      id: 'avgMemory',
      icon: 'MemoryStick',
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
      label: 'Avg Memory',
      valueSource: { type: 'computed', expression: 'avg:memoryPercent' },
    },
  ],

  // Filters
  filters: [
    {
      field: 'search',
      type: 'text',
      placeholder: 'Search...',
      searchFields: ['cluster', 'nodeName'],
      storageKey: 'resource-usage',
    },
  ],

  // Content - Table visualization
  content: {
    type: 'table',
    pageSize: 10,
    sortable: true,
    defaultSort: 'cpuPercent',
    defaultDirection: 'desc',
    columns: [
      {
        field: 'cluster',
        header: 'Cluster',
        render: 'cluster-badge',
        width: 120,
        sortable: true,
      },
      {
        field: 'nodeName',
        header: 'Node',
        primary: true,
        sortable: true,
      },
      {
        field: 'cpuPercent',
        header: 'CPU',
        render: 'progress-bar',
        width: 150,
        sortable: true,
      },
      {
        field: 'memoryPercent',
        header: 'Memory',
        render: 'progress-bar',
        width: 150,
        sortable: true,
      },
    ],
  },

  // Drill-down
  drillDown: {
    action: 'drillToNode',
    params: ['cluster', 'nodeName'],
  },

  // Empty state
  emptyState: {
    icon: 'Cpu',
    title: 'No resource data',
    message: 'Resource metrics will appear here',
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

export default resourceUsageConfig
