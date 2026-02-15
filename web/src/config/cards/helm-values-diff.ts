/**
 * Helm Values Diff Card Configuration
 */
import type { UnifiedCardConfig } from '../../lib/unified/types'

export const helmValuesDiffConfig: UnifiedCardConfig = {
  type: 'helm_values_diff',
  title: 'Helm Values Diff',
  category: 'gitops',
  description: 'Compare Helm values between revisions',
  icon: 'FileDiff',
  iconColor: 'text-purple-400',
  defaultWidth: 8,
  defaultHeight: 4,
  dataSource: { type: 'hook', hook: 'useHelmValuesDiff' },
  content: {
    type: 'custom',
    component: 'DiffViewer',
  },
  emptyState: { icon: 'FileDiff', title: 'No Diff', message: 'Select revisions to compare', variant: 'info' },
  loadingState: { type: 'custom' },
  isDemoData: false,
  isLive: false,
}
export default helmValuesDiffConfig
