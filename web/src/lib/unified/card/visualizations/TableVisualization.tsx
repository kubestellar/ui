/**
 * TableVisualization - Renders data as a table with headers
 *
 * Used for card content type 'table'. Displays data in a traditional
 * table layout with sortable columns and pagination.
 */

import { useMemo, useState, useCallback } from 'react'
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from 'lucide-react'
import type { CardContentTable, CardDrillDownConfig } from '../../types'
import { renderCell } from '../renderers'

export interface TableVisualizationProps {
  /** Content configuration */
  content: CardContentTable
  /** Data to display */
  data: unknown[]
  /** Drill-down configuration */
  drillDown?: CardDrillDownConfig
  /** Drill-down handler */
  onDrillDown?: (item: Record<string, unknown>) => void
}

type SortDirection = 'asc' | 'desc'

/**
 * TableVisualization - Renders data as a table
 */
export function TableVisualization({
  content,
  data,
  drillDown,
  onDrillDown,
}: TableVisualizationProps) {
  const {
    columns,
    sortable = true,
    defaultSort,
    defaultDirection = 'asc',
    pageSize = 10,
  } = content

  // Sort state
  const [sortField, setSortField] = useState<string | undefined>(defaultSort)
  const [sortDirection, setSortDirection] = useState<SortDirection>(defaultDirection)

  // Pagination state
  const [currentPage, setCurrentPage] = useState(0)

  // Get visible columns
  const visibleColumns = useMemo(
    () => columns.filter((col) => !col.hidden),
    [columns]
  )

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortField) return data

    return [...data].sort((a, b) => {
      const aVal = (a as Record<string, unknown>)[sortField]
      const bVal = (b as Record<string, unknown>)[sortField]

      // Handle nullish values
      if (aVal === null || aVal === undefined) return sortDirection === 'asc' ? 1 : -1
      if (bVal === null || bVal === undefined) return sortDirection === 'asc' ? -1 : 1

      // Compare values
      let comparison = 0
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        comparison = aVal - bVal
      } else if (typeof aVal === 'string' && typeof bVal === 'string') {
        comparison = aVal.localeCompare(bVal)
      } else {
        comparison = String(aVal).localeCompare(String(bVal))
      }

      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [data, sortField, sortDirection])

  // Paginate data
  const totalPages = Math.ceil(sortedData.length / pageSize)
  const paginatedData = useMemo(() => {
    if (!pageSize || pageSize <= 0) return sortedData
    const start = currentPage * pageSize
    return sortedData.slice(start, start + pageSize)
  }, [sortedData, currentPage, pageSize])

  // Handle sort click
  const handleSort = useCallback(
    (field: string) => {
      if (!sortable) return
      if (sortField === field) {
        // Toggle direction
        setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))
      } else {
        // New field, default to ascending
        setSortField(field)
        setSortDirection('asc')
      }
      // Reset to first page on sort change
      setCurrentPage(0)
    },
    [sortable, sortField]
  )

  // Handle row click
  const handleRowClick = useCallback(
    (item: Record<string, unknown>) => {
      if (onDrillDown) {
        onDrillDown(item)
      }
    },
    [onDrillDown]
  )

  const isClickable = !!(drillDown || onDrillDown)

  return (
    <div className="flex flex-col h-full">
      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          {/* Header */}
          <thead className="sticky top-0 bg-gray-900/95 backdrop-blur-sm">
            <tr className="border-b border-gray-800">
              {visibleColumns.map((column) => (
                <th
                  key={column.field}
                  className={`
                    px-3 py-2 text-xs font-medium text-gray-400 uppercase tracking-wider
                    ${column.align === 'center' ? 'text-center' : ''}
                    ${column.align === 'right' ? 'text-right' : 'text-left'}
                    ${sortable && column.sortable !== false ? 'cursor-pointer hover:text-gray-200 select-none' : ''}
                  `}
                  style={
                    column.width
                      ? {
                          width: typeof column.width === 'number' ? `${column.width}px` : column.width,
                        }
                      : undefined
                  }
                  onClick={
                    sortable && column.sortable !== false
                      ? () => handleSort(column.field)
                      : undefined
                  }
                >
                  <div className="flex items-center gap-1">
                    <span>{column.header ?? column.field}</span>
                    {sortable && column.sortable !== false && sortField === column.field && (
                      sortDirection === 'asc' ? (
                        <ChevronUp className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      )
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          {/* Body */}
          <tbody className="divide-y divide-gray-800">
            {paginatedData.length === 0 ? (
              <tr>
                <td
                  colSpan={visibleColumns.length}
                  className="px-3 py-8 text-center text-gray-500"
                >
                  No data to display
                </td>
              </tr>
            ) : (
              paginatedData.map((item, rowIndex) => (
                <tr
                  key={rowIndex}
                  className={`
                    ${isClickable ? 'cursor-pointer hover:bg-gray-800/50' : ''}
                    transition-colors
                  `}
                  onClick={
                    isClickable
                      ? () => handleRowClick(item as Record<string, unknown>)
                      : undefined
                  }
                >
                  {visibleColumns.map((column) => {
                    const value = (item as Record<string, unknown>)[column.field]
                    return (
                      <td
                        key={column.field}
                        className={`
                          px-3 py-2
                          ${column.align === 'center' ? 'text-center' : ''}
                          ${column.align === 'right' ? 'text-right' : ''}
                          ${column.primary ? 'font-medium text-gray-200' : 'text-gray-400'}
                        `}
                      >
                        {renderCell(value, item as Record<string, unknown>, column)}
                      </td>
                    )
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination footer */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-3 py-2 border-t border-gray-800 text-xs text-gray-400">
          <span>
            {currentPage * pageSize + 1}–{Math.min((currentPage + 1) * pageSize, sortedData.length)} of {sortedData.length}
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

export default TableVisualization
