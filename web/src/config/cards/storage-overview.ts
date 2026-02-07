/**
 * Storage Overview Card Configuration
 *
 * Displays storage usage and PVC status summary.
 */

import type { UnifiedCardConfig } from '../../lib/unified/types'

export const storageOverviewConfig: UnifiedCardConfig = {
  type: 'storage_overview',
  title: 'Storage Overview',
  category: 'storage',
  description: 'Storage capacity and usage across clusters',
  icon: 'HardDrive',
  iconColor: 'text-purple-400',
  defaultWidth: 4,
  defaultHeight: 3,

  isDemoData: true, // Uses demo data hook in registerHooks.ts

  dataSource: {
    type: 'hook',
    hook: 'useStorageOverview',
  },

  content: {
    type: 'status-grid',
    columns: 2,
    items: [
      {
        id: 'total-capacity',
        label: 'Total Capacity',
        valueSource: { type: 'field', path: 'totalCapacity' },
        icon: 'Database',
        color: 'purple',
      },
      {
        id: 'used',
        label: 'Used',
        valueSource: { type: 'field', path: 'usedStorage' },
        icon: 'HardDrive',
        color: 'blue',
      },
      {
        id: 'pvcs',
        label: 'PVCs',
        valueSource: { type: 'field', path: 'pvcCount' },
        icon: 'Layers',
        color: 'cyan',
      },
      {
        id: 'unbound',
        label: 'Unbound',
        valueSource: { type: 'field', path: 'unboundCount' },
        icon: 'AlertCircle',
        color: 'yellow',
      },
    ],
  },

  emptyState: {
    icon: 'HardDrive',
    title: 'No storage data',
    message: 'Storage metrics not available',
    variant: 'neutral',
  },

  isLive: true,
}
