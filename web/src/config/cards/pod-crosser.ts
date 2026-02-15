/**
 * Pod Crosser Card Configuration
 */
import type { UnifiedCardConfig } from '../../lib/unified/types'

export const podCrosserConfig: UnifiedCardConfig = {
  type: 'pod_crosser',
  title: 'Pod Crosser',
  category: 'games',
  description: 'Frogger-style game',
  icon: 'Car',
  iconColor: 'text-green-400',
  defaultWidth: 6,
  defaultHeight: 4,
  dataSource: { type: 'static' },
  content: { type: 'custom', component: 'PodCrosser' },
  emptyState: { icon: 'Car', title: 'Pod Crosser', message: 'Press to start', variant: 'info' },
  loadingState: { type: 'custom' },
  isDemoData: false,
  isLive: false,
}
export default podCrosserConfig
