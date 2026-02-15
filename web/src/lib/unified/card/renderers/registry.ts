/**
 * Renderer Registry - Centralized cell rendering for unified cards
 *
 * Provides built-in renderers for common data types and allows
 * registering custom renderers for specialized display.
 */

import { ReactNode, createElement } from 'react'
import type { CardColumnConfig, RendererFunction } from '../../types'
import { getStatusColors } from '../../../cards/statusColors'
import {
  formatStatNumber,
  formatBytes,
  formatPercent,
  formatDuration,
} from '../../../stats/types'

// ============================================================================
// Renderer Registry
// ============================================================================

const rendererRegistry: Record<string, RendererFunction> = {}

/**
 * Register a custom renderer
 *
 * @example
 * registerRenderer('custom-badge', (value, item) => (
 *   <CustomBadge value={value} item={item} />
 * ))
 */
export function registerRenderer(name: string, renderer: RendererFunction): void {
  rendererRegistry[name] = renderer
}

/**
 * Get a renderer by name
 */
export function getRenderer(name: string): RendererFunction | undefined {
  // Check custom registry first
  if (rendererRegistry[name]) {
    return rendererRegistry[name]
  }
  // Fall back to built-in renderers
  return BUILT_IN_RENDERERS[name]
}

/**
 * List all registered renderers
 */
export function getRegisteredRenderers(): string[] {
  return [...Object.keys(BUILT_IN_RENDERERS), ...Object.keys(rendererRegistry)]
}

/**
 * Render a cell value using the appropriate renderer
 */
export function renderCell(
  value: unknown,
  item: Record<string, unknown>,
  column: CardColumnConfig
): ReactNode {
  // Get renderer name from column config, default to 'text'
  const rendererName = column.render ?? 'text'

  // Get the renderer function
  const renderer = getRenderer(rendererName)
  if (!renderer) {
    // Fallback to text if renderer not found
    console.warn(`Renderer not found: ${rendererName}, falling back to text`)
    return renderText(value, item, column)
  }

  return renderer(value, item, column)
}

// ============================================================================
// Built-in Renderers
// ============================================================================

/**
 * Text renderer - displays value as-is with optional prefix/suffix
 */
function renderText(
  value: unknown,
  _item: Record<string, unknown>,
  column: CardColumnConfig
): ReactNode {
  if (value === null || value === undefined) {
    return createElement('span', { className: 'text-gray-500' }, '—')
  }

  const text = String(value)
  const prefix = column.prefix ?? ''
  const suffix = column.suffix ?? ''

  return `${prefix}${text}${suffix}`
}

/**
 * Number renderer - formats with K/M suffix
 */
function renderNumber(
  value: unknown,
  _item: Record<string, unknown>,
  column: CardColumnConfig
): ReactNode {
  if (value === null || value === undefined) {
    return createElement('span', { className: 'text-gray-500' }, '—')
  }

  const num = typeof value === 'number' ? value : parseFloat(String(value))
  if (isNaN(num)) {
    return createElement('span', { className: 'text-gray-500' }, '—')
  }

  const prefix = column.prefix ?? ''
  const suffix = column.suffix ?? ''

  return createElement(
    'span',
    { className: 'font-mono tabular-nums' },
    `${prefix}${formatStatNumber(num)}${suffix}`
  )
}

/**
 * Percentage renderer - formats as X%
 */
function renderPercentage(
  value: unknown,
  _item: Record<string, unknown>,
  column: CardColumnConfig
): ReactNode {
  if (value === null || value === undefined) {
    return createElement('span', { className: 'text-gray-500' }, '—')
  }

  const num = typeof value === 'number' ? value : parseFloat(String(value))
  if (isNaN(num)) {
    return createElement('span', { className: 'text-gray-500' }, '—')
  }

  const prefix = column.prefix ?? ''
  const suffix = column.suffix ?? ''

  return createElement(
    'span',
    { className: 'font-mono tabular-nums' },
    `${prefix}${formatPercent(num)}${suffix}`
  )
}

/**
 * Bytes renderer - formats as KB/MB/GB/TB
 */
function renderBytes(
  value: unknown,
  _item: Record<string, unknown>,
  column: CardColumnConfig
): ReactNode {
  if (value === null || value === undefined) {
    return createElement('span', { className: 'text-gray-500' }, '—')
  }

  const num = typeof value === 'number' ? value : parseFloat(String(value))
  if (isNaN(num)) {
    return createElement('span', { className: 'text-gray-500' }, '—')
  }

  const prefix = column.prefix ?? ''
  const suffix = column.suffix ?? ''

  return createElement(
    'span',
    { className: 'font-mono tabular-nums' },
    `${prefix}${formatBytes(num)}${suffix}`
  )
}

