/**
 * Network Dashboard Configuration
 *
 * Dashboard focused on networking resources: Services, Ingresses, NetworkPolicies.
 */

import type { UnifiedDashboardConfig } from '../../lib/unified/types'

export const networkDashboardConfig: UnifiedDashboardConfig = {
  id: 'network',
  name: 'Network',
  subtitle: 'Networking resources',
  route: '/network',

  statsType: 'network',
  stats: {
    type: 'network',
    title: 'Network Resources',
    collapsible: true,
    showConfigButton: true,
    blocks: [
      {
        id: 'services',
        name: 'Services',
        icon: 'Globe',
        color: 'blue',
        visible: true,
        valueSource: { type: 'field', path: 'summary.totalServices' },
      },
      {
        id: 'ingresses',
        name: 'Ingresses',
        icon: 'ArrowRightLeft',
        color: 'purple',
        visible: true,
        valueSource: { type: 'field', path: 'summary.totalIngresses' },
      },
      {
        id: 'network-policies',
        name: 'Policies',
        icon: 'Shield',
        color: 'orange',
        visible: true,
        valueSource: { type: 'field', path: 'summary.totalNetworkPolicies' },
      },
      {
        id: 'endpoints',
        name: 'Endpoints',
        icon: 'CircleDot',
        color: 'green',
        visible: true,
        valueSource: { type: 'field', path: 'summary.totalEndpoints' },
      },
    ],
  },

  cards: [
    {
      id: 'network-1',
      cardType: 'network_overview',
      position: { w: 4, h: 3, x: 0, y: 0 },
    },
    {
      id: 'network-2',
      cardType: 'service_status',
      position: { w: 8, h: 3, x: 4, y: 0 },
    },
    {
      id: 'network-3',
      cardType: 'ingress_status',
      position: { w: 6, h: 3, x: 0, y: 3 },
    },
    {
      id: 'network-4',
      cardType: 'network_policy_status',
      position: { w: 6, h: 3, x: 6, y: 3 },
    },
  ],

  availableCardTypes: [
    'network_overview',
    'service_status',
    'ingress_status',
    'network_policy_status',
  ],

  features: {
    dragDrop: true,
    autoRefresh: true,
    autoRefreshInterval: 30000,
    addCard: true,
  },

  storageKey: 'kubestellar-unified-network-dashboard',
}

export default networkDashboardConfig
