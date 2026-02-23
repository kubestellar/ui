/**
 * Unified Card Module
 *
 * Exports the UnifiedCard component and supporting utilities.
 */

export { UnifiedCard, default as UnifiedCardDefault } from './UnifiedCard'

export {
  useDataSource,
  registerDataHook,
  getDataHook,
  getRegisteredDataHooks,
  useCardFiltering,
} from './hooks'

export type { UseDataSourceResult, UseCardFilteringResult } from './hooks'

export {
  registerRenderer,
  getRenderer,
  getRegisteredRenderers,
  renderCell,
} from './renderers'

export { ListVisualization, TableVisualization, ChartVisualization } from './visualizations'
export type { ListVisualizationProps, TableVisualizationProps, ChartVisualizationProps } from './visualizations'

// Unified Card Adapter for gradual migration
export {
  UnifiedCardAdapter,
  UNIFIED_READY_CARDS,
  UNIFIED_EXCLUDED_CARDS,
  shouldUseUnifiedCard,
  hasValidUnifiedConfig,
  getCardMigrationStatus,
  getCardsByMigrationStatus,
} from './UnifiedCardAdapter'
