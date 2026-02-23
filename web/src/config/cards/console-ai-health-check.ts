/**
 * Console AI Health Check Card Configuration
 */
import type { UnifiedCardConfig } from '../../lib/unified/types'

export const consoleAiHealthCheckConfig: UnifiedCardConfig = {
  type: 'console_ai_health_check',
  title: 'AI Health Check',
  category: 'ai-ml',
  description: 'AI-powered cluster health check',
  icon: 'Stethoscope',
  iconColor: 'text-green-400',
  defaultWidth: 6,
  defaultHeight: 3,
  dataSource: { type: 'hook', hook: 'useConsoleAIHealthCheck' },
  content: { type: 'custom', component: 'AIHealthCheckView' },
  emptyState: { icon: 'Stethoscope', title: 'No Check', message: 'Run AI health check', variant: 'info' },
  loadingState: { type: 'custom' },
  isDemoData: false,
  isLive: false,
}
export default consoleAiHealthCheckConfig
