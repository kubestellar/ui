/**
 * Iframe Embed Card Configuration
 */
import type { UnifiedCardConfig } from '../../lib/unified/types'

export const iframeEmbedConfig: UnifiedCardConfig = {
  type: 'iframe_embed',
  title: 'Embed',
  category: 'utility',
  description: 'Embed external content',
  icon: 'Globe',
  iconColor: 'text-blue-400',
  defaultWidth: 6,
  defaultHeight: 4,
  dataSource: { type: 'static' },
  content: { type: 'custom', component: 'IframeEmbed' },
  emptyState: { icon: 'Globe', title: 'Embed', message: 'Configure URL to embed', variant: 'info' },
  loadingState: { type: 'custom' },
  isDemoData: false,
  isLive: false,
}
export default iframeEmbedConfig
