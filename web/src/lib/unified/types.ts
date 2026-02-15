/**
 * Unified Component Types
 *
 * This module provides type definitions for the unified component architecture:
 * - UnifiedCard: Single component that renders any card type from config
 * - UnifiedStatBlock: Single component that renders any stat block from config
 * - UnifiedDashboard: Single component that renders any dashboard from config
 *
 * All variations come from configuration, not code branches.
 */

// Re-export existing types that we're extending
export type {
  CardCategory,
  CardVisualization,
  CardPlacement,
  CardStatus,
} from '../cards/types'

export type {
  StatBlockColor,
  StatBlockValue,
  StatBlockConfig,
} from '../stats/types'

// ============================================================================
// UnifiedCard Types
// ============================================================================

/**
 * Complete card configuration - drives all card rendering
 */
export interface UnifiedCardConfig {
  /** Unique card type identifier */
  type: string
  /** Display title */
  title: string
  /** Card category for organization */
  category: CardCategory
  /** Description shown in info tooltip */
  description?: string

  // Appearance
  /** Icon name from lucide-react */
  icon?: string
  /** Icon color class (e.g., 'text-green-400') */
  iconColor?: string
  /** Default grid width (3-12 columns) */
  defaultWidth?: CardWidth
  /** Default grid height (in rows) */
  defaultHeight?: number

  // Data
  /** Data source configuration */
  dataSource: CardDataSource
  /** Data transformation after fetching */
  transform?: CardDataTransform

  // Layout sections
  /** Inline stats shown at top of card */
  stats?: CardStatConfig[]
  /** Filter controls */
  filters?: CardFilterConfig[]
  /** Main content area */
  content: CardContent
  /** Footer configuration */
  footer?: CardFooterConfig

  // Interaction
  /** Drill-down configuration */
  drillDown?: CardDrillDownConfig
  /** Empty state configuration */
  emptyState?: CardEmptyStateConfig
  /** Loading state configuration */
  loadingState?: CardLoadingStateConfig

  // Metadata
  /** Whether card uses demo/mock data */
  isDemoData?: boolean
  /** Whether card has live/real-time data */
  isLive?: boolean
}

export type CardWidth = 3 | 4 | 5 | 6 | 8 | 12

// ============================================================================
// Data Source Types (discriminated union)
// ============================================================================

export type CardDataSource =
  | CardDataSourceHook
  | CardDataSourceApi
  | CardDataSourceStatic
  | CardDataSourceContext

export interface CardDataSourceHook {
  type: 'hook'
  /** Hook name from the hook registry */
  hook: string
  /** Parameters to pass to the hook */
  params?: Record<string, unknown>
}

export interface CardDataSourceApi {
  type: 'api'
  /** API endpoint path */
  endpoint: string
  /** HTTP method */
  method?: 'GET' | 'POST'
  /** Query parameters */
  params?: Record<string, unknown>
  /** Polling interval in ms (0 = no polling) */
  pollInterval?: number
}

export interface CardDataSourceStatic {
  type: 'static'
  /** Static data array (optional for custom components that don't need data) */
  data?: unknown[]
}

export interface CardDataSourceContext {
  type: 'context'
  /** Key in React context to read data from */
  contextKey: string
}

export interface CardDataTransform {
  /** Transform function name from registry */
  fn: string
  /** Additional parameters */
  params?: Record<string, unknown>
}

// ============================================================================
// Content Types (discriminated union)
// ============================================================================

export type CardContent =
  | CardContentList
  | CardContentTable
  | CardContentChart
  | CardContentStatusGrid
  | CardContentStatsGrid
  | CardContentCustom

