/**
 * ListVisualization - Renders data as a scrollable list
 *
 * Used for card content type 'list'. Displays data items in rows
 * with configurable columns and cell renderers.
 */

import { useMemo, useState, useCallback } from 'react'
import { ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import type { CardContentList, CardColumnConfig, CardDrillDownConfig, CardAIActionsConfig } from '../../types'
import { renderCell } from '../renderers'
import { CardAIActions } from '../../../cards/CardComponents'

type SortDirection = 'asc' | 'desc'

export interface ListVisualizationProps {
  /** Content configuration */
  content: CardContentList
  /** Data to display */
  data: unknown[]
  /** Drill-down configuration */
  drillDown?: CardDrillDownConfig
  /** Drill-down handler */
  onDrillDown?: (item: Record<string, unknown>) => void
}

/**
 * ListVisualization - Renders data as a list
 */
export function ListVisualization({
  content,
  data,
  drillDown,
  onDrillDown,
}: ListVisualizationProps) {
  const {
    columns,
    pageSize = 10,
    itemClick = 'none',
    showRowNumbers = false,
    aiActions,
    sortable = false,
    defaultSort,
    defaultDirection = 'asc',
    sortOptions,
  } = content

  // Pagination state
  const [currentPage, setCurrentPage] = useState(0)

  // Sorting state
  const [sortBy, setSortBy] = useState<string | undefined>(defaultSort)
  const [sortDirection, setSortDirection] = useState<SortDirection>(defaultDirection)

  // Build sort options from config or columns
  const availableSortOptions = useMemo(() => {
    if (sortOptions) return sortOptions
    // Default: use all columns with headers as sortable options
    return columns
      .filter((col) => !col.hidden && col.header)
      .map((col) => ({
        field: col.field,
        label: col.header || col.field,
      }))
  }, [sortOptions, columns])

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortable || !sortBy) return data

    return [...data].sort((a, b) => {
      const aRecord = a as Record<string, unknown>
      const bRecord = b as Record<string, unknown>
      const aVal = aRecord[sortBy]
      const bVal = bRecord[sortBy]

      // Handle null/undefined
      if (aVal == null && bVal == null) return 0
      if (aVal == null) return sortDirection === 'asc' ? 1 : -1
      if (bVal == null) return sortDirection === 'asc' ? -1 : 1

      // Handle numbers
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal
      }

      // Handle strings
      const aStr = String(aVal).toLowerCase()
      const bStr = String(bVal).toLowerCase()
      const comparison = aStr.localeCompare(bStr)
      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [data, sortable, sortBy, sortDirection])

  // Calculate pagination (on sorted data)
  const totalPages = Math.ceil(sortedData.length / pageSize)
  const paginatedData = useMemo(() => {
    if (!pageSize || pageSize <= 0) return sortedData
    const start = currentPage * pageSize
    return sortedData.slice(start, start + pageSize)
  }, [sortedData, currentPage, pageSize])

  // Handle item click
  const handleItemClick = useCallback(
    (item: Record<string, unknown>) => {
      if (itemClick === 'none') return
      if (itemClick === 'drill' && onDrillDown) {
        onDrillDown(item)
      }
      // 'expand' and 'select' can be implemented later
    },
    [itemClick, onDrillDown]
  )

  // Get visible columns (filter out hidden)
  const visibleColumns = useMemo(
    () => columns.filter((col) => !col.hidden),
    [columns]
  )

  // Find primary column for styling
  const primaryColumn = useMemo(
    () => columns.find((col) => col.primary),
    [columns]
  )

  const isClickable = itemClick !== 'none' && !!(drillDown || onDrillDown)

  // Toggle sort direction
  const toggleSortDirection = useCallback(() => {
    setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
  }, [])

  return (
    <div className="flex flex-col h-full">
      {/* Sort controls */}
      {sortable && availableSortOptions.length > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-800">
          <ArrowUpDown className="w-3.5 h-3.5 text-gray-500" />
          <select
            value={sortBy || ''}
            onChange={(e) => {
              setSortBy(e.target.value || undefined)
              setCurrentPage(0) // Reset to first page on sort change
            }}
            className="px-2 py-1 text-xs bg-gray-800 border border-gray-700 rounded text-gray-200 focus:outline-none focus:border-blue-500"
          >
            <option value="">Sort by...</option>
            {availableSortOptions.map((opt) => (
              <option key={opt.field} value={opt.field}>
                {opt.label}
              </option>
            ))}
          </select>
          {sortBy && (
            <button
              onClick={toggleSortDirection}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-800 border border-gray-700 rounded text-gray-200 hover:bg-gray-700 transition-colors"
              title={sortDirection === 'asc' ? 'Ascending (click to reverse)' : 'Descending (click to reverse)'}
            >
              {sortDirection === 'asc' ? (
                <>
                  <ArrowUp className="w-3 h-3" />
                  <span>Asc</span>
                </>
              ) : (
                <>
                  <ArrowDown className="w-3 h-3" />
                  <span>Desc</span>
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* List content */}
      <div className="flex-1 overflow-y-auto">
        {paginatedData.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500 text-sm">
            No items to display
          </div>
        ) : (
          <div className="divide-y divide-gray-800">
            {paginatedData.map((item, index) => (
              <ListItem
                key={index}
                item={item as Record<string, unknown>}
                columns={visibleColumns}
                primaryColumn={primaryColumn}
                rowNumber={showRowNumbers ? currentPage * pageSize + index + 1 : undefined}
                isClickable={isClickable}
                onClick={() => handleItemClick(item as Record<string, unknown>)}
                aiActions={aiActions}
              />
            ))}
          </div>
        )}
      </div>

      {/* Pagination footer */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-3 py-2 border-t border-gray-800 text-xs text-gray-400">
          <span>
            {currentPage * pageSize + 1}–{Math.min((currentPage + 1) * pageSize, data.length)} of {data.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
              disabled={currentPage === 0}
              className="p-1 rounded hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2">
              {currentPage + 1} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={currentPage >= totalPages - 1}
              className="p-1 rounded hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Individual list item row
 */
function ListItem({
  item,
  columns,
  primaryColumn,
  rowNumber,
  isClickable,
  onClick,
  aiActions,
}: {
  item: Record<string, unknown>
  columns: CardColumnConfig[]
  primaryColumn?: CardColumnConfig
  rowNumber?: number
  isClickable: boolean
  onClick: () => void
  aiActions?: CardAIActionsConfig
}) {
  // Build AI resource context from item using the mapping config
  const aiResource = useMemo(() => {
    if (!aiActions) return null

    const { resourceMapping, issuesField, contextFields, showRepair } = aiActions
    const { kind, nameField, namespaceField, clusterField, statusField } = resourceMapping

    // Kind can be a static value or a field reference (starts with $)
    const resolvedKind = kind.startsWith('$')
      ? String(item[kind.slice(1)] ?? '')
      : kind

    const resource = {
      kind: resolvedKind,
      name: String(item[nameField] ?? ''),
      namespace: namespaceField ? String(item[namespaceField] ?? '') : undefined,
      cluster: clusterField ? String(item[clusterField] ?? '') : undefined,
      status: statusField ? String(item[statusField] ?? '') : undefined,
    }

    // Extract issues if configured
    let issues: Array<{ name: string; message: string }> = []
    if (issuesField) {
      const rawIssues = item[issuesField]
      if (Array.isArray(rawIssues)) {
        issues = rawIssues.map((issue) => {
          if (typeof issue === 'string') {
            return { name: resource.status || 'Issue', message: issue }
          }
          if (typeof issue === 'object' && issue !== null) {
            return {
              name: String((issue as Record<string, unknown>).name ?? 'Issue'),
              message: String((issue as Record<string, unknown>).message ?? ''),
            }
          }
          return { name: 'Issue', message: String(issue) }
        })
      }
    }

    // Extract additional context fields
    const additionalContext: Record<string, unknown> = {}
    if (contextFields) {
      for (const field of contextFields) {
        additionalContext[field] = item[field]
      }
    }

    return { resource, issues, additionalContext, showRepair: showRepair !== false }
  }, [item, aiActions])

  return (
    <div
      className={`flex items-center gap-3 px-3 py-2 group ${
        isClickable
          ? 'cursor-pointer hover:bg-gray-800/50 transition-colors'
          : ''
      }`}
      onClick={isClickable ? onClick : undefined}
    >
      {/* Row number */}
      {rowNumber !== undefined && (
        <span className="text-xs text-gray-600 w-6 text-right shrink-0">
          {rowNumber}
        </span>
      )}

      {/* Columns */}
      {columns.map((column, colIndex) => {
        const value = item[column.field]
        const isPrimary = column === primaryColumn

        return (
          <div
            key={column.field}
            className={`
              ${column.width ? '' : 'flex-1'}
              ${column.align === 'center' ? 'text-center' : ''}
              ${column.align === 'right' ? 'text-right' : ''}
              ${isPrimary ? 'font-medium text-gray-200' : 'text-gray-400'}
              ${colIndex === 0 && !rowNumber ? 'flex-1' : ''}
              truncate
            `}
            style={
              column.width
                ? {
                    width: typeof column.width === 'number' ? `${column.width}px` : column.width,
                    flexShrink: 0,
                  }
                : undefined
            }
          >
            {renderCell(value, item, column)}
          </div>
        )
      })}

      {/* AI Actions (Diagnose/Repair) */}
      {aiResource && (
        <CardAIActions
          resource={aiResource.resource}
          issues={aiResource.issues}
          additionalContext={aiResource.additionalContext}
          showRepair={aiResource.showRepair}
          className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
        />
      )}
    </div>
  )
}

export default ListVisualization
