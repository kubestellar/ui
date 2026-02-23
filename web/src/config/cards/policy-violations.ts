/**
 * Policy Violations Card Configuration
 */
import type { UnifiedCardConfig } from '../../lib/unified/types'

export const policyViolationsConfig: UnifiedCardConfig = {
  type: 'policy_violations',
  title: 'Policy Violations',
  category: 'security',
  description: 'Security policy violation summary',
  icon: 'AlertOctagon',
  iconColor: 'text-red-400',
  defaultWidth: 6,
  defaultHeight: 3,
  dataSource: { type: 'hook', hook: 'usePolicyViolations' },
  content: {
    type: 'list',
    pageSize: 10,
    columns: [
      { field: 'resource', header: 'Resource', primary: true, render: 'truncate' },
      { field: 'policy', header: 'Policy', render: 'text', width: 120 },
      { field: 'severity', header: 'Severity', render: 'status-badge', width: 80 },
      { field: 'timestamp', header: 'Time', render: 'relative-time', width: 80 },
    ],
  },
  emptyState: { icon: 'AlertOctagon', title: 'No Violations', message: 'No policy violations found', variant: 'success' },
  loadingState: { type: 'list', rows: 5 },
  isDemoData: true,
  isLive: false,
}
export default policyViolationsConfig
