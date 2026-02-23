/**
 * Unified Stats Section Configs
 *
 * Converts legacy StatsBlockDefinitions to UnifiedStatsSectionConfig format.
 * These configs work with UnifiedStatsSection using the getStatValue callback.
 */

import type { UnifiedStatsSectionConfig, UnifiedStatBlockConfig, StatBlockColor } from '../types'
import {
  CLUSTERS_STAT_BLOCKS,
  WORKLOADS_STAT_BLOCKS,
  PODS_STAT_BLOCKS,
  GITOPS_STAT_BLOCKS,
  STORAGE_STAT_BLOCKS,
  NETWORK_STAT_BLOCKS,
  SECURITY_STAT_BLOCKS,
  COMPLIANCE_STAT_BLOCKS,
  DATA_COMPLIANCE_STAT_BLOCKS,
  COMPUTE_STAT_BLOCKS,
  EVENTS_STAT_BLOCKS,
  COST_STAT_BLOCKS,
  ALERTS_STAT_BLOCKS,
  DASHBOARD_STAT_BLOCKS,
  OPERATORS_STAT_BLOCKS,
  DEPLOY_STAT_BLOCKS,
  StatBlockConfig,
} from '../../../components/ui/StatsBlockDefinitions'

/**
 * Convert legacy StatBlockConfig to UnifiedStatBlockConfig
 */
function convertBlock(block: StatBlockConfig, order: number): UnifiedStatBlockConfig {
  return {
    id: block.id,
    name: block.name,
    icon: block.icon,
    color: block.color as StatBlockColor,
    visible: block.visible,
    order,
    // Use callback value source - actual value comes from getStatValue
    valueSource: { type: 'hook', hookName: 'getStatValue', field: block.id },
  }
}

/**
 * Convert legacy stat blocks array to unified config
 */
function createConfig(
  type: string,
  title: string,
  blocks: StatBlockConfig[],
  options?: Partial<UnifiedStatsSectionConfig>
): UnifiedStatsSectionConfig {
  return {
    type,
    title,
    blocks: blocks.map((b, i) => convertBlock(b, i)),
    collapsible: true,
    showConfigButton: true,
    storageKey: `kubestellar-${type}-stats-collapsed`,
    ...options,
  }
}

// ============================================================================
// Dashboard-specific configs
// ============================================================================

export const CLUSTERS_STATS_CONFIG = createConfig(
  'clusters',
  'Stats Overview',
  CLUSTERS_STAT_BLOCKS
)

export const WORKLOADS_STATS_CONFIG = createConfig(
  'workloads',
  'Stats Overview',
  WORKLOADS_STAT_BLOCKS
)

export const PODS_STATS_CONFIG = createConfig(
  'pods',
  'Stats Overview',
  PODS_STAT_BLOCKS
)

export const GITOPS_STATS_CONFIG = createConfig(
  'gitops',
  'Stats Overview',
  GITOPS_STAT_BLOCKS
)

export const STORAGE_STATS_CONFIG = createConfig(
  'storage',
  'Stats Overview',
  STORAGE_STAT_BLOCKS
)

export const NETWORK_STATS_CONFIG = createConfig(
  'network',
  'Stats Overview',
  NETWORK_STAT_BLOCKS
)

export const SECURITY_STATS_CONFIG = createConfig(
  'security',
  'Stats Overview',
  SECURITY_STAT_BLOCKS
)

export const COMPLIANCE_STATS_CONFIG = createConfig(
  'compliance',
  'Stats Overview',
  COMPLIANCE_STAT_BLOCKS
)

export const DATA_COMPLIANCE_STATS_CONFIG = createConfig(
  'data-compliance',
  'Stats Overview',
  DATA_COMPLIANCE_STAT_BLOCKS
)

export const COMPUTE_STATS_CONFIG = createConfig(
  'compute',
  'Stats Overview',
  COMPUTE_STAT_BLOCKS
)

export const EVENTS_STATS_CONFIG = createConfig(
  'events',
  'Stats Overview',
  EVENTS_STAT_BLOCKS
)

export const COST_STATS_CONFIG = createConfig(
  'cost',
  'Stats Overview',
  COST_STAT_BLOCKS
)

export const ALERTS_STATS_CONFIG = createConfig(
  'alerts',
  'Stats Overview',
  ALERTS_STAT_BLOCKS
)

export const DASHBOARD_STATS_CONFIG = createConfig(
  'dashboard',
  'Stats Overview',
  DASHBOARD_STAT_BLOCKS
)

export const OPERATORS_STATS_CONFIG = createConfig(
  'operators',
  'Stats Overview',
  OPERATORS_STAT_BLOCKS
)

export const DEPLOY_STATS_CONFIG = createConfig(
  'deploy',
  'Stats Overview',
  DEPLOY_STAT_BLOCKS
)

// ============================================================================
// Config lookup
// ============================================================================

export type StatsConfigType =
  | 'clusters'
  | 'workloads'
  | 'pods'
  | 'gitops'
  | 'storage'
  | 'network'
  | 'security'
  | 'compliance'
  | 'data-compliance'
  | 'compute'
  | 'events'
  | 'cost'
  | 'alerts'
  | 'dashboard'
  | 'operators'
  | 'deploy'

const CONFIGS: Record<StatsConfigType, UnifiedStatsSectionConfig> = {
  clusters: CLUSTERS_STATS_CONFIG,
  workloads: WORKLOADS_STATS_CONFIG,
  pods: PODS_STATS_CONFIG,
  gitops: GITOPS_STATS_CONFIG,
  storage: STORAGE_STATS_CONFIG,
  network: NETWORK_STATS_CONFIG,
  security: SECURITY_STATS_CONFIG,
  compliance: COMPLIANCE_STATS_CONFIG,
  'data-compliance': DATA_COMPLIANCE_STATS_CONFIG,
  compute: COMPUTE_STATS_CONFIG,
  events: EVENTS_STATS_CONFIG,
  cost: COST_STATS_CONFIG,
  alerts: ALERTS_STATS_CONFIG,
  dashboard: DASHBOARD_STATS_CONFIG,
  operators: OPERATORS_STATS_CONFIG,
  deploy: DEPLOY_STATS_CONFIG,
}

/**
 * Get unified stats config for a dashboard type
 */
export function getUnifiedStatsConfig(type: StatsConfigType): UnifiedStatsSectionConfig {
  return CONFIGS[type]
}
