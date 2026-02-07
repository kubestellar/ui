/**
 * PVC Status Card Configuration
 *
 * Displays Persistent Volume Claims using the unified card system.
 */

import type { UnifiedCardConfig } from '../../lib/unified/types'

export const pvcStatusConfig: UnifiedCardConfig = {
  type: 'pvc_status',
  title: 'PVC Status',
  category: 'storage',
  description: 'Persistent Volume Claims across clusters',

  // Appearance
  icon: 'HardDrive',
  iconColor: 'text-purple-400',
  defaultWidth: 6,
  defaultHeight: 3,

  // Data source
  dataSource: {
    type: 'hook',
    hook: 'usePVCs',
  },

  // Filters
  filters: [
    {
      field: 'search',
      type: 'text',
      placeholder: 'Search PVCs...',
      searchFields: ['name', 'namespace', 'cluster', 'storageClass'],
      storageKey: 'pvc-status-unified',
    },
    {
      field: 'cluster',
      type: 'cluster-select',
      label: 'Cluster',
      storageKey: 'pvc-status-unified-cluster',
    },
  ],

  // Content - List visualization
  content: {
    type: 'list',
    pageSize: 10,
    itemClick: 'drill',
    columns: [
      {
        field: 'cluster',
        header: 'Cluster',
        render: 'cluster-badge',
        width: 100,
      },
      {
        field: 'namespace',
        header: 'Namespace',
        render: 'namespace-badge',
        width: 100,
      },
      {
        field: 'name',
        header: 'Name',
        primary: true,
        render: 'truncate',
      },
      {
        field: 'status',
        header: 'Status',
        render: 'status-badge',
        width: 80,
      },
      {
        field: 'capacity',
        header: 'Capacity',
        render: 'text',
        align: 'right',
        width: 80,
      },
      {
        field: 'storageClass',
        header: 'Class',
        render: 'text',
        width: 100,
      },
    ],
  },

  // Drill-down
  drillDown: {
    action: 'drillToPVC',
    params: ['cluster', 'namespace', 'name'],
    context: {
      status: 'status',
      capacity: 'capacity',
      storageClass: 'storageClass',
    },
  },

  // Empty state
  emptyState: {
    icon: 'HardDrive',
    title: 'No PVCs found',
    message: 'No Persistent Volume Claims in the selected clusters',
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

export default pvcStatusConfig
