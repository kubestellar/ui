/**
 * Kyverno Policies Card Configuration
 */
import type { UnifiedCardConfig } from '../../lib/unified/types'

export const kyvernoPoliciesConfig: UnifiedCardConfig = {
  type: 'kyverno_policies',
  title: 'Kyverno Policies',
  category: 'security',
  description: 'Kyverno policy resources',
  icon: 'ShieldCheck',
  iconColor: 'text-green-400',
  defaultWidth: 6,
  defaultHeight: 3,
  dataSource: { type: 'hook', hook: 'useKyvernoPolicies' },
  filters: [
    { field: 'search', type: 'text', placeholder: 'Search policies...', searchFields: ['name', 'category'], storageKey: 'kyverno-policies' },
  ],
  content: {
    type: 'list',
    pageSize: 10,
    columns: [
      { field: 'name', header: 'Policy', primary: true, render: 'truncate' },
      { field: 'category', header: 'Category', render: 'text', width: 100 },
      { field: 'validationFailures', header: 'Failures', render: 'number', width: 70 },
      { field: 'background', header: 'Background', render: 'text', width: 80 },
    ],
  },
  emptyState: { icon: 'ShieldCheck', title: 'No Policies', message: 'No Kyverno policies found', variant: 'info' },
  loadingState: { type: 'list', rows: 5 },
  isDemoData: true,
  isLive: false,
}
export default kyvernoPoliciesConfig
