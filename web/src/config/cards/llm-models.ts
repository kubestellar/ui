/**
 * LLM Models Card Configuration
 */
import type { UnifiedCardConfig } from '../../lib/unified/types'

export const llmModelsConfig: UnifiedCardConfig = {
  type: 'llm_models',
  title: 'llm-d Models',
  category: 'ai-ml',
  description: 'Deployed LLM models',
  icon: 'Brain',
  iconColor: 'text-pink-400',
  defaultWidth: 6,
  defaultHeight: 3,
  dataSource: { type: 'hook', hook: 'useLLMModels' },
  content: {
    type: 'list',
    pageSize: 10,
    columns: [
      { field: 'name', header: 'Model', primary: true, render: 'truncate' },
      { field: 'version', header: 'Version', render: 'text', width: 80 },
      { field: 'replicas', header: 'Replicas', render: 'number', width: 70 },
      { field: 'status', header: 'Status', render: 'status-badge', width: 80 },
    ],
  },
  emptyState: { icon: 'Brain', title: 'No Models', message: 'No LLM models deployed', variant: 'info' },
  loadingState: { type: 'list', rows: 5 },
  isDemoData: false,
  isLive: true,
}
export default llmModelsConfig
