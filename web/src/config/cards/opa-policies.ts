/**
 * OPA Policies Card Configuration
 */
import type { UnifiedCardConfig } from '../../lib/unified/types'

export const opaPoliciesConfig: UnifiedCardConfig = {
  type: 'opa_policies',
  title: 'OPA/Gatekeeper Policies',
  category: 'security',
  description: 'OPA Gatekeeper constraint templates',
  icon: 'Shield',
  iconColor: 'text-blue-400',
  defaultWidth: 6,
  defaultHeight: 3,
  dataSource: { type: 'hook', hook: 'useOPAPolicies' },
  filters: [
    { field: 'search', type: 'text', placeholder: 'Search policies...', searchFields: ['name', 'kind'], storageKey: 'opa-policies' },
  ],
  content: {
    type: 'list',
    pageSize: 10,
    columns: [
      { field: 'name', header: 'Policy', primary: true, render: 'truncate' },
      { field: 'kind', header: 'Kind', render: 'text', width: 120 },
      { field: 'violations', header: 'Violations', render: 'number', width: 80 },
      { field: 'enforcement', header: 'Mode', render: 'status-badge', width: 80 },
    ],
  },
  emptyState: { icon: 'Shield', title: 'No Policies', message: 'No OPA policies found', variant: 'info' },
  loadingState: { type: 'list', rows: 5 },
  isDemoData: true,
  isLive: false,
}
export default opaPoliciesConfig
