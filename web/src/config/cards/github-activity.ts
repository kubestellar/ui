/**
 * GitHub Activity Card Configuration
 */
import type { UnifiedCardConfig } from '../../lib/unified/types'

export const githubActivityConfig: UnifiedCardConfig = {
  type: 'github_activity',
  title: 'GitHub Activity',
  category: 'ci-cd',
  description: 'Recent GitHub repository activity',
  icon: 'Github',
  iconColor: 'text-gray-400',
  defaultWidth: 8,
  defaultHeight: 3,
  dataSource: { type: 'hook', hook: 'useGithubActivity' },
  content: {
    type: 'list',
    pageSize: 10,
    columns: [
      { field: 'type', header: 'Event', render: 'text', width: 80 },
      { field: 'repo', header: 'Repository', primary: true, render: 'truncate' },
      { field: 'actor', header: 'Actor', render: 'text', width: 100 },
      { field: 'timestamp', header: 'Time', render: 'relative-time', width: 80 },
    ],
  },
  emptyState: { icon: 'Github', title: 'No Activity', message: 'No recent GitHub activity', variant: 'info' },
  loadingState: { type: 'list', rows: 5 },
  isDemoData: false,
  isLive: true,
}
export default githubActivityConfig
