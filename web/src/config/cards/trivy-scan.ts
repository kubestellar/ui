/**
 * Trivy Scan Card Configuration
 */
import type { UnifiedCardConfig } from '../../lib/unified/types'

export const trivyScanConfig: UnifiedCardConfig = {
  type: 'trivy_scan',
  title: 'Trivy Vulnerabilities',
  category: 'security',
  description: 'Container vulnerability scan results',
  icon: 'Bug',
  iconColor: 'text-orange-400',
  defaultWidth: 4,
  defaultHeight: 3,
  dataSource: { type: 'hook', hook: 'useTrivyScan' },
  content: {
    type: 'stats-grid',
    stats: [
      { field: 'critical', label: 'Critical', color: 'red' },
      { field: 'high', label: 'High', color: 'orange' },
      { field: 'medium', label: 'Medium', color: 'yellow' },
      { field: 'low', label: 'Low', color: 'blue' },
    ],
  },
  emptyState: { icon: 'Bug', title: 'No Scans', message: 'No vulnerability scan data', variant: 'info' },
  loadingState: { type: 'stats', count: 4 },
  isDemoData: true,
  isLive: false,
}
export default trivyScanConfig
