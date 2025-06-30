import React from 'react';
import { Button, SxProps, Theme } from '@mui/material';
import useTheme from '../../stores/themeStore';

interface CancelButtonProps {
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
  fullWidth?: boolean;
  size?: 'small' | 'medium' | 'large';
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  sx?: SxProps<Theme> | Array<SxProps<Theme>>;
  children?: React.ReactNode;
}

const CancelButton: React.FC<CancelButtonProps> = ({
  onClick,
  disabled = false,
  className,
  style,
  fullWidth = false,
  size = 'medium',
  startIcon,
  endIcon,
  sx = {},
  children = 'Cancel',
}) => {
  const themeMode = useTheme((state: { theme: string }) => state.theme);
  const isDark = themeMode === 'dark';

  const secondaryButtonStyles: SxProps<Theme> = {
    textTransform: 'none',
    fontWeight: 600,
    borderRadius: 1.5,
    py: 1.2,
    px: 3,
    fontSize: '0.875rem',
    minWidth: '120px',
    height: '40px',
    color: isDark ? 'white' : 'black',
    bgcolor: 'transparent',
    border: '1px solid',
    borderColor: isDark ? 'rgba(255,255,255,0.23)' : 'rgba(0,0,0,0.23)',
    boxShadow: isDark ? '0 4px 6px -1px rgba(0, 0, 0, 0.2)' : '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    transition: 'all 0.2s ease',
    '&:hover': {
      bgcolor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
      borderColor: isDark ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)',
      transform: 'translateY(-2px)',
      boxShadow: isDark ? '0 4px 8px -2px rgba(0, 0, 0, 0.3)' : '0 4px 8px -2px rgba(0, 0, 0, 0.1)',
    },
    '&:active': {
      transform: 'translateY(0)',
    },
    '&.Mui-disabled': {
      bgcolor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.04)',
      color: isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.26)',
      borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)',
    },
    ...(Array.isArray(sx) ? Object.assign({}, ...sx) : sx),
  };

  return (
    <Button
      variant="outlined"
      onClick={onClick}
      disabled={disabled}
      className={className}
      style={style}
      fullWidth={fullWidth}
      size={size}
      startIcon={startIcon}
      endIcon={endIcon}
      sx={secondaryButtonStyles}
    >
      {children}
    </Button>
  );
};

export default CancelButton;
