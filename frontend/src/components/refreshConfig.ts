import type { SxProps, Theme } from '@mui/material';

export const REFRESH_ANIMATION_DURATION = 1000;

type ThemeMode = 'light' | 'dark';

export const getRefreshButtonSx = (
  themeMode: ThemeMode,
  isRefreshing: boolean
): SxProps<Theme> => ({
  padding: 1,
  borderRadius: '50%',
  width: 40,
  height: 40,
  color: themeMode === 'dark' ? '#FFFFFF' : undefined,
  bgcolor: themeMode === 'dark' ? 'transparent' : 'transparent',
  opacity: isRefreshing ? 0.6 : 1,
  transition: 'opacity 0.2s ease',
  '&:hover': {
    bgcolor: themeMode === 'dark' ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0,0,0,0.04)',
  },
  '&.Mui-disabled': {
    color: themeMode === 'dark' ? '#FFFFFF' : undefined,
    opacity: 0.6,
  },
});
