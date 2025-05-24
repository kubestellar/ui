import { CheckCircle, XCircle, Clock, RefreshCw } from 'lucide-react';

interface ColorTheme {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  secondary: string;
  white: string;
  background: string;
  paper: string;
  text: string;
  textSecondary: string;
  border: string;
  success: string;
  warning: string;
  error: string;
  disabled: string;
}

interface StatusBadgeProps {
  status: 'running' | 'completed' | 'failed' | 'idle';
  isDark: boolean;
  colors: ColorTheme;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const StatusBadge = ({
  status,
  isDark,
  colors,
  showLabel = false,
  size = 'md',
}: StatusBadgeProps) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'running':
        return {
          icon: RefreshCw,
          label: 'Running',
          bgColor: isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)',
          textColor: colors.primary,
          borderColor: colors.primary,
          animate: true,
        };
      case 'completed':
        return {
          icon: CheckCircle,
          label: 'Completed',
          bgColor: isDark ? 'rgba(34, 197, 94, 0.2)' : 'rgba(34, 197, 94, 0.1)',
          textColor: colors.success,
          borderColor: colors.success,
          animate: false,
        };
      case 'failed':
        return {
          icon: XCircle,
          label: 'Failed',
          bgColor: isDark ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.1)',
          textColor: colors.error,
          borderColor: colors.error,
          animate: false,
        };
      case 'idle':
      default:
        return {
          icon: Clock,
          label: 'Idle',
          bgColor: isDark ? 'rgba(107, 114, 128, 0.2)' : 'rgba(107, 114, 128, 0.1)',
          textColor: colors.textSecondary,
          borderColor: colors.textSecondary,
          animate: false,
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base',
  };

  const iconSizes = {
    sm: 12,
    md: 14,
    lg: 16,
  };

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border font-medium ${sizeClasses[size]}`}
      style={{
        backgroundColor: config.bgColor,
        color: config.textColor,
        borderColor: config.borderColor,
      }}
    >
      <Icon size={iconSizes[size]} className={config.animate ? 'animate-spin' : ''} />
      {showLabel && <span>{config.label}</span>}
    </div>
  );
};

export default StatusBadge;
