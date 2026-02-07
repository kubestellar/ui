/**
 * Events Dashboard Configuration
 *
 * Dashboard focused on Kubernetes events monitoring.
 */

import type { UnifiedDashboardConfig } from '../../lib/unified/types'

export const eventsDashboardConfig: UnifiedDashboardConfig = {
  id: 'events',
  name: 'Events',
  subtitle: 'Kubernetes events monitoring',
  route: '/events',

  statsType: 'events',
  stats: {
    type: 'events',
    title: 'Event Activity',
    collapsible: true,
    showConfigButton: true,
    blocks: [
      {
        id: 'total-events',
        name: 'Total',
        icon: 'Activity',
        color: 'blue',
        visible: true,
        valueSource: { type: 'field', path: 'summary.totalEvents' },
      },
      {
        id: 'warning-events',
        name: 'Warnings',
        icon: 'AlertTriangle',
        color: 'yellow',
        visible: true,
        valueSource: { type: 'field', path: 'summary.warningCount' },
      },
      {
        id: 'error-events',
        name: 'Errors',
        icon: 'AlertCircle',
        color: 'red',
        visible: true,
        valueSource: { type: 'field', path: 'summary.errorCount' },
      },
      {
        id: 'normal-events',
        name: 'Normal',
        icon: 'CheckCircle2',
        color: 'green',
        visible: true,
        valueSource: { type: 'field', path: 'summary.normalCount' },
      },
    ],
  },

  cards: [
    {
      id: 'events-1',
      cardType: 'event_stream',
      position: { w: 6, h: 4, x: 0, y: 0 },
    },
    {
      id: 'events-2',
      cardType: 'warning_events',
      position: { w: 6, h: 4, x: 6, y: 0 },
    },
    {
      id: 'events-3',
      cardType: 'recent_events',
      position: { w: 6, h: 3, x: 0, y: 4 },
    },
    {
      id: 'events-4',
      cardType: 'events_timeline',
      position: { w: 6, h: 3, x: 6, y: 4 },
    },
  ],

  availableCardTypes: [
    'event_stream',
    'warning_events',
    'recent_events',
    'events_timeline',
  ],

  features: {
    dragDrop: true,
    autoRefresh: true,
    autoRefreshInterval: 10000,
    addCard: true,
  },

  storageKey: 'kubestellar-unified-events-dashboard',
}

export default eventsDashboardConfig
