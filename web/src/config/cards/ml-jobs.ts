/**
 * ML Jobs Card Configuration
 */
import type { UnifiedCardConfig } from '../../lib/unified/types'

export const mlJobsConfig: UnifiedCardConfig = {
  type: 'ml_jobs',
  title: 'ML Jobs',
  category: 'ai-ml',
  description: 'Machine learning training jobs',
  icon: 'Sparkles',
  iconColor: 'text-yellow-400',
  defaultWidth: 6,
  defaultHeight: 3,
  dataSource: { type: 'hook', hook: 'useMLJobs' },
  content: {
    type: 'list',
    pageSize: 10,
    columns: [
      { field: 'name', header: 'Job', primary: true, render: 'truncate' },
      { field: 'type', header: 'Type', render: 'text', width: 80 },
      { field: 'progress', header: 'Progress', render: 'progress-bar', width: 100 },
      { field: 'status', header: 'Status', render: 'status-badge', width: 80 },
    ],
  },
  emptyState: { icon: 'Sparkles', title: 'No Jobs', message: 'No ML jobs found', variant: 'info' },
  loadingState: { type: 'list', rows: 5 },
  isDemoData: true,
  isLive: false,
}
export default mlJobsConfig
