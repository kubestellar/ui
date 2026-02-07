/**
 * Resource Marshall Card Configuration
 */
import type { UnifiedCardConfig } from '../../lib/unified/types'

export const resourceMarshallConfig: UnifiedCardConfig = {
  type: 'resource_marshall',
  title: 'Resource Marshall',
  category: 'workloads',
  description: 'Dependency tree explorer',
  icon: 'GitBranch',
  iconColor: 'text-blue-400',
  defaultWidth: 6,
  defaultHeight: 4,
  dataSource: { type: 'hook', hook: 'useResourceMarshall' },
  content: { type: 'custom', component: 'ResourceMarshallTree' },
  emptyState: { icon: 'GitBranch', title: 'No Resources', message: 'Select a resource to explore', variant: 'info' },
  loadingState: { type: 'custom' },
  isDemoData: false,
  isLive: true,
}
export default resourceMarshallConfig
