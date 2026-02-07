/**
 * Compliance Score Card Configuration
 */
import type { UnifiedCardConfig } from '../../lib/unified/types'

export const complianceScoreConfig: UnifiedCardConfig = {
  type: 'compliance_score',
  title: 'Compliance Score',
  category: 'security',
  description: 'Overall compliance posture score',
  icon: 'Award',
  iconColor: 'text-green-400',
  defaultWidth: 4,
  defaultHeight: 3,
  dataSource: { type: 'hook', hook: 'useComplianceScore' },
  content: {
    type: 'stats-grid',
    stats: [
      { field: 'overall', label: 'Overall', color: 'blue', format: 'percentage' },
      { field: 'security', label: 'Security', color: 'red', format: 'percentage' },
      { field: 'reliability', label: 'Reliability', color: 'green', format: 'percentage' },
    ],
  },
  emptyState: { icon: 'Award', title: 'No Score', message: 'Compliance data not available', variant: 'info' },
  loadingState: { type: 'stats', count: 3 },
  isDemoData: true,
  isLive: false,
}
export default complianceScoreConfig
