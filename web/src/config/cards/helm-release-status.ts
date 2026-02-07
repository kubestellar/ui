/**
 * Helm Release Status Card Configuration
 *
 * Displays Helm releases across clusters using the unified card system.
 */

import type { UnifiedCardConfig } from '../../lib/unified/types'

export const helmReleaseStatusConfig: UnifiedCardConfig = {
  type: 'helm_release_status',
  title: 'Helm Release Status',
  category: 'gitops',
  description: 'Helm releases across clusters',

  // Appearance
  icon: 'Package',
  iconColor: 'text-blue-400',
  defaultWidth: 6,
  defaultHeight: 3,

  // Data source
  dataSource: {
    type: 'hook',
    hook: 'useHelmReleases',
  },

  // Filters
  filters: [
    {
      field: 'search',
      type: 'text',
      placeholder: 'Search releases...',
      searchFields: ['name', 'namespace', 'chart', 'cluster'],
      storageKey: 'helm-release-status',
    },
    {
      field: 'cluster',
      type: 'cluster-select',
      label: 'Cluster',
      storageKey: 'helm-release-status-cluster',
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
        field: 'namespace',
        header: 'Namespace',
        render: 'namespace-badge',
        width: 100,
      },
      {
        field: 'name',
        header: 'Release',
        primary: true,
        render: 'truncate',
      },
      {
        field: 'chart',
        header: 'Chart',
        render: 'text',
        width: 100,
      },
      {
        field: 'status',
        header: 'Status',
        render: 'status-badge',
        width: 90,
      },
      {
        field: 'revision',
        header: 'Rev',
        render: 'number',
        align: 'right',
        width: 50,
      },
    ],
  },

  // Drill-down configuration
  drillDown: {
    action: 'drillToHelm',
    params: ['cluster', 'namespace', 'name'],
    context: {
      chart: 'chart',
      status: 'status',
      revision: 'revision',
    },
  },

  // Empty state
  emptyState: {
    icon: 'Package',
    title: 'No Helm releases',
    message: 'No Helm releases found in the selected clusters',
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

export default helmReleaseStatusConfig
