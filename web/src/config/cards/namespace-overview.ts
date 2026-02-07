/**
 * Namespace Overview Card Configuration
 */
import type { UnifiedCardConfig } from '../../lib/unified/types'

export const namespaceOverviewConfig: UnifiedCardConfig = {
  type: 'namespace_overview',
  title: 'Namespace Overview',
  category: 'namespaces',
  description: 'Namespace resource summary',
  icon: 'FolderOpen',
  iconColor: 'text-sky-400',
  defaultWidth: 6,
  defaultHeight: 3,
  dataSource: { type: 'hook', hook: 'useNamespaceOverview' },
  content: {
    type: 'stats-grid',
    stats: [
      { field: 'pods', label: 'Pods', color: 'blue' },
      { field: 'deployments', label: 'Deployments', color: 'purple' },
      { field: 'services', label: 'Services', color: 'green' },
      { field: 'configmaps', label: 'ConfigMaps', color: 'orange' },
    ],
  },
  emptyState: { icon: 'FolderOpen', title: 'Select Namespace', message: 'Select a namespace to view details', variant: 'info' },
  loadingState: { type: 'stats', count: 4 },
  isDemoData: false,
  isLive: true,
}
export default namespaceOverviewConfig
