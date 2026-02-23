/**
 * Deployment Issues Card Configuration
 *
 * Displays Kubernetes Deployments with issues using the unified card system.
 */

import type { UnifiedCardConfig } from '../../lib/unified/types'

export const deploymentIssuesConfig: UnifiedCardConfig = {
  type: 'deployment_issues',
  title: 'Deployment Issues',
  category: 'workloads',
  description: 'Kubernetes Deployments with replica or readiness issues',

  // Appearance
  icon: 'AlertTriangle',
  iconColor: 'text-orange-400',
  defaultWidth: 6,
  defaultHeight: 3,

  // Data source
  dataSource: {
    type: 'hook',
    hook: 'useCachedDeploymentIssues',
  },

  // Filters
  filters: [
    {
      field: 'search',
      type: 'text',
      placeholder: 'Search deployments...',
      searchFields: ['name', 'namespace', 'cluster', 'reason', 'message'],
      storageKey: 'deployment-issues',
    },
    {
      field: 'cluster',
      type: 'cluster-select',
      label: 'Cluster',
      storageKey: 'deployment-issues-cluster',
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
        header: 'Deployment',
        primary: true,
        render: 'truncate',
      },
      {
        field: 'reason',
        header: 'Reason',
        render: 'status-badge',
        width: 120,
      },
      {
        field: 'readyReplicas',
        header: 'Ready',
        render: 'replica-count',
        width: 80,
      },
    ],
  },

  // Drill-down configuration
  drillDown: {
    action: 'drillToDeployment',
    params: ['cluster', 'namespace', 'name'],
    context: {
      replicas: 'replicas',
      readyReplicas: 'readyReplicas',
      reason: 'reason',
      message: 'message',
    },
  },

  // Empty state
  emptyState: {
    icon: 'CheckCircle',
    title: 'All deployments healthy',
    message: 'No deployment issues detected',
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

export default deploymentIssuesConfig
