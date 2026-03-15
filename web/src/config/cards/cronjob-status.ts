/**
 * CronJob Status Card Configuration
 *
 * Displays Kubernetes CronJobs using the unified card system.
 */

import type { UnifiedCardConfig } from '../../lib/unified/types'

export const cronJobStatusConfig: UnifiedCardConfig = {
  type: 'cronjob_status',
  title: 'CronJobs',
  category: 'workloads',
  description: 'Kubernetes CronJobs across clusters',

  // Appearance
  icon: 'Clock',
  iconColor: 'text-orange-400',
  defaultWidth: 6,
  defaultHeight: 3,

  // Data source
  dataSource: {
    type: 'hook',
    hook: 'useCronJobs',
  },

  // Filters
  filters: [
    {
      field: 'search',
      type: 'text',
      placeholder: 'Search cronjobs...',
      searchFields: ['name', 'namespace', 'cluster', 'schedule'],
      storageKey: 'cronjob-status',
    },
    {
      field: 'cluster',
      type: 'cluster-select',
      label: 'Cluster',
      storageKey: 'cronjob-status-cluster',
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
        field: 'schedule',
        header: 'Schedule',
        render: 'text',
        width: 100,
      },
      {
        field: 'suspend',
        header: 'Suspended',
        render: 'status-badge',
        width: 80,
      },
      {
        field: 'lastSchedule',
        header: 'Last Run',
        render: 'relative-time',
        width: 80,
      },
    ],
  },

  // Empty state
  emptyState: {
    icon: 'Clock',
    title: 'No CronJobs',
    message: 'No CronJobs found in the selected clusters',
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

export default cronJobStatusConfig
