/**
 * Kubectl Card Configuration
 */
import type { UnifiedCardConfig } from '../../lib/unified/types'

export const kubectlConfig: UnifiedCardConfig = {
  type: 'kubectl',
  title: 'Kubectl',
  category: 'utility',
  description: 'Interactive kubectl terminal',
  icon: 'Terminal',
  iconColor: 'text-green-400',
  defaultWidth: 8,
  defaultHeight: 4,
  dataSource: { type: 'hook', hook: 'useKubectl' },
  content: {
    type: 'custom',
    component: 'KubectlTerminal',
  },
  emptyState: { icon: 'Terminal', title: 'Terminal', message: 'Enter kubectl commands', variant: 'info' },
  loadingState: { type: 'custom' },
  isDemoData: false,
  isLive: true,
}
export default kubectlConfig
