/**
 * Card Component Analyzer
 *
 * Analyzes legacy card components to determine migration complexity
 * and generate migration recommendations.
 */

import type {
  CardAnalysis,
  VisualizationType,
  CardPattern,
  DataSourceInfo,
} from './types'

/**
 * Cards that should NOT be migrated (games, specialized visualizations)
 */
const NON_MIGRATION_CARDS = new Set([
  // Arcade games
  'kube_man', 'kube_kong', 'node_invaders', 'pod_pitfall', 'container_tetris',
  'flappy_pod', 'pod_sweeper', 'game_2048', 'checkers', 'kube_chess',
  'solitaire', 'match_game', 'kubedle', 'sudoku_game', 'pod_brothers',
  'kube_kart', 'kube_pong', 'kube_snake', 'kube_galaga', 'kube_craft',
  'kube_craft_3d', 'kube_doom', 'pod_crosser',
  // Embedded/utility
  'iframe_embed', 'mobile_browser', 'kubectl',
  // Weather has animated backgrounds
  'weather',
])

/**
 * Cards that use the unified CardWrapper pattern - prime migration candidates
 */
const UNIFIED_PATTERN_CARDS = new Set([
  'pod_issues', 'deployment_issues', 'security_issues', 'cluster_health',
  'service_status', 'operator_status', 'active_alerts', 'hardware_health',
  'event_stream', 'event_summary', 'warning_events', 'recent_events',
  'namespace_events', 'app_status', 'deployment_status', 'pvc_status',
  'service_exports', 'service_imports', 'gateway_status', 'crd_health',
  'helm_release_status', 'argocd_applications', 'argocd_sync_status',
  'kustomization_status', 'opa_policies', 'kyverno_policies', 'top_pods',
  'chart_versions', 'llm_inference', 'llm_models', 'ml_jobs', 'prow_jobs',
  'prow_status', 'gpu_inventory', 'gpu_workloads', 'namespace_rbac',
  'role_status', 'role_binding_status', 'argocd_health', 'gitops_drift',
])

/**
 * Chart/visualization cards that need moderate effort
 */
const CHART_CARDS = new Set([
  'events_timeline', 'resource_usage', 'resource_trend', 'pod_health_trend',
  'gpu_utilization', 'gpu_usage_trend', 'cluster_metrics', 'resource_capacity',
  'compliance_score', 'deployment_progress', 'storage_overview', 'network_overview',
  'compute_overview', 'gpu_overview', 'gpu_status',
])

/**
 * Complex visualization cards requiring custom handling
 */
const COMPLEX_CARDS = new Set([
  'cluster_locations', 'cluster_comparison', 'cluster_network', 'service_topology',
  'cluster_resource_tree', 'workload_monitor', 'cluster_health_monitor',
  'llmd_stack_monitor', 'prow_ci_monitor', 'github_ci_monitor', 'resource_marshall',
  'cluster_groups', 'namespace_monitor', 'cluster_focus', 'user_management',
  // AI-ML flow cards
  'llmd_flow', 'epp_routing', 'kv_cache_monitor', 'pd_disaggregation',
  // Kagenti cards
  'kagenti_status', 'kagenti_agent_fleet', 'kagenti_build_pipeline',
  'kagenti_tool_registry', 'kagenti_agent_discovery', 'kagenti_security',
  'kagenti_topology',
])

/**
 * Known data hooks and their registration status
 */
const REGISTERED_HOOKS: Record<string, boolean> = {
  useCachedPodIssues: true,
  useCachedDeploymentIssues: true,
  useCachedSecurityIssues: true,
  useCachedEvents: true,
  useCachedPods: true,
  useCachedServices: true,
  useCachedDeployments: true,
  useClusters: true,
  useGPUNodes: true,
  useAlerts: true,
  useOperators: true,
  useHelmReleases: true,
  useNamespaces: true,
  // Add more as they get registered
}

/**
 * Analyze a card type and return migration information
 */
