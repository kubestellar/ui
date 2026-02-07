/**
 * Service Topology Card Configuration
 */
import type { UnifiedCardConfig } from '../../lib/unified/types'

export const serviceTopologyConfig: UnifiedCardConfig = {
  type: 'service_topology',
  title: 'Service Topology',
  category: 'network',
  description: 'Service connectivity visualization',
  icon: 'Network',
  iconColor: 'text-cyan-400',
  defaultWidth: 8,
  defaultHeight: 4,
  dataSource: { type: 'hook', hook: 'useServiceTopology' },
  content: { type: 'custom', component: 'ServiceTopologyGraph' },
  emptyState: { icon: 'Network', title: 'No Topology', message: 'Service topology data unavailable', variant: 'info' },
  loadingState: { type: 'custom' },
  isDemoData: true,
  isLive: false,
}
export default serviceTopologyConfig
