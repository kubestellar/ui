import { styled } from '@mui/material/styles';
import { Tab } from '@mui/material';
import useTheme from '../../stores/themeStore';

export const StyledTab = styled(Tab)(({ theme }) => {
  const appTheme = useTheme(state => state.theme);
  return {
    textTransform: 'none',
    fontWeight: 500,
    fontSize: '0.8rem',
    color: appTheme === 'dark' ? '#d4d4d4' : theme.palette.grey[600],
    padding: '10px 17px',
    minHeight: '40px',
    marginLeft: '16px',
    marginTop: '4px',
    borderRadius: '12px 12px 12px 12px',
    border: '1px solid transparent',
    transition: 'background-color 0.2s ease, border-color 0.2s ease',
    '&.Mui-selected': {
      color: '#1976d2',
      fontWeight: 600,
      border: '1px solid rgba(25, 118, 210, 0.7)',
      boxShadow: `
        -2px 0 6px rgba(47, 134, 255, 0.2),
        2px 0 6px rgba(47, 134, 255, 0.2),
        0 -2px 6px rgba(47, 134, 255, 0.2),
        0 2px 6px rgba(47, 134, 255, 0.2)
      `,
      zIndex: 1,
      position: 'relative',
    },
    '&:hover': {
      backgroundColor: appTheme === 'dark' ? '#333' : '#f4f4f4',
      border: appTheme === 'dark' ? '1px solid #444' : '1px solid rgba(0, 0, 0, 0.1)',
    },
  };
});

export const getPanelStyles = (theme: string, isOpen: boolean) => ({
  position: 'fixed' as const,
  right: isOpen ? 0 : '-80vw',
  top: 0,
  bottom: 0,
  width: '80vw',
  bgcolor: theme === 'dark' ? '#1F2937' : '#eff3f5',
  boxShadow: '-2px 0 10px rgba(0,0,0,0.2)',
  transition: 'right 0.4s ease-in-out',
  zIndex: 1001,
  overflowY: 'auto' as const,
  borderTopLeftRadius: '8px',
  borderBottomLeftRadius: '8px',
});

export const getContentBoxStyles = (theme: string) => ({
  backgroundColor: theme === 'dark' ? '#00000033' : 'rgba(255, 255, 255, 0.8)',
  borderRadius: '8px',
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
  border: theme === 'dark' ? '1px solid #444' : '1px solid rgba(0, 0, 0, 0.1)',
  padding: 3,
  display: 'flex',
  flexDirection: 'column' as const,
  mt: 2,
  mb: 4,
});

export const getTerminalStyles = (theme: string, isMaximized: boolean) => ({
  height: isMaximized ? 'calc(100vh - 220px)' : '500px',
  bgcolor: theme === 'dark' ? '#1A1A1A' : '#FAFAFA',
  borderRadius: '8px',
  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.1)',
  overflow: 'hidden',
  border: theme === 'dark' ? '1px solid #333' : '1px solid #E0E0E0',
  p: 0,
  pb: 0.5,
  display: 'flex',
  flexDirection: 'column' as const,
  position: 'relative' as const,
  transition: 'height 0.3s ease-in-out',
});

export const getTerminalHeaderStyles = (theme: string) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  px: 2,
  py: 0.75,
  backgroundColor: theme === 'dark' ? '#252525' : '#F0F0F0',
  borderBottom: theme === 'dark' ? '1px solid #333' : '1px solid #E0E0E0',
  fontSize: '13px',
  fontWeight: 500,
  color: theme === 'dark' ? '#CCC' : '#444',
  fontFamily: '"Segoe UI", "Helvetica", "Arial", sans-serif',
});

export const getContainerSelectStyles = (theme: string) => ({
  minWidth: 150,
  '& .MuiInputBase-root': {
    color: theme === 'dark' ? '#CCC' : '#444',
    fontSize: '13px',
    backgroundColor: theme === 'dark' ? '#333' : '#FFF',
    border: theme === 'dark' ? '1px solid #444' : '1px solid #DDD',
    borderRadius: '4px',
    height: '30px',
  },
  '& .MuiOutlinedInput-notchedOutline': {
    border: 'none',
  },
});

export const getLogsContainerSelectStyles = (theme: string) => ({
  minWidth: 200,
  '& .MuiInputBase-root': {
    color: theme === 'dark' ? '#CCC' : '#444',
    fontSize: '13px',
    backgroundColor: theme === 'dark' ? '#333' : '#FFF',
    border: theme === 'dark' ? '1px solid #444' : '1px solid #DDD',
    borderRadius: '4px',
    height: '36px',
  },
  '& .MuiOutlinedInput-notchedOutline': {
    border: 'none',
  },
});

export const getButtonStyles = (variant: 'contained' | 'outlined', color: string) => ({
  textTransform: 'none' as const,
  backgroundColor: variant === 'contained' ? color : 'transparent',
  borderRadius: '8px',
  color: variant === 'contained' ? '#fff' : color,
  border: variant === 'contained' ? 'none' : `1px solid ${color}`,
  '&:hover': {
    backgroundColor: variant === 'contained' ? '#1565c0' : 'rgba(47, 134, 255, 0.08)',
  },
});

export const getSmallButtonStyles = (variant: 'contained' | 'outlined', color: string) => ({
  textTransform: 'none' as const,
  backgroundColor: variant === 'contained' ? color : 'transparent',
  borderRadius: '6px',
  color: variant === 'contained' ? '#fff' : color,
  border: variant === 'contained' ? 'none' : `1px solid ${color}`,
  fontSize: '12px',
  height: '36px',
  px: 2,
  '&:hover': {
    backgroundColor: variant === 'contained' ? '#1565c0' : 'rgba(47, 134, 255, 0.08)',
  },
});

export const getIconButtonStyles = (theme: string) => ({
  color: theme === 'dark' ? '#CCC' : '#666',
  padding: '2px',
  '&:hover': {
    backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
  },
});

export const getChipStyles = (theme: string) => ({
  mr: 1,
  mb: 1,
  backgroundColor: theme === 'dark' ? '#334155' : undefined,
  color: theme === 'dark' ? '#fff' : undefined,
});

export const getResponsiveChipStyles = (theme: string) => ({
  mr: { xs: 0.5, sm: 1 },
  mb: { xs: 0.5, sm: 1 },
  backgroundColor: theme === 'dark' ? '#334155' : undefined,
  color: theme === 'dark' ? '#fff' : undefined,
  fontSize: { xs: '10px', sm: '12px' },
  height: { xs: '24px', sm: '28px' },
  maxWidth: { xs: '100%', sm: 'none' },
  '& .MuiChip-label': {
    fontSize: { xs: '10px', sm: '12px' },
    padding: { xs: '0 6px', sm: '0 8px' },
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: { xs: '140px', sm: '180px', md: 'none' },
  },
  flexShrink: 0,
  minWidth: 0,
});
