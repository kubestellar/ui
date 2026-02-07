/**
 * ArgoCD Sync Status Card Configuration
 */
import type { UnifiedCardConfig } from '../../lib/unified/types'

export const argocdSyncStatusConfig: UnifiedCardConfig = {
  type: 'argocd_sync_status',
  title: 'ArgoCD Sync Status',
  category: 'gitops',
  description: 'Sync status of ArgoCD applications',
  icon: 'RefreshCw',
  iconColor: 'text-green-400',
  defaultWidth: 6,
  defaultHeight: 3,
  dataSource: { type: 'hook', hook: 'useArgoCDSyncStatus' },
  content: {
    type: 'stats-grid',
    stats: [
      { field: 'synced', label: 'Synced', color: 'green' },
      { field: 'outOfSync', label: 'Out of Sync', color: 'yellow' },
      { field: 'unknown', label: 'Unknown', color: 'gray' },
    ],
  },
  emptyState: { icon: 'RefreshCw', title: 'No Status', message: 'No sync status available', variant: 'info' },
  loadingState: { type: 'stats', count: 3 },
  isDemoData: true,
  isLive: false,
}
export default argocdSyncStatusConfig
