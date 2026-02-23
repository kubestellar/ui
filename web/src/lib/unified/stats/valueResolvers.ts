/**
 * Value Resolvers for UnifiedStatBlock
 *
 * Resolves stat values from various sources (field path, computed expression,
 * hook result, or aggregation).
 */

import type {
  StatValueSource,
  StatValueFormat,
} from '../types'

/**
 * Resolved stat value with metadata
 */
export interface ResolvedStatValue {
  value: string | number
  sublabel?: string
  isDemo?: boolean
}

/**
 * Resolve a stat value from data using the configured source
 */
export function resolveStatValue(
  source: StatValueSource,
  data: unknown,
  format?: StatValueFormat
): ResolvedStatValue {
  let rawValue: unknown

  switch (source.type) {
    case 'field':
      rawValue = resolveFieldPath(data, source.path)
      break

    case 'computed':
      rawValue = resolveComputedExpression(data, source.expression)
      break

    case 'hook':
      // Hook values should be provided via separate mechanism
      // This is a placeholder - hooks are resolved by the component
      rawValue = undefined
      break

    case 'aggregate':
      rawValue = resolveAggregate(data, source.aggregation, source.field, source.filter)
      break

    default:
      rawValue = undefined
  }

  // Format the value
  const formattedValue = formatValue(rawValue, format)

  return {
    value: formattedValue,
    isDemo: false,
  }
}

/**
 * Resolve a dot-notation field path from data
 * Example: 'summary.healthyCount' -> data.summary.healthyCount
 */
export function resolveFieldPath(data: unknown, path: string): unknown {
  if (data === null || data === undefined) return undefined
  if (!path) return data

  const parts = path.split('.')
  let current: unknown = data

  for (const part of parts) {
    if (current === null || current === undefined) return undefined

    // Handle array access like 'items[0]'
    const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/)
    if (arrayMatch) {
      const [, key, index] = arrayMatch
      current = (current as Record<string, unknown>)[key]
      if (Array.isArray(current)) {
        current = current[parseInt(index, 10)]
      } else {
        return undefined
      }
    } else {
      current = (current as Record<string, unknown>)[part]
    }
  }

  return current
}

/**
 * Resolve a computed expression
 *
 * Supported expressions:
 * - 'count' - Count array items
 * - 'sum:field' - Sum a field across array items
 * - 'avg:field' - Average a field
 * - 'min:field' - Minimum value
 * - 'max:field' - Maximum value
 * - 'filter:condition|count' - Filter then count
 * - 'filter:condition|sum:field' - Filter then sum
 * - 'latest:field' - Get last item's field value
 * - 'first:field' - Get first item's field value
 */
export function resolveComputedExpression(data: unknown, expression: string): unknown {
  if (!Array.isArray(data)) {
    // If data is an object, try to extract an array field
    if (typeof data === 'object' && data !== null) {
      // Look for common array field names
      const obj = data as Record<string, unknown>
      const arrayField = obj.items || obj.data || obj.results || obj.list
      if (Array.isArray(arrayField)) {
        data = arrayField
      } else {
        return undefined
      }
    } else {
      return undefined
    }
  }

  const items = data as Record<string, unknown>[]

  // Parse expression
  const parts = expression.split('|')
  let currentItems = items

  for (const part of parts) {
    const [op, arg] = part.split(':')

    switch (op) {
      case 'count':
        return currentItems.length

      case 'sum':
        return currentItems.reduce((acc, item) => {
          const val = resolveFieldPath(item, arg)
          return acc + (typeof val === 'number' ? val : 0)
        }, 0)

      case 'avg': {
        if (currentItems.length === 0) return 0
        const sum = currentItems.reduce((acc, item) => {
          const val = resolveFieldPath(item, arg)
          return acc + (typeof val === 'number' ? val : 0)
        }, 0)
        return sum / currentItems.length
      }

      case 'min': {
        if (currentItems.length === 0) return 0
        return Math.min(
          ...currentItems.map((item) => {
            const val = resolveFieldPath(item, arg)
            return typeof val === 'number' ? val : Infinity
          })
        )
      }

      case 'max': {
        if (currentItems.length === 0) return 0
        return Math.max(
          ...currentItems.map((item) => {
            const val = resolveFieldPath(item, arg)
            return typeof val === 'number' ? val : -Infinity
          })
        )
      }

      case 'latest': {
        if (currentItems.length === 0) return undefined
        return resolveFieldPath(currentItems[currentItems.length - 1], arg)
      }

      case 'first': {
        if (currentItems.length === 0) return undefined
        return resolveFieldPath(currentItems[0], arg)
      }

      case 'filter': {
        // Filter format: 'filter:field=value' or 'filter:field!=value'
        // or 'filter:field' (truthy check)
        if (arg.includes('=')) {
          const [field, expectedValue] = arg.includes('!=')
            ? arg.split('!=').map((s) => s.trim())
            : arg.split('=').map((s) => s.trim())
          const isNegation = arg.includes('!=')

          currentItems = currentItems.filter((item) => {
            const val = resolveFieldPath(item, field)
            const matches = String(val) === expectedValue
            return isNegation ? !matches : matches
          })
        } else {
          // Truthy check
          currentItems = currentItems.filter((item) => {
            const val = resolveFieldPath(item, arg)
            return Boolean(val)
          })
        }
        break
      }

      default:
        // Unknown operation
        break
    }
  }

  // If we get here without returning, return the count of remaining items
  return currentItems.length
}