/**
 * Duration renderer - formats seconds as Xd Xh Xm Xs
 */
function renderDuration(
  value: unknown,
  _item: Record<string, unknown>,
  column: CardColumnConfig
): ReactNode {
  if (value === null || value === undefined) {
    return createElement('span', { className: 'text-gray-500' }, '—')
  }

  const num = typeof value === 'number' ? value : parseFloat(String(value))
  if (isNaN(num)) {
    return createElement('span', { className: 'text-gray-500' }, '—')
  }

  const prefix = column.prefix ?? ''
  const suffix = column.suffix ?? ''

  return createElement(
    'span',
    { className: 'font-mono tabular-nums' },
    `${prefix}${formatDuration(num)}${suffix}`
  )
}

/**
 * Date renderer - formats as date string
 */
function renderDate(
  value: unknown,
  _item: Record<string, unknown>,
  _column: CardColumnConfig
): ReactNode {
  if (value === null || value === undefined) {
    return createElement('span', { className: 'text-gray-500' }, '—')
  }

  try {
    const date = value instanceof Date ? value : new Date(String(value))
    return createElement(
      'span',
      { className: 'text-gray-300' },
      date.toLocaleDateString()
    )
  } catch {
    return createElement('span', { className: 'text-gray-500' }, '—')
  }
}

/**
 * DateTime renderer - formats as date + time string
 */
function renderDateTime(
  value: unknown,
  _item: Record<string, unknown>,
  _column: CardColumnConfig
): ReactNode {
  if (value === null || value === undefined) {
    return createElement('span', { className: 'text-gray-500' }, '—')
  }

  try {
    const date = value instanceof Date ? value : new Date(String(value))
    return createElement(
      'span',
      { className: 'text-gray-300' },
      date.toLocaleString()
    )
  } catch {
    return createElement('span', { className: 'text-gray-500' }, '—')
  }
}

/**
 * Relative time renderer - formats as "X minutes ago"
 */
function renderRelativeTime(
  value: unknown,
  _item: Record<string, unknown>,
  _column: CardColumnConfig
): ReactNode {
  if (value === null || value === undefined) {
    return createElement('span', { className: 'text-gray-500' }, '—')
  }

  try {
    const date = value instanceof Date ? value : new Date(String(value))
    const now = Date.now()
    const diff = now - date.getTime()

    // Format relative time
    const seconds = Math.floor(diff / 1000)
    if (seconds < 60) return 'just now'

    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`

    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`

    const days = Math.floor(hours / 24)
    if (days < 30) return `${days}d ago`

    const months = Math.floor(days / 30)
    if (months < 12) return `${months}mo ago`

    const years = Math.floor(days / 365)
    return `${years}y ago`
  } catch {
    return createElement('span', { className: 'text-gray-500' }, '—')
  }
}

/**
 * Status badge renderer - displays status with color coding
 */
function renderStatusBadge(
  value: unknown,
  _item: Record<string, unknown>,
  _column: CardColumnConfig
): ReactNode {
  if (value === null || value === undefined) {
    return createElement('span', { className: 'text-gray-500' }, '—')
  }

  const status = String(value)
  const colors = getStatusColors(status)

  return createElement(
    'span',
    {
      className: `inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`,
    },
    status
  )
}

/**
 * Cluster badge renderer - displays cluster name with icon
 */
function renderClusterBadge(
  value: unknown,
  _item: Record<string, unknown>,
  _column: CardColumnConfig
): ReactNode {
  if (value === null || value === undefined) {
    return createElement('span', { className: 'text-gray-500' }, '—')
  }

  const cluster = String(value)

  return createElement(
    'span',
    {
      className: 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-500/20 text-purple-400',
    },
    cluster
  )
}

/**
 * Namespace badge renderer - displays namespace name
 */
function renderNamespaceBadge(
  value: unknown,
  _item: Record<string, unknown>,
  _column: CardColumnConfig
): ReactNode {
  if (value === null || value === undefined) {
    return createElement('span', { className: 'text-gray-500' }, '—')
  }

  const namespace = String(value)

  return createElement(
    'span',
    {
      className: 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400',
    },
    namespace
  )
}

/**
 * Progress bar renderer - displays value as a progress bar
 */
