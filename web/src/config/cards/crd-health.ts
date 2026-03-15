/**
 * CRD Health Card Configuration
 */
import type { UnifiedCardConfig } from '../../lib/unified/types'

export const crdHealthConfig: UnifiedCardConfig = {
  type: 'crd_health',
  title: 'CRD Health',
  category: 'operators',
  description: 'Custom Resource Definition health status',
  icon: 'FileCode',
  iconColor: 'text-purple-400',
  defaultWidth: 5,
  defaultHeight: 3,
  dataSource: { type: 'hook', hook: 'useCRDHealth' },
  filters: [
    { field: 'search', type: 'text', placeholder: 'Search CRDs...', searchFields: ['name', 'group'], storageKey: 'crd-health' },
  ],
  content: {
    type: 'list',
    pageSize: 10,
    columns: [
      { field: 'name', header: 'Name', primary: true, render: 'truncate' },
      { field: 'group', header: 'Group', render: 'text', width: 120 },
      { field: 'version', header: 'Version', render: 'text', width: 80 },
      { field: 'status', header: 'Status', render: 'status-badge', width: 80 },
    ],
  },
  emptyState: { icon: 'FileCode', title: 'No CRDs', message: 'No Custom Resource Definitions found', variant: 'info' },
  loadingState: { type: 'list', rows: 5 },
  isDemoData: true,
  isLive: false,
}
export default crdHealthConfig
