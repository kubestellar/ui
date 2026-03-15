/**
 * Network Overview Card Configuration
 *
 * Displays network status and connectivity summary.
 */

import type { UnifiedCardConfig } from '../../lib/unified/types'

export const networkOverviewConfig: UnifiedCardConfig = {
  type: 'network_overview',
  title: 'Network Overview',
  category: 'network',
  description: 'Network connectivity and service status',
  icon: 'Network',
  iconColor: 'text-cyan-400',
  defaultWidth: 4,
  defaultHeight: 3,

  isDemoData: true, // Uses demo data hook in registerHooks.ts

  dataSource: {
    type: 'hook',
    hook: 'useNetworkOverview',
  },

  content: {
    type: 'status-grid',
    columns: 2,
    items: [
      {
        id: 'services',
        label: 'Services',
        valueSource: { type: 'field', path: 'serviceCount' },
        icon: 'Globe',
        color: 'blue',
      },
      {
        id: 'ingresses',
        label: 'Ingresses',
        valueSource: { type: 'field', path: 'ingressCount' },
        icon: 'ArrowRightLeft',
        color: 'purple',
      },
      {
        id: 'endpoints',
        label: 'Endpoints',
        valueSource: { type: 'field', path: 'endpointCount' },
        icon: 'Link',
        color: 'cyan',
      },
      {
        id: 'policies',
        label: 'Net Policies',
        valueSource: { type: 'field', path: 'networkPolicyCount' },
        icon: 'Shield',
        color: 'green',
      },
    ],
  },

  emptyState: {
    icon: 'Network',
    title: 'No network data',
    message: 'Network metrics not available',
    variant: 'neutral',
  },

  isLive: true,
}