export interface CardContentList {
  type: 'list'
  /** Column definitions */
  columns: CardColumnConfig[]
  /** Item click behavior */
  itemClick?: 'drill' | 'expand' | 'select' | 'none'
  /** Max items per page (enables pagination) */
  pageSize?: number
  /** Show row numbers */
  showRowNumbers?: boolean
  /** AI actions configuration for list items */
  aiActions?: CardAIActionsConfig
  /** Enable sorting controls */
  sortable?: boolean
  /** Default sort field (column field name) */
  defaultSort?: string
  /** Default sort direction */
  defaultDirection?: 'asc' | 'desc'
  /** Sort options to show in dropdown (defaults to all sortable columns) */
  sortOptions?: Array<{ field: string; label: string }>
}

/**
 * Configuration for AI actions (Diagnose/Repair) on list items
 */
export interface CardAIActionsConfig {
  /** Field mappings to construct the resource context */
  resourceMapping: {
    /** Resource kind (e.g., 'Pod', 'Deployment') - can be field name or static value */
    kind: string
    /** Field for resource name */
    nameField: string
    /** Field for namespace (optional) */
    namespaceField?: string
    /** Field for cluster (optional) */
    clusterField?: string
    /** Field for status (optional) */
    statusField?: string
  }
  /** Field that contains issues array (optional) - each issue should have name/message */
  issuesField?: string
  /** Additional context fields to include */
  contextFields?: string[]
  /** Whether to show the repair button (default: true) */
  showRepair?: boolean
}

export interface CardContentTable {
  type: 'table'
  /** Column definitions */
  columns: CardColumnConfig[]
  /** Enable column sorting */
  sortable?: boolean
  /** Default sort field */
  defaultSort?: string
  /** Default sort direction */
  defaultDirection?: 'asc' | 'desc'
  /** Max items per page */
  pageSize?: number
}

export interface CardContentChart {
  type: 'chart'
  /** Chart type */
  chartType: 'line' | 'bar' | 'donut' | 'gauge' | 'sparkline' | 'area'
  /** Data series configuration (optional - can derive from yAxis) */
  series?: CardChartSeries[]
  /** X-axis configuration (string field name or full config) */
  xAxis?: CardAxisConfig | string
  /** Y-axis configuration (string field name, array of fields, or full config) */
  yAxis?: CardAxisConfig | string | string[]
  /** Show legend */
  showLegend?: boolean
  /** Chart height in pixels */
  height?: number
  /** Data key field (for donut/pie charts) */
  dataKey?: string
  /** Value key field (alias for dataKey) */
  valueKey?: string
  /** Label key field (for donut/pie charts) */
  labelKey?: string
  /** Color palette for chart series */
  colors?: string[]
}

export interface CardContentStatusGrid {
  type: 'status-grid'
  /** Status items to display */
  items: CardStatusItem[]
  /** Grid columns */
  columns?: number
  /** Show counts */
  showCounts?: boolean
}

export interface CardContentCustom {
  type: 'custom'
  /** Component name from registry */
  componentName?: string
  /** Component name (alias for componentName) */
  component?: string
  /** Props to pass to component */
  props?: Record<string, unknown>
}

export interface CardContentStatsGrid {
  type: 'stats-grid'
  /** Stat items to display */
  stats: CardStatsGridItem[]
  /** Grid columns */
  columns?: number
}

export interface CardStatsGridItem {
  /** Field name from data */
  field: string
  /** Label to display */
  label: string
  /** Color for the stat */
  color?: string
  /** Icon name */
  icon?: string
  /** Value format */
  format?: 'number' | 'percentage' | 'bytes' | 'currency'
}

// ============================================================================
// Column & Renderer Types
// ============================================================================

export interface CardColumnConfig {
  /** Field name from data item */
  field: string
  /** Column header text */
  header?: string
  /** Column width (px, %, or 'auto') */
  width?: number | string
  /** Text alignment */
  align?: 'left' | 'center' | 'right'
  /** Renderer name from registry, or built-in type */
  render?: CardRenderer
  /** Whether this is the primary field (bold, clickable) */
  primary?: boolean
  /** Whether column is sortable */
  sortable?: boolean
  /** Whether column is hidden by default */
  hidden?: boolean
  /** Suffix to append to value */
  suffix?: string
  /** Prefix to prepend to value */
  prefix?: string
}

