import React from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Chip,
  Tooltip,
  IconButton,
  alpha,
  List,
  ListItem,
  ListItemText,
  useTheme as useMuiTheme,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import EditIcon from '@mui/icons-material/Edit';
import { ManagedCluster } from '../../types/bindingPolicy';
import { usePolicyDragDropStore } from '../../stores/policyDragDropStore';
import useTheme from '../../stores/themeStore';

// Group representing a unique label key+value with clusters that share it
interface LabelGroup {
  key: string;
  value: string;
  clusters: Array<{
    name: string;
  }>;
}

interface ClusterLabelsListProps {
  clusters: ManagedCluster[];
  filteredLabels: LabelGroup[];
  loading: boolean;
  error?: string;
  compact?: boolean;
  searchTerm: string;
  onItemClick?: (clusterId: string) => void;
  onEditCluster: (cluster: ManagedCluster) => void;
}

const ClusterLabelsList: React.FC<ClusterLabelsListProps> = ({
  clusters,
  filteredLabels,
  loading,
  error,
  compact = false,
  searchTerm,
  onItemClick,
  onEditCluster,
}) => {
  const muiTheme = useMuiTheme();
  const theme = useTheme(state => state.theme);
  const isDarkTheme = theme === 'dark';

  const renderLabelItem = (labelGroup: LabelGroup) => {
    const firstCluster = labelGroup.clusters[0];

    // Format: label-{key}-{value} or label-{key}:{value} if it's a simple label
    let itemId = '';

    // Special handling for common labels we know are important
    if (labelGroup.key === 'location-group' && labelGroup.value === 'edge') {
      itemId = 'label-location-group:edge';
    } else if (labelGroup.key.includes('/')) {
      itemId = `label-${labelGroup.key}-${labelGroup.value}`;
    } else {
      itemId = `label-${labelGroup.key}:${labelGroup.value}`;
    }

    // Check if this item is in the canvas
    const { canvasEntities } = usePolicyDragDropStore.getState();
    const isInCanvas = canvasEntities.clusters.includes(itemId);

    // Find the full cluster objects for each cluster in this label group
    const clusterObjects = labelGroup.clusters
      .map(c => clusters.find(cluster => cluster.name === c.name))
      .filter((c): c is ManagedCluster => c !== undefined);

    return (
      <Box
        key={`${labelGroup.key}:${labelGroup.value}`}
        onClick={() => {
          if (onItemClick) {
            if (isInCanvas) {
              console.log(`⚠️ Cluster ${itemId} is already in the canvas`);
              return;
            }

            onItemClick(itemId);
          }
        }}
        sx={{
          p: 1,
          m: compact ? 0.5 : 1,
          borderRadius: 1,
          backgroundColor: isDarkTheme
            ? 'rgba(30, 41, 59, 0.8)'
            : muiTheme.palette.background.paper,
          border: `1px solid ${isDarkTheme ? 'rgba(255, 255, 255, 0.12)' : muiTheme.palette.divider}`,
          boxShadow: 0,
          cursor: 'pointer',
          position: 'relative',
          transition: 'all 0.2s ease',
          '&:hover': {
            backgroundColor: isDarkTheme
              ? 'rgba(30, 41, 59, 0.95)'
              : alpha(muiTheme.palette.primary.main, 0.1),
            boxShadow: 2,
            transform: 'translateY(-2px)',
          },
        }}
      >
        {/* Position cluster count chip and edit button  */}
        <Box sx={{ position: 'absolute', top: 4, right: 4, display: 'flex', gap: 0.5 }}>
          <Tooltip title="Edit clusters with this label">
            <IconButton
              size="small"
              onClick={e => {
                e.stopPropagation();

                if (clusterObjects.length === 1) {
                  // If only one cluster, edit it directly
                  onEditCluster(clusterObjects[0]);
                }
              }}
              sx={{
                p: 0.5,
                bgcolor: isDarkTheme
                  ? alpha(muiTheme.palette.primary.main, 0.2)
                  : alpha(muiTheme.palette.primary.main, 0.1),
                color: isDarkTheme ? muiTheme.palette.primary.light : muiTheme.palette.primary.main,
                '&:hover': {
                  bgcolor: isDarkTheme
                    ? alpha(muiTheme.palette.primary.main, 0.3)
                    : alpha(muiTheme.palette.primary.main, 0.2),
                },
              }}
            >
              <EditIcon sx={{ fontSize: '0.9rem' }} />
            </IconButton>
          </Tooltip>

          <Tooltip title={`${labelGroup.clusters.length} cluster(s)`}>
            <Chip
              size="small"
              label={`${labelGroup.clusters.length}`}
              sx={{
                fontSize: '0.8rem',
                height: 16,
                '& .MuiChip-label': { px: 0.5 },
                bgcolor: isDarkTheme
                  ? alpha(muiTheme.palette.info.main, 0.2)
                  : alpha(muiTheme.palette.info.main, 0.1),
                color: isDarkTheme ? muiTheme.palette.info.light : muiTheme.palette.info.main,
              }}
            />
          </Tooltip>
        </Box>

        {/* Label value */}
        <Box sx={{ mt: 0.5 }}>
          <Chip
            size="small"
            label={`${labelGroup.key} = ${labelGroup.value}`}
            sx={{
              fontSize: '1rem',
              height: 20,
              '& .MuiChip-label': {
                px: 0.75,
                textOverflow: 'ellipsis',
                overflow: 'hidden',
              },
              bgcolor: isDarkTheme
                ? alpha(muiTheme.palette.primary.main, 0.2)
                : alpha(muiTheme.palette.primary.main, 0.1),
              color: isDarkTheme ? muiTheme.palette.primary.light : muiTheme.palette.primary.main,
            }}
          />
        </Box>
        {/* Cluster summary with edit buttons */}
        <Box sx={{ mt: 0.5 }}>
          <Tooltip
            title={
              <React.Fragment>
                <Typography variant="caption" sx={{ fontWeight: 'bold' }} component="div">
                  Clusters:
                </Typography>
                <List
                  dense
                  sx={{
                    m: 0,
                    p: 0,
                    pl: 1,
                    maxHeight: '150px',
                    overflow: 'auto',
                    '&::-webkit-scrollbar': { width: '4px' },
                    '&::-webkit-scrollbar-thumb': {
                      background: isDarkTheme ? alpha('#ffffff', 0.2) : alpha('#000000', 0.2),
                      borderRadius: '4px',
                    },
                  }}
                >
                  {clusterObjects.map(cluster => (
                    <ListItem
                      key={cluster.name}
                      disablePadding
                      secondaryAction={
                        <IconButton
                          edge="end"
                          size="small"
                          onClick={e => {
                            e.stopPropagation();
                            e.preventDefault();
                            onEditCluster(cluster);
                          }}
                          sx={{ p: 0.5 }}
                        >
                          <EditIcon fontSize="inherit" />
                        </IconButton>
                      }
                    >
                      <ListItemText
                        primary={cluster.name}
                        sx={{ m: 0 }}
                        primaryTypographyProps={{
                          variant: 'caption',
                          component: 'div',
                          style: {
                            display: 'block',
                            maxWidth: '180px',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          },
                        }}
                      />
                    </ListItem>
                  ))}
                </List>
              </React.Fragment>
            }
            arrow
            placement="top"
          >
            <Typography
              variant="caption"
              sx={{
                color: isDarkTheme ? 'rgba(255, 255, 255, 0.7)' : 'text.secondary',
              }}
            >
              {labelGroup.clusters.length === 1
                ? firstCluster.name
                : labelGroup.clusters.length <= 2
                  ? labelGroup.clusters.map(c => c.name).join(', ')
                  : `${labelGroup.clusters
                      .slice(0, 2)
                      .map(c => c.name)
                      .join(', ')} +${labelGroup.clusters.length - 2} more`}
            </Typography>
          </Tooltip>
        </Box>

        {isInCanvas && (
          <CheckCircleIcon
            sx={{
              position: 'absolute',
              bottom: 4,
              right: 4,
              fontSize: '1.2rem',
              color: muiTheme.palette.success.main,
              backgroundColor: isDarkTheme
                ? 'rgba(17, 25, 40, 0.8)'
                : alpha(muiTheme.palette.background.paper, 0.7),
              borderRadius: '50%',
            }}
          />
        )}
      </Box>
    );
  };

  return (
    <Box
      sx={{
        p: compact ? 0.5 : 1,
        overflow: 'auto',
        flexGrow: 1,
        '&::-webkit-scrollbar': {
          display: 'none',
        },
        scrollbarWidth: 'none',
        '-ms-overflow-style': 'none',
        backgroundColor: isDarkTheme ? 'rgba(17, 25, 40, 0.8)' : 'transparent',
      }}
    >
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress
            size={30}
            sx={{
              color: isDarkTheme ? '#60a5fa' : undefined,
            }}
          />
        </Box>
      ) : error ? (
        <Typography color="error" sx={{ p: 2 }}>
          {error}
        </Typography>
      ) : clusters.length === 0 ? (
        <Typography
          sx={{
            p: 2,
            color: isDarkTheme ? 'rgba(255, 255, 255, 0.7)' : 'text.secondary',
            textAlign: 'center',
          }}
        >
          No cluster labels available. Please add clusters with labels to use in binding policies.
        </Typography>
      ) : (
        <Box sx={{ minHeight: '100%' }}>
          {filteredLabels.length === 0 ? (
            <Typography
              sx={{
                p: 2,
                color: isDarkTheme ? 'rgba(255, 255, 255, 0.7)' : 'text.secondary',
                textAlign: 'center',
              }}
            >
              {searchTerm
                ? 'No labels match your search.'
                : 'No labels found in available clusters.'}
            </Typography>
          ) : (
            filteredLabels.map(labelGroup => renderLabelItem(labelGroup))
          )}
        </Box>
      )}
    </Box>
  );
};

export default ClusterLabelsList;
