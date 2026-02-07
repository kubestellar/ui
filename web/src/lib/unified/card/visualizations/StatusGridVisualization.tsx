/**
 * StatusGridVisualization - Renders data as a grid of status items
 *
 * Used for card content type 'status-grid'. Displays status items in a grid
 * with icons, labels, and dynamic values resolved from data.
 */

import { useMemo } from 'react'
import {
  Server, CheckCircle2, XCircle, WifiOff, Box, Cpu, MemoryStick, HardDrive, Zap, Layers,
  FolderOpen, AlertCircle, AlertTriangle, AlertOctagon, Package, Ship, Settings, Clock,
  MoreHorizontal, Database, Workflow, Globe, Network, ArrowRightLeft, CircleDot,
  ShieldAlert, ShieldOff, User, Info, Percent, ClipboardList, Sparkles, Activity,
  List, DollarSign, FlaskConical, FolderTree, Bell, RefreshCw, ArrowUpCircle,
  Newspaper, FileCode, Lock, Unlock, UserCheck, FileText, Calendar, CreditCard,
  Heart, Shield, ShieldCheck, GitBranch, Cloud, Link, Unlink,
} from 'lucide-react'
import type { CardContentStatusGrid, CardStatusItem } from '../../types'
import { resolveFieldPath, formatValue } from '../../stats/valueResolvers'

// Icon mapping for dynamic rendering
const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Server, CheckCircle2, XCircle, WifiOff, Box, Cpu, MemoryStick, HardDrive, Zap, Layers,
  FolderOpen, AlertCircle, AlertTriangle, AlertOctagon, Package, Ship, Settings, Clock,
  MoreHorizontal, Database, Workflow, Globe, Network, ArrowRightLeft, CircleDot,
  ShieldAlert, ShieldOff, User, Info, Percent, ClipboardList, Sparkles, Activity,
  List, DollarSign, FlaskConical, FolderTree, Bell, RefreshCw, ArrowUpCircle,
  Newspaper, FileCode, Lock, Unlock, UserCheck, FileText, Calendar, CreditCard,
  Heart, Shield, ShieldCheck, GitBranch, Cloud, Link, Unlink,
}

// Color mapping for icons and backgrounds
const ICON_COLORS: Record<string, string> = {
  purple: 'text-purple-400',
  green: 'text-green-400',
  orange: 'text-orange-400',
  yellow: 'text-yellow-400',
  cyan: 'text-cyan-400',
  blue: 'text-blue-400',
  red: 'text-red-400',
  gray: 'text-gray-400',
  indigo: 'text-indigo-400',
  pink: 'text-pink-400',
  teal: 'text-teal-400',
  emerald: 'text-emerald-400',
}

const BG_COLORS: Record<string, string> = {
  purple: 'bg-purple-500/10',
  green: 'bg-green-500/10',
  orange: 'bg-orange-500/10',
  yellow: 'bg-yellow-500/10',
  cyan: 'bg-cyan-500/10',
  blue: 'bg-blue-500/10',
  red: 'bg-red-500/10',
  gray: 'bg-gray-500/10',
  indigo: 'bg-indigo-500/10',
  pink: 'bg-pink-500/10',
  teal: 'bg-teal-500/10',
  emerald: 'bg-emerald-500/10',
}

export interface StatusGridVisualizationProps {
  /** Content configuration */
  content: CardContentStatusGrid
  /** Data to resolve values from */
  data: unknown[] | unknown
}

/**
 * StatusGridVisualization - Renders a grid of status items
 */
export function StatusGridVisualization({
  content,
  data,
}: StatusGridVisualizationProps) {
  const { items, columns = 2, showCounts = true } = content

  // Resolve values for all items
  const resolvedItems = useMemo(() => {
    return items.map((item) => ({
      ...item,
      resolvedValue: resolveItemValue(item, data),
    }))
  }, [items, data])

  // Determine grid class based on column count
  const gridClass = useMemo(() => {
    switch (columns) {
      case 1:
        return 'grid-cols-1'
      case 2:
        return 'grid-cols-2'
      case 3:
        return 'grid-cols-3'
      case 4:
        return 'grid-cols-4'
      default:
        return 'grid-cols-2'
    }
  }, [columns])

  return (
    <div className={`grid ${gridClass} gap-3 p-3`}>
      {resolvedItems.map((item) => (
        <StatusGridItem
          key={item.id}
          item={item}
          value={item.resolvedValue}
          showValue={showCounts}
        />
      ))}
    </div>
  )
}

/**
 * Resolve a status item's value from data
 */
function resolveItemValue(item: CardStatusItem, data: unknown): string | number {
  const { valueSource } = item

  switch (valueSource.type) {
    case 'field': {
      const value = resolveFieldPath(data, valueSource.path)
      return formatValue(value) as string | number
    }

    case 'computed': {
      // Simple computed expression support
      const expression = valueSource.expression
      if (expression === 'count' && Array.isArray(data)) {
        return data.length
      }
      // For more complex expressions, return placeholder
      return '-'
    }

    case 'count': {
      if (!Array.isArray(data)) return 0
      if (valueSource.filter) {
        // Filter format: 'field=value'
        const [field, expectedValue] = valueSource.filter.split('=')
        const filtered = data.filter((item) => {
          const val = resolveFieldPath(item, field.trim())
          return String(val) === expectedValue?.trim()
        })
        return filtered.length
      }
      return data.length
    }

    default:
      return '-'
  }
}

/**
 * Individual status grid item
 */
function StatusGridItem({
  item,
  value,
  showValue,
}: {
  item: CardStatusItem & { resolvedValue: string | number }
  value: string | number
  showValue: boolean
}) {
  const IconComponent = ICONS[item.icon] || Box
  const iconColor = ICON_COLORS[item.color] || ICON_COLORS.gray
  const bgColor = item.bgColor || BG_COLORS[item.color] || BG_COLORS.gray

  return (
    <div
      className={`
        flex items-center gap-3 p-3 rounded-lg
        ${bgColor}
        transition-colors hover:bg-opacity-20
      `}
    >
      <div className={`shrink-0 ${iconColor}`}>
        <IconComponent className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-gray-400 truncate">{item.label}</div>
        {showValue && (
          <div className="text-lg font-semibold text-gray-200 truncate">
            {value}
          </div>
        )}
      </div>
    </div>
  )
}

export default StatusGridVisualization
