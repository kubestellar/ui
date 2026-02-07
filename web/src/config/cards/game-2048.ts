/**
 * 2048 Game Card Configuration
 */
import type { UnifiedCardConfig } from '../../lib/unified/types'

export const game2048Config: UnifiedCardConfig = {
  type: 'game_2048',
  title: 'Kube 2048',
  category: 'games',
  description: 'Classic 2048 sliding puzzle',
  icon: 'Grid2X2',
  iconColor: 'text-orange-400',
  defaultWidth: 6,
  defaultHeight: 4,
  dataSource: { type: 'static' },
  content: { type: 'custom', component: 'Game2048' },
  emptyState: { icon: 'Grid2X2', title: '2048', message: 'Start a new game', variant: 'info' },
  loadingState: { type: 'custom' },
  isDemoData: false,
  isLive: false,
}
export default game2048Config
