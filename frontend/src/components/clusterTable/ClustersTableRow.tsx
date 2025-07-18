import React from 'react';
import {
  Checkbox,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Fade,
  Tooltip,
  Zoom,
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
import { CloudOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';

import { ManagedClusterInfo, ColorTheme } from './types';

interface ClustersTableRowProps {
  clusters: ManagedClusterInfo[];
  selectedClusters: string[];
  setSelectedClusters: React.Dispatch<React.SetStateAction<string[]>>;
  selectAll: boolean;
  setSelectAll: (selectAll: boolean) => void;
  filterByLabel: Array<{ key: string; value: string }>;
  setFilterByLabel: React.Dispatch<React.SetStateAction<Array<{ key: string; value: string }>>>;
  anchorElActions: { [key: string]: HTMLElement | null };
  setAnchorElActions: React.Dispatch<React.SetStateAction<{ [key: string]: HTMLElement | null }>>;
  setSelectedCluster: (cluster: ManagedClusterInfo | null) => void;
  setEditDialogOpen: (open: boolean) => void;
  setViewDetailsOpen: (open: boolean) => void;
  setDetachClusterOpen: (open: boolean) => void;
  colors: ColorTheme;
  isDark: boolean;
  onCopyName: (clusterName: string) => void;
}

const ClustersTableRow: React.FC<ClustersTableRowProps> = ({
  clusters,
  selectedClusters,
  setSelectedClusters,
  selectAll,
  setSelectAll,
  filterByLabel,
  setFilterByLabel,
  anchorElActions,
  setAnchorElActions,
  setSelectedCluster,
  setEditDialogOpen,
  setViewDetailsOpen,
  setDetachClusterOpen,
  colors,
  isDark,
  onCopyName,
}) => {
  const { t } = useTranslation();

  const handleCheckboxChange = (clusterName: string) => {
    setSelectedClusters(prev =>
      prev.includes(clusterName)
        ? prev.filter(name => name !== clusterName)
        : [...prev, clusterName]
    );
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedClusters([]);
    } else {
      setSelectedClusters(clusters.map(cluster => cluster.name));
    }
    setSelectAll(!selectAll);
  };

  const handleFilterByLabel = (key: string, value: string) => {
    if (filterByLabel.some(item => item.key === key && item.value === value)) {
      setFilterByLabel(prev => prev.filter(item => item.key !== key || item.value !== value));
      toast.success('Label filter removed', { duration: 2000 });
    } else {
      setFilterByLabel(prev => [...prev, { key, value }]);
      toast.success(`Filtering by label: ${key}=${value}`, { duration: 2000 });
    }
  };

  const handleActionsClick = (event: React.MouseEvent<HTMLButtonElement>, clusterName: string) => {
    setAnchorElActions(prev => ({ ...prev, [clusterName]: event.currentTarget }));
  };

  const handleActionsClose = (clusterName: string) => {
    setAnchorElActions(prev => ({ ...prev, [clusterName]: null }));
  };

  const handleViewDetails = (cluster: ManagedClusterInfo) => {
    setSelectedCluster(cluster);
    handleActionsClose(cluster.name);
    setViewDetailsOpen(true);
  };

  const handleEditLabels = (cluster: ManagedClusterInfo) => {
    setSelectedCluster(cluster);
    handleActionsClose(cluster.name);
    setEditDialogOpen(true);
  };

  const handleCopyName = (clusterName: string) => {
    onCopyName(clusterName);
    handleActionsClose(clusterName);
  };

  const handleDetachCluster = (cluster: ManagedClusterInfo) => {
    setSelectedCluster(cluster);
    handleActionsClose(cluster.name);
    setDetachClusterOpen(true);
  };

  const getStatusDisplay = (cluster: ManagedClusterInfo) => {
    const isInactive = cluster.status?.toLowerCase() === 'unavailable' || !cluster.available;
    const isPending = cluster.status?.toLowerCase() === 'pending';

    return {
      backgroundColor: isInactive
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
      color: isInactive ? colors.error : isPending ? colors.warning : colors.success,
      border: isInactive
        ? `1px solid ${isDark ? 'rgba(255, 107, 107, 0.4)' : 'rgba(255, 107, 107, 0.3)'}`
        : isPending
          ? `1px solid ${isDark ? 'rgba(255, 179, 71, 0.4)' : 'rgba(255, 179, 71, 0.3)'}`
          : `1px solid ${isDark ? 'rgba(103, 192, 115, 0.4)' : 'rgba(103, 192, 115, 0.3)'}`,
      text: isInactive
        ? t('clusters.status.inactive')
        : isPending
          ? t('clusters.status.pending')
          : t('clusters.status.active'),
      dotColor: isInactive ? colors.error : isPending ? colors.warning : colors.success,
    };
  };

  return (
    <>
      <TableHead>
        <TableRow
          sx={{
            background: colors.primary,
            '& .MuiTableCell-head': {
              color: colors.white,
              fontWeight: 600,
              padding: '16px',
              fontSize: '0.95rem',
            },
          }}
        >
          <TableCell>
            <Checkbox
              checked={selectAll}
              onChange={handleSelectAll}
              sx={{
                color: colors.white,
                '&.Mui-checked': { color: colors.white },
              }}
            />
          </TableCell>
          <TableCell>{t('clusters.table.name')}</TableCell>
          <TableCell>{t('clusters.table.labels')}</TableCell>
          <TableCell>{t('clusters.table.creationTime')}</TableCell>
          <TableCell>{t('clusters.table.context')}</TableCell>
          <TableCell>{t('clusters.table.status')}</TableCell>
          <TableCell>{t('clusters.table.actions')}</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {clusters.length > 0 ? (
          clusters.map((cluster, index) => {
            const statusDisplay = getStatusDisplay(cluster);

            return (
              <Fade in={true} timeout={100 + index * 50} key={cluster.name}>
                <TableRow
                  sx={{
                    backgroundColor: colors.paper,
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      backgroundColor: isDark
                        ? 'rgba(47, 134, 255, 0.08)'
                        : 'rgba(47, 134, 255, 0.04)',
                      transform: 'translateY(-2px)',
                      boxShadow: isDark
                        ? '0 4px 8px -2px rgba(0, 0, 0, 0.2)'
                        : '0 4px 8px -2px rgba(0, 0, 0, 0.1)',
                    },
                    '& .MuiTableCell-body': {
                      color: colors.text,
                      borderColor: colors.border,
                      padding: '16px',
                      fontSize: '0.95rem',
                    },
                    position: 'relative',
                    '&::after': selectedClusters.includes(cluster.name)
                      ? {
                          content: '""',
                          position: 'absolute',
                          left: 0,
                          top: 0,
                          height: '100%',
                          width: '3px',
                          backgroundColor: colors.primary,
                          borderTopLeftRadius: '4px',
                          borderBottomLeftRadius: '4px',
                        }
                      : {},
                  }}
                >
                  <TableCell>
                    <Checkbox
                      checked={selectedClusters.includes(cluster.name)}
                      onChange={() => handleCheckboxChange(cluster.name)}
                      sx={{
                        color: colors.textSecondary,
                        '&.Mui-checked': {
                          color: colors.primary,
                        },
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="text-base font-medium">{cluster.name}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        {cluster.labels && Object.keys(cluster.labels).length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(cluster.labels).map(([key, value]) => (
                              <Tooltip
                                key={`${key}-${value}`}
                                title={t('clusters.filteredByLabel')}
                                arrow
                                placement="top"
                                TransitionComponent={Zoom}
                              >
                                <span
                                  onClick={() => handleFilterByLabel(key, value)}
                                  style={{
                                    backgroundColor: filterByLabel.some(
                                      item => item.key === key && item.value === value
                                    )
                                      ? isDark
                                        ? 'rgba(47, 134, 255, 0.3)'
                                        : 'rgba(47, 134, 255, 0.15)'
                                      : isDark
                                        ? 'rgba(47, 134, 255, 0.15)'
                                        : 'rgba(47, 134, 255, 0.08)',
                                    color: colors.primary,
                                    border: `1px solid ${
                                      filterByLabel.some(
                                        item => item.key === key && item.value === value
                                      )
                                        ? colors.primary
                                        : isDark
                                          ? 'rgba(47, 134, 255, 0.4)'
                                          : 'rgba(47, 134, 255, 0.3)'
                                    }`,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                  }}
                                  className="rounded-md px-2 py-1 text-xs font-medium hover:scale-105 hover:shadow-md"
                                >
                                  {key}={value}
                                </span>
                              </Tooltip>
                            ))}
                          </div>
                        ) : (
                          <span style={{ color: colors.textSecondary, fontStyle: 'italic' }}>
                            {t('clusters.labels.noLabels')}
                          </span>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {cluster.creationTime || cluster.creationTimestamp
                      ? new Date(
                          cluster.creationTime || cluster.creationTimestamp || ''
                        ).toLocaleString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'N/A'}
                  </TableCell>
                  <TableCell>
                    <span
                      style={{
                        backgroundColor: isDark
                          ? 'rgba(103, 192, 115, 0.2)'
                          : 'rgba(103, 192, 115, 0.1)',
                        color: isDark ? 'rgb(154, 214, 249)' : 'rgb(47, 134, 255)',
                        border: `1px solid ${isDark ? 'rgba(103, 192, 115, 0.4)' : 'rgba(103, 192, 115, 0.3)'}`,
                        display: 'inline-block',
                        maxWidth: '200px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        verticalAlign: 'middle',
                      }}
                      className="rounded-lg px-2 py-1 text-xs font-medium"
                      title={cluster.name}
                    >
                      {cluster.name}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span
                      className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium"
                      style={{
                        backgroundColor: statusDisplay.backgroundColor,
                        color: statusDisplay.color,
                        border: statusDisplay.border,
                      }}
                    >
                      <span
                        className="h-3 w-3 animate-pulse rounded-full"
                        style={{ backgroundColor: statusDisplay.dotColor }}
                      />
                      {statusDisplay.text}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end">
                      <IconButton
                        aria-label="more"
                        id={`actions-button-${cluster.name}`}
                        onClick={event => handleActionsClick(event, cluster.name)}
                        size="small"
                        style={{
                          color: colors.textSecondary,
                          backgroundColor: isDark
                            ? 'rgba(47, 134, 255, 0.08)'
                            : 'rgba(47, 134, 255, 0.05)',
                        }}
                        className="transition-all duration-200 hover:scale-110"
                      >
                        <MoreVertIcon fontSize="small" />
                      </IconButton>
                      <Menu
                        id={`actions-menu-${cluster.name}`}
                        anchorEl={anchorElActions[cluster.name]}
                        open={Boolean(anchorElActions[cluster.name])}
                        onClose={() => handleActionsClose(cluster.name)}
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                        PaperProps={{
                          style: {
                            backgroundColor: colors.paper,
                            border: `1px solid ${colors.border}`,
                            borderRadius: '8px',
                          },
                        }}
                      >
                        <MenuItem
                          onClick={() => handleViewDetails(cluster)}
                          sx={{ color: colors.text }}
                        >
                          <ListItemIcon>
                            <VisibilityIcon fontSize="small" style={{ color: colors.primary }} />
                          </ListItemIcon>
                          <ListItemText>{t('clusters.actions.viewDetails')}</ListItemText>
                        </MenuItem>

                        <MenuItem
                          onClick={() => handleEditLabels(cluster)}
                          sx={{ color: colors.text }}
                        >
                          <ListItemIcon>
                            <LabelIcon fontSize="small" style={{ color: colors.primary }} />
                          </ListItemIcon>
                          <ListItemText>{t('clusters.actions.editLabels')}</ListItemText>
                        </MenuItem>

                        <MenuItem
                          onClick={() => handleCopyName(cluster.name)}
                          sx={{ color: colors.text }}
                        >
                          <ListItemIcon>
                            <ContentCopyIcon fontSize="small" style={{ color: colors.primary }} />
                          </ListItemIcon>
                          <ListItemText>{t('clusters.actions.copyName')}</ListItemText>
                        </MenuItem>

                        <Divider />

                        <MenuItem
                          onClick={() => handleDetachCluster(cluster)}
                          sx={{ color: colors.error }}
                        >
                          <ListItemIcon>
                            <LinkOffIcon fontSize="small" style={{ color: colors.error }} />
                          </ListItemIcon>
                          <ListItemText>{t('clusters.actions.detachCluster')}</ListItemText>
                        </MenuItem>
                      </Menu>
                    </div>
                  </TableCell>
                </TableRow>
              </Fade>
            );
          })
        ) : (
          <TableRow>
            <TableCell colSpan={7} className="py-16">
              <div className="animate-fadeIn flex flex-col items-center justify-center p-8 text-center">
                <CloudOff size={64} style={{ color: colors.textSecondary, opacity: 0.6 }} />
                <h3 style={{ color: colors.text }} className="mb-3 text-xl font-semibold">
                  {t('clusters.noClustersFound')}
                </h3>
                <p style={{ color: colors.textSecondary }} className="mb-6 max-w-md text-base">
                  {t('clusters.noClustersAvailable')}
                </p>
              </div>
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </>
  );
};

export default ClustersTableRow;