export type CardRenderer =
  | 'text'
  | 'number'
  | 'percentage'
  | 'bytes'
  | 'duration'
  | 'date'
  | 'datetime'
  | 'relative-time'
  | 'status-badge'
  | 'cluster-badge'
  | 'namespace-badge'
  | 'progress-bar'
  | 'icon'
  | 'boolean'
  | 'json'
  | 'truncate'
  | 'link'
  | string // Custom renderer name

// ============================================================================
// Chart Types
// ============================================================================

export interface CardChartSeries {
  /** Field name for values */
  field: string
  /** Series label */
  label?: string
  /** Series color */
  color?: string
  /** Line/bar style */
  style?: 'solid' | 'dashed' | 'dotted'
  /** For donut: whether this is the main value */
  primary?: boolean
}

export interface CardAxisConfig {
  /** Field for axis values */
  field?: string
  /** Axis label */
  label?: string
  /** Axis type */
  type?: 'linear' | 'time' | 'category'
  /** Value format */
  format?: 'number' | 'percentage' | 'bytes' | 'currency' | 'time'
  /** Min value */
  min?: number
  /** Max value */
  max?: number
}

// ============================================================================
// Status Grid Types
// ============================================================================

export interface CardStatusItem {
  /** Item ID */
  id: string
  /** Item label */
  label: string
  /** Icon name */
  icon: string
  /** Icon color */
  color: string
  /** Background color */
  bgColor?: string
  /** Value source configuration */
  valueSource: CardValueSource
}

export type CardValueSource =
  | { type: 'field'; path: string }
  | { type: 'computed'; expression: string }
  | { type: 'count'; filter?: string }

// ============================================================================
// Filter Types
// ============================================================================

export interface CardFilterConfig {
  /** Field to filter on */
  field: string
  /** Filter type */
  type: 'text' | 'select' | 'multi-select' | 'cluster-select' | 'chips' | 'toggle'
  /** Filter label */
  label?: string
  /** Placeholder text */
  placeholder?: string
  /** For text: fields to search across */
  searchFields?: string[]
  /** For select/chips: static options */
  options?: CardFilterOption[]
  /** For select/chips: data source for options */
  optionsSource?: string
  /** Storage key for persistence */
  storageKey?: string
}

export interface CardFilterOption {
  value: string
  label: string
  icon?: string
  color?: string
}

// ============================================================================
// Inline Stats Types
// ============================================================================

export interface CardStatConfig {
  /** Stat ID */
  id: string
  /** Icon name */
  icon: string
  /** Icon color class */
  color: string
  /** Background color class */
  bgColor?: string
  /** Stat label */
  label: string
  /** Value source */
  valueSource: CardValueSource
  /** Click action */
  onClick?: CardStatAction
}

export interface CardStatAction {
  type: 'filter' | 'drill' | 'navigate'
  target: string
  params?: Record<string, string>
}

// ============================================================================
// Footer Types
// ============================================================================

export interface CardFooterConfig {
  /** Show pagination */
  pagination?: boolean
  /** Show total count */
  showTotal?: boolean
  /** Custom footer text */
  text?: string
}

// ============================================================================
// Drill-Down Types
// ============================================================================

export interface CardDrillDownConfig {
  /** Action name from useDrillDownActions */
  action: string
  /** Fields from data item to pass as params */
  params: string[]
  /** Additional context to include */
  context?: Record<string, string>
}

// ============================================================================
// Empty & Loading States
// ============================================================================

export interface CardEmptyStateConfig {
  /** Icon name */
  icon: string
  /** Main message */
  title: string
  /** Secondary message */
  message?: string
  /** Variant for styling */
  variant: 'success' | 'info' | 'warning' | 'neutral'
}

