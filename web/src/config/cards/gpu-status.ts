/**
 * GPU Status Card Configuration
 */
import type { UnifiedCardConfig } from '../../lib/unified/types'

export const gpuStatusConfig: UnifiedCardConfig = {
  type: 'gpu_status',
  title: 'GPU Status',
  category: 'compute',
  description: 'GPU health and status',
  icon: 'Activity',
  iconColor: 'text-green-400',
  defaultWidth: 6,
  defaultHeight: 3,
  dataSource: { type: 'hook', hook: 'useGPUStatus' },
  content: {
    type: 'list',
    pageSize: 10,
    columns: [
      { field: 'name', header: 'GPU', primary: true, render: 'truncate' },
      { field: 'status', header: 'Status', render: 'status-badge', width: 80 },
      { field: 'temperature', header: 'Temp', render: 'text', width: 60, suffix: '°C' },
      { field: 'power', header: 'Power', render: 'text', width: 60, suffix: 'W' },
    ],
  },
  emptyState: { icon: 'Activity', title: 'No GPUs', message: 'No GPU status available', variant: 'info' },
  loadingState: { type: 'list', rows: 5 },
  isDemoData: true,
  isLive: false,
}
export default gpuStatusConfig
