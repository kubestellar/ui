/**
 * Job Status Card Configuration
 *
 * Displays Kubernetes Jobs using the unified card system.
 */

import type { UnifiedCardConfig } from '../../lib/unified/types'

export const jobStatusConfig: UnifiedCardConfig = {
  type: 'job_status',
  title: 'Jobs',
  category: 'workloads',
  description: 'Kubernetes Jobs across clusters',

  // Appearance
  icon: 'Play',
  iconColor: 'text-blue-400',
  defaultWidth: 6,
  defaultHeight: 3,

  // Data source
  dataSource: {
    type: 'hook',
    hook: 'useJobs',
  },

  // Filters
  filters: [
    {
      field: 'search',
      type: 'text',
      placeholder: 'Search jobs...',
      searchFields: ['name', 'namespace', 'cluster'],
      storageKey: 'job-status',
    },
    {
      field: 'cluster',
      type: 'cluster-select',
      label: 'Cluster',
      storageKey: 'job-status-cluster',
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
        field: 'status',
        header: 'Status',
        render: 'status-badge',
        width: 90,
      },
      {
        field: 'completions',
        header: 'Done',
        render: 'text',
        align: 'right',
        width: 60,
      },
      {
        field: 'duration',
        header: 'Duration',
        render: 'text',
        width: 80,
      },
    ],
  },

  // Empty state
  emptyState: {
    icon: 'Play',
    title: 'No Jobs',
    message: 'No Jobs found in the selected clusters',
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

export default jobStatusConfig
