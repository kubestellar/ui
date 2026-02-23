/**
 * GPU Inventory Card Configuration
 */
import type { UnifiedCardConfig } from '../../lib/unified/types'

export const gpuInventoryConfig: UnifiedCardConfig = {
  type: 'gpu_inventory',
  title: 'GPU Inventory',
  category: 'compute',
  description: 'Available GPU resources',
  icon: 'Cpu',
  iconColor: 'text-green-400',
  defaultWidth: 6,
  defaultHeight: 3,
  dataSource: { type: 'hook', hook: 'useGPUInventory' },
  filters: [
    { field: 'search', type: 'text', placeholder: 'Search GPUs...', searchFields: ['name', 'model', 'cluster'], storageKey: 'gpu-inventory' },
  ],
  content: {
    type: 'list',
    pageSize: 10,
    columns: [
      { field: 'cluster', header: 'Cluster', render: 'cluster-badge', width: 100 },
      { field: 'node', header: 'Node', render: 'text', width: 120 },
      { field: 'model', header: 'Model', primary: true, render: 'truncate' },
      { field: 'memory', header: 'Memory', render: 'bytes', width: 80 },
      { field: 'utilization', header: 'Util %', render: 'percentage', width: 70 },
    ],
  },
  emptyState: { icon: 'Cpu', title: 'No GPUs', message: 'No GPU resources found', variant: 'info' },
  loadingState: { type: 'list', rows: 5 },
  isDemoData: true,
  isLive: false,
}
export default gpuInventoryConfig
