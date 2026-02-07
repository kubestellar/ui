/**
 * Migration Types
 *
 * Type definitions for card migration analysis and validation.
 */

/** Card complexity level for migration effort estimation */
export type CardComplexity = 'simple' | 'moderate' | 'complex' | 'custom'

/** Card visualization type detected from component */
export type VisualizationType =
  | 'list'
  | 'table'
  | 'chart'
  | 'status-grid'
  | 'gauge'
  | 'map'
  | 'topology'
  | 'game'
  | 'embed'
  | 'custom'

/** Card pattern detected from component structure */
export interface CardPattern {
  /** Uses useCardData hook for filtering/sorting/pagination */
  usesCardData: boolean
  /** Uses CardListItem for row rendering */
  usesCardListItem: boolean
  /** Uses CardPaginationFooter */
  usesPagination: boolean
  /** Uses CardSearchInput */
  usesSearch: boolean
  /** Uses CardControlsRow */
  usesControlsRow: boolean
  /** Uses CardAIActions */
  usesAIActions: boolean
  /** Uses useCardLoadingState */
  usesLoadingState: boolean
  /** Uses useDrillDown */
  usesDrillDown: boolean
  /** Has cluster filter support */
  hasClusterFilter: boolean
  /** Has namespace filter support */
  hasNamespaceFilter: boolean
}

/** Data source information extracted from component */
export interface DataSourceInfo {
  /** Hook name used for data fetching (e.g., 'useCachedPodIssues') */
  hookName: string
  /** Whether it's a cached hook */
  isCached: boolean
  /** Source type */
  type: 'hook' | 'prop' | 'context' | 'static'
  /** Whether hook is already registered in unified system */
  isRegistered: boolean
}

/** Card analysis result */
export interface CardAnalysis {
  /** Card type identifier (e.g., 'pod_issues') */
  cardType: string
  /** Component file name */
  componentFile: string
  /** Config file name (if exists) */
  configFile: string | null
  /** Detected complexity level */
  complexity: CardComplexity
  /** Detected visualization type */
  visualizationType: VisualizationType
  /** Pattern detection results */
  patterns: CardPattern
  /** Data source information */
  dataSource: DataSourceInfo | null
  /** Lines of code */
  linesOfCode: number
  /** Whether card is a good migration candidate */
  isMigrationCandidate: boolean
  /** Reason if not a candidate */
  nonCandidateReason?: string
  /** Estimated migration effort (hours) */
  estimatedEffort: number
  /** Features that need manual handling */
  manualHandlingNeeded: string[]
}

/** Migration validation result */
export interface MigrationValidation {
  /** Whether migration is valid */
  isValid: boolean
  /** Data parity check passed */
  dataParityPassed: boolean
  /** UI parity check passed */
  uiParityPassed: boolean
  /** Feature parity check passed */
  featureParityPassed: boolean
  /** List of issues found */
  issues: ValidationIssue[]
  /** List of warnings */
  warnings: string[]
}

/** Individual validation issue */
export interface ValidationIssue {
  /** Issue severity */
  severity: 'error' | 'warning' | 'info'
  /** Issue category */
  category: 'data' | 'ui' | 'feature' | 'behavior'
  /** Issue message */
  message: string
  /** Legacy value (if applicable) */
  legacyValue?: unknown
  /** Unified value (if applicable) */
  unifiedValue?: unknown
}

/** Migration batch definition */
export interface MigrationBatch {
  /** Batch identifier */
  id: string
  /** Batch name */
  name: string
  /** Cards in this batch */
  cards: string[]
  /** Estimated total effort */
  estimatedEffort: number
  /** Batch priority (lower = higher priority) */
  priority: number
}

/** Migration report summary */
export interface MigrationReport {
  /** Total cards analyzed */
  totalCards: number
  /** Cards by complexity */
  byComplexity: Record<CardComplexity, number>
  /** Cards by visualization type */
  byVisualization: Record<VisualizationType, number>
  /** Migration candidates count */
  migrationCandidates: number
  /** Non-candidates count */
  nonCandidates: number
  /** Total estimated effort (hours) */
  totalEstimatedEffort: number
  /** Suggested migration batches */
  batches: MigrationBatch[]
  /** Individual card analyses */
  cards: CardAnalysis[]
  /** Generated timestamp */
  generatedAt: Date
}

/** Card category for grouping */
export type CardCategory =
  | 'health'
  | 'events'
  | 'resources'
  | 'ai-ml'
  | 'charts'
  | 'security'
  | 'gitops'
  | 'games'
  | 'utilities'
  | 'specialized'
