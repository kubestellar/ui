/**
 * Overlay Comparison Card Configuration
 */
import type { UnifiedCardConfig } from '../../lib/unified/types'

export const overlayComparisonConfig: UnifiedCardConfig = {
  type: 'overlay_comparison',
  title: 'Overlay Comparison',
  category: 'gitops',
  description: 'Compare Kustomize overlays',
  icon: 'GitCompare',
  iconColor: 'text-blue-400',
  defaultWidth: 8,
  defaultHeight: 4,
  dataSource: { type: 'hook', hook: 'useOverlayComparison' },
  content: {
    type: 'custom',
    component: 'OverlayDiff',
  },
  emptyState: { icon: 'GitCompare', title: 'No Overlays', message: 'Select overlays to compare', variant: 'info' },
  loadingState: { type: 'custom' },
  isDemoData: true,
  isLive: false,
}
export default overlayComparisonConfig
