/**
 * UnifiedStatsSection - Container for multiple stat blocks
 *
 * Renders a configurable grid of stat blocks with optional
 * collapsing, configuration modal, and last updated timestamp.
 */

import { useState, useMemo, useCallback } from 'react'
import { Activity, ChevronDown, ChevronRight, Settings, FlaskConical } from 'lucide-react'
import type { UnifiedStatsSectionProps, UnifiedStatBlockConfig, StatBlockValue } from '../types'
import { UnifiedStatBlock } from './UnifiedStatBlock'
import { resolveStatValue } from './valueResolvers'

/**
 * UnifiedStatsSection - Renders a section of stat blocks from config
 */
export function UnifiedStatsSection({
  config,
  data,
  getStatValue,
  hasData = true,
  isLoading = false,
  lastUpdated,
  className = '',
}: UnifiedStatsSectionProps) {
  // Collapsed state with localStorage persistence
  const storageKey = config.storageKey || `kubestellar-${config.type}-stats-collapsed`
  const [isExpanded, setIsExpanded] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      return saved !== null ? JSON.parse(saved) : !config.defaultCollapsed
    } catch {
      return !config.defaultCollapsed
    }
  })

  // Configuration modal state
  const [showConfig, setShowConfig] = useState(false)
  const [customBlocks, setCustomBlocks] = useState<UnifiedStatBlockConfig[] | null>(null)

  // Determine visible blocks
  const visibleBlocks = useMemo(() => {
    const blocks = customBlocks || config.blocks
    return blocks.filter((block) => block.visible !== false)
  }, [config.blocks, customBlocks])

  // Check if any block uses demo data
  const isDemoData = useMemo(() => {
    if (!data) return false
    return visibleBlocks.some((block) => {
      const resolved = resolveStatValue(block.valueSource, data, block.format)
      return resolved.isDemo
    })
  }, [visibleBlocks, data])

  // Toggle collapsed state
  const toggleExpanded = useCallback(() => {
    const newValue = !isExpanded
    setIsExpanded(newValue)
    try {
      localStorage.setItem(storageKey, JSON.stringify(!newValue))
    } catch {
      // Ignore storage errors
    }
  }, [isExpanded, storageKey])

  // Get value for a block
  const getBlockValue = useCallback(
    (block: UnifiedStatBlockConfig): (() => StatBlockValue) | undefined => {
      if (getStatValue) {
        return () => getStatValue(block.id)
      }
      return undefined
    },
    [getStatValue]
  )

  // Save custom block configuration
  const saveBlocks = useCallback((blocks: UnifiedStatBlockConfig[]) => {
    setCustomBlocks(blocks)
    // Persist to localStorage
    try {
      localStorage.setItem(`${storageKey}-blocks`, JSON.stringify(blocks))
    } catch {
      // Ignore storage errors
    }
  }, [storageKey])

  // Load custom blocks on mount
  useMemo(() => {
    try {
      const saved = localStorage.getItem(`${storageKey}-blocks`)
      if (saved) {
        setCustomBlocks(JSON.parse(saved))
      }
    } catch {
      // Ignore storage errors
    }
  }, [storageKey])

  // Dynamic grid columns based on visible blocks
  const gridCols = useMemo(() => {
    const count = visibleBlocks.length

    // Use custom grid config if provided
    if (config.grid?.responsive) {
      const { sm = 2, md = 4, lg = count } = config.grid.responsive
      return `grid-cols-${sm} md:grid-cols-${md} lg:grid-cols-${lg}`
    }

    // Default responsive behavior
    if (count <= 4) return 'grid-cols-2 md:grid-cols-4'
    if (count <= 5) return 'grid-cols-2 md:grid-cols-5'
    if (count <= 6) return 'grid-cols-2 md:grid-cols-3 lg:grid-cols-6'
    if (count <= 8) return 'grid-cols-2 md:grid-cols-4 lg:grid-cols-8'
    return 'grid-cols-2 md:grid-cols-5 lg:grid-cols-10'
  }, [visibleBlocks.length, config.grid])

  const collapsible = config.collapsible !== false

  return (
    <div className={`mb-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          {collapsible ? (
            <button
              onClick={toggleExpanded}
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <Activity className="w-4 h-4" />
              <span>{config.title || 'Stats Overview'}</span>
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
          ) : (
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Activity className="w-4 h-4" />
              <span>{config.title || 'Stats Overview'}</span>
            </div>
          )}

          {/* Demo indicator */}
          {isDemoData && (
            <span className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
              <FlaskConical className="w-2.5 h-2.5" />
              Demo
            </span>
          )}

          {/* Last updated */}
          {lastUpdated && (
            <span className="text-xs text-muted-foreground/60">
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </div>

        {/* Configure button */}
        {config.showConfigButton !== false && isExpanded && (
          <button
            onClick={() => setShowConfig(true)}
            className="p-1 text-muted-foreground hover:text-foreground hover:bg-secondary rounded transition-colors"
            title="Configure stats"
          >
            <Settings className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Stats grid */}
      {(!collapsible || isExpanded) && (
        <div className={`grid ${gridCols} gap-4`}>
          {visibleBlocks.map((block) => (
            <UnifiedStatBlock
              key={block.id}
              config={block}
              data={hasData ? data : undefined}
              getValue={getBlockValue(block)}
              isLoading={isLoading}
            />
          ))}
        </div>
      )}

      {/* Configuration modal placeholder */}
      {showConfig && (
        <StatsConfigModal
          isOpen={showConfig}
          onClose={() => setShowConfig(false)}
          blocks={customBlocks || config.blocks}
          onSave={saveBlocks}
          defaultBlocks={config.blocks}
          title={`Configure ${config.title || 'Stats'}`}
        />
      )}
    </div>
  )
}

/**
 * Simple configuration modal for stat blocks
 */
interface StatsConfigModalProps {
  isOpen: boolean
  onClose: () => void
  blocks: UnifiedStatBlockConfig[]
  onSave: (blocks: UnifiedStatBlockConfig[]) => void
  defaultBlocks: UnifiedStatBlockConfig[]
  title: string
}

function StatsConfigModal({
  isOpen,
  onClose,
  blocks,
  onSave,
  defaultBlocks,
  title,
}: StatsConfigModalProps) {
  const [localBlocks, setLocalBlocks] = useState(blocks)

  if (!isOpen) return null

  const toggleVisibility = (blockId: string) => {
    setLocalBlocks((prev) =>
      prev.map((block) =>
        block.id === blockId ? { ...block, visible: !block.visible } : block
      )
    )
  }

  const handleSave = () => {
    onSave(localBlocks)
    onClose()
  }

  const handleReset = () => {
    setLocalBlocks(defaultBlocks)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative glass rounded-lg p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto">
        <h2 className="text-lg font-semibold mb-4">{title}</h2>

        {/* Block list */}
        <div className="space-y-2 mb-6">
          {localBlocks.map((block) => (
            <label
              key={block.id}
              className="flex items-center gap-3 p-2 rounded hover:bg-secondary/50 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={block.visible !== false}
                onChange={() => toggleVisibility(block.id)}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm">{block.name}</span>
            </label>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <button
            onClick={handleReset}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Reset to default
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-sm rounded bg-secondary hover:bg-secondary/80"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-3 py-1.5 text-sm rounded bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default UnifiedStatsSection
