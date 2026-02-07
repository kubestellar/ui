/**
 * Kube Kong Card Configuration
 */
import type { UnifiedCardConfig } from '../../lib/unified/types'

export const kubeKongConfig: UnifiedCardConfig = {
  type: 'kube_kong',
  title: 'Kube Kong',
  category: 'games',
  description: 'Donkey Kong inspired game',
  icon: 'Banana',
  iconColor: 'text-yellow-400',
  defaultWidth: 6,
  defaultHeight: 4,
  dataSource: { type: 'static' },
  content: { type: 'custom', component: 'KubeKong' },
  emptyState: { icon: 'Banana', title: 'Kube Kong', message: 'Press to start', variant: 'info' },
  loadingState: { type: 'custom' },
  isDemoData: false,
  isLive: false,
}
export default kubeKongConfig
