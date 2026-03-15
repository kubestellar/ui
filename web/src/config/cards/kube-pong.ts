/**
 * Kube Pong Card Configuration
 */
import type { UnifiedCardConfig } from '../../lib/unified/types'

export const kubePongConfig: UnifiedCardConfig = {
  type: 'kube_pong',
  title: 'Kube Pong',
  category: 'games',
  description: 'Classic Pong game',
  icon: 'Minus',
  iconColor: 'text-white',
  defaultWidth: 5,
  defaultHeight: 4,
  dataSource: { type: 'static' },
  content: { type: 'custom', component: 'KubePong' },
  emptyState: { icon: 'Minus', title: 'Kube Pong', message: 'Press to start', variant: 'info' },
  loadingState: { type: 'custom' },
  isDemoData: false,
  isLive: false,
}
export default kubePongConfig
