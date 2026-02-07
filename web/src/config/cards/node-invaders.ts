/**
 * Node Invaders Card Configuration
 */
import type { UnifiedCardConfig } from '../../lib/unified/types'

export const nodeInvadersConfig: UnifiedCardConfig = {
  type: 'node_invaders',
  title: 'Node Invaders',
  category: 'games',
  description: 'Space Invaders with nodes',
  icon: 'Rocket',
  iconColor: 'text-purple-400',
  defaultWidth: 6,
  defaultHeight: 4,
  dataSource: { type: 'static' },
  content: { type: 'custom', component: 'NodeInvaders' },
  emptyState: { icon: 'Rocket', title: 'Node Invaders', message: 'Press to start', variant: 'info' },
  loadingState: { type: 'custom' },
  isDemoData: false,
  isLive: false,
}
export default nodeInvadersConfig