export function analyzeCard(cardType: string): CardAnalysis {
  const normalizedType = cardType.toLowerCase().replace(/-/g, '_')

  // Check if non-migratable
  if (NON_MIGRATION_CARDS.has(normalizedType)) {
    return createNonCandidateAnalysis(cardType, 'game_or_embed')
  }

  // Check if uses unified pattern (simple migration)
  if (UNIFIED_PATTERN_CARDS.has(normalizedType)) {
    return createSimpleAnalysis(cardType)
  }

  // Check if chart card (moderate effort)
  if (CHART_CARDS.has(normalizedType)) {
    return createChartAnalysis(cardType)
  }

  // Check if complex card
  if (COMPLEX_CARDS.has(normalizedType)) {
    return createComplexAnalysis(cardType)
  }

  // Unknown card - assume moderate complexity
  return createUnknownAnalysis(cardType)
}

/**
 * Analyze multiple cards and return all analyses
 */
export function analyzeCards(cardTypes: string[]): CardAnalysis[] {
  return cardTypes.map(analyzeCard)
}

/**
 * Get list of all known card types
 */
export function getAllKnownCardTypes(): string[] {
  const allCards = new Set<string>()

  NON_MIGRATION_CARDS.forEach(c => allCards.add(c))
  UNIFIED_PATTERN_CARDS.forEach(c => allCards.add(c))
  CHART_CARDS.forEach(c => allCards.add(c))
  COMPLEX_CARDS.forEach(c => allCards.add(c))

  return Array.from(allCards).sort()
}

/**
 * Get migration candidates (cards worth migrating)
 */
export function getMigrationCandidates(): string[] {
  const candidates: string[] = []

  UNIFIED_PATTERN_CARDS.forEach(c => candidates.push(c))
  CHART_CARDS.forEach(c => candidates.push(c))

  return candidates.sort()
}

/**
 * Check if a hook is registered in the unified data source system
 */
export function isHookRegistered(hookName: string): boolean {
  return REGISTERED_HOOKS[hookName] === true
}

/**
 * Detect patterns in card based on type
 */
function detectPatterns(cardType: string): CardPattern {
  const isUnified = UNIFIED_PATTERN_CARDS.has(cardType)

  return {
    usesCardData: isUnified,
    usesCardListItem: isUnified,
    usesPagination: isUnified,
    usesSearch: isUnified,
    usesControlsRow: isUnified,
    usesAIActions: isUnified,
    usesLoadingState: isUnified || CHART_CARDS.has(cardType),
    usesDrillDown: isUnified || CHART_CARDS.has(cardType),
    hasClusterFilter: isUnified,
    hasNamespaceFilter: isUnified,
  }
}

/**
 * Get visualization type for card
 */
function getVisualizationType(cardType: string): VisualizationType {
  if (NON_MIGRATION_CARDS.has(cardType)) {
    if (cardType.includes('game') || cardType.includes('chess') ||
        cardType.includes('checkers') || cardType.includes('tetris') ||
        cardType.includes('kong') || cardType.includes('doom')) {
      return 'game'
    }
    if (cardType.includes('embed') || cardType.includes('browser')) {
      return 'embed'
    }
  }

  if (CHART_CARDS.has(cardType)) {
    if (cardType.includes('gauge') || cardType.includes('score')) return 'gauge'
    return 'chart'
  }

  if (cardType.includes('topology') || cardType.includes('tree')) return 'topology'
  if (cardType.includes('location') || cardType.includes('map')) return 'map'
  if (cardType.includes('grid') || cardType.includes('health')) return 'status-grid'

  if (UNIFIED_PATTERN_CARDS.has(cardType)) return 'list'

  return 'custom'
}

/**
 * Get data source info for card type
 */
function getDataSourceInfo(cardType: string): DataSourceInfo | null {
  const hookMappings: Record<string, string> = {
    pod_issues: 'useCachedPodIssues',
    deployment_issues: 'useCachedDeploymentIssues',
    security_issues: 'useCachedSecurityIssues',
    event_stream: 'useCachedEvents',
    cluster_health: 'useClusters',
    gpu_inventory: 'useGPUNodes',
    active_alerts: 'useAlerts',
    operator_status: 'useOperators',
    helm_release_status: 'useHelmReleases',
  }

  const hookName = hookMappings[cardType]
  if (!hookName) return null

  return {
    hookName,
    isCached: hookName.startsWith('useCached'),
    type: 'hook',
    isRegistered: isHookRegistered(hookName),
  }
}

