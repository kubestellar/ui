/**
 * Console AI Issues Card Configuration
 */
import type { UnifiedCardConfig } from '../../lib/unified/types'

export const consoleAiIssuesConfig: UnifiedCardConfig = {
  type: 'console_ai_issues',
  title: 'AI Issues',
  category: 'ai-ml',
  description: 'AI-detected cluster issues',
  icon: 'Bot',
  iconColor: 'text-purple-400',
  defaultWidth: 6,
  defaultHeight: 3,
  dataSource: { type: 'hook', hook: 'useConsoleAIIssues' },
  content: {
    type: 'list',
    pageSize: 10,
    columns: [
      { field: 'severity', header: 'Sev', render: 'status-badge', width: 60 },
      { field: 'issue', header: 'Issue', primary: true, render: 'truncate' },
      { field: 'cluster', header: 'Cluster', render: 'cluster-badge', width: 100 },
      { field: 'confidence', header: 'Conf', render: 'percentage', width: 60 },
    ],
  },
  emptyState: { icon: 'Bot', title: 'No Issues', message: 'No AI-detected issues', variant: 'success' },
  loadingState: { type: 'list', rows: 5 },
  isDemoData: false,
  isLive: true,
}
export default consoleAiIssuesConfig
