/**
 * GPU Workloads Card Configuration
 */
import type { UnifiedCardConfig } from '../../lib/unified/types'

export const gpuWorkloadsConfig: UnifiedCardConfig = {
  type: 'gpu_workloads',
  title: 'GPU Workloads',
  category: 'compute',
  description: 'Workloads using GPU resources',
  icon: 'Zap',
  iconColor: 'text-yellow-400',
  defaultWidth: 6,
  defaultHeight: 3,
  dataSource: { type: 'hook', hook: 'useGPUWorkloads' },
  content: {
    type: 'list',
    pageSize: 10,
    columns: [
      { field: 'name', header: 'Workload', primary: true, render: 'truncate' },
      { field: 'namespace', header: 'Namespace', render: 'namespace-badge', width: 100 },
      { field: 'gpuCount', header: 'GPUs', render: 'number', width: 60 },
      { field: 'status', header: 'Status', render: 'status-badge', width: 80 },
    ],
  },
  emptyState: { icon: 'Zap', title: 'No Workloads', message: 'No GPU workloads found', variant: 'info' },
  loadingState: { type: 'list', rows: 5 },
  isDemoData: true,
  isLive: false,
}
export default gpuWorkloadsConfig
