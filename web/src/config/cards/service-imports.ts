/**
 * Service Imports Card Configuration
 */
import type { UnifiedCardConfig } from '../../lib/unified/types'

export const serviceImportsConfig: UnifiedCardConfig = {
  type: 'service_imports',
  title: 'Service Imports',
  category: 'network',
  description: 'Multi-cluster service imports',
  icon: 'ArrowDownToLine',
  iconColor: 'text-blue-400',
  defaultWidth: 6,
  defaultHeight: 3,
  dataSource: { type: 'hook', hook: 'useServiceImports' },
  content: {
    type: 'list',
    pageSize: 10,
    columns: [
      { field: 'name', header: 'Service', primary: true, render: 'truncate' },
      { field: 'namespace', header: 'Namespace', render: 'namespace-badge', width: 100 },
      { field: 'sourceCluster', header: 'Source', render: 'cluster-badge', width: 100 },
      { field: 'status', header: 'Status', render: 'status-badge', width: 80 },
    ],
  },
  emptyState: { icon: 'ArrowDownToLine', title: 'No Imports', message: 'No service imports found', variant: 'info' },
  loadingState: { type: 'list', rows: 5 },
  isDemoData: true,
  isLive: false,
}
export default serviceImportsConfig
