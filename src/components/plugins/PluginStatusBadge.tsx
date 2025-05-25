import { CheckCircle, AlertTriangle, XCircle, MinusCircle } from 'lucide-react';

interface PluginStatusBadgeProps {
  status: string;
}

type StatusKey = 'active' | 'failed' | 'error' | 'idle';

const statusConfig: Record<StatusKey, { color: string; icon: React.ElementType }> = {
  active: {
    color: 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400',
    icon: CheckCircle,
  },
  failed: {
    color: 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400',
    icon: XCircle,
  },
  error: {
    color: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400',
    icon: AlertTriangle,
  },
  idle: {
    color: 'bg-gray-50 text-gray-600 dark:bg-gray-900/20 dark:text-gray-400',
    icon: MinusCircle,
  },
};

export function PluginStatusBadge({ status }: PluginStatusBadgeProps) {
  const key =
    (status.toLowerCase() as StatusKey) in statusConfig
      ? (status.toLowerCase() as StatusKey)
      : 'idle';
  const config = statusConfig[key];
  const Icon = config.icon;

  return (
    <span
      className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${config.color}`}
    >
      <Icon size={12} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}
