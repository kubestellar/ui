/**
 * Network Utils Card Configuration
 */
import type { UnifiedCardConfig } from '../../lib/unified/types'

export const networkUtilsConfig: UnifiedCardConfig = {
  type: 'network_utils',
  title: 'Network Utils',
  category: 'utility',
  description: 'Network diagnostic tools',
  icon: 'Wifi',
  iconColor: 'text-cyan-400',
  defaultWidth: 5,
  defaultHeight: 3,
  dataSource: { type: 'static' },
  content: { type: 'custom', component: 'NetworkUtils' },
  emptyState: { icon: 'Wifi', title: 'Network Utils', message: 'Run network diagnostics', variant: 'info' },
  loadingState: { type: 'custom' },
  isDemoData: false,
  isLive: false,
}
export default networkUtilsConfig
