/**
 * Kube Doom Card Configuration
 */
import type { UnifiedCardConfig } from '../../lib/unified/types'

export const kubeDoomConfig: UnifiedCardConfig = {
  type: 'kube_doom',
  title: 'Kube Doom',
  category: 'games',
  description: 'Doom-style FPS',
  icon: 'Skull',
  iconColor: 'text-red-400',
  defaultWidth: 6,
  defaultHeight: 4,
  dataSource: { type: 'static' },
  content: { type: 'custom', component: 'KubeDoom' },
  emptyState: { icon: 'Skull', title: 'Kube Doom', message: 'Press to start', variant: 'info' },
  loadingState: { type: 'custom' },
  isDemoData: false,
  isLive: false,
}
export default kubeDoomConfig
