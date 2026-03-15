/**
 * Kube-Man Card Configuration
 */
import type { UnifiedCardConfig } from '../../lib/unified/types'

export const kubeManConfig: UnifiedCardConfig = {
  type: 'kube_man',
  title: 'Kube-Man',
  category: 'games',
  description: 'Kubernetes Pac-Man clone',
  icon: 'Ghost',
  iconColor: 'text-yellow-400',
  defaultWidth: 6,
  defaultHeight: 4,
  dataSource: { type: 'static' },
  content: { type: 'custom', component: 'KubeMan' },
  emptyState: { icon: 'Ghost', title: 'Kube-Man', message: 'Press to start', variant: 'info' },
  loadingState: { type: 'custom' },
  isDemoData: false,
  isLive: false,
}
export default kubeManConfig
