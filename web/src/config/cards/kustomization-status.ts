/**
 * Kustomization Status Card Configuration
 */
import type { UnifiedCardConfig } from '../../lib/unified/types'

export const kustomizationStatusConfig: UnifiedCardConfig = {
  type: 'kustomization_status',
  title: 'Kustomizations',
  category: 'gitops',
  description: 'Flux Kustomization resources',
  icon: 'Layers',
  iconColor: 'text-purple-400',
  defaultWidth: 6,
  defaultHeight: 3,
  dataSource: { type: 'hook', hook: 'useKustomizationStatus' },
  content: {
    type: 'list',
    pageSize: 10,
    columns: [
      { field: 'name', header: 'Name', primary: true, render: 'truncate' },
      { field: 'namespace', header: 'Namespace', render: 'namespace-badge', width: 100 },
      { field: 'ready', header: 'Ready', render: 'status-badge', width: 70 },
      { field: 'lastApplied', header: 'Applied', render: 'relative-time', width: 100 },
    ],
  },
  emptyState: { icon: 'Layers', title: 'No Kustomizations', message: 'No Kustomization resources found', variant: 'info' },
  loadingState: { type: 'list', rows: 5 },
  isDemoData: true,
  isLive: false,
}
export default kustomizationStatusConfig
