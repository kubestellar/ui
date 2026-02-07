/**
 * Workloads Dashboard Configuration
 *
 * Dashboard focused on workload resources: Deployments, StatefulSets, DaemonSets, Jobs.
 */

import type { UnifiedDashboardConfig } from '../../lib/unified/types'

export const workloadsDashboardConfig: UnifiedDashboardConfig = {
  id: 'workloads',
  name: 'Workloads',
  subtitle: 'Application workloads',
  route: '/workloads',

  statsType: 'workloads',
  stats: {
    type: 'workloads',
    title: 'Workload Resources',
    collapsible: true,
    showConfigButton: true,
    blocks: [
      {
        id: 'deployments',
        name: 'Deployments',
        icon: 'Package',
        color: 'blue',
        visible: true,
        valueSource: { type: 'field', path: 'summary.totalDeployments' },
      },
      {
        id: 'statefulsets',
        name: 'StatefulSets',
        icon: 'Database',
        color: 'purple',
        visible: true,
        valueSource: { type: 'field', path: 'summary.totalStatefulSets' },
      },
      {
        id: 'daemonsets',
        name: 'DaemonSets',
        icon: 'Layers',
        color: 'cyan',
        visible: true,
        valueSource: { type: 'field', path: 'summary.totalDaemonSets' },
      },
      {
        id: 'jobs',
        name: 'Jobs',
        icon: 'Zap',
        color: 'orange',
        visible: true,
        valueSource: { type: 'field', path: 'summary.totalJobs' },
      },
      {
        id: 'cronjobs',
        name: 'CronJobs',
        icon: 'Clock',
        color: 'green',
        visible: true,
        valueSource: { type: 'field', path: 'summary.totalCronJobs' },
      },
    ],
  },

  cards: [
    {
      id: 'workloads-1',
      cardType: 'deployment_status',
      position: { w: 6, h: 3, x: 0, y: 0 },
    },
    {
      id: 'workloads-2',
      cardType: 'deployment_issues',
      position: { w: 6, h: 3, x: 6, y: 0 },
    },
    {
      id: 'workloads-3',
      cardType: 'statefulset_status',
      position: { w: 6, h: 3, x: 0, y: 3 },
    },
    {
      id: 'workloads-4',
      cardType: 'daemonset_status',
      position: { w: 6, h: 3, x: 6, y: 3 },
    },
    {
      id: 'workloads-5',
      cardType: 'job_status',
      position: { w: 6, h: 3, x: 0, y: 6 },
    },
    {
      id: 'workloads-6',
      cardType: 'cronjob_status',
      position: { w: 6, h: 3, x: 6, y: 6 },
    },
  ],

  availableCardTypes: [
    'deployment_status',
    'deployment_issues',
    'statefulset_status',
    'daemonset_status',
    'job_status',
    'cronjob_status',
    'replicaset_status',
    'hpa_status',
  ],

  features: {
    dragDrop: true,
    autoRefresh: true,
    autoRefreshInterval: 30000,
    addCard: true,
  },

  storageKey: 'kubestellar-unified-workloads-dashboard',
}

export default workloadsDashboardConfig
