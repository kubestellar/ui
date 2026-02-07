/**
 * Unified Stats Components
 */

export { UnifiedStatBlock } from './UnifiedStatBlock'
export { UnifiedStatsSection } from './UnifiedStatsSection'

export {
  resolveStatValue,
  resolveFieldPath,
  resolveComputedExpression,
  resolveAggregate,
  formatValue,
  formatNumber,
  formatBytes,
  formatCurrency,
  formatDuration,
} from './valueResolvers'

export type { ResolvedStatValue } from './valueResolvers'

// Stats configs
export {
  getUnifiedStatsConfig,
  CLUSTERS_STATS_CONFIG,
  WORKLOADS_STATS_CONFIG,
  PODS_STATS_CONFIG,
  GITOPS_STATS_CONFIG,
  STORAGE_STATS_CONFIG,
  NETWORK_STATS_CONFIG,
  SECURITY_STATS_CONFIG,
  COMPLIANCE_STATS_CONFIG,
  DATA_COMPLIANCE_STATS_CONFIG,
  COMPUTE_STATS_CONFIG,
  EVENTS_STATS_CONFIG,
  COST_STATS_CONFIG,
  ALERTS_STATS_CONFIG,
  DASHBOARD_STATS_CONFIG,
  OPERATORS_STATS_CONFIG,
  DEPLOY_STATS_CONFIG,
} from './configs'

export type { StatsConfigType } from './configs'
