/**
 * Console AI Offline Detection Card Configuration
 */
import type { UnifiedCardConfig } from '../../lib/unified/types'

export const consoleAiOfflineDetectionConfig: UnifiedCardConfig = {
  type: 'console_ai_offline_detection',
  title: 'Offline Detection',
  category: 'cluster-health',
  description: 'AI-detected offline clusters',
  icon: 'WifiOff',
  iconColor: 'text-red-400',
  defaultWidth: 6,
  defaultHeight: 3,
  dataSource: { type: 'hook', hook: 'useConsoleAIOfflineDetection' },
  content: {
    type: 'list',
    pageSize: 10,
    columns: [
      { field: 'cluster', header: 'Cluster', primary: true, render: 'cluster-badge' },
      { field: 'lastSeen', header: 'Last Seen', render: 'relative-time', width: 100 },
      { field: 'reason', header: 'Reason', render: 'truncate', width: 150 },
    ],
  },
  emptyState: { icon: 'WifiOff', title: 'All Online', message: 'All clusters are online', variant: 'success' },
  loadingState: { type: 'list', rows: 3 },
  isDemoData: false,
  isLive: true,
}
export default consoleAiOfflineDetectionConfig
