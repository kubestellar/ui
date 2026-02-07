/**
 * Vault Secrets Card Configuration
 */
import type { UnifiedCardConfig } from '../../lib/unified/types'

export const vaultSecretsConfig: UnifiedCardConfig = {
  type: 'vault_secrets',
  title: 'Vault Secrets',
  category: 'security',
  description: 'HashiCorp Vault secret status',
  icon: 'Lock',
  iconColor: 'text-yellow-400',
  defaultWidth: 4,
  defaultHeight: 3,
  dataSource: { type: 'hook', hook: 'useVaultSecrets' },
  content: {
    type: 'stats-grid',
    stats: [
      { field: 'total', label: 'Total', color: 'blue' },
      { field: 'synced', label: 'Synced', color: 'green' },
      { field: 'failed', label: 'Failed', color: 'red' },
    ],
  },
  emptyState: { icon: 'Lock', title: 'No Vault', message: 'Vault not configured', variant: 'info' },
  loadingState: { type: 'stats', count: 3 },
  isDemoData: true,
  isLive: false,
}
export default vaultSecretsConfig
