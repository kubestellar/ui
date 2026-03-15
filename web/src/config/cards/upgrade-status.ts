/**
 * Upgrade Status Card Configuration
 */
import type { UnifiedCardConfig } from '../../lib/unified/types'

export const upgradeStatusConfig: UnifiedCardConfig = {
  type: 'upgrade_status',
  title: 'Upgrade Status',
  category: 'cluster-health',
  description: 'Cluster upgrade availability',
  icon: 'ArrowUpCircle',
  iconColor: 'text-green-400',
  defaultWidth: 4,
  defaultHeight: 3,
  dataSource: { type: 'hook', hook: 'useUpgradeStatus' },
  content: {
    type: 'list',
    pageSize: 8,
    columns: [
      { field: 'cluster', header: 'Cluster', render: 'cluster-badge', width: 100 },
      { field: 'currentVersion', header: 'Current', render: 'text', width: 80 },
      { field: 'availableVersion', header: 'Available', render: 'text', width: 80 },
      { field: 'status', header: 'Status', render: 'status-badge', width: 80 },
    ],
  },
  emptyState: { icon: 'ArrowUpCircle', title: 'All Current', message: 'All clusters are up to date', variant: 'success' },
  loadingState: { type: 'list', rows: 4 },
  isDemoData: true,
  isLive: false,
}
export default upgradeStatusConfig
