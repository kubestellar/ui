/**
 * AI Agents (Kagenti) Dashboard Configuration
 */
import type { UnifiedDashboardConfig } from '../../lib/unified/types'

export const aiAgentsDashboardConfig: UnifiedDashboardConfig = {
  id: 'ai-agents',
  name: 'AI Agents',
  subtitle: 'Kagenti agent platform — deploy, secure, and manage AI agents',
  route: '/ai-agents',
  statsType: 'ai-agents',
  cards: [
    // Hero overview card
    { id: 'kagenti-status-1', cardType: 'kagenti_status', title: 'Kagenti Overview', position: { w: 4, h: 5 } },
    // Agent fleet table
    { id: 'kagenti-fleet-1', cardType: 'kagenti_agent_fleet', title: 'Agent Fleet', position: { w: 8, h: 5 } },
    // Build pipeline
    { id: 'kagenti-builds-1', cardType: 'kagenti_build_pipeline', title: 'Build Pipeline', position: { w: 4, h: 4 } },
    // Tool registry
    { id: 'kagenti-tools-1', cardType: 'kagenti_tool_registry', title: 'MCP Tool Registry', position: { w: 4, h: 4 } },
    // Agent discovery
    { id: 'kagenti-discovery-1', cardType: 'kagenti_agent_discovery', title: 'Agent Discovery', position: { w: 4, h: 4 } },
    // Security posture
    { id: 'kagenti-security-1', cardType: 'kagenti_security', title: 'Security Posture', position: { w: 4, h: 4 } },
    // Agent topology
    { id: 'kagenti-topology-1', cardType: 'kagenti_topology', title: 'Agent Topology', position: { w: 8, h: 4 } },
  ],
  features: {
    dragDrop: true,
    addCard: true,
    autoRefresh: true,
    autoRefreshInterval: 30000,
  },
  storageKey: 'ai-agents-dashboard-cards',
}

export default aiAgentsDashboardConfig
