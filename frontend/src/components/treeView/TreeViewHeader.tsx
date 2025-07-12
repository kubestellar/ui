import { memo } from 'react';
import { Box, Typography, IconButton, Button } from '@mui/material';
import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import useTheme from '../../stores/themeStore';

interface TreeViewHeaderProps {
  viewMode: 'tiles' | 'list';
  onViewModeChange: (mode: 'tiles' | 'list') => void;
  onCreateWorkload: () => void;
  children?: React.ReactNode;
}

const TreeViewHeader = memo<TreeViewHeaderProps>(
  ({ viewMode, onViewModeChange, onCreateWorkload, children }) => {
    const { t } = useTranslation();
    const theme = useTheme(state => state.theme);

    return (
      <Box
        sx={{
          mb: 4,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          flex: 1,
          justifyContent: 'space-between',
          padding: 2,
          borderRadius: 1,
          boxShadow: '0 6px 6px rgba(0,0,0,0.1)',
          background: theme === 'dark' ? 'rgb(15, 23, 42)' : '#fff',
        }}
      >
        <Typography
          variant="h4"
          sx={{
            color: '#4498FF',
            fontWeight: 700,
            fontSize: '30px',
            letterSpacing: '0.5px',
          }}
        >
          {t('treeView.title')}
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {children}

          <IconButton
            color={viewMode === 'tiles' ? 'primary' : 'default'}
            onClick={() => onViewModeChange('tiles')}
            sx={{
              padding: 1,
              borderRadius: '50%',
              width: 40,
              height: 40,
              bgcolor:
                theme === 'dark' && viewMode === 'tiles'
                  ? 'rgba(144, 202, 249, 0.15)'
                  : 'transparent',
              '&:hover': {
                bgcolor: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
              },
            }}
          >
            <span>
              <i
                className="fa fa-th menu_icon"
                title={t('treeView.viewModes.tiles')}
                style={{
                  color:
                    theme === 'dark' ? (viewMode === 'tiles' ? '#90CAF9' : '#FFFFFF') : undefined,
                }}
              />
            </span>
          </IconButton>

          <IconButton
            color={viewMode === 'list' ? 'primary' : 'default'}
            onClick={() => onViewModeChange('list')}
            sx={{
              padding: 1,
              borderRadius: '50%',
              width: 40,
              height: 40,
              bgcolor:
                theme === 'dark' && viewMode === 'list'
                  ? 'rgba(144, 202, 249, 0.15)'
                  : 'transparent',
              '&:hover': {
                bgcolor: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
              },
            }}
          >
            <span>
              <i
                className="fa fa-th-list selected menu_icon"
                title={t('treeView.viewModes.list')}
                style={{
                  color:
                    theme === 'dark' ? (viewMode === 'list' ? '#90CAF9' : '#FFFFFF') : undefined,
                }}
              />
            </span>
          </IconButton>

          <Button
            variant="outlined"
            startIcon={<Plus size={20} />}
            onClick={onCreateWorkload}
            sx={{
              color: '#FFFFFF',
              backgroundColor: '#2F86FF',
              padding: '8px 20px',
              fontWeight: '600',
              borderRadius: '8px',
              textTransform: 'none',
            }}
          >
            {t('treeView.createWorkload')}
          </Button>
        </Box>
      </Box>
    );
  }
);

TreeViewHeader.displayName = 'TreeViewHeader';

export default TreeViewHeader;
