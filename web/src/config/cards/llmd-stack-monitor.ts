/**
 * LLMd Stack Monitor Card Configuration
 */
import type { UnifiedCardConfig } from '../../lib/unified/types'

export const llmdStackMonitorConfig: UnifiedCardConfig = {
  type: 'llmd_stack_monitor',
  title: 'llm-d Stack',
  category: 'ai-ml',
  description: 'LLM-d stack health monitoring',
  icon: 'Layers',
  iconColor: 'text-purple-400',
  defaultWidth: 6,
  defaultHeight: 3,
  dataSource: { type: 'hook', hook: 'useLLMdStackMonitor' },
  content: { type: 'custom', component: 'LLMdStackView' },
  emptyState: { icon: 'Layers', title: 'No Stack', message: 'LLM-d stack not detected', variant: 'info' },
  loadingState: { type: 'custom' },
  isDemoData: false,
  isLive: true,
}
export default llmdStackMonitorConfig
