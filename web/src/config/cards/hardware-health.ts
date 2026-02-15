/**
 * Hardware Health Card Configuration
 *
 * Monitors hardware device disappearances on SuperMicro/HGX nodes.
 * Tracks GPUs, NICs, NVMe, InfiniBand, MOFED drivers, GPU drivers, etc.
 */
import type { UnifiedCardConfig } from '../../lib/unified/types'

export const hardwareHealthConfig: UnifiedCardConfig = {
  type: 'hardware_health',
  title: 'Hardware Health',
  category: 'cluster-health',
  description: 'Track hardware device disappearances on SuperMicro/HGX nodes',
  icon: 'Cpu',
  iconColor: 'text-red-400',
  defaultWidth: 6,
  defaultHeight: 3,
  dataSource: { type: 'hook', hook: 'useHardwareHealth' },
  content: {
    type: 'list',
    pageSize: 5,
    columns: [
      { field: 'nodeName', header: 'Node', primary: true },
      { field: 'deviceType', header: 'Device', width: 80 },
      { field: 'cluster', header: 'Cluster', render: 'cluster-badge', width: 100 },
      { field: 'droppedCount', header: 'Dropped', width: 60 },
      { field: 'severity', header: 'Severity', render: 'severity-badge', width: 80 },
    ],
  },
  emptyState: {
    icon: 'CheckCircle',
    title: 'All Healthy',
    message: 'All hardware devices are healthy',
    variant: 'success',
  },
  loadingState: { type: 'list', rows: 3 },
  isDemoData: false,
  isLive: true,
}

export default hardwareHealthConfig
