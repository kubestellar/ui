/**
 * Flappy Pod Card Configuration
 */
import type { UnifiedCardConfig } from '../../lib/unified/types'

export const flappyPodConfig: UnifiedCardConfig = {
  type: 'flappy_pod',
  title: 'Flappy Pod',
  category: 'games',
  description: 'Flappy bird with pods',
  icon: 'Bird',
  iconColor: 'text-yellow-400',
  defaultWidth: 6,
  defaultHeight: 4,
  dataSource: { type: 'static' },
  content: { type: 'custom', component: 'FlappyPod' },
  emptyState: { icon: 'Bird', title: 'Flappy Pod', message: 'Press space to start', variant: 'info' },
  loadingState: { type: 'custom' },
  isDemoData: false,
  isLive: false,
}
export default flappyPodConfig
