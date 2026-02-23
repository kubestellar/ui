/**
 * Namespace Quotas Card Configuration
 */
import type { UnifiedCardConfig } from '../../lib/unified/types'

export const namespaceQuotasConfig: UnifiedCardConfig = {
  type: 'namespace_quotas',
  title: 'Namespace Quotas',
  category: 'namespaces',
  description: 'Resource quota usage by namespace',
  icon: 'Gauge',
  iconColor: 'text-amber-400',
  defaultWidth: 5,
  defaultHeight: 3,
  dataSource: { type: 'hook', hook: 'useNamespaceQuotas' },
  content: {
    type: 'list',
    pageSize: 8,
    columns: [
      { field: 'resource', header: 'Resource', primary: true, render: 'text' },
      { field: 'used', header: 'Used', render: 'text', width: 80 },
      { field: 'hard', header: 'Limit', render: 'text', width: 80 },
      { field: 'percentage', header: 'Usage', render: 'progress-bar', width: 100 },
    ],
  },
  emptyState: { icon: 'Gauge', title: 'No Quotas', message: 'No resource quotas defined', variant: 'info' },
  loadingState: { type: 'list', rows: 5 },
  isDemoData: false,
  isLive: true,
}
export default namespaceQuotasConfig
