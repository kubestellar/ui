/**
 * Events Timeline Card Configuration
 *
 * Shows event counts over time using a bar chart.
 */

import type { UnifiedCardConfig } from '../../lib/unified/types'

export const eventsTimelineConfig: UnifiedCardConfig = {
  type: 'events_timeline',
  title: 'Events Timeline',
  category: 'alerting',
  description: 'Event frequency over time',

  // Appearance
  icon: 'Clock',
  iconColor: 'text-amber-400',
  defaultWidth: 6,
  defaultHeight: 3,

  // Data source
  dataSource: {
    type: 'hook',
    hook: 'useCachedEventsTimeline',
  },

  // Inline stats
  stats: [
    {
      id: 'totalEvents',
      icon: 'Bell',
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
      label: 'Total',
      valueSource: { type: 'computed', expression: 'sum:count' },
    },
    {
      id: 'warningEvents',
      icon: 'AlertTriangle',
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/10',
      label: 'Warnings',
      valueSource: { type: 'computed', expression: 'sum:warnings' },
    },
    {
      id: 'errorEvents',
      icon: 'AlertCircle',
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
      label: 'Errors',
      valueSource: { type: 'computed', expression: 'sum:errors' },
    },
  ],

  // Content - Bar chart visualization
  content: {
    type: 'chart',
    chartType: 'bar',
    height: 180,
    showLegend: true,
    xAxis: {
      field: 'time',
      label: 'Time',
    },
    yAxis: {
      label: 'Events',
    },
    series: [
      {
        field: 'normal',
        label: 'Normal',
        color: '#22c55e', // green
      },
      {
        field: 'warnings',
        label: 'Warning',
        color: '#f59e0b', // amber
      },
      {
        field: 'errors',
        label: 'Error',
        color: '#ef4444', // red
      },
    ],
  },

  // Empty state
  emptyState: {
    icon: 'Clock',
    title: 'No events',
    message: 'Event history will appear here',
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

export default eventsTimelineConfig
