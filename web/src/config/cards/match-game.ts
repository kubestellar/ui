/**
 * Match Game Card Configuration
 */
import type { UnifiedCardConfig } from '../../lib/unified/types'

export const matchGameConfig: UnifiedCardConfig = {
  type: 'match_game',
  title: 'Kube Match',
  category: 'games',
  description: 'Memory matching game',
  icon: 'Puzzle',
  iconColor: 'text-purple-400',
  defaultWidth: 6,
  defaultHeight: 4,
  dataSource: { type: 'static' },
  content: { type: 'custom', component: 'MatchGame' },
  emptyState: { icon: 'Puzzle', title: 'Match', message: 'Start a new game', variant: 'info' },
  loadingState: { type: 'custom' },
  isDemoData: false,
  isLive: false,
}
export default matchGameConfig
