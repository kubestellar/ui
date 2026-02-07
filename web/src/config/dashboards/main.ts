/**
 * Main Dashboard Configuration
 *
 * The primary dashboard showing cluster overview with key metrics
 * and status cards.
 */

import type { UnifiedDashboardConfig } from '../../lib/unified/types'

export const mainDashboardConfig: UnifiedDashboardConfig = {
  id: 'main',
  name: 'Dashboard',
  subtitle: 'Multi-cluster overview',
  route: '/',

  // Stats configuration
  statsType: 'dashboard',
  stats: {
    type: 'dashboard',
    title: 'Overview',
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
        id: 'healthy',
        name: 'Healthy',
        icon: 'CheckCircle2',
        color: 'green',
        visible: true,
        valueSource: { type: 'field', path: 'summary.healthyClusters' },
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
        id: 'nodes',
        name: 'Nodes',
        icon: 'Box',
        color: 'cyan',
        visible: true,
        valueSource: { type: 'field', path: 'summary.totalNodes' },
      },
      {
        id: 'namespaces',
        name: 'Namespaces',
        icon: 'FolderTree',
        color: 'purple',
        visible: true,
        valueSource: { type: 'field', path: 'summary.totalNamespaces' },
      },
      {
        id: 'errors',
        name: 'Errors',
        icon: 'XCircle',
        color: 'red',
        visible: true,
        valueSource: { type: 'field', path: 'summary.errorCount' },
      },
    ],
  },

  // Default cards
  cards: [
    {
      id: 'default-offline',
      cardType: 'console_ai_offline_detection',
      position: { w: 6, h: 3, x: 0, y: 0 },
    },
    {
      id: 'default-hardware',
      cardType: 'hardware_health',
      position: { w: 6, h: 3, x: 6, y: 0 },
    },
    {
      id: 'default-1',
      cardType: 'cluster_health',
      position: { w: 4, h: 3, x: 0, y: 3 },
    },
    {
      id: 'default-2',
      cardType: 'resource_usage',
      position: { w: 4, h: 3, x: 4, y: 3 },
    },
    {
      id: 'default-3',
      cardType: 'pod_issues',
      position: { w: 4, h: 3, x: 8, y: 3 },
    },
    {
      id: 'default-4',
      cardType: 'cluster_metrics',
      position: { w: 6, h: 3, x: 0, y: 6 },
    },
    {
      id: 'default-5',
      cardType: 'event_stream',
      position: { w: 6, h: 4, x: 6, y: 6 },
    },
    {
      id: 'default-6',
      cardType: 'deployment_status',
      position: { w: 6, h: 3, x: 0, y: 9 },
    },
    {
      id: 'default-7',
      cardType: 'events_timeline',
      position: { w: 6, h: 3, x: 6, y: 10 },
    },
  ],

  // Available card types for add menu
  availableCardTypes: [
    'console_ai_offline_detection',
    'hardware_health',
    'cluster_health',
    'resource_usage',
    'pod_issues',
    'deployment_status',
    'event_stream',
    'cluster_metrics',
    'events_timeline',
  ],

  // Features
  features: {
    dragDrop: true,
    autoRefresh: true,
    autoRefreshInterval: 30000,
    addCard: true,
    templates: true,
    recommendations: true,
    floatingActions: true,
  },

  // Persistence
  storageKey: 'kubestellar-unified-main-dashboard',
}

export default mainDashboardConfig
