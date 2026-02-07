/**
 * Console AI Kubeconfig Audit Card Configuration
 */
import type { UnifiedCardConfig } from '../../lib/unified/types'

export const consoleAiKubeconfigAuditConfig: UnifiedCardConfig = {
  type: 'console_ai_kubeconfig_audit',
  title: 'Kubeconfig Audit',
  category: 'security',
  description: 'AI kubeconfig security audit',
  icon: 'FileKey',
  iconColor: 'text-yellow-400',
  defaultWidth: 6,
  defaultHeight: 3,
  dataSource: { type: 'hook', hook: 'useConsoleAIKubeconfigAudit' },
  content: { type: 'custom', component: 'KubeconfigAuditView' },
  emptyState: { icon: 'FileKey', title: 'No Audit', message: 'Run kubeconfig audit', variant: 'info' },
  loadingState: { type: 'custom' },
  isDemoData: false,
  isLive: false,
}
export default consoleAiKubeconfigAuditConfig
