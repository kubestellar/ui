/**
 * Solitaire Card Configuration
 */
import type { UnifiedCardConfig } from '../../lib/unified/types'

export const solitaireConfig: UnifiedCardConfig = {
  type: 'solitaire',
  title: 'Solitaire',
  category: 'games',
  description: 'Classic card solitaire',
  icon: 'Club',
  iconColor: 'text-red-400',
  defaultWidth: 8,
  defaultHeight: 4,
  dataSource: { type: 'static' },
  content: { type: 'custom', component: 'Solitaire' },
  emptyState: { icon: 'Club', title: 'Solitaire', message: 'Start a new game', variant: 'info' },
  loadingState: { type: 'custom' },
  isDemoData: false,
  isLive: false,
}
export default solitaireConfig
