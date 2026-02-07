/**
 * GitHub CI Monitor Card Configuration
 */
import type { UnifiedCardConfig } from '../../lib/unified/types'

export const githubCiMonitorConfig: UnifiedCardConfig = {
  type: 'github_ci_monitor',
  title: 'GitHub Actions',
  category: 'ci-cd',
  description: 'GitHub Actions monitoring',
  icon: 'Github',
  iconColor: 'text-gray-400',
  defaultWidth: 8,
  defaultHeight: 3,
  dataSource: { type: 'hook', hook: 'useGitHubCIMonitor' },
  content: { type: 'custom', component: 'GitHubCIView' },
  emptyState: { icon: 'Github', title: 'No Actions', message: 'GitHub Actions not configured', variant: 'info' },
  loadingState: { type: 'custom' },
  isDemoData: false,
  isLive: true,
}
export default githubCiMonitorConfig
