/**
 * Pod Issues Card Configuration
 *
 * Displays pods with issues (CrashLoopBackOff, OOMKilled, etc.)
 * using the unified card system.
 */

import type { UnifiedCardConfig } from '../../lib/unified/types'

export const podIssuesConfig: UnifiedCardConfig = {
  type: 'pod_issues',
  title: 'Pod Issues',
  category: 'workloads',
  description: 'Pods with errors, crashes, or other issues requiring attention',

  // Appearance
  icon: 'AlertTriangle',
  iconColor: 'text-orange-400',
  defaultWidth: 6,
  defaultHeight: 3,

  // Data source
  dataSource: {
    type: 'hook',
    hook: 'useCachedPodIssues',
  },

  // Filters
  filters: [
    {
      field: 'search',
      type: 'text',
      placeholder: 'Search issues...',
      searchFields: ['name', 'namespace', 'cluster', 'status'],
      storageKey: 'pod-issues',
    },
    {
      field: 'cluster',
      type: 'cluster-select',
      label: 'Cluster',
      storageKey: 'pod-issues-cluster',
    },
  ],

  // Content - List visualization
  content: {
    type: 'list',
    pageSize: 5,
    itemClick: 'drill',
    // Sorting configuration
    sortable: true,
    defaultSort: 'status',
    defaultDirection: 'asc',
    sortOptions: [
      { field: 'status', label: 'Status' },
      { field: 'name', label: 'Name' },
      { field: 'restarts', label: 'Restarts' },
      { field: 'cluster', label: 'Cluster' },
    ],
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
        header: 'Pod',
        primary: true,
        render: 'truncate',
      },
      {
        field: 'status',
        header: 'Status',
        render: 'status-badge',
        width: 120,
      },
      {
        field: 'restarts',
        header: 'Restarts',
        render: 'number',
        align: 'right',
        width: 80,
      },
    ],
    // AI Actions for Diagnose/Repair buttons
    aiActions: {
      resourceMapping: {
        kind: 'Pod',
        nameField: 'name',
        namespaceField: 'namespace',
        clusterField: 'cluster',
        statusField: 'status',
      },
      issuesField: 'issues',
      contextFields: ['restarts'],
      showRepair: true,
    },
  },

  // Drill-down
  drillDown: {
    action: 'drillToPod',
    params: ['cluster', 'namespace', 'name'],
    context: {
      status: 'status',
      restarts: 'restarts',
      issues: 'issues',
    },
  },

  // Empty state
  emptyState: {
    icon: 'CheckCircle',
    title: 'All pods healthy',
    message: 'No issues detected',
    variant: 'success',
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

export default podIssuesConfig
