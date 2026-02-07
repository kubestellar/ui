/**
 * Pod Sweeper Card Configuration
 */
import type { UnifiedCardConfig } from '../../lib/unified/types'

export const podSweeperConfig: UnifiedCardConfig = {
  type: 'pod_sweeper',
  title: 'Pod Sweeper',
  category: 'games',
  description: 'Kubernetes-themed minesweeper',
  icon: 'Bomb',
  iconColor: 'text-gray-400',
  defaultWidth: 6,
  defaultHeight: 4,
  dataSource: { type: 'static' },
  content: { type: 'custom', component: 'PodSweeper' },
  emptyState: { icon: 'Bomb', title: 'Pod Sweeper', message: 'Start a new game', variant: 'info' },
  loadingState: { type: 'custom' },
  isDemoData: false,
  isLive: false,
}
export default podSweeperConfig
