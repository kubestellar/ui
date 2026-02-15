/**
 * Kube Kart Card Configuration
 */
import type { UnifiedCardConfig } from '../../lib/unified/types'

export const kubeKartConfig: UnifiedCardConfig = {
  type: 'kube_kart',
  title: 'Kube Kart',
  category: 'games',
  description: 'Racing game',
  icon: 'Car',
  iconColor: 'text-red-400',
  defaultWidth: 5,
  defaultHeight: 4,
  dataSource: { type: 'static' },
  content: { type: 'custom', component: 'KubeKart' },
  emptyState: { icon: 'Car', title: 'Kube Kart', message: 'Press to start', variant: 'info' },
  loadingState: { type: 'custom' },
  isDemoData: false,
  isLive: false,
}
export default kubeKartConfig