function renderProgressBar(
  value: unknown,
  _item: Record<string, unknown>,
  _column: CardColumnConfig
): ReactNode {
  if (value === null || value === undefined) {
    return createElement('span', { className: 'text-gray-500' }, '—')
  }

  const num = typeof value === 'number' ? value : parseFloat(String(value))
  if (isNaN(num)) {
    return createElement('span', { className: 'text-gray-500' }, '—')
  }

  // Clamp to 0-100
  const percent = Math.min(100, Math.max(0, num))

  // Determine color based on value
  const severity = percent >= 90 ? 'error' : percent >= 70 ? 'warning' : 'success'
  const colors = getStatusColors(
    severity === 'error' ? 'failed' : severity === 'warning' ? 'pending' : 'running'
  )

  return createElement(
    'div',
    { className: 'flex items-center gap-2 w-full' },
    createElement(
      'div',
      { className: 'flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden' },
      createElement('div', {
        className: `h-full ${colors.barColor} transition-all duration-300`,
        style: { width: `${percent}%` },
      })
    ),
    createElement(
      'span',
      { className: 'text-xs font-mono tabular-nums text-gray-400 w-10 text-right' },
      `${Math.round(percent)}%`
    )
  )
}

/**
 * Boolean renderer - displays checkmark or X
 */
function renderBoolean(
  value: unknown,
  _item: Record<string, unknown>,
  _column: CardColumnConfig
): ReactNode {
  const bool = Boolean(value)

  return createElement(
    'span',
    {
      className: bool ? 'text-green-400' : 'text-gray-500',
    },
    bool ? '✓' : '✗'
  )
}

/**
 * Icon renderer - displays an icon based on value
 */
function renderIcon(
  value: unknown,
  _item: Record<string, unknown>,
  _column: CardColumnConfig
): ReactNode {
  if (value === null || value === undefined) {
    return createElement('span', { className: 'text-gray-500' }, '—')
  }

  // For now, just render the value - icon lookup can be added later
  return createElement(
    'span',
    { className: 'text-gray-400' },
    String(value)
  )
}

/**
 * JSON renderer - displays JSON as formatted code
 */
function renderJson(
  value: unknown,
  _item: Record<string, unknown>,
  _column: CardColumnConfig
): ReactNode {
  if (value === null || value === undefined) {
    return createElement('span', { className: 'text-gray-500' }, 'null')
  }

  try {
    const json = typeof value === 'string' ? value : JSON.stringify(value, null, 2)
    return createElement(
      'pre',
      { className: 'text-xs text-gray-300 font-mono overflow-x-auto max-w-xs' },
      json
    )
  } catch {
    return createElement('span', { className: 'text-gray-500' }, '[Object]')
  }
}

/**
 * Truncate renderer - truncates long text with ellipsis
 */
function renderTruncate(
  value: unknown,
  _item: Record<string, unknown>,
  _column: CardColumnConfig
): ReactNode {
  if (value === null || value === undefined) {
    return createElement('span', { className: 'text-gray-500' }, '—')
  }

  const text = String(value)

  return createElement(
    'span',
    {
      className: 'truncate max-w-[200px] block',
      title: text,
    },
    text
  )
}

/**
 * Link renderer - displays as a clickable link
 */
function renderLink(
  value: unknown,
  _item: Record<string, unknown>,
  _column: CardColumnConfig
): ReactNode {
  if (value === null || value === undefined) {
    return createElement('span', { className: 'text-gray-500' }, '—')
  }

  const url = String(value)

  return createElement(
    'a',
    {
      href: url,
      target: '_blank',
      rel: 'noopener noreferrer',
      className: 'text-blue-400 hover:text-blue-300 hover:underline truncate max-w-[200px] block',
    },
    url
  )
}

// ============================================================================
// Built-in Renderer Map
// ============================================================================

const BUILT_IN_RENDERERS: Record<string, RendererFunction> = {
  text: renderText,
  number: renderNumber,
  percentage: renderPercentage,
  bytes: renderBytes,
  duration: renderDuration,
  date: renderDate,
  datetime: renderDateTime,
  'relative-time': renderRelativeTime,
  'status-badge': renderStatusBadge,
  'cluster-badge': renderClusterBadge,
  'namespace-badge': renderNamespaceBadge,
  'progress-bar': renderProgressBar,
  boolean: renderBoolean,
  icon: renderIcon,
  json: renderJson,
  truncate: renderTruncate,
  link: renderLink,
}

export default {
  registerRenderer,
  getRenderer,
  getRegisteredRenderers,
  renderCell,
}
