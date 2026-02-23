/**
 * GitOps Dashboard Configuration
 *
 * Dashboard focused on GitOps sync status and deployments.
 */

import type { UnifiedDashboardConfig } from '../../lib/unified/types'

export const gitopsDashboardConfig: UnifiedDashboardConfig = {
  id: 'gitops',
  name: 'GitOps',
  subtitle: 'Deployment and sync status',
  route: '/gitops',

  statsType: 'gitops',
  stats: {
    type: 'gitops',
    title: 'GitOps Status',
    collapsible: true,
    showConfigButton: true,
    blocks: [
      {
        id: 'deployments',
        name: 'Deployments',
        icon: 'Rocket',
        color: 'blue',
        visible: true,
        valueSource: { type: 'field', path: 'summary.totalDeployments' },
      },
      {
        id: 'synced',
        name: 'Synced',
        icon: 'CheckCircle2',
        color: 'green',
        visible: true,
        valueSource: { type: 'field', path: 'summary.syncedCount' },
      },
      {
        id: 'drifted',
        name: 'Drifted',
        icon: 'AlertTriangle',
        color: 'yellow',
        visible: true,
        valueSource: { type: 'field', path: 'summary.driftedCount' },
      },
      {
        id: 'failed',
        name: 'Failed',
        icon: 'XCircle',
        color: 'red',
        visible: true,
        valueSource: { type: 'field', path: 'summary.failedCount' },
      },
    ],
  },

  cards: [
    {
      id: 'gitops-1',
      cardType: 'deployment_status',
      position: { w: 6, h: 3, x: 0, y: 0 },
    },
    {
      id: 'gitops-2',
      cardType: 'gitops_drift',
      position: { w: 6, h: 3, x: 6, y: 0 },
    },
    {
      id: 'gitops-3',
      cardType: 'event_stream',
      position: { w: 6, h: 4, x: 0, y: 3 },
    },
    {
      id: 'gitops-4',
      cardType: 'events_timeline',
      position: { w: 6, h: 3, x: 6, y: 3 },
    },
  ],

  availableCardTypes: [
    'deployment_status',
    'gitops_drift',
    'event_stream',
    'events_timeline',
  ],

  features: {
    dragDrop: true,
    autoRefresh: true,
    autoRefreshInterval: 30000,
    addCard: true,
  },

  storageKey: 'kubestellar-unified-gitops-dashboard',
}

export default gitopsDashboardConfig
