/**
 * Kubedle Card Configuration
 */
import type { UnifiedCardConfig } from '../../lib/unified/types'

export const kubedleConfig: UnifiedCardConfig = {
  type: 'kubedle',
  title: 'Kubedle',
  category: 'games',
  description: 'Kubernetes word guessing game',
  icon: 'Type',
  iconColor: 'text-green-400',
  defaultWidth: 6,
  defaultHeight: 4,
  dataSource: { type: 'static' },
  content: { type: 'custom', component: 'Kubedle' },
  emptyState: { icon: 'Type', title: 'Kubedle', message: 'Start a new game', variant: 'info' },
  loadingState: { type: 'custom' },
  isDemoData: false,
  isLive: false,
}
export default kubedleConfig
