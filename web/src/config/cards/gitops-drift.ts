/**
 * GitOps Drift Card Configuration
 *
 * Displays resources that have drifted from their Git source.
 */

import type { UnifiedCardConfig } from '../../lib/unified/types'

export const gitopsDriftConfig: UnifiedCardConfig = {
  type: 'gitops_drift',
  title: 'GitOps Drift',
  category: 'gitops',
  description: 'Resources that have drifted from their declared state',
  icon: 'GitBranch',
  iconColor: 'text-yellow-400',
  defaultWidth: 6,
  defaultHeight: 3,

  dataSource: {
    type: 'hook',
    hook: 'useGitOpsDrift',
  },

  stats: [
    {
      id: 'drifted',
      icon: 'AlertTriangle',
      color: 'yellow',
      label: 'Drifted',
      bgColor: 'bg-yellow-500',
      valueSource: { type: 'count' },
    },
  ],

  content: {
    type: 'list',
    columns: [
      {
        field: 'status',
        header: '',
        width: 32,
        render: 'status-badge',
      },
      {
        field: 'resource',
        header: 'Resource',
        primary: true,
      },
      {
        field: 'kind',
        header: 'Kind',
        width: 100,
      },
      {
        field: 'lastSync',
        header: 'Last Sync',
        width: 100,
        render: 'relative-time',
      },
    ],
    pageSize: 6,
  },

  emptyState: {
    icon: 'GitMerge',
    title: 'No drift detected',
    message: 'All resources are in sync',
    variant: 'success',
  },

  drillDown: {
    action: 'showGitOpsDrift',
    params: ['resource', 'kind', 'namespace'],
  },

  isDemoData: true,
}