export interface CardLoadingStateConfig {
  /** Number of skeleton rows */
  rows?: number
  /** Skeleton type */
  type?: 'table' | 'list' | 'chart' | 'status' | 'stats' | 'custom'
  /** Show header skeleton */
  showHeader?: boolean
  /** Show search skeleton */
  showSearch?: boolean
  /** Number of items for stats type */
  count?: number
}

// ============================================================================
// UnifiedStatBlock Types
// ============================================================================

/**
 * Complete stat block configuration
 */
export interface UnifiedStatBlockConfig {
  /** Unique block ID */
  id: string
  /** Display name */
  name: string
  /** Icon name from lucide-react */
  icon: string
  /** Color variant */
  color: StatBlockColor
  /** Whether visible by default */
  visible?: boolean
  /** Display order */
  order?: number

  // Value resolution
  /** How to get the value */
  valueSource: StatValueSource
  /** Value format */
  format?: StatValueFormat
  /** Sublabel field */
  sublabelField?: string

  // Interaction
  /** Click action */
  onClick?: StatBlockAction
  /** Tooltip text */
  tooltip?: string
}

export type StatValueSource =
  | StatValueSourceField
  | StatValueSourceComputed
  | StatValueSourceHook
  | StatValueSourceAggregate

export interface StatValueSourceField {
  type: 'field'
  /** Dot-notation path to value (e.g., 'summary.healthyCount') */
  path: string
}

export interface StatValueSourceComputed {
  type: 'computed'
  /** Expression (e.g., 'filter:healthy|count', 'sum:pods') */
  expression: string
}

export interface StatValueSourceHook {
  type: 'hook'
  /** Hook name */
  hookName: string
  /** Field from hook result */
  field: string
}

export interface StatValueSourceAggregate {
  type: 'aggregate'
  /** Aggregation type */
  aggregation: 'sum' | 'count' | 'avg' | 'min' | 'max'
  /** Field to aggregate */
  field: string
  /** Filter before aggregating */
  filter?: string
}

export type StatValueFormat = 'number' | 'percentage' | 'bytes' | 'currency' | 'duration'

export interface StatBlockAction {
  /** Action type */
  type: 'drill' | 'filter' | 'navigate' | 'callback'
  /** Target (action name, filter field, or route) */
  target: string
  /** Parameters */
  params?: Record<string, string>
}

// ============================================================================
// UnifiedStatsSection Types
// ============================================================================

/**
 * Complete stats section configuration
 */
export interface UnifiedStatsSectionConfig {
  /** Section type identifier */
  type: string
  /** Section title */
  title?: string
  /** Stat blocks */
  blocks: UnifiedStatBlockConfig[]
  /** Default collapsed state */
  defaultCollapsed?: boolean
  /** Collapsible */
  collapsible?: boolean
  /** Storage key for collapsed state */
  storageKey?: string
  /** Show configure button */
  showConfigButton?: boolean
  /** Grid configuration */
  grid?: {
    columns?: number
    responsive?: {
      sm?: number
      md?: number
      lg?: number
    }
  }
}

// ============================================================================
// UnifiedDashboard Types
// ============================================================================

/**
 * Complete dashboard configuration
 */
export interface UnifiedDashboardConfig {
  /** Unique dashboard ID */
  id: string
  /** Display name */
  name: string
  /** Subtitle/description */
  subtitle?: string
  /** Route path */
  route?: string

  // Stats configuration
  /** Stats section type */
  statsType?: string
  /** Custom stats config */
  stats?: UnifiedStatsSectionConfig
  /** Custom value resolver function name */
  statsValueResolver?: string

  // Cards configuration
  /** Default cards for this dashboard */
  cards: DashboardCardPlacement[]
  /** Available card types for add menu */
  availableCardTypes?: string[]

  // Features
  features?: DashboardFeatures

  // Persistence
  /** Storage key for card positions */
  storageKey?: string
}

