/**
 * LLM Inference Card Configuration
 */
import type { UnifiedCardConfig } from '../../lib/unified/types'

export const llmInferenceConfig: UnifiedCardConfig = {
  type: 'llm_inference',
  title: 'llm-d Inference',
  category: 'ai-ml',
  description: 'LLM inference endpoint status',
  icon: 'Bot',
  iconColor: 'text-purple-400',
  defaultWidth: 6,
  defaultHeight: 3,
  dataSource: { type: 'hook', hook: 'useLLMInference' },
  content: {
    type: 'list',
    pageSize: 10,
    columns: [
      { field: 'model', header: 'Model', primary: true, render: 'truncate' },
      { field: 'endpoint', header: 'Endpoint', render: 'text', width: 120 },
      { field: 'status', header: 'Status', render: 'status-badge', width: 80 },
      { field: 'latency', header: 'Latency', render: 'text', width: 70, suffix: 'ms' },
    ],
  },
  emptyState: { icon: 'Bot', title: 'No Endpoints', message: 'No LLM inference endpoints', variant: 'info' },
  loadingState: { type: 'list', rows: 5 },
  isDemoData: false,
  isLive: true,
}
export default llmInferenceConfig
