/**
 * PersistentVolume Status Card Configuration
 *
 * Displays Kubernetes PersistentVolumes using the unified card system.
 */

import type { UnifiedCardConfig } from '../../lib/unified/types'

export const pvStatusConfig: UnifiedCardConfig = {
  type: 'pv_status',
  title: 'Persistent Volumes',
  category: 'storage',
  description: 'Kubernetes PersistentVolumes across clusters',

  // Appearance
  icon: 'HardDrive',
  iconColor: 'text-amber-400',
  defaultWidth: 6,
  defaultHeight: 3,

  // Data source
  dataSource: {
    type: 'hook',
    hook: 'usePVs',
  },

  // Filters
  filters: [
    {
      field: 'search',
      type: 'text',
      placeholder: 'Search PVs...',
      searchFields: ['name', 'cluster', 'storageClass', 'status'],
      storageKey: 'pv-status',
    },
    {
      field: 'cluster',
      type: 'cluster-select',
      label: 'Cluster',
      storageKey: 'pv-status-cluster',
    },
  ],

  // Content - List visualization
  content: {
    type: 'list',
    pageSize: 10,
    columns: [
      {
        field: 'cluster',
        header: 'Cluster',
        render: 'cluster-badge',
        width: 100,
      },
      {
        field: 'name',
        header: 'Name',
        primary: true,
        render: 'truncate',
      },
      {
        field: 'capacity',
        header: 'Capacity',
        render: 'text',
        width: 80,
      },
      {
        field: 'status',
        header: 'Status',
        render: 'status-badge',
        width: 90,
      },
      {
        field: 'storageClass',
        header: 'Storage Class',
        render: 'text',
        width: 120,
      },
    ],
  },

  // Empty state
  emptyState: {
    icon: 'HardDrive',
    title: 'No Persistent Volumes',
    message: 'No PVs found in the selected clusters',
    variant: 'info',
  },

  // Loading state
  loadingState: {
    type: 'list',
    rows: 5,
    showSearch: true,
  },

  // Metadata
  isDemoData: true,
  isLive: true,
}

export default pvStatusConfig
