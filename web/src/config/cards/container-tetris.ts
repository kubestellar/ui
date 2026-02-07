/**
 * Container Tetris Card Configuration
 */
import type { UnifiedCardConfig } from '../../lib/unified/types'

export const containerTetrisConfig: UnifiedCardConfig = {
  type: 'container_tetris',
  title: 'Container Tetris',
  category: 'games',
  description: 'Container-themed Tetris game',
  icon: 'Box',
  iconColor: 'text-cyan-400',
  defaultWidth: 6,
  defaultHeight: 5,
  dataSource: { type: 'static' },
  content: { type: 'custom', component: 'ContainerTetris' },
  emptyState: { icon: 'Box', title: 'Tetris', message: 'Start a new game', variant: 'info' },
  loadingState: { type: 'custom' },
  isDemoData: false,
  isLive: false,
}
export default containerTetrisConfig
