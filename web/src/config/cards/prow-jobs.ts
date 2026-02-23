/**
 * Prow Jobs Card Configuration
 */
import type { UnifiedCardConfig } from '../../lib/unified/types'

export const prowJobsConfig: UnifiedCardConfig = {
  type: 'prow_jobs',
  title: 'Prow Jobs',
  category: 'ci-cd',
  description: 'Prow CI job status',
  icon: 'GitPullRequest',
  iconColor: 'text-blue-400',
  defaultWidth: 6,
  defaultHeight: 3,
  dataSource: { type: 'hook', hook: 'useProwJobs' },
  filters: [
    { field: 'search', type: 'text', placeholder: 'Search jobs...', searchFields: ['name', 'type'], storageKey: 'prow-jobs' },
  ],
  content: {
    type: 'list',
    pageSize: 10,
    columns: [
      { field: 'name', header: 'Job', primary: true, render: 'truncate' },
      { field: 'type', header: 'Type', render: 'text', width: 80 },
      { field: 'state', header: 'State', render: 'status-badge', width: 80 },
      { field: 'startTime', header: 'Started', render: 'relative-time', width: 80 },
    ],
  },
  emptyState: { icon: 'GitPullRequest', title: 'No Jobs', message: 'No Prow jobs found', variant: 'info' },
  loadingState: { type: 'list', rows: 5 },
  isDemoData: false,
  isLive: true,
}
export default prowJobsConfig
