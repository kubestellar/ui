/**
 * Compute Dashboard Configuration
 *
 * Dashboard focused on compute resources: clusters, nodes, pods.
 */

import type { UnifiedDashboardConfig } from '../../lib/unified/types'

export const computeDashboardConfig: UnifiedDashboardConfig = {
  id: 'compute',
  name: 'Compute',
  subtitle: 'Cluster and node resources',
  route: '/compute',

  statsType: 'compute',
  stats: {
    type: 'compute',
    title: 'Compute Resources',
    collapsible: true,
    showConfigButton: true,
    blocks: [
      {
        id: 'clusters',
        name: 'Clusters',
        icon: 'Server',
        color: 'purple',
        visible: true,
        valueSource: { type: 'field', path: 'summary.totalClusters' },
      },
      {
        id: 'nodes',
        name: 'Nodes',
        icon: 'Box',
        color: 'cyan',
        visible: true,
        valueSource: { type: 'field', path: 'summary.totalNodes' },
      },
      {
        id: 'pods',
        name: 'Pods',
        icon: 'Layers',
        color: 'blue',
        visible: true,
        valueSource: { type: 'field', path: 'summary.totalPods' },
      },
      {
        id: 'cpu-usage',
        name: 'CPU Usage',
        icon: 'Cpu',
        color: 'orange',
        visible: true,
        valueSource: { type: 'field', path: 'summary.cpuUsagePercent' },
        format: 'percentage',
      },
      {
        id: 'memory-usage',
        name: 'Memory',
        icon: 'MemoryStick',
        color: 'green',
        visible: true,
        valueSource: { type: 'field', path: 'summary.memoryUsagePercent' },
        format: 'percentage',
      },
    ],
  },

  cards: [
    {
      id: 'compute-1',
      cardType: 'cluster_health',
      position: { w: 4, h: 3, x: 0, y: 0 },
    },
    {
      id: 'compute-2',
      cardType: 'resource_usage',
      position: { w: 4, h: 3, x: 4, y: 0 },
    },
    {
      id: 'compute-3',
      cardType: 'top_pods',
      position: { w: 4, h: 3, x: 8, y: 0 },
    },
    {
      id: 'compute-4',
      cardType: 'cluster_metrics',
      position: { w: 6, h: 3, x: 0, y: 3 },
    },
    {
      id: 'compute-5',
      cardType: 'pod_issues',
      position: { w: 6, h: 3, x: 6, y: 3 },
    },
  ],

  availableCardTypes: [
    'cluster_health',
    'resource_usage',
    'top_pods',
    'pod_issues',
    'cluster_metrics',
    'deployment_status',
  ],

  features: {
    dragDrop: true,
    autoRefresh: true,
    autoRefreshInterval: 30000,
    addCard: true,
  },

  storageKey: 'kubestellar-unified-compute-dashboard',
}

export default computeDashboardConfig
