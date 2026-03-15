/**
 * Pod Pitfall Card Configuration
 */
import type { UnifiedCardConfig } from '../../lib/unified/types'

export const podPitfallConfig: UnifiedCardConfig = {
  type: 'pod_pitfall',
  title: 'Pod Pitfall',
  category: 'games',
  description: 'Pitfall-style adventure',
  icon: 'TreePine',
  iconColor: 'text-green-400',
  defaultWidth: 6,
  defaultHeight: 4,
  dataSource: { type: 'static' },
  content: { type: 'custom', component: 'PodPitfall' },
  emptyState: { icon: 'TreePine', title: 'Pod Pitfall', message: 'Press to start', variant: 'info' },
  loadingState: { type: 'custom' },
  isDemoData: false,
  isLive: false,
}
export default podPitfallConfig
