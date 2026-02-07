/**
 * useCardFiltering - Unified filtering hook for cards
 *
 * Applies filters based on card configuration and provides
 * filter control components for the UI.
 */

import { useState, useMemo, useCallback, ReactNode, createElement } from 'react'
import type { CardFilterConfig } from '../../types'

export interface UseCardFilteringResult {
  /** Filtered data */
  filteredData: unknown[] | undefined
  /** Filter control components to render */
  filterControls: ReactNode
  /** Current filter state */
  filterState: Record<string, unknown>
  /** Update a filter value */
  setFilter: (field: string, value: unknown) => void
  /** Clear all filters */
  clearFilters: () => void
}

/**
 * useCardFiltering - Apply configured filters to data
 */
export function useCardFiltering(
  data: unknown[] | undefined,
  filters?: CardFilterConfig[]
): UseCardFilteringResult {
  // Filter state - keyed by field name
  const [filterState, setFilterState] = useState<Record<string, unknown>>({})

  // Update a single filter
  const setFilter = useCallback((field: string, value: unknown) => {
    setFilterState((prev) => ({
      ...prev,
      [field]: value,
    }))
  }, [])

  // Clear all filters
  const clearFilters = useCallback(() => {
    setFilterState({})
  }, [])

  // Apply filters to data
  const filteredData = useMemo(() => {
    if (!data) return undefined
    if (!filters || filters.length === 0) return data

    let result = [...data]

    for (const filter of filters) {
      const filterValue = filterState[filter.field]

      // Skip if no value set
      if (filterValue === undefined || filterValue === null || filterValue === '') {
        continue
      }

      switch (filter.type) {
        case 'text': {
          const query = String(filterValue).toLowerCase()
          const searchFields = filter.searchFields ?? [filter.field]
          result = result.filter((item) => {
            const record = item as Record<string, unknown>
            return searchFields.some((field) => {
              const value = record[field]
              return value && String(value).toLowerCase().includes(query)
            })
          })
          break
        }

        case 'select':
        case 'cluster-select': {
          const selected = filterValue as string
          result = result.filter((item) => {
            const record = item as Record<string, unknown>
            return record[filter.field] === selected
          })
          break
        }

        case 'multi-select':
        case 'chips': {
          const selected = filterValue as string[]
          if (selected.length > 0) {
            result = result.filter((item) => {
              const record = item as Record<string, unknown>
              return selected.includes(String(record[filter.field]))
            })
          }
          break
        }

        case 'toggle': {
          const enabled = filterValue as boolean
          if (enabled) {
            result = result.filter((item) => {
              const record = item as Record<string, unknown>
              return Boolean(record[filter.field])
            })
          }
          break
        }
      }
    }

    return result
  }, [data, filters, filterState])

  // Generate filter control components
  const filterControls = useMemo(() => {
    if (!filters || filters.length === 0) return null

    return createElement(
      'div',
      { className: 'flex items-center gap-2 p-2 border-b border-gray-800' },
      filters.map((filter) =>
        createElement(FilterControl, {
          key: filter.field,
          config: filter,
          value: filterState[filter.field],
          onChange: (value: unknown) => setFilter(filter.field, value),
        })
      )
    )
  }, [filters, filterState, setFilter])

  return {
    filteredData,
    filterControls,
    filterState,
    setFilter,
    clearFilters,
  }
}

/**
 * Individual filter control component
 */
function FilterControl({
  config,
  value,
  onChange,
}: {
  config: CardFilterConfig
  value: unknown
  onChange: (value: unknown) => void
}) {
  switch (config.type) {
    case 'text':
      return createElement('input', {
        type: 'text',
        placeholder: config.placeholder ?? `Search ${config.label ?? config.field}...`,
        value: (value as string) ?? '',
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value),
        className:
          'flex-1 px-3 py-1.5 text-sm bg-gray-800 border border-gray-700 rounded focus:outline-none focus:border-blue-500 text-gray-200 placeholder-gray-500',
      })

    case 'select':
    case 'cluster-select':
      return createElement(
        'select',
        {
          value: (value as string) ?? '',
          onChange: (e: React.ChangeEvent<HTMLSelectElement>) =>
            onChange(e.target.value || undefined),
          className:
            'px-3 py-1.5 text-sm bg-gray-800 border border-gray-700 rounded focus:outline-none focus:border-blue-500 text-gray-200',
        },
        createElement('option', { value: '' }, config.placeholder ?? 'All'),
        config.options?.map((opt) =>
          createElement('option', { key: opt.value, value: opt.value }, opt.label)
        )
      )

    case 'toggle':
      return createElement(
        'label',
        { className: 'flex items-center gap-2 text-sm text-gray-400 cursor-pointer' },
        createElement('input', {
          type: 'checkbox',
          checked: (value as boolean) ?? false,
          onChange: (e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.checked),
          className: 'rounded border-gray-700 bg-gray-800',
        }),
        config.label ?? config.field
      )

    case 'chips':
    case 'multi-select':
      // Simplified chip display - full implementation in PR 2
      return createElement(
        'div',
        { className: 'flex items-center gap-1 text-xs' },
        createElement('span', { className: 'text-gray-400' }, config.label ?? config.field),
        createElement('span', { className: 'text-gray-500' }, '(multi-select)')
      )

    default:
      return null
  }
}

export default useCardFiltering
