/**
 * ArgoCD Health Card Configuration
 */
import type { UnifiedCardConfig } from '../../lib/unified/types'

export const argocdHealthConfig: UnifiedCardConfig = {
  type: 'argocd_health',
  title: 'ArgoCD Health',
  category: 'gitops',
  description: 'Health status of ArgoCD applications',
  icon: 'HeartPulse',
  iconColor: 'text-red-400',
  defaultWidth: 6,
  defaultHeight: 3,
  dataSource: { type: 'hook', hook: 'useArgoCDHealth' },
  content: {
    type: 'stats-grid',
    stats: [
      { field: 'healthy', label: 'Healthy', color: 'green' },
      { field: 'degraded', label: 'Degraded', color: 'yellow' },
      { field: 'progressing', label: 'Progressing', color: 'blue' },
      { field: 'missing', label: 'Missing', color: 'red' },
    ],
  },
  emptyState: { icon: 'HeartPulse', title: 'No Health Data', message: 'No ArgoCD health data available', variant: 'info' },
  loadingState: { type: 'stats', count: 4 },
  isDemoData: true,
  isLive: false,
}
export default argocdHealthConfig
