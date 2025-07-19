import {
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import VisibilityIcon from '@mui/icons-material/Visibility';
import LabelIcon from '@mui/icons-material/Label';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import { useTranslation } from 'react-i18next';
import { ColorTheme, ManagedClusterInfo } from '../types';
import { toast } from 'react-hot-toast';

interface ActionMenuProps {
  cluster: ManagedClusterInfo;
  anchorEl: HTMLElement | null;
  onClose: () => void;
  onViewDetails: (cluster: ManagedClusterInfo) => void;
  onEditLabels: (cluster: ManagedClusterInfo) => void;
  onDetachCluster: (cluster: ManagedClusterInfo) => void;
  isDark: boolean;
  colors: ColorTheme;
}

const ActionMenu: React.FC<ActionMenuProps> = ({
  cluster,
  anchorEl,
  onClose,
  onViewDetails,
  onEditLabels,
  onDetachCluster,
  isDark,
  colors,
}) => {
  const { t } = useTranslation();

  const handleCopyName = (clusterName: string) => {
    navigator.clipboard.writeText(clusterName);
    onClose();
    toast.success(`Cluster name copied to clipboard: ${clusterName}`, {
      duration: 2000,
    });
  };

  return (
    <Menu
      id={`actions-menu-${cluster.name}`}
      anchorEl={anchorEl}
      open={Boolean(anchorEl)}
      onClose={onClose}
      MenuListProps={{
        'aria-labelledby': `actions-button-${cluster.name}`,
      }}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'right',
      }}
      transformOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
      PaperProps={{
        style: {
          backgroundColor: colors.paper,
          border: `1px solid ${colors.border}`,
          boxShadow: isDark
            ? '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.4)'
            : '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
          borderRadius: '8px',
        },
      }}
    >
      <MenuItem onClick={() => onViewDetails(cluster)} sx={{ color: colors.text }}>
        <ListItemIcon>
          <VisibilityIcon fontSize="small" style={{ color: colors.primary }} />
        </ListItemIcon>
        <ListItemText>{t('clusters.actions.viewDetails')}</ListItemText>
      </MenuItem>

      <MenuItem onClick={() => onEditLabels(cluster)} sx={{ color: colors.text }}>
        <ListItemIcon>
          <LabelIcon fontSize="small" style={{ color: colors.primary }} />
        </ListItemIcon>
        <ListItemText>{t('clusters.actions.editLabels')}</ListItemText>
      </MenuItem>

      <MenuItem onClick={() => handleCopyName(cluster.name)} sx={{ color: colors.text }}>
        <ListItemIcon>
          <ContentCopyIcon fontSize="small" style={{ color: colors.primary }} />
        </ListItemIcon>
        <ListItemText>{t('clusters.actions.copyName')}</ListItemText>
      </MenuItem>

      <Divider />

      <MenuItem onClick={() => onDetachCluster(cluster)} sx={{ color: colors.error }}>
        <ListItemIcon>
          <LinkOffIcon fontSize="small" style={{ color: colors.error }} />
        </ListItemIcon>
        <ListItemText>{t('clusters.actions.detachCluster')}</ListItemText>
      </MenuItem>
    </Menu>
  );
};

export const ActionButton: React.FC<{
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  colors: ColorTheme;
  isDark: boolean;
}> = ({ onClick, colors, isDark }) => (
  <IconButton
    aria-label="more"
    onClick={onClick}
    size="small"
    style={{
      color: colors.textSecondary,
      backgroundColor: isDark ? 'rgba(47, 134, 255, 0.08)' : 'rgba(47, 134,255, 0.05)',
    }}
    className="transition-all duration-200 hover:scale-110 hover:bg-opacity-80"
  >
    <MoreVertIcon fontSize="small" />
  </IconButton>
);

export default ActionMenu; 