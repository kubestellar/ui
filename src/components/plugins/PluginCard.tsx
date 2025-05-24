import { motion } from 'framer-motion';
import { CheckCircle, XCircle } from 'lucide-react';
import StatusBadge from './StatusBadge';

interface PluginAction {
  id: string;
  label: string;
  icon: React.ElementType;
  variant: 'primary' | 'secondary' | 'danger';
  onClick: () => void;
}

interface Plugin {
  id: string;
  name: string;
  version: string;
  description: string;
  icon: React.ElementType;
  enabled: boolean;
  actions: PluginAction[];
}

interface BackupStatus {
  status: 'running' | 'completed' | 'failed' | 'idle';
  error: string | null;
}

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

interface PluginCardProps {
  plugin: Plugin;
  isDark: boolean;
  colors: ColorTheme;
  isLoading?: boolean;
  status?: BackupStatus;
}

const PluginCard = ({ plugin, isDark, colors, isLoading, status }: PluginCardProps) => {
  const Icon = plugin.icon;

  const getActionButtonStyles = (variant: string) => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: colors.primary,
          color: 'white',
          hover: 'hover:opacity-90',
        };
      case 'secondary':
        return {
          backgroundColor: colors.paper,
          color: colors.text,
          border: `1px solid ${colors.border}`,
          hover: 'hover:bg-opacity-80',
        };
      case 'danger':
        return {
          backgroundColor: colors.error,
          color: 'white',
          hover: 'hover:opacity-90',
        };
      default:
        return {
          backgroundColor: colors.paper,
          color: colors.text,
          border: `1px solid ${colors.border}`,
          hover: 'hover:bg-opacity-80',
        };
    }
  };

  return (
    <motion.div
      className="rounded-xl border p-6 shadow-sm transition-all duration-300"
      style={{
        backgroundColor: colors.paper,
        borderColor: colors.border,
      }}
      whileHover={{
        y: -4,
        boxShadow: isDark ? '0 12px 24px rgba(0, 0, 0, 0.3)' : '0 12px 24px rgba(0, 0, 0, 0.1)',
      }}
    >
      {/* Plugin Header */}
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className="rounded-lg p-3"
            style={{
              backgroundColor: isDark ? 'rgba(47, 134, 255, 0.15)' : 'rgba(47, 134, 255, 0.1)',
            }}
          >
            <Icon size={24} style={{ color: colors.primary }} />
          </div>
          <div>
            <h3 className="text-lg font-semibold" style={{ color: colors.text }}>
              {plugin.name}
            </h3>
            <span className="text-sm" style={{ color: colors.textSecondary }}>
              v{plugin.version}
            </span>
          </div>
        </div>

        {/* Status Indicator */}
        <div className="flex items-center gap-2">
          {plugin.enabled ? (
            <CheckCircle size={18} style={{ color: colors.success }} />
          ) : (
            <XCircle size={18} style={{ color: colors.error }} />
          )}
          <span
            className="text-xs font-medium"
            style={{ color: plugin.enabled ? colors.success : colors.error }}
          >
            {plugin.enabled ? 'Enabled' : 'Disabled'}
          </span>
        </div>
      </div>

      {/* Plugin Description */}
      <p className="mb-4 text-sm leading-relaxed" style={{ color: colors.textSecondary }}>
        {plugin.description}
      </p>

      {/* Status Badge for Backup Plugin */}
      {status && (
        <div className="mb-4">
          <StatusBadge status={status.status} isDark={isDark} colors={colors} showLabel={true} />
          {status.error && (
            <div
              className="mt-2 rounded-lg border-l-4 p-2"
              style={{
                backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : '#fef2f2',
                borderColor: colors.error,
              }}
            >
              <p className="text-xs" style={{ color: colors.error }}>
                {status.error}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Plugin Actions */}
      <div className="flex flex-wrap gap-2">
        {plugin.actions.map(action => {
          const ActionIcon = action.icon;
          const buttonStyles = getActionButtonStyles(action.variant);

          return (
            <button
              key={action.id}
              onClick={action.onClick}
              disabled={isLoading}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${buttonStyles.hover}`}
              style={{
                backgroundColor: buttonStyles.backgroundColor,
                color: buttonStyles.color,
                border: buttonStyles.border,
                opacity: isLoading ? 0.6 : 1,
              }}
            >
              <ActionIcon size={14} />
              <span>{action.label}</span>
            </button>
          );
        })}
      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <motion.div
          className="absolute inset-0 flex items-center justify-center rounded-xl"
          style={{
            backgroundColor: isDark ? 'rgba(0, 0, 0, 0.7)' : 'rgba(255, 255, 255, 0.8)',
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          <div className="flex items-center gap-2">
            <div
              className="h-5 w-5 animate-spin rounded-full border-2 border-b-transparent"
              style={{ borderColor: colors.primary, borderBottomColor: 'transparent' }}
            />
            <span className="text-sm font-medium" style={{ color: colors.text }}>
              Processing...
            </span>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default PluginCard;
