/**
 * ML Notebooks Card Configuration
 */
import type { UnifiedCardConfig } from '../../lib/unified/types'

export const mlNotebooksConfig: UnifiedCardConfig = {
  type: 'ml_notebooks',
  title: 'ML Notebooks',
  category: 'ai-ml',
  description: 'Jupyter notebook instances',
  icon: 'BookOpen',
  iconColor: 'text-orange-400',
  defaultWidth: 6,
  defaultHeight: 3,
  dataSource: { type: 'hook', hook: 'useMLNotebooks' },
  content: {
    type: 'list',
    pageSize: 10,
    columns: [
      { field: 'name', header: 'Notebook', primary: true, render: 'truncate' },
      { field: 'namespace', header: 'Namespace', render: 'namespace-badge', width: 100 },
      { field: 'image', header: 'Image', render: 'truncate', width: 120 },
      { field: 'status', header: 'Status', render: 'status-badge', width: 80 },
    ],
  },
  emptyState: { icon: 'BookOpen', title: 'No Notebooks', message: 'No ML notebooks found', variant: 'info' },
  loadingState: { type: 'list', rows: 5 },
  isDemoData: true,
  isLive: false,
}
export default mlNotebooksConfig
