/**
 * Mobile Browser Card Configuration
 */
import type { UnifiedCardConfig } from '../../lib/unified/types'

export const mobileBrowserConfig: UnifiedCardConfig = {
  type: 'mobile_browser',
  title: 'Mobile Browser',
  category: 'utility',
  description: 'Mobile web browser emulator',
  icon: 'Smartphone',
  iconColor: 'text-gray-400',
  defaultWidth: 5,
  defaultHeight: 4,
  dataSource: { type: 'static' },
  content: { type: 'custom', component: 'MobileBrowser' },
  emptyState: { icon: 'Smartphone', title: 'Browser', message: 'Enter URL to browse', variant: 'info' },
  loadingState: { type: 'custom' },
  isDemoData: false,
  isLive: false,
}
export default mobileBrowserConfig
