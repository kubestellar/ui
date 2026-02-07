/**
 * ArgoCD Applications Card Configuration
 */
import type { UnifiedCardConfig } from '../../lib/unified/types'

export const argocdApplicationsConfig: UnifiedCardConfig = {
  type: 'argocd_applications',
  title: 'ArgoCD Applications',
  category: 'gitops',
  description: 'ArgoCD managed applications',
  icon: 'GitBranch',
  iconColor: 'text-orange-400',
  defaultWidth: 6,
  defaultHeight: 3,
  dataSource: { type: 'hook', hook: 'useArgoCDApplications' },
  filters: [
    { field: 'search', type: 'text', placeholder: 'Search apps...', searchFields: ['name', 'namespace', 'project'], storageKey: 'argocd-apps' },
  ],
  content: {
    type: 'list',
    pageSize: 10,
    columns: [
      { field: 'name', header: 'Application', primary: true, render: 'truncate' },
      { field: 'project', header: 'Project', render: 'text', width: 100 },
      { field: 'syncStatus', header: 'Sync', render: 'status-badge', width: 80 },
      { field: 'healthStatus', header: 'Health', render: 'status-badge', width: 80 },
    ],
  },
  emptyState: { icon: 'GitBranch', title: 'No Applications', message: 'No ArgoCD applications found', variant: 'info' },
  loadingState: { type: 'list', rows: 5 },
  isDemoData: true,
  isLive: false,
}
export default argocdApplicationsConfig
