/**
 * External Secrets Card Configuration
 */
import type { UnifiedCardConfig } from '../../lib/unified/types'

export const externalSecretsConfig: UnifiedCardConfig = {
  type: 'external_secrets',
  title: 'External Secrets',
  category: 'security',
  description: 'External Secrets Operator status',
  icon: 'Key',
  iconColor: 'text-purple-400',
  defaultWidth: 4,
  defaultHeight: 3,
  dataSource: { type: 'hook', hook: 'useExternalSecrets' },
  content: {
    type: 'stats-grid',
    stats: [
      { field: 'total', label: 'Total', color: 'blue' },
      { field: 'ready', label: 'Ready', color: 'green' },
      { field: 'failed', label: 'Failed', color: 'red' },
    ],
  },
  emptyState: { icon: 'Key', title: 'No ESO', message: 'External Secrets not configured', variant: 'info' },
  loadingState: { type: 'stats', count: 3 },
  isDemoData: true,
  isLive: false,
}
export default externalSecretsConfig
