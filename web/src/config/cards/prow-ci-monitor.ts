/**
 * Prow CI Monitor Card Configuration
 */
import type { UnifiedCardConfig } from '../../lib/unified/types'

export const prowCiMonitorConfig: UnifiedCardConfig = {
  type: 'prow_ci_monitor',
  title: 'Prow CI',
  category: 'ci-cd',
  description: 'Prow CI system monitoring',
  icon: 'GitBranch',
  iconColor: 'text-blue-400',
  defaultWidth: 6,
  defaultHeight: 3,
  dataSource: { type: 'hook', hook: 'useProwCIMonitor' },
  content: { type: 'custom', component: 'ProwCIView' },
  emptyState: { icon: 'GitBranch', title: 'No Prow', message: 'Prow CI not detected', variant: 'info' },
  loadingState: { type: 'custom' },
  isDemoData: false,
  isLive: true,
}
export default prowCiMonitorConfig
