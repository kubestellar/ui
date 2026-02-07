/**
 * UnifiedStatBlock - Single stat block component
 *
 * Renders a stat from configuration, automatically resolving values
 * from the provided data source.
 */

import { useMemo } from 'react'
import {
  Server, CheckCircle2, XCircle, WifiOff, Box, Cpu, MemoryStick, HardDrive, Zap, Layers,
  FolderOpen, AlertCircle, AlertTriangle, AlertOctagon, Package, Ship, Settings, Clock,
  MoreHorizontal, Database, Workflow, Globe, Network, ArrowRightLeft, CircleDot,
  ShieldAlert, ShieldOff, User, Info, Percent, ClipboardList, Sparkles, Activity,
  List, DollarSign, FlaskConical, FolderTree, Bell, RefreshCw, ArrowUpCircle,
  Newspaper, FileCode, Lock, Unlock, UserCheck, FileText, Calendar, CreditCard,
  Heart, Shield, ShieldCheck,
} from 'lucide-react'
import type { UnifiedStatBlockProps, StatBlockValue } from '../types'
import { resolveStatValue } from './valueResolvers'

// Icon mapping for dynamic rendering
const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Server, CheckCircle2, XCircle, WifiOff, Box, Cpu, MemoryStick, HardDrive, Zap, Layers,
  FolderOpen, AlertCircle, AlertTriangle, AlertOctagon, Package, Ship, Settings, Clock,
  MoreHorizontal, Database, Workflow, Globe, Network, ArrowRightLeft, CircleDot,
  ShieldAlert, ShieldOff, User, Info, Percent, ClipboardList, Sparkles, Activity,
  List, DollarSign, FlaskConical, FolderTree, Bell, RefreshCw, ArrowUpCircle,
  Newspaper, FileCode, Lock, Unlock, UserCheck, FileText, Calendar, CreditCard,
  Heart, Shield, ShieldCheck,
}

// Color mapping for icons
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
}

// Value color mapping based on stat ID
const VALUE_COLORS: Record<string, string> = {
  healthy: 'text-green-400',
  passing: 'text-green-400',
  deployed: 'text-green-400',
  bound: 'text-green-400',
  normal: 'text-blue-400',
  unhealthy: 'text-orange-400',
  warning: 'text-yellow-400',
  warnings: 'text-yellow-400',
  pending: 'text-yellow-400',
  unreachable: 'text-yellow-400',
  critical: 'text-red-400',
  failed: 'text-red-400',
  failing: 'text-red-400',
  errors: 'text-red-400',
  issues: 'text-red-400',
  high: 'text-orange-400',
  medium: 'text-yellow-400',
  low: 'text-blue-400',
  privileged: 'text-red-400',
  root: 'text-orange-400',
}

/**
 * UnifiedStatBlock - Renders a single stat from config
 */
export function UnifiedStatBlock({
  config,
  data,
  getValue,
  isLoading = false,
}: UnifiedStatBlockProps) {
  // Resolve the value
  const resolvedValue = useMemo((): StatBlockValue => {
    // If custom getValue is provided, use it
    if (getValue) {
      return getValue()
    }

    // Otherwise resolve from config
    const resolved = resolveStatValue(config.valueSource, data, config.format)

    return {
      value: resolved.value,
      sublabel: config.sublabelField
        ? resolved.sublabel
        : undefined,
      isDemo: resolved.isDemo,
      isClickable: !!config.onClick,
    }
  }, [config, data, getValue])

  // Get components
  const IconComponent = ICONS[config.icon] || Server
  const iconColor = ICON_COLORS[config.color] || 'text-foreground'
  const valueColor = VALUE_COLORS[config.id] || 'text-foreground'

  // Determine clickable state
  const isClickable = resolvedValue.isClickable !== false && !!config.onClick
  const isDemo = resolvedValue.isDemo === true
  const hasData = resolvedValue.value !== undefined && resolvedValue.value !== '-'

  // Loading state
  if (isLoading) {
    return (
      <div className="glass p-4 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-5 h-5 bg-gray-800 rounded-full animate-pulse" />
          <div className="h-4 bg-gray-800 rounded w-20 animate-pulse" />
        </div>
        <div className="h-9 bg-gray-800 rounded w-16 animate-pulse mb-1" />
        <div className="h-3 bg-gray-800 rounded w-24 animate-pulse" />
      </div>
    )
  }

  return (
    <div
      className={`
        relative glass p-4 rounded-lg transition-colors
        ${isClickable ? 'cursor-pointer hover:bg-secondary/50' : ''}
        ${isDemo ? 'border border-yellow-500/30 bg-yellow-500/5 shadow-[0_0_12px_rgba(234,179,8,0.15)]' : ''}
      `}
      onClick={() => {
        if (isClickable && config.onClick) {
          // Handle click action based on type
          handleStatClick(config.onClick)
        }
      }}
      title={config.tooltip}
    >
      {/* Demo indicator */}
      {isDemo && (
        <span className="absolute -top-1 -right-1" title="Demo data">
          <FlaskConical className="w-3.5 h-3.5 text-yellow-400/50" />
        </span>
      )}

      {/* Header with icon and name */}
      <div className="flex items-center gap-2 mb-2">
        <IconComponent className={`w-5 h-5 shrink-0 ${iconColor}`} />
        <span className="text-sm text-muted-foreground truncate">{config.name}</span>
      </div>

      {/* Value */}
      <div className={`text-3xl font-bold ${hasData ? valueColor : 'text-muted-foreground'}`}>
        {hasData ? resolvedValue.value : '-'}
      </div>

      {/* Sublabel */}
      {resolvedValue.sublabel && (
        <div className="text-xs text-muted-foreground">{resolvedValue.sublabel}</div>
      )}
    </div>
  )
}

/**
 * Handle stat click action
 */
function handleStatClick(action: NonNullable<UnifiedStatBlockProps['config']['onClick']>) {
  switch (action.type) {
    case 'drill':
      // Dispatch drill-down event
      window.dispatchEvent(
        new CustomEvent('stat-drill', {
          detail: { target: action.target, params: action.params },
        })
      )
      break

    case 'filter':
      // Dispatch filter event
      window.dispatchEvent(
        new CustomEvent('stat-filter', {
          detail: { field: action.target, params: action.params },
        })
      )
      break

    case 'navigate':
      // Navigate to route
      window.location.hash = action.target
      break

    case 'callback':
      // Dispatch callback event
      window.dispatchEvent(
        new CustomEvent('stat-callback', {
          detail: { name: action.target, params: action.params },
        })
      )
      break
  }
}

export default UnifiedStatBlock
