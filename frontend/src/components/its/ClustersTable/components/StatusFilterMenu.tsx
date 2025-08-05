import { Menu, MenuItem, Typography, Box, Fade } from '@mui/material';
import { ColorTheme, StatusFilterItem } from '../types';

interface StatusFilterMenuProps {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  onFilterChange: (value: string) => void;
  currentFilter: string;
  statusFilterItems: StatusFilterItem[];
  isDark: boolean;
  colors: ColorTheme;
}

const StatusFilterMenu: React.FC<StatusFilterMenuProps> = ({
  anchorEl,
  open,
  onClose,
  onFilterChange,
  currentFilter,
  statusFilterItems,
  isDark,
  colors,
}) => {
  return (
    <Menu
      id="status-filter-menu"
      anchorEl={anchorEl}
      open={open}
      onClose={onClose}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'left',
      }}
      transformOrigin={{
        vertical: 'top',
        horizontal: 'left',
      }}
      PaperProps={{
        style: {
          backgroundColor: colors.paper,
          borderRadius: '12px',
          minWidth: '220px',
          border: `1px solid ${colors.border}`,
          boxShadow: isDark
            ? '0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.2)'
            : '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
          marginTop: '8px',
          padding: '8px',
          overflow: 'hidden',
        },
      }}
      TransitionComponent={Fade}
      transitionDuration={200}
    >
      {statusFilterItems.map(item => (
        <MenuItem
          key={item.value}
          onClick={() => {
            onFilterChange(item.value);
            onClose();
          }}
          selected={currentFilter === item.value}
          sx={{
            color: colors.text,
            backgroundColor:
              currentFilter === item.value
                ? isDark
                  ? 'rgba(47, 134, 255, 0.15)'
                  : 'rgba(47, 134, 255, 0.1)'
                : 'transparent',
            borderRadius: '8px',
            margin: '3px 0',
            padding: '10px 16px',
            transition: 'all 0.15s ease',
            '&:hover': {
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(0, 0, 0, 0.04)',
              transform: 'translateX(4px)',
            },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 1.5 }}>
            {item.value && (
              <Box
                sx={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  backgroundColor: item.color,
                  flexShrink: 0,
                  transition: 'transform 0.2s ease',
                  transform: currentFilter === item.value ? 'scale(1.2)' : 'scale(1)',
                }}
              />
            )}
            <Typography
              variant="body2"
              sx={{
                fontWeight: currentFilter === item.value ? 600 : 400,
                transition: 'all 0.15s ease',
                color: currentFilter === item.value ? colors.primary : colors.text,
              }}
            >
              {item.label}
            </Typography>
          </Box>
        </MenuItem>
      ))}
    </Menu>
  );
};

export default StatusFilterMenu;
