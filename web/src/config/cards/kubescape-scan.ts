/**
 * Kubescape Scan Card Configuration
 */
import type { UnifiedCardConfig } from '../../lib/unified/types'

export const kubescapeScanConfig: UnifiedCardConfig = {
  type: 'kubescape_scan',
  title: 'Kubescape Scan',
  category: 'security',
  description: 'Kubernetes security posture scan',
  icon: 'ShieldAlert',
  iconColor: 'text-purple-400',
  defaultWidth: 4,
  defaultHeight: 3,
  dataSource: { type: 'hook', hook: 'useKubescapeScan' },
  content: {
    type: 'stats-grid',
    stats: [
      { field: 'score', label: 'Score', color: 'blue', format: 'percentage' },
      { field: 'passed', label: 'Passed', color: 'green' },
      { field: 'failed', label: 'Failed', color: 'red' },
    ],
  },
  emptyState: { icon: 'ShieldAlert', title: 'No Scans', message: 'No Kubescape scan data', variant: 'info' },
  loadingState: { type: 'stats', count: 3 },
  isDemoData: true,
  isLive: false,
}
export default kubescapeScanConfig
