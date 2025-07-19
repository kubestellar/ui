import { useTranslation } from 'react-i18next';
import { ColorTheme } from '../types';

interface StatusBadgeProps {
  status?: string;
  available?: boolean;
  isDark: boolean;
  colors: ColorTheme;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, available, isDark, colors }) => {
  const { t } = useTranslation();

  const getStatusStyles = () => {
    const isUnavailable = status?.toLowerCase() === 'unavailable' || !available;
    const isPending = status?.toLowerCase() === 'pending';

    return {
      backgroundColor: isUnavailable
        ? isDark
          ? 'rgba(255, 107, 107, 0.2)'
          : 'rgba(255, 107, 107, 0.1)'
        : isPending
          ? isDark
            ? 'rgba(255, 179, 71, 0.2)'
            : 'rgba(255, 179, 71, 0.1)'
          : isDark
            ? 'rgba(103, 192, 115, 0.2)'
            : 'rgba(103, 192, 115, 0.1)',
      color: isUnavailable ? colors.error : isPending ? colors.warning : colors.success,
      border: isUnavailable
        ? `1px solid ${isDark ? 'rgba(255, 107, 107, 0.4)' : 'rgba(255, 107, 107, 0.3)'}`
        : isPending
          ? `1px solid ${isDark ? 'rgba(255, 179, 71, 0.4)' : 'rgba(255, 179, 71, 0.3)'}`
          : `1px solid ${isDark ? 'rgba(103, 192, 115, 0.4)' : 'rgba(103, 192, 115, 0.3)'}`,
    };
  };

  const getDotColor = () => {
    if (status?.toLowerCase() === 'unavailable' || !available) return colors.error;
    if (status?.toLowerCase() === 'pending') return colors.warning;
    return colors.success;
  };

  const getStatusText = () => {
    if (status?.toLowerCase() === 'unavailable' || !available) return t('clusters.status.inactive');
    if (status?.toLowerCase() === 'pending') return t('clusters.status.pending');
    return t('clusters.status.active');
  };

  return (
    <span
      className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium"
      style={getStatusStyles()}
    >
      <span
        className="h-3 w-3 animate-pulse rounded-full"
        style={{
          backgroundColor: getDotColor(),
        }}
      />
      {getStatusText()}
    </span>
  );
};

export default StatusBadge;
