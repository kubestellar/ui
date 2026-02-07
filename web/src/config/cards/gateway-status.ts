/**
 * Gateway Status Card Configuration
 */
import type { UnifiedCardConfig } from '../../lib/unified/types'

export const gatewayStatusConfig: UnifiedCardConfig = {
  type: 'gateway_status',
  title: 'Gateway Status',
  category: 'network',
  description: 'Gateway API resources',
  icon: 'Router',
  iconColor: 'text-purple-400',
  defaultWidth: 6,
  defaultHeight: 3,
  dataSource: { type: 'hook', hook: 'useGatewayStatus' },
  content: {
    type: 'list',
    pageSize: 10,
    columns: [
      { field: 'name', header: 'Gateway', primary: true, render: 'truncate' },
      { field: 'class', header: 'Class', render: 'text', width: 100 },
      { field: 'addresses', header: 'Addresses', render: 'number', width: 80 },
      { field: 'status', header: 'Status', render: 'status-badge', width: 80 },
    ],
  },
  emptyState: { icon: 'Router', title: 'No Gateways', message: 'No Gateway API resources', variant: 'info' },
  loadingState: { type: 'list', rows: 5 },
  isDemoData: true,
  isLive: false,
}
export default gatewayStatusConfig