// Note: Effort estimates are hardcoded in create*Analysis functions
// Simple: 0.5h, Moderate: 2h, Complex: 4h, Custom: 8h

// Helper functions to create analyses

function createSimpleAnalysis(cardType: string): CardAnalysis {
  return {
    cardType,
    componentFile: `${pascalCase(cardType)}.tsx`,
    configFile: `config/cards/${cardType.replace(/_/g, '-')}.ts`,
    complexity: 'simple',
    visualizationType: 'list',
    patterns: detectPatterns(cardType),
    dataSource: getDataSourceInfo(cardType),
    linesOfCode: 250, // Average for simple cards
    isMigrationCandidate: true,
    estimatedEffort: 0.5,
    manualHandlingNeeded: [],
  }
}

function createChartAnalysis(cardType: string): CardAnalysis {
  return {
    cardType,
    componentFile: `${pascalCase(cardType)}.tsx`,
    configFile: `config/cards/${cardType.replace(/_/g, '-')}.ts`,
    complexity: 'moderate',
    visualizationType: 'chart',
    patterns: {
      ...detectPatterns(cardType),
      usesCardData: false,
      usesCardListItem: false,
      usesPagination: false,
    },
    dataSource: getDataSourceInfo(cardType),
    linesOfCode: 350, // Average for chart cards
    isMigrationCandidate: true,
    estimatedEffort: 2,
    manualHandlingNeeded: ['chart-configuration', 'time-range-selector'],
  }
}

function createComplexAnalysis(cardType: string): CardAnalysis {
  return {
    cardType,
    componentFile: `${pascalCase(cardType)}.tsx`,
    configFile: null,
    complexity: 'complex',
    visualizationType: getVisualizationType(cardType),
    patterns: {
      ...detectPatterns(cardType),
      usesCardData: false,
      usesCardListItem: false,
    },
    dataSource: getDataSourceInfo(cardType),
    linesOfCode: 500, // Average for complex cards
    isMigrationCandidate: true,
    estimatedEffort: 4,
    manualHandlingNeeded: ['custom-visualization', 'state-management', 'fullscreen-support'],
  }
}

function createNonCandidateAnalysis(
  cardType: string,
  reason: 'game_or_embed' | 'specialized'
): CardAnalysis {
  return {
    cardType,
    componentFile: `${pascalCase(cardType)}.tsx`,
    configFile: null,
    complexity: 'custom',
    visualizationType: getVisualizationType(cardType),
    patterns: {
      usesCardData: false,
      usesCardListItem: false,
      usesPagination: false,
      usesSearch: false,
      usesControlsRow: false,
      usesAIActions: false,
      usesLoadingState: false,
      usesDrillDown: false,
      hasClusterFilter: false,
      hasNamespaceFilter: false,
    },
    dataSource: null,
    linesOfCode: 600,
    isMigrationCandidate: false,
    nonCandidateReason: reason === 'game_or_embed'
      ? 'Game or embedded content - not suitable for unified framework'
      : 'Highly specialized visualization - requires custom component',
    estimatedEffort: 0,
    manualHandlingNeeded: [],
  }
}

function createUnknownAnalysis(cardType: string): CardAnalysis {
  return {
    cardType,
    componentFile: `${pascalCase(cardType)}.tsx`,
    configFile: null,
    complexity: 'moderate',
    visualizationType: 'custom',
    patterns: {
      usesCardData: false,
      usesCardListItem: false,
      usesPagination: false,
      usesSearch: false,
      usesControlsRow: false,
      usesAIActions: false,
      usesLoadingState: true,
      usesDrillDown: false,
      hasClusterFilter: false,
      hasNamespaceFilter: false,
    },
    dataSource: null,
    linesOfCode: 300,
    isMigrationCandidate: true,
    estimatedEffort: 2,
    manualHandlingNeeded: ['needs-analysis'],
  }
}

/**
 * Convert snake_case to PascalCase
 */
function pascalCase(str: string): string {
  return str
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('')
}
