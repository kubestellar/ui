/**
 * Storage Dashboard Configuration
 *
 * Dashboard focused on storage resources: PVCs, PVs, StorageClasses.
 */

import type { UnifiedDashboardConfig } from '../../lib/unified/types'

export const storageDashboardConfig: UnifiedDashboardConfig = {
  id: 'storage',
  name: 'Storage',
  subtitle: 'Persistent storage resources',
  route: '/storage',

  statsType: 'storage',
  stats: {
    type: 'storage',
    title: 'Storage Resources',
    collapsible: true,
    showConfigButton: true,
    blocks: [
      {
        id: 'pvcs',
        name: 'PVCs',
        icon: 'Database',
        color: 'blue',
        visible: true,
        valueSource: { type: 'field', path: 'summary.totalPVCs' },
      },
      {
        id: 'pvs',
        name: 'PVs',
        icon: 'HardDrive',
        color: 'purple',
        visible: true,
        valueSource: { type: 'field', path: 'summary.totalPVs' },
      },
      {
        id: 'bound',
        name: 'Bound',
        icon: 'CheckCircle2',
        color: 'green',
        visible: true,
        valueSource: { type: 'field', path: 'summary.boundCount' },
      },
      {
        id: 'pending',
        name: 'Pending',
        icon: 'Clock',
        color: 'yellow',
        visible: true,
        valueSource: { type: 'field', path: 'summary.pendingCount' },
      },
      {
        id: 'storage-usage',
        name: 'Usage',
        icon: 'Percent',
        color: 'orange',
        visible: true,
        valueSource: { type: 'field', path: 'summary.storageUsagePercent' },
        format: 'percentage',
      },
    ],
  },

  cards: [
    {
      id: 'storage-1',
      cardType: 'storage_overview',
      position: { w: 4, h: 3, x: 0, y: 0 },
    },
    {
      id: 'storage-2',
      cardType: 'pvc_status',
      position: { w: 8, h: 3, x: 4, y: 0 },
    },
    {
      id: 'storage-3',
      cardType: 'pv_status',
      position: { w: 6, h: 3, x: 0, y: 3 },
    },
    {
      id: 'storage-4',
      cardType: 'resource_quota_status',
      position: { w: 6, h: 3, x: 6, y: 3 },
    },
  ],

  availableCardTypes: [
    'storage_overview',
    'pvc_status',
    'pv_status',
    'resource_quota_status',
    'limit_range_status',
  ],

  features: {
    dragDrop: true,
    autoRefresh: true,
    autoRefreshInterval: 30000,
    addCard: true,
  },

  storageKey: 'kubestellar-unified-storage-dashboard',
}

export default storageDashboardConfig
