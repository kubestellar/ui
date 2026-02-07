/**
 * AI/ML Dashboard Configuration
 */
import type { UnifiedDashboardConfig } from '../../lib/unified/types'

export const aiMlDashboardConfig: UnifiedDashboardConfig = {
  id: 'ai-ml',
  name: 'AI/ML Workloads',
  subtitle: 'LLM inference, ML jobs, and notebooks',
  route: '/ai-ml',
  statsType: 'ai-ml',
  cards: [
    // Stunning LLM-d visualization cards (hero row - all 1/3 width)
    { id: 'llmd-flow-1', cardType: 'llmd_flow', title: 'llm-d Request Flow', position: { w: 4, h: 5 } },
    { id: 'kvcache-monitor-1', cardType: 'kvcache_monitor', title: 'KV Cache Monitor', position: { w: 4, h: 5 } },
    { id: 'epp-routing-1', cardType: 'epp_routing', title: 'EPP Routing', position: { w: 4, h: 5 } },

    // Architecture and routing visualizations
    { id: 'pd-disagg-1', cardType: 'pd_disaggregation', title: 'P/D Disaggregation', position: { w: 6, h: 4 } },

    // Performance and intelligence
    { id: 'llmd-benchmarks-1', cardType: 'llmd_benchmarks', title: 'Benchmarks', position: { w: 6, h: 4 } },
    { id: 'llmd-ai-insights-1', cardType: 'llmd_ai_insights', title: 'AI Insights', position: { w: 6, h: 4 } },

    // Configuration and existing cards
    { id: 'llmd-configurator-1', cardType: 'llmd_configurator', title: 'Configurator', position: { w: 4, h: 4 } },
    { id: 'llm-models-1', cardType: 'llm_models', position: { w: 4, h: 3 } },
    { id: 'llm-inference-1', cardType: 'llm_inference', position: { w: 4, h: 3 } },
    { id: 'llmd-stack-monitor-1', cardType: 'llmd_stack_monitor', position: { w: 4, h: 3 } },
    { id: 'ml-jobs-1', cardType: 'ml_jobs', position: { w: 4, h: 3 } },
    { id: 'ml-notebooks-1', cardType: 'ml_notebooks', position: { w: 4, h: 3 } },
    { id: 'gpu-overview-1', cardType: 'gpu_overview', position: { w: 4, h: 3 } },
    { id: 'hardware-health-1', cardType: 'hardware_health', title: 'Hardware Health', position: { w: 6, h: 3 } },
  ],
  features: {
    dragDrop: true,
    addCard: true,
    autoRefresh: true,
    autoRefreshInterval: 30000,
  },
  storageKey: 'ai-ml-dashboard-cards',
}

export default aiMlDashboardConfig
