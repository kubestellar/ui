/**
 * Dynamic Card Configuration
 */
import type { UnifiedCardConfig } from '../../lib/unified/types'

export const dynamicCardConfig: UnifiedCardConfig = {
  type: 'dynamic_card',
  title: 'Dynamic Card',
  category: 'utility',
  description: 'User-defined dynamic card',
  icon: 'Sparkles',
  iconColor: 'text-purple-400',
  defaultWidth: 6,
  defaultHeight: 3,
  dataSource: { type: 'static' },
  content: { type: 'custom', component: 'DynamicCardRenderer' },
  emptyState: { icon: 'Sparkles', title: 'Dynamic', message: 'Configure card', variant: 'info' },
  loadingState: { type: 'custom' },
  isDemoData: false,
  isLive: false,
}
export default dynamicCardConfig
