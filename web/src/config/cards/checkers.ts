/**
 * Checkers Card Configuration
 */
import type { UnifiedCardConfig } from '../../lib/unified/types'

export const checkersConfig: UnifiedCardConfig = {
  type: 'checkers',
  title: 'AI Checkers',
  category: 'games',
  description: 'Play checkers against AI',
  icon: 'Circle',
  iconColor: 'text-red-400',
  defaultWidth: 6,
  defaultHeight: 4,
  dataSource: { type: 'static' },
  content: { type: 'custom', component: 'Checkers' },
  emptyState: { icon: 'Circle', title: 'Checkers', message: 'Start a new game', variant: 'info' },
  loadingState: { type: 'custom' },
  isDemoData: false,
  isLive: false,
}
export default checkersConfig
