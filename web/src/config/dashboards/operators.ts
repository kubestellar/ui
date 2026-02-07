/**
 * Operators Dashboard Configuration
 *
 * Dashboard focused on operator resources: Operators, Subscriptions, CRDs.
 */

import type { UnifiedDashboardConfig } from '../../lib/unified/types'

export const operatorsDashboardConfig: UnifiedDashboardConfig = {
  id: 'operators',
  name: 'Operators',
  subtitle: 'Operator lifecycle management',
  route: '/operators',

  statsType: 'operators',
  stats: {
    type: 'operators',
    title: 'Operator Resources',
    collapsible: true,
    showConfigButton: true,
    blocks: [
      {
        id: 'operators',
        name: 'Operators',
        icon: 'Settings',
        color: 'purple',
        visible: true,
        valueSource: { type: 'field', path: 'summary.totalOperators' },
      },
      {
        id: 'subscriptions',
        name: 'Subscriptions',
        icon: 'RefreshCw',
        color: 'blue',
        visible: true,
        valueSource: { type: 'field', path: 'summary.totalSubscriptions' },
      },
      {
        id: 'healthy',
        name: 'Healthy',
        icon: 'CheckCircle2',
        color: 'green',
        visible: true,
        valueSource: { type: 'field', path: 'summary.healthyCount' },
      },
      {
        id: 'degraded',
        name: 'Degraded',
        icon: 'AlertTriangle',
        color: 'yellow',
        visible: true,
        valueSource: { type: 'field', path: 'summary.degradedCount' },
      },
    ],
  },

  cards: [
    {
      id: 'operators-1',
      cardType: 'operator_status',
      position: { w: 6, h: 3, x: 0, y: 0 },
    },
    {
      id: 'operators-2',
      cardType: 'operator_subscription_status',
      position: { w: 6, h: 3, x: 6, y: 0 },
    },
    {
      id: 'operators-3',
      cardType: 'helm_release_status',
      position: { w: 6, h: 3, x: 0, y: 3 },
    },
    {
      id: 'operators-4',
      cardType: 'configmap_status',
      position: { w: 6, h: 3, x: 6, y: 3 },
    },
  ],

  availableCardTypes: [
    'operator_status',
    'operator_subscription_status',
    'helm_release_status',
    'configmap_status',
    'secret_status',
  ],

  features: {
    dragDrop: true,
    autoRefresh: true,
    autoRefreshInterval: 30000,
    addCard: true,
  },

  storageKey: 'kubestellar-unified-operators-dashboard',
}

export default operatorsDashboardConfig
