/**
 * Provider Health Card Configuration
 */
import type { UnifiedCardConfig } from '../../lib/unified/types'

export const providerHealthConfig: UnifiedCardConfig = {
  type: 'provider_health',
  title: 'Provider Health',
  category: 'cluster-health',
  description: 'Cloud and AI provider status',
  icon: 'Cloud',
  iconColor: 'text-sky-400',
  defaultWidth: 6,
  defaultHeight: 3,
  dataSource: { type: 'hook', hook: 'useProviderHealth' },
  content: {
    type: 'list',
    pageSize: 10,
    columns: [
      { field: 'provider', header: 'Provider', primary: true, render: 'truncate' },
      { field: 'type', header: 'Type', render: 'text', width: 80 },
      { field: 'status', header: 'Status', render: 'status-badge', width: 80 },
      { field: 'latency', header: 'Latency', render: 'text', width: 70, suffix: 'ms' },
    ],
  },
  emptyState: { icon: 'Cloud', title: 'No Providers', message: 'No providers configured', variant: 'info' },
  loadingState: { type: 'list', rows: 5 },
  isDemoData: false,
  isLive: true,
}
export default providerHealthConfig
