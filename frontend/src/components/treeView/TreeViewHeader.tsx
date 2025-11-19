import { memo, useRef, useEffect, useState } from 'react';
import { Box, IconButton, Button } from '@mui/material';
import { Plus, Menu, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import useTheme from '../../stores/themeStore';

interface TreeViewHeaderProps {
  viewMode: 'tiles' | 'list';
  onViewModeChange: (mode: 'tiles' | 'list') => void;
  onCreateWorkload: () => void;
  children?: React.ReactNode;
}

const TreeViewHeader = memo<TreeViewHeaderProps>(
  ({ viewMode, onViewModeChange, onCreateWorkload }) => {
    const { t } = useTranslation();
    const theme = useTheme(state => state.theme);
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
      if (!isOpen) return;

      const handleClickOutside = (event: MouseEvent) => {
        if (
          menuRef.current &&
          buttonRef.current &&
          !menuRef.current.contains(event.target as Node) &&
          !buttonRef.current.contains(event.target as Node)
        ) {
          setIsOpen(false);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    return (
      <Box
        sx={{
          position: 'fixed',
          display: 'inline-block',
          marginLeft: 'auto',
          right: 44,
          zIndex: 1000,
        }}
      >
        <IconButton
          ref={buttonRef}
          onClick={() => setIsOpen(!isOpen)}
          sx={{
            padding: 2,
            borderRadius: '50%',
            right: 0,
            width: 56,
            height: 56,
            bgcolor: theme === 'dark' ? 'rgb(15, 23, 42)' : '#fff',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            border:
              theme === 'dark'
                ? '1px solid rgba(144, 202, 249, 0.2)'
                : '1px solid rgba(0, 0, 0, 0.1)',
            '&:hover': {
              bgcolor: theme === 'dark' ? 'rgba(144, 202, 249, 0.1)' : 'rgba(47, 134, 255, 0.05)',
              borderColor:
                theme === 'dark' ? 'rgba(144, 202, 249, 0.4)' : 'rgba(47, 134, 255, 0.3)',
            },
          }}
        >
          {isOpen ? (
            <X size={24} color={theme === 'dark' ? '#90CAF9' : '#2F86FF'} />
          ) : (
            <Menu size={24} color={theme === 'dark' ? '#90CAF9' : '#2F86FF'} />
          )}
        </IconButton>

        <Box
          ref={menuRef}
          sx={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: 1,
            zIndex: 10000,
            width: 320,
            maxWidth: 'calc(100vw - 32px)',
            opacity: isOpen ? 1 : 0,
            visibility: isOpen ? 'visible' : 'hidden',
            transform: isOpen ? 'translateY(0) scale(1)' : 'translateY(-10px) scale(0.95)',
            transition: 'all 0.2s ease-in-out',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'stretch',
            gap: 2,
            padding: 2,
            borderRadius: 2,
            boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
            background: theme === 'dark' ? 'rgb(15, 23, 42)' : '#fff',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, justifyContent: 'center' }}>
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
          </Box>

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
              width: '100%',
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
