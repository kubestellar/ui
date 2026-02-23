/**
 * Compute Overview Card Configuration
 */
import type { UnifiedCardConfig } from '../../lib/unified/types'

export const computeOverviewConfig: UnifiedCardConfig = {
  type: 'compute_overview',
  title: 'Compute Overview',
  category: 'compute',
  description: 'Compute resource summary',
  icon: 'Cpu',
  iconColor: 'text-blue-400',
  defaultWidth: 4,
  defaultHeight: 3,
  dataSource: { type: 'hook', hook: 'useComputeOverview' },
  content: {
    type: 'stats-grid',
    stats: [
      { field: 'nodes', label: 'Nodes', color: 'blue' },
      { field: 'cpuUsage', label: 'CPU %', color: 'orange', format: 'percentage' },
      { field: 'memoryUsage', label: 'Memory %', color: 'green', format: 'percentage' },
    ],
  },
  emptyState: { icon: 'Cpu', title: 'No Data', message: 'No compute data available', variant: 'info' },
  loadingState: { type: 'stats', count: 3 },
  isDemoData: false,
  isLive: true,
}
export default computeOverviewConfig
