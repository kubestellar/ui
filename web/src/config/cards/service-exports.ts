/**
 * Service Exports Card Configuration
 */
import type { UnifiedCardConfig } from '../../lib/unified/types'

export const serviceExportsConfig: UnifiedCardConfig = {
  type: 'service_exports',
  title: 'Service Exports',
  category: 'network',
  description: 'Multi-cluster service exports',
  icon: 'ArrowUpFromLine',
  iconColor: 'text-green-400',
  defaultWidth: 6,
  defaultHeight: 3,
  dataSource: { type: 'hook', hook: 'useServiceExports' },
  content: {
    type: 'list',
    pageSize: 10,
    columns: [
      { field: 'name', header: 'Service', primary: true, render: 'truncate' },
      { field: 'namespace', header: 'Namespace', render: 'namespace-badge', width: 100 },
      { field: 'cluster', header: 'Cluster', render: 'cluster-badge', width: 100 },
      { field: 'status', header: 'Status', render: 'status-badge', width: 80 },
    ],
  },
  emptyState: { icon: 'ArrowUpFromLine', title: 'No Exports', message: 'No service exports found', variant: 'info' },
  loadingState: { type: 'list', rows: 5 },
  isDemoData: true,
  isLive: false,
}
export default serviceExportsConfig
