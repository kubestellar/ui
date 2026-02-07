/**
 * UnifiedCardAdapter
 *
 * A bridge component that enables gradual migration from legacy card components
 * to the UnifiedCard framework. Cards can opt-in to using UnifiedCard rendering
 * by being added to the UNIFIED_READY_CARDS set.
 *
 * Usage:
 *   <UnifiedCardAdapter cardType="pod_issues" cardId="abc" />
 *
 * Migration path:
 *   1. Add card type to UNIFIED_READY_CARDS set
 *   2. Verify rendering matches legacy component
 *   3. Eventually deprecate legacy component
 */

import { useMemo } from 'react'
import { UnifiedCard } from './UnifiedCard'
import { getCardConfig } from '../../../config/cards'
import type { CardComponentProps } from '../../../components/cards/cardRegistry'

/**
 * Cards that have been validated to work correctly with UnifiedCard.
 *
 * Before adding a card here:
 * 1. Verify the card config in config/cards/*.ts is complete
 * 2. Test that UnifiedCard renders data correctly
 * 3. Verify filtering, pagination, and drill-down work
 * 4. Compare rendering with legacy component
 */
export const UNIFIED_READY_CARDS = new Set<string>([
  // =====================================================================
  // Phase 6 Batch 1 - Simple list cards with registered hooks
  // =====================================================================

  // Core workload cards
  'pod_issues',           // useCachedPodIssues
  'deployment_issues',    // useCachedDeploymentIssues

  // Event cards
  'event_stream',         // useCachedEvents
  'warning_events',       // useWarningEvents
  'recent_events',        // useRecentEvents

  // Resource status cards
  'service_status',       // useServices
  'pvc_status',           // usePVCs
  'operator_status',      // useOperators
  'helm_release_status',  // useHelmReleases
  'configmap_status',     // useConfigMaps
  'secret_status',        // useSecrets
  'ingress_status',       // useIngresses
  'node_status',          // useNodes
  'job_status',           // useJobs
  'cronjob_status',       // useCronJobs
  'statefulset_status',   // useStatefulSets
  'daemonset_status',     // useDaemonSets
  'hpa_status',           // useHPAs
  'replicaset_status',    // useReplicaSets
  'pv_status',            // usePVs
  'namespace_status',     // useNamespaces

  // =====================================================================
  // Phase 6 Batch 2 - Additional list/table cards
  // =====================================================================

  // RBAC cards
  'role_status',          // useK8sRoles
  'role_binding_status',  // useK8sRoleBindings

  // Quota cards
  'resource_quota_status', // useResourceQuotas
  'limit_range_status',   // useLimitRanges

  // Network cards
  'network_policy_status', // useNetworkPolicies
  'service_exports',      // useServiceExports
  'service_imports',      // useServiceImports

  // Operator cards
  'operator_subscription_status', // useOperatorSubscriptions

  // Service account
  'service_account_status', // useServiceAccounts

  // =====================================================================
  // Phase 6 Batch 3 - Chart and overview cards
  // =====================================================================

  // Chart cards (demo data)
  'cluster_metrics',        // useCachedClusterMetrics
  'events_timeline',        // useCachedEventsTimeline
  'pod_health_trend',       // usePodHealthTrend
  'resource_trend',         // useResourceTrend

  // Table/list cards with demo data
  'resource_usage',         // useCachedResourceUsage
  'top_pods',               // useTopPods
  'security_issues',        // useSecurityIssues
  'active_alerts',          // useActiveAlerts
  'gitops_drift',           // useGitOpsDrift

  // Status grid/overview cards (demo data)
  'storage_overview',       // useStorageOverview
  'network_overview',       // useNetworkOverview
  'compute_overview',       // useComputeOverview

  // =====================================================================
  // Phase 6 Batch 4 - ArgoCD, Prow, GPU, ML, Policy cards
  // =====================================================================

  // Deployment cards
  'deployment_status',      // useCachedDeployments (already registered)
  'deployment_progress',    // useDeploymentProgress

  // ArgoCD cards
  'argocd_applications',    // useArgoCDApplications

  // Prow/CI cards
  'prow_jobs',              // useProwJobs

  // GPU cards
  'gpu_inventory',          // useGPUInventory
  'gpu_overview',           // useGPUOverview
  'gpu_workloads',          // useGPUWorkloads

  // ML cards
  'ml_jobs',                // useMLJobs
  'ml_notebooks',           // useMLNotebooks

  // Policy cards
  'opa_policies',           // useOPAPolicies
  'kyverno_policies',       // useKyvernoPolicies

  // Alert cards
  'alert_rules',            // useAlertRules

  // Chart/upgrade cards
  'chart_versions',         // useChartVersions

  // CRD cards
  'crd_health',             // useCRDHealth

  // Compliance cards
  'compliance_score',       // useComplianceScore

  // Namespace cards
  'namespace_events',       // useNamespaceEvents

  // =====================================================================
  // Phase 6 Batch 5 - GitOps, Security, Status cards
  // =====================================================================

  // ArgoCD cards
  'argocd_health',          // useArgoCDHealth (stats-grid)
  'argocd_sync_status',     // useArgoCDSyncStatus (stats-grid)

  // GitOps cards
  'gateway_status',         // useGatewayStatus
  'kustomization_status',   // useKustomizationStatus

  // Cluster status cards
  'provider_health',        // useProviderHealth
  'upgrade_status',         // useUpgradeStatus

  // Prow/CI cards
  'prow_status',            // useProwStatus (stats-grid)
  'prow_history',           // useProwHistory

  // Helm cards
  'helm_history',           // useHelmHistory

  // Security cards
  'external_secrets',       // useExternalSecrets (stats-grid)
  'cert_manager',           // useCertManager (stats-grid)
  'vault_secrets',          // useVaultSecrets
  'falco_alerts',           // useFalcoAlerts
  'kubescape_scan',         // useKubescapeScan (stats-grid)
  'trivy_scan',             // useTrivyScan (stats-grid)
  'policy_violations',      // usePolicyViolations

  // Event cards
  'event_summary',          // useEventSummary (stats-grid)

  // App cards
  'app_status',             // useAppStatus

  // GPU cards
  'gpu_status',             // useGPUStatus (stats-grid)
  'gpu_utilization',        // useGPUUtilization (chart)
  'gpu_usage_trend',        // useGPUUsageTrend (chart)

  // Namespace cards
  'namespace_overview',     // useNamespaceOverview (stats-grid)
  'namespace_quotas',       // useNamespaceQuotas
  'namespace_rbac',         // useNamespaceRBAC

  // Resource cards
  'resource_capacity',      // useResourceCapacity (stats-grid)

  // =====================================================================
  // Phase 6 Batch 6 - Final compatible cards
  // =====================================================================

  // Cluster cards
  'cluster_health',         // useClusters (already registered)
  'cluster_costs',          // useClusterCosts

  // CI/CD cards
  'github_activity',        // useGithubActivity

  // Utility cards
  'rss_feed',               // useRSSFeed

  // Cost cards
  'kubecost_overview',      // useKubecostOverview (chart/donut)
  'opencost_overview',      // useOpencostOverview (chart/donut)
])

