import { SxProps, Theme } from '@mui/material/styles';

/**
 * Color theme configuration for clusters table
 */
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
  [key: string]: string;
}

export type { ColorTheme };

/**
 * Status filter item for dropdown
 */
export interface StatusFilterItem {
  value: string;
  label: string;
  color: string;
  icon?: React.ReactNode;
}

/**
 * Managed cluster information
 */
export interface ManagedClusterInfo {
  name: string;
  context: string;
  labels: { [key: string]: string };
  uid?: string;
  creationTimestamp?: string;
  creationTime?: string;
  status: string;
  available?: boolean;
}

/**
 * Clusters table props
 */
export interface ClustersTableProps {
  clusters: ManagedClusterInfo[];
  isLoading?: boolean;
  initialShowCreateOptions?: boolean;
  initialActiveOption?: string;
}

/**
 * Gets color theme based on dark mode setting
 */
export const getColorTheme = (isDark: boolean): ColorTheme => ({
  primary: '#2f86ff',
  primaryLight: '#9ad6f9',
  primaryDark: '#1a65cc',
  secondary: '#67c073',
  white: '#ffffff',
  background: isDark ? '#0f172a' : '#ffffff',
  paper: isDark ? '#1e293b' : '#f8fafc',
  text: isDark ? '#f1f5f9' : '#1e293b',
  textSecondary: isDark ? '#94a3b8' : '#64748b',
  border: isDark ? '#334155' : '#e2e8f0',
  success: '#67c073',
  warning: '#ffb347',
  error: '#ff6b6b',
  disabled: isDark ? '#475569' : '#94a3b8',
});

/**
 * Table container styles
 */
export const getTableContainerStyles = (isDark: boolean): SxProps<Theme> => ({
  backgroundColor: isDark ? '#1e293b' : '#f8fafc',
  boxShadow: isDark
    ? '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -2px rgba(0, 0, 0, 0.2)'
    : '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
  borderRadius: '12px',
  border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
});

/**
 * Status chip styles based on status type
 */
export const getStatusChipStyles = (
  status: 'active' | 'inactive' | 'pending',
  isDark: boolean
): React.CSSProperties => {
  const baseStyles = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    borderRadius: '8px',
    padding: '6px 12px',
    fontSize: '12px',
    fontWeight: 500,
    border: '1px solid',
  };

  switch (status) {
    case 'active':
      return {
        ...baseStyles,
        backgroundColor: isDark ? 'rgba(103, 192, 115, 0.2)' : 'rgba(103, 192, 115, 0.1)',
        color: '#67c073',
        borderColor: isDark ? 'rgba(103, 192, 115, 0.4)' : 'rgba(103, 192, 115, 0.3)',
      };
    case 'inactive':
      return {
        ...baseStyles,
        backgroundColor: isDark ? 'rgba(255, 107, 107, 0.2)' : 'rgba(255, 107, 107, 0.1)',
        color: '#ff6b6b',
        borderColor: isDark ? 'rgba(255, 107, 107, 0.4)' : 'rgba(255, 107, 107, 0.3)',
      };
    case 'pending':
      return {
        ...baseStyles,
        backgroundColor: isDark ? 'rgba(255, 179, 71, 0.2)' : 'rgba(255, 179, 71, 0.1)',
        color: '#ffb347',
        borderColor: isDark ? 'rgba(255, 179, 71, 0.4)' : 'rgba(255, 179, 71, 0.3)',
      };
    default:
      return baseStyles;
  }
};

/**
 * Label chip styles
 */
export const getLabelChipStyles = (isActive: boolean, isDark: boolean): React.CSSProperties => ({
  backgroundColor: isActive
    ? isDark
      ? 'rgba(47, 134, 255, 0.3)'
      : 'rgba(47, 134, 255, 0.15)'
    : isDark
      ? 'rgba(47, 134, 255, 0.15)'
      : 'rgba(47, 134, 255, 0.08)',
  color: '#2f86ff',
  border: `1px solid ${
    isActive ? '#2f86ff' : isDark ? 'rgba(47, 134, 255, 0.4)' : 'rgba(47, 134, 255, 0.3)'
  }`,
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  borderRadius: '6px',
  padding: '4px 8px',
  fontSize: '12px',
  fontWeight: 500,
});

/**
 * Dialog styles
 */
export const getDialogStyles = (isDark: boolean): SxProps<Theme> => ({
  '& .MuiDialog-paper': {
    backgroundColor: isDark ? '#1e293b' : '#f8fafc',
    color: isDark ? '#f1f5f9' : '#1e293b',
    border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: isDark
      ? '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.4)'
      : '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
  },
});

/**
 * Button styles
 */
