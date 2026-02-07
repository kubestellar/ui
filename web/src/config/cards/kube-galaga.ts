/**
 * Kube Galaga Card Configuration
 */
import type { UnifiedCardConfig } from '../../lib/unified/types'

export const kubeGalagaConfig: UnifiedCardConfig = {
  type: 'kube_galaga',
  title: 'Kube Galaga',
  category: 'games',
  description: 'Galaga-style shooter',
  icon: 'Crosshair',
  iconColor: 'text-cyan-400',
  defaultWidth: 5,
  defaultHeight: 4,
  dataSource: { type: 'static' },
  content: { type: 'custom', component: 'KubeGalaga' },
  emptyState: { icon: 'Crosshair', title: 'Kube Galaga', message: 'Press to start', variant: 'info' },
  loadingState: { type: 'custom' },
  isDemoData: false,
  isLive: false,
}
export default kubeGalagaConfig
