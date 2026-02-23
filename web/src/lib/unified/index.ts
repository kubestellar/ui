/**
 * Unified Component Architecture
 *
 * This module provides the unified component system:
 * - UnifiedCard: Single component that renders any card type from config
 * - UnifiedStatBlock: Single component that renders any stat block from config (PR 5)
 * - UnifiedDashboard: Single component that renders any dashboard from config (PR 6)
 *
 * All variations come from configuration, not code branches.
 *
 * @example
 * ```tsx
 * import { UnifiedCard, registerDataHook } from '@/lib/unified'
 *
 * // Register data hooks at app startup
 * registerDataHook('useCachedPodIssues', useCachedPodIssues)
 *
 * // Use in component
 * <UnifiedCard config={podIssuesConfig} />
 * ```
 */

// Types
export type {
  // Card types
  UnifiedCardConfig,
  UnifiedCardProps,
  CardDataSource,
  CardDataSourceHook,
  CardDataSourceApi,
  CardDataSourceStatic,
  CardDataSourceContext,
  CardDataTransform,
  CardContent,
  CardContentList,
  CardContentTable,
  CardContentChart,
  CardContentStatusGrid,
  CardContentCustom,
  CardColumnConfig,
  CardRenderer,
  CardChartSeries,
  CardAxisConfig,
  CardStatusItem,
  CardValueSource,
  CardFilterConfig,
  CardFilterOption,
  CardStatConfig,
  CardStatAction,
  CardFooterConfig,
  CardDrillDownConfig,
  CardEmptyStateConfig,
  CardLoadingStateConfig,
  CardWidth,

  // Stat block types
  UnifiedStatBlockConfig,
  UnifiedStatBlockProps,
  StatValueSource,
  StatValueSourceField,
  StatValueSourceComputed,
  StatValueSourceHook,
  StatValueSourceAggregate,
  StatValueFormat,
  StatBlockAction,

  // Stats section types
  UnifiedStatsSectionConfig,
  UnifiedStatsSectionProps,

  // Dashboard types
  UnifiedDashboardConfig,
  UnifiedDashboardProps,
  DashboardCardPlacement,
  DashboardFeatures,

  // Registry types
  CardConfigRegistry,
  StatsConfigRegistry,
  DashboardConfigRegistry,
  RendererFunction,
  RendererRegistry,
  DataHookFunction,
  DataHookRegistry,
} from './types'

// Re-export from existing modules
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

// Components
export {
  UnifiedCard,
  useDataSource,
  registerDataHook,
  getDataHook,
  getRegisteredDataHooks,
  useCardFiltering,
  registerRenderer,
  getRenderer,
  getRegisteredRenderers,
  renderCell,
  ListVisualization,
  TableVisualization,
  ChartVisualization,
} from './card'

export type {
  ListVisualizationProps,
  TableVisualizationProps,
  ChartVisualizationProps,
} from './card'

// Stats components (PR 5)
export {
  UnifiedStatBlock,
  UnifiedStatsSection,
  resolveStatValue,
  resolveFieldPath,
  resolveComputedExpression,
  resolveAggregate,
  formatValue,
  formatNumber,
  formatBytes,
  formatCurrency,
  formatDuration,
} from './stats'

export type { ResolvedStatValue } from './stats'

// Dashboard components (PR 6)
export {
  UnifiedDashboard,
  DashboardGrid,
} from './dashboard'

export type { DashboardGridProps } from './dashboard'

// Hook registration
export { registerUnifiedHooks } from './registerHooks'
