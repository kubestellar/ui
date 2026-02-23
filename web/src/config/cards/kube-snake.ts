/**
 * Kube Snake Card Configuration
 */
import type { UnifiedCardConfig } from '../../lib/unified/types'

export const kubeSnakeConfig: UnifiedCardConfig = {
  type: 'kube_snake',
  title: 'Kube Snake',
  category: 'games',
  description: 'Classic Snake game',
  icon: 'Waves',
  iconColor: 'text-green-400',
  defaultWidth: 5,
  defaultHeight: 4,
  dataSource: { type: 'static' },
  content: { type: 'custom', component: 'KubeSnake' },
  emptyState: { icon: 'Waves', title: 'Kube Snake', message: 'Press to start', variant: 'info' },
  loadingState: { type: 'custom' },
  isDemoData: false,
  isLive: false,
}
export default kubeSnakeConfig
