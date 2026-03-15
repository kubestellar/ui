/**
 * Dashboard Configuration Registry
 *
 * Central registry for all unified dashboard configurations.
 */

import type { UnifiedDashboardConfig, DashboardConfigRegistry } from '../../lib/unified/types'
import { mainDashboardConfig } from './main'
import { computeDashboardConfig } from './compute'
import { securityDashboardConfig } from './security'
import { gitopsDashboardConfig } from './gitops'
import { storageDashboardConfig } from './storage'
import { networkDashboardConfig } from './network'
import { eventsDashboardConfig } from './events'
import { workloadsDashboardConfig } from './workloads'
import { operatorsDashboardConfig } from './operators'
import { clustersDashboardConfig } from './clusters'
import { complianceDashboardConfig } from './compliance'
import { costDashboardConfig } from './cost'
import { gpuDashboardConfig } from './gpu'
import { nodesDashboardConfig } from './nodes'
import { deploymentsDashboardConfig } from './deployments'
import { podsDashboardConfig } from './pods'
import { servicesDashboardConfig } from './services'
import { helmDashboardConfig } from './helm'
import { alertsDashboardConfig } from './alerts'
import { aiMlDashboardConfig } from './ai-ml'
import { ciCdDashboardConfig } from './ci-cd'
import { logsDashboardConfig } from './logs'
import { dataComplianceDashboardConfig } from './data-compliance'
import { arcadeDashboardConfig } from './arcade'
import { deployDashboardConfig } from './deploy'
import { aiAgentsDashboardConfig } from './ai-agents'

/**
 * Registry of all unified dashboard configurations
 */
export const DASHBOARD_CONFIGS: DashboardConfigRegistry = {
  main: mainDashboardConfig,
  compute: computeDashboardConfig,
  security: securityDashboardConfig,
  gitops: gitopsDashboardConfig,
  storage: storageDashboardConfig,
  network: networkDashboardConfig,
  events: eventsDashboardConfig,
  workloads: workloadsDashboardConfig,
  operators: operatorsDashboardConfig,
  clusters: clustersDashboardConfig,
  compliance: complianceDashboardConfig,
  cost: costDashboardConfig,
  gpu: gpuDashboardConfig,
  nodes: nodesDashboardConfig,
  deployments: deploymentsDashboardConfig,
  pods: podsDashboardConfig,
  services: servicesDashboardConfig,
  helm: helmDashboardConfig,
  alerts: alertsDashboardConfig,
  'ai-ml': aiMlDashboardConfig,
  'ci-cd': ciCdDashboardConfig,
  logs: logsDashboardConfig,
  'data-compliance': dataComplianceDashboardConfig,
  arcade: arcadeDashboardConfig,
  deploy: deployDashboardConfig,
  'ai-agents': aiAgentsDashboardConfig,
}

/**
 * Get a dashboard configuration by ID
 */
export function getDashboardConfig(dashboardId: string): UnifiedDashboardConfig | undefined {
  return DASHBOARD_CONFIGS[dashboardId]
}

/**
 * Check if a dashboard ID has a unified configuration
 */
export function hasUnifiedDashboardConfig(dashboardId: string): boolean {
  return dashboardId in DASHBOARD_CONFIGS
}

/**
 * Get all registered dashboard IDs
 */
export function getUnifiedDashboardIds(): string[] {
  return Object.keys(DASHBOARD_CONFIGS)
}

/**
 * Get default cards for a dashboard in the legacy format used by DashboardPage
 * Converts from UnifiedDashboardConfig.cards to the legacy { type, title, position } format
 */
export function getDefaultCards(dashboardId: string): Array<{ type: string; title?: string; position: { w: number; h: number } }> {
  const config = DASHBOARD_CONFIGS[dashboardId]
  if (!config?.cards) return []

  return config.cards.map(card => ({
    type: card.cardType,
    title: card.title,
    position: { w: card.position.w, h: card.position.h },
  }))
}

/**
 * Get default cards for a dashboard in the Dashboard.tsx format
 * Converts from UnifiedDashboardConfig.cards to { id, card_type, config, position } format
 */
export function getDefaultCardsForDashboard(dashboardId: string): Array<{ id: string; card_type: string; config: Record<string, unknown>; position: { x: number; y: number; w: number; h: number } }> {
  const config = DASHBOARD_CONFIGS[dashboardId]
  if (!config?.cards) return []

  return config.cards.map((card, index) => ({
    id: card.id || `default-${index}`,
    card_type: card.cardType,
    config: {},
    position: {
      x: card.position.x ?? (index % 3) * 4,
      y: card.position.y ?? Math.floor(index / 3) * 3,
      w: card.position.w,
      h: card.position.h,
    },
  }))
}

// Re-export individual configs
export {
  mainDashboardConfig,
  computeDashboardConfig,
  securityDashboardConfig,
  gitopsDashboardConfig,
  storageDashboardConfig,
  networkDashboardConfig,
  eventsDashboardConfig,
  workloadsDashboardConfig,
  operatorsDashboardConfig,
  clustersDashboardConfig,
  complianceDashboardConfig,
  costDashboardConfig,
  gpuDashboardConfig,
  nodesDashboardConfig,
  deploymentsDashboardConfig,
  podsDashboardConfig,
  servicesDashboardConfig,
  helmDashboardConfig,
  alertsDashboardConfig,
  aiMlDashboardConfig,
  ciCdDashboardConfig,
  logsDashboardConfig,
  dataComplianceDashboardConfig,
  arcadeDashboardConfig,
  deployDashboardConfig,
  aiAgentsDashboardConfig,
}