/**
 * Cards that should NEVER use UnifiedCard (games, embeds, custom viz)
 */
export const UNIFIED_EXCLUDED_CARDS = new Set<string>([
  // Arcade games - require custom rendering
  'kube_man', 'kube_kong', 'node_invaders', 'pod_pitfall', 'container_tetris',
  'flappy_pod', 'pod_sweeper', 'game_2048', 'checkers', 'kube_chess',
  'solitaire', 'match_game', 'kubedle', 'sudoku_game', 'pod_brothers',
  'kube_kart', 'kube_pong', 'kube_snake', 'kube_galaga', 'kube_craft',
  'kube_craft_3d', 'kube_doom', 'pod_crosser',

  // Embedded content
  'iframe_embed', 'mobile_browser', 'kubectl',

  // Weather has animated backgrounds
  'weather',

  // Complex tree/topology visualizations
  'cluster_resource_tree', 'service_topology', 'cluster_locations',
  'cluster_comparison', 'cluster_network',

  // AI-ML flow visualizations
  'llmd_flow', 'epp_routing', 'kv_cache_monitor', 'pd_disaggregation',

  // LLM/ML stack cards - require StackContext
  'llm_inference', 'llm_models', 'llmd_stack_monitor',

  // Monitor cards - complex custom visualizations
  'cluster_health_monitor', 'namespace_monitor', 'workload_monitor',
  'prow_ci_monitor', 'github_ci_monitor',

  // Complex interactive cards
  'cluster_focus', 'cluster_groups', 'resource_marshall',
  'user_management', 'workload_deployment',

  // Diff/comparison cards
  'helm_values_diff', 'overlay_comparison',

  // Console AI cards - special agent integration
  'console_ai_health_check', 'console_ai_issues',
  'console_ai_kubeconfig_audit', 'console_ai_offline_detection',

  // Special cards
  'deployment_missions', 'dynamic_card', 'hardware_health',
  'stock_market_ticker',
])

