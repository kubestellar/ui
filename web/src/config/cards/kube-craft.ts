/**
 * Kube Craft Card Configuration
 */
import type { UnifiedCardConfig } from '../../lib/unified/types'

export const kubeCraftConfig: UnifiedCardConfig = {
  type: 'kube_craft',
  title: 'Kube Craft',
  category: 'games',
  description: 'Minecraft-style building',
  icon: 'Hammer',
  iconColor: 'text-brown-400',
  defaultWidth: 5,
  defaultHeight: 4,
  dataSource: { type: 'static' },
  content: { type: 'custom', component: 'KubeCraft' },
  emptyState: { icon: 'Hammer', title: 'Kube Craft', message: 'Press to start', variant: 'info' },
  loadingState: { type: 'custom' },
  isDemoData: false,
  isLive: false,
}
export default kubeCraftConfig
