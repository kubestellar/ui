import { memo } from 'react';
import { Menu, MenuItem } from '@mui/material';
import { useTranslation } from 'react-i18next';
import useTheme from '../../stores/themeStore';
import { ContextMenuState } from './types';

interface TreeViewContextMenuProps {
  contextMenu: ContextMenuState | null;
  onClose: () => void;
  onAction: (action: string) => void;
}

const TreeViewContextMenu = memo<TreeViewContextMenuProps>(({ contextMenu, onClose, onAction }) => {
  const { t } = useTranslation();
  const theme = useTheme(state => state.theme);

  const menuItems = [
    {
      key: 'Details',
      label: t('treeView.contextMenu.details'),
      show: true,
    },
    {
      key: 'Delete',
      label: t('treeView.contextMenu.delete'),
      show: contextMenu?.nodeType !== 'context',
    },
    {
      key: 'Edit',
      label: t('treeView.contextMenu.edit'),
      show: contextMenu?.nodeType !== 'context',
    },
    {
      key: 'Logs',
      label: t('treeView.contextMenu.logs'),
      show: contextMenu?.nodeType !== 'context',
    },
  ];

  return (
    <Menu
      open={Boolean(contextMenu)}
      onClose={onClose}
      anchorReference="anchorPosition"
      anchorPosition={contextMenu ? { top: contextMenu.y, left: contextMenu.x } : undefined}
      PaperProps={{
        style: {
          backgroundColor: theme === 'dark' ? '#1F2937' : '#fff',
          color: theme === 'dark' ? '#fff' : '#333',
          boxShadow:
            theme === 'dark' ? '0 4px 20px rgba(0, 0, 0, 0.5)' : '0 4px 20px rgba(0, 0, 0, 0.15)',
        },
      }}
    >
      {menuItems
        .filter(item => item.show)
        .map(item => (
          <MenuItem
            key={item.key}
            onClick={() => onAction(item.key)}
            sx={{
              color: theme === 'dark' ? '#fff' : '#333',
              '&:hover': {
                backgroundColor:
                  theme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
              },
            }}
          >
            {item.label}
          </MenuItem>
        ))}
    </Menu>
  );
});

TreeViewContextMenu.displayName = 'TreeViewContextMenu';

export default TreeViewContextMenu;
