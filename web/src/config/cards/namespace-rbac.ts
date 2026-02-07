/**
 * Namespace RBAC Card Configuration
 */
import type { UnifiedCardConfig } from '../../lib/unified/types'

export const namespaceRbacConfig: UnifiedCardConfig = {
  type: 'namespace_rbac',
  title: 'Namespace RBAC',
  category: 'security',
  description: 'RBAC permissions in namespace',
  icon: 'Shield',
  iconColor: 'text-red-400',
  defaultWidth: 6,
  defaultHeight: 3,
  dataSource: { type: 'hook', hook: 'useNamespaceRBAC' },
  content: {
    type: 'list',
    pageSize: 10,
    columns: [
      { field: 'subject', header: 'Subject', primary: true, render: 'truncate' },
      { field: 'type', header: 'Type', render: 'text', width: 80 },
      { field: 'role', header: 'Role', render: 'text', width: 100 },
      { field: 'scope', header: 'Scope', render: 'status-badge', width: 80 },
    ],
  },
  emptyState: { icon: 'Shield', title: 'No RBAC', message: 'No RBAC bindings found', variant: 'info' },
  loadingState: { type: 'list', rows: 5 },
  isDemoData: false,
  isLive: true,
}
export default namespaceRbacConfig