export const getButtonStyles = (
  variant: 'primary' | 'secondary' | 'error' | 'text',
  isDark: boolean
): SxProps<Theme> => {
  const colors = getColorTheme(isDark);

  switch (variant) {
    case 'primary':
      return {
        bgcolor: colors.primary,
        color: colors.white,
        '&:hover': { bgcolor: colors.primaryDark },
        textTransform: 'none',
        fontWeight: '600',
        borderRadius: '8px',
      };
    case 'secondary':
      return {
        bgcolor: colors.secondary,
        color: colors.white,
        '&:hover': { bgcolor: colors.secondary },
        textTransform: 'none',
        fontWeight: '600',
        borderRadius: '8px',
      };
    case 'error':
      return {
        bgcolor: colors.error,
        color: colors.white,
        '&:hover': { bgcolor: colors.error },
        textTransform: 'none',
        fontWeight: '600',
        borderRadius: '8px',
      };
    case 'text':
      return {
        color: colors.textSecondary,
        textTransform: 'none',
        fontWeight: '500',
        borderRadius: '8px',
      };
    default:
      return {};
  }
};

/**
 * Search box styles
 */
export const getSearchBoxStyles = (isDark: boolean): SxProps<Theme> => ({
  '& .MuiOutlinedInput-root': {
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
    borderRadius: '12px',
    '& fieldset': {
      borderColor: isDark ? '#334155' : '#e2e8f0',
    },
    '&:hover fieldset': {
      borderColor: '#9ad6f9',
    },
    '&.Mui-focused fieldset': {
      borderColor: '#2f86ff',
    },
  },
  '& .MuiInputBase-input': {
    color: isDark ? '#f1f5f9' : '#1e293b',
  },
});

/**
 * Filter chip styles
 */
export const getFilterChipStyles = (isDark: boolean): SxProps<Theme> => ({
  backgroundColor: isDark ? 'rgba(47, 134, 255, 0.15)' : 'rgba(47, 134, 255, 0.1)',
  color: '#2f86ff',
  fontWeight: 500,
  '& .MuiChip-deleteIcon': {
    color: '#2f86ff',
    '&:hover': { color: '#1a65cc' },
  },
  borderRadius: '8px',
  transition: 'all 0.2s ease',
  '&:hover': {
    backgroundColor: isDark ? 'rgba(47, 134, 255, 0.2)' : 'rgba(47, 134, 255, 0.15)',
    boxShadow: '0 2px 4px rgba(47, 134, 255, 0.2)',
  },
});

/**
 * Menu styles
 */
export const getMenuStyles = (isDark: boolean): SxProps<Theme> => ({
  '& .MuiPaper-root': {
    backgroundColor: isDark ? '#1e293b' : '#f8fafc',
    borderRadius: '12px',
    border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
    boxShadow: isDark
      ? '0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.2)'
      : '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
    marginTop: '8px',
    padding: '8px',
  },
  '& .MuiMenuItem-root': {
    color: isDark ? '#f1f5f9' : '#1e293b',
    borderRadius: '8px',
    margin: '3px 0',
    padding: '10px 16px',
    transition: 'all 0.15s ease',
    '&:hover': {
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(0, 0, 0, 0.04)',
      transform: 'translateX(4px)',
    },
  },
});

/**
 * Animation keyframes
 */
export const animationStyles = `
  @keyframes float {
    0% { transform: translateY(0px); }
    50% { transform: translateY(-10px); }
    100% { transform: translateY(0px); }
  }
  
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  @keyframes pulse {
    0% { transform: scale(0.8); }
    50% { transform: scale(1.2); }
    100% { transform: scale(1); }
  }
  
  .animate-float {
    animation: float 3s ease-in-out infinite;
  }
  
  .animate-fadeIn {
    animation: fadeIn 0.5s ease-out forwards;
  }
  
  .animate-pulse-checkbox {
    animation: pulse 0.3s ease-in-out;
  }
`;

/**
 * Get all table styles
 */
export const getClusterTableStyles = (isDark: boolean) => ({
  colors: getColorTheme(isDark),
  tableContainer: getTableContainerStyles(isDark),
  dialog: getDialogStyles(isDark),
  searchBox: getSearchBoxStyles(isDark),
  filterChip: getFilterChipStyles(isDark),
  menu: getMenuStyles(isDark),
  buttons: {
    primary: getButtonStyles('primary', isDark),
    secondary: getButtonStyles('secondary', isDark),
    error: getButtonStyles('error', isDark),
    text: getButtonStyles('text', isDark),
  },
  statusChip: {
    active: getStatusChipStyles('active', isDark),
    inactive: getStatusChipStyles('inactive', isDark),
    pending: getStatusChipStyles('pending', isDark),
  },
  labelChip: {
    active: getLabelChipStyles(true, isDark),
    inactive: getLabelChipStyles(false, isDark),
  },
});

/**
 * CSS classes for common styles
 */
export const cssClasses = {
  tableRow: {
    hover: 'transition-all duration-200 hover:scale-105 hover:shadow-md',
    selected: 'ring-1 ring-blue-500 bg-blue-50',
  },
  button: {
    primary: 'transition-all duration-200 hover:transform hover:scale-105',
    icon: 'transition-all duration-200 hover:scale-110',
  },
  animation: {
    fadeIn: 'animate-fadeIn',
    float: 'animate-float',
    pulse: 'animate-pulse-checkbox',
  },
};
