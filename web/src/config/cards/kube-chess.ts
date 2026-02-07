/**
 * Kube Chess Card Configuration
 */
import type { UnifiedCardConfig } from '../../lib/unified/types'

export const kubeChessConfig: UnifiedCardConfig = {
  type: 'kube_chess',
  title: 'Kube Chess',
  category: 'games',
  description: 'Play chess against AI',
  icon: 'Crown',
  iconColor: 'text-yellow-400',
  defaultWidth: 5,
  defaultHeight: 4,
  dataSource: { type: 'static' },
  content: { type: 'custom', component: 'KubeChess' },
  emptyState: { icon: 'Crown', title: 'Kube Chess', message: 'Start a new game', variant: 'info' },
  loadingState: { type: 'custom' },
  isDemoData: false,
  isLive: false,
}
export default kubeChessConfig