interface UnifiedCardAdapterProps extends CardComponentProps {
  /** The card type to render */
  cardType: string
  /** Unique card instance ID */
  cardId: string
  /** Instance-specific config overrides */
  instanceConfig?: Record<string, unknown>
  /** Force legacy rendering even if card is unified-ready */
  forceLegacy?: boolean
  /** Callback when legacy component should be rendered */
  renderLegacy?: () => React.ReactNode
}

/**
 * Check if a card should use UnifiedCard rendering
 */
export function shouldUseUnifiedCard(cardType: string): boolean {
  // Explicitly excluded cards never use unified
  if (UNIFIED_EXCLUDED_CARDS.has(cardType)) {
    return false
  }

  // Only cards in the ready set use unified
  return UNIFIED_READY_CARDS.has(cardType)
}

/**
 * Check if a card has a valid config for UnifiedCard
 */
export function hasValidUnifiedConfig(cardType: string): boolean {
  const config = getCardConfig(cardType)
  if (!config) return false

  // Check required fields
  if (!config.type || !config.dataSource || !config.content) {
    return false
  }

  // Check data source is configured
  if (config.dataSource.type === 'hook' && !config.dataSource.hook) {
    return false
  }

  // Check content type is supported
  const supportedTypes = ['list', 'table', 'chart', 'status-grid']
  if (!supportedTypes.includes(config.content.type)) {
    return false
  }

  return true
}

/**
 * UnifiedCardAdapter - Renders cards via UnifiedCard or legacy component
 */
export function UnifiedCardAdapter({
  cardType,
  cardId: _cardId,
  instanceConfig,
  forceLegacy = false,
  renderLegacy,
}: UnifiedCardAdapterProps) {
  // Get config for this card type
  const config = useMemo(() => getCardConfig(cardType), [cardType])

  // Determine if we should use UnifiedCard
  const useUnified = useMemo(() => {
    if (forceLegacy) return false
    if (!shouldUseUnifiedCard(cardType)) return false
    if (!hasValidUnifiedConfig(cardType)) return false
    return true
  }, [cardType, forceLegacy])

  // Render via UnifiedCard
  if (useUnified && config) {
    return (
      <UnifiedCard
        config={config}
        instanceConfig={instanceConfig}
        className="h-full"
      />
    )
  }

  // Fall back to legacy rendering
  if (renderLegacy) {
    return <>{renderLegacy()}</>
  }

  // If no legacy renderer provided, show placeholder
  return (
    <div className="flex items-center justify-center h-full text-gray-500 text-sm">
      Card not available
    </div>
  )
}

/**
 * Get migration status for a card type
 */
export function getCardMigrationStatus(cardType: string): {
  status: 'unified' | 'ready' | 'pending' | 'excluded'
  reason?: string
} {
  if (UNIFIED_EXCLUDED_CARDS.has(cardType)) {
    return {
      status: 'excluded',
      reason: 'Card type not suitable for unified framework',
    }
  }

  if (UNIFIED_READY_CARDS.has(cardType)) {
    return {
      status: 'unified',
      reason: 'Card is rendering via UnifiedCard',
    }
  }

  if (hasValidUnifiedConfig(cardType)) {
    return {
      status: 'ready',
      reason: 'Config complete, ready for validation',
    }
  }

  return {
    status: 'pending',
    reason: 'Config incomplete or missing',
  }
}

/**
 * Get all cards by migration status
 */
export function getCardsByMigrationStatus(): {
  unified: string[]
  ready: string[]
  pending: string[]
  excluded: string[]
} {
  const result = {
    unified: Array.from(UNIFIED_READY_CARDS),
    ready: [] as string[],
    pending: [] as string[],
    excluded: Array.from(UNIFIED_EXCLUDED_CARDS),
  }

  // Import all card types from config registry
  // This would need to be done dynamically in practice
  // For now, we check known card types

  return result
}

export default UnifiedCardAdapter