/**
 * Resolve an aggregate operation
 */
export function resolveAggregate(
  data: unknown,
  aggregation: 'sum' | 'count' | 'avg' | 'min' | 'max',
  field: string,
  filter?: string
): number {
  if (!Array.isArray(data)) return 0

  let items = data as Record<string, unknown>[]

  // Apply filter if specified
  if (filter) {
    const [filterField, filterValue] = filter.split('=')
    items = items.filter((item) => {
      const val = resolveFieldPath(item, filterField.trim())
      return String(val) === filterValue?.trim()
    })
  }

  switch (aggregation) {
    case 'count':
      return items.length

    case 'sum':
      return items.reduce((acc, item) => {
        const val = resolveFieldPath(item, field)
        return acc + (typeof val === 'number' ? val : 0)
      }, 0)

    case 'avg': {
      if (items.length === 0) return 0
      const sum = items.reduce((acc, item) => {
        const val = resolveFieldPath(item, field)
        return acc + (typeof val === 'number' ? val : 0)
      }, 0)
      return sum / items.length
    }

    case 'min': {
      if (items.length === 0) return 0
      return Math.min(
        ...items.map((item) => {
          const val = resolveFieldPath(item, field)
          return typeof val === 'number' ? val : Infinity
        })
      )
    }

    case 'max': {
      if (items.length === 0) return 0
      return Math.max(
        ...items.map((item) => {
          const val = resolveFieldPath(item, field)
          return typeof val === 'number' ? val : -Infinity
        })
      )
    }

    default:
      return 0
  }
}

/**
 * Format a value according to the specified format
 */
export function formatValue(value: unknown, format?: StatValueFormat): string | number {
  if (value === null || value === undefined) return '-'

  const numValue = typeof value === 'number' ? value : parseFloat(String(value))

  if (isNaN(numValue)) {
    // Return as string if not a number
    return String(value)
  }

  switch (format) {
    case 'number':
      return formatNumber(numValue)

    case 'percentage':
      return `${Math.round(numValue)}%`

    case 'bytes':
      return formatBytes(numValue)

    case 'currency':
      return formatCurrency(numValue)

    case 'duration':
      return formatDuration(numValue)

    default:
      // Default: format large numbers nicely
      if (Number.isInteger(numValue)) {
        return formatNumber(numValue)
      }
      return numValue
  }
}

/**
 * Format a number with K/M/B suffixes
 */
export function formatNumber(value: number): string | number {
  if (Math.abs(value) >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(1)}B`
  }
  if (Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`
  }
  if (Math.abs(value) >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`
  }
  return value
}

/**
 * Format bytes to human-readable
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'

  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']
  const exp = Math.floor(Math.log(bytes) / Math.log(1024))
  const size = bytes / Math.pow(1024, exp)

  return `${size.toFixed(1)} ${units[exp]}`
}

/**
 * Format currency
 */
export function formatCurrency(value: number): string {
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`
  }
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(1)}K`
  }
  return `$${value.toFixed(2)}`
}

/**
 * Format duration in seconds to human-readable
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)}s`
  }
  if (seconds < 3600) {
    return `${Math.round(seconds / 60)}m`
  }
  if (seconds < 86400) {
    return `${(seconds / 3600).toFixed(1)}h`
  }
  return `${(seconds / 86400).toFixed(1)}d`
}
