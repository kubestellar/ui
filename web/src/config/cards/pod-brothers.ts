/**
 * Pod Brothers Card Configuration
 */
import type { UnifiedCardConfig } from '../../lib/unified/types'

export const podBrothersConfig: UnifiedCardConfig = {
  type: 'pod_brothers',
  title: 'Pod Brothers',
  category: 'games',
  description: 'Mario Bros-style game',
  icon: 'Users',
  iconColor: 'text-red-400',
  defaultWidth: 6,
  defaultHeight: 4,
  dataSource: { type: 'static' },
  content: { type: 'custom', component: 'PodBrothers' },
  emptyState: { icon: 'Users', title: 'Pod Brothers', message: 'Press to start', variant: 'info' },
  loadingState: { type: 'custom' },
  isDemoData: false,
  isLive: false,
}
export default podBrothersConfig