export interface DashboardCardPlacement {
  /** Unique placement ID */
  id: string
  /** Card type (references UnifiedCardConfig.type) */
  cardType: string
  /** Instance-specific config overrides */
  config?: Record<string, unknown>
  /** Title override */
  title?: string
  /** Grid position */
  position: {
    /** Width in grid columns (3-12) */
    w: number
    /** Height in grid rows */
    h: number
    /** X position (optional, for absolute positioning) */
    x?: number
    /** Y position (optional, for absolute positioning) */
    y?: number
  }
}

export interface DashboardFeatures {
  /** Enable drag-and-drop */
  dragDrop?: boolean
  /** Enable auto-refresh */
  autoRefresh?: boolean
  /** Auto-refresh interval in ms */
  autoRefreshInterval?: number
  /** Show add card button */
  addCard?: boolean
  /** Show templates button */
  templates?: boolean
  /** Show recommendations */
  recommendations?: boolean
  /** Show AI mission suggestions */
  missionSuggestions?: boolean
  /** Show floating action buttons */
  floatingActions?: boolean
  /** Enable card sections */
  cardSections?: boolean
}

// ============================================================================
// Registry Types
// ============================================================================

/**
 * Card configuration registry
 */
export type CardConfigRegistry = Record<string, UnifiedCardConfig>

/**
 * Stats configuration registry
 */
export type StatsConfigRegistry = Record<string, UnifiedStatsSectionConfig>

/**
 * Dashboard configuration registry
 */
export type DashboardConfigRegistry = Record<string, UnifiedDashboardConfig>

/**
 * Renderer function type
 */
export type RendererFunction<T = unknown> = (
  value: T,
  item: Record<string, unknown>,
  column: CardColumnConfig
) => React.ReactNode

/**
 * Renderer registry
 */
export type RendererRegistry = Record<string, RendererFunction>

/**
 * Data hook type
 */
export type DataHookFunction = (
  params?: Record<string, unknown>
) => {
  data: unknown[] | undefined
  isLoading: boolean
  error: Error | null
  refetch?: () => void
}

/**
 * Data hook registry
 */
export type DataHookRegistry = Record<string, DataHookFunction>

// ============================================================================
// Component Props Types
// ============================================================================

/**
 * Props for UnifiedCard component
 */
export interface UnifiedCardProps {
  /** Card configuration */
  config: UnifiedCardConfig
  /** Instance-specific config overrides */
  instanceConfig?: Record<string, unknown>
  /** Title override */
  title?: string
  /** Additional className */
  className?: string
  /** Override data for demo/testing purposes (bypasses data source) */
  overrideData?: unknown[]
}

/**
 * Props for UnifiedStatBlock component
 */
export interface UnifiedStatBlockProps {
  /** Stat block configuration */
  config: UnifiedStatBlockConfig
  /** Data object to resolve values from */
  data?: unknown
  /** Override value getter */
  getValue?: () => StatBlockValue
  /** Loading state */
  isLoading?: boolean
}

/**
 * Props for UnifiedStatsSection component
 */
export interface UnifiedStatsSectionProps {
  /** Stats section configuration */
  config: UnifiedStatsSectionConfig
  /** Data to resolve values from */
  data?: unknown
  /** Custom value getter by block ID */
  getStatValue?: (blockId: string) => StatBlockValue
  /** Whether data is loaded */
  hasData?: boolean
  /** Loading state */
  isLoading?: boolean
  /** Last updated timestamp */
  lastUpdated?: Date | null
  /** Additional className */
  className?: string
}

/**
 * Props for UnifiedDashboard component
 */
export interface UnifiedDashboardProps {
  /** Dashboard configuration */
  config: UnifiedDashboardConfig
  /** Stats data */
  statsData?: unknown
  /** Additional className */
  className?: string
}

// Import CardCategory for the type alias
import type { CardCategory } from '../cards/types'
import type { StatBlockColor, StatBlockValue } from '../stats/types'
