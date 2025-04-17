import React from 'react';
import { 
  Box, 
  Typography, 
  CircularProgress, 
  Paper, 
  Divider,
  useTheme,
  alpha,
  Chip,
  Tooltip,
  Button
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { Draggable } from '@hello-pangea/dnd';
import { ManagedCluster } from '../../types/bindingPolicy';
import StrictModeDroppable from './StrictModeDroppable';
import KubernetesIcon from './KubernetesIcon';
import { useNavigate } from 'react-router-dom';

interface ClusterPanelProps {
  clusters: ManagedCluster[];
  loading: boolean;
  error?: string;
  compact?: boolean;
  filteredLabelKeys?: string[];
}

// Group representing a unique label key+value with clusters that share it
interface LabelGroup {
  key: string;
  value: string;
  clusters: Array<{
    name: string;
  }>;
}

const DEFAULT_FILTERED_LABEL_KEYS = [
  'open-cluster-management',
  'kubernetes.io',
  'k8s.io'
];

const ClusterPanel: React.FC<ClusterPanelProps> = ({
  clusters,
  loading,
  error,
  compact = false,
  filteredLabelKeys = DEFAULT_FILTERED_LABEL_KEYS
}) => {
  const theme = useTheme();
  const navigate = useNavigate();

  const handleImportClusters = () => {
    navigate('/its');
  };

  // Extract unique labels from clusters
  const uniqueLabels = React.useMemo(() => {
    const labelMap: Record<string, LabelGroup> = {};
    
    clusters.forEach(cluster => {
      if (cluster.labels && Object.keys(cluster.labels).length > 0) {
        Object.entries(cluster.labels).forEach(([key, value]) => {
          if (filteredLabelKeys.some(pattern => key.includes(pattern))) return;
          
          const labelId = `${key}:${value}`;
          
          if (!labelMap[labelId]) {
            labelMap[labelId] = {
              key,
              value,
              clusters: []
            };
          }
          
          if (!labelMap[labelId].clusters.some(c => c.name === cluster.name)) {
            labelMap[labelId].clusters.push({
              name: cluster.name
            });
          }
        });
      }
    });
    
    return Object.values(labelMap);
  }, [clusters, filteredLabelKeys]);

  const renderLabelItem = (labelGroup: LabelGroup, index: number) => {
    const firstCluster = labelGroup.clusters[0];

    // Format: label-{key}-{value} or label-{key}:{value} if it's a simple label
    let draggableId = '';
    
    // Special handling for common labels we know are important
    if (labelGroup.key === 'location-group' && labelGroup.value === 'edge') {
      draggableId = 'label-location-group:edge';
    } else if (labelGroup.key.includes('/')) {
      draggableId = `label-${labelGroup.key}-${labelGroup.value}`;
    } else {
      draggableId = `label-${labelGroup.key}:${labelGroup.value}`;
    }
    
    console.log(`Creating draggable label: ${draggableId} for ${labelGroup.key}:${labelGroup.value}`);
    
    return (
      <Draggable
        key={`${labelGroup.key}:${labelGroup.value}`}
        draggableId={draggableId}
        index={index}
      >
        {(provided, snapshot) => (
          <Box
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            data-rbd-draggable-id={draggableId}
            data-rfd-draggable-context-id={provided.draggableProps['data-rfd-draggable-context-id']}
            sx={{
              p: 1,
              m: compact ? 0.5 : 1,
              borderRadius: 1,
              backgroundColor: snapshot.isDragging
                ? alpha(theme.palette.primary.main, 0.1)
                : theme.palette.background.paper,
              border: `1px solid ${snapshot.isDragging 
                ? theme.palette.primary.main 
                : theme.palette.divider}`,
              boxShadow: snapshot.isDragging ? 2 : 0,
              '&:hover': {
                backgroundColor: alpha(theme.palette.primary.main, 0.05),
                cursor: 'grab'
              },
              position: 'relative'
            }}
          >
            {/* Position cluster count chip in absolute position */}
            <Tooltip title={`${labelGroup.clusters.length} cluster(s)`}>
              <Chip 
                size="small" 
                label={`${labelGroup.clusters.length}`}
                sx={{ 
                  fontSize: '0.5rem',
                  height: 16,
                  '& .MuiChip-label': { px: 0.5 },
                  bgcolor: alpha(theme.palette.info.main, 0.1),
                  color: theme.palette.info.main,
                  position: 'absolute',
                  top: 4,
                  right: 4
                }}
              />
            </Tooltip>
            
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
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  color: theme.palette.primary.main,
                }}
              />
            </Box>
            
            {/* Cluster summary */}
            <Box sx={{ mt: 0.5 }}>
              <Tooltip 
                title={
                  <React.Fragment>
                    <Typography variant="caption" sx={{ fontWeight: 'bold' }}>Clusters:</Typography>
                    <ul style={{ margin: 0, paddingLeft: '1rem' }}>
                      {labelGroup.clusters.map(c => (
                        <li key={c.name}>{c.name}</li>
                      ))}
                    </ul>
                  </React.Fragment>
                } 
                arrow 
                placement="top"
              >
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {labelGroup.clusters.length === 1 
                    ? firstCluster.name
                    : labelGroup.clusters.length <= 2
                      ? labelGroup.clusters.map(c => c.name).join(', ')
                      : `${labelGroup.clusters.slice(0, 2).map(c => c.name).join(', ')} +${labelGroup.clusters.length - 2} more`}
                </Typography>
              </Tooltip>
            </Box>
          </Box>
        )}
      </Draggable>
    );
  };

  return (
    <Paper 
      elevation={2}
      sx={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        overflow: 'hidden',
        borderRadius: 2,
      }}
    >
      <Box sx={{ p: compact ? 1 : 2, backgroundColor: theme.palette.primary.main, color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <KubernetesIcon type="cluster" size={compact ? 20 : 24} sx={{ mr: 1, color: 'white' }} />
          <Typography variant={compact ? "subtitle1" : "h6"}>Cluster Labels</Typography>
        </Box>
        {!compact && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleImportClusters}
            size="small"
            sx={{ 
              bgcolor: 'white', 
              color: theme.palette.primary.main,
              '&:hover': {
                bgcolor: alpha(theme.palette.common.white, 0.9),
              }
            }}
          >
            Import
          </Button>
        )}
      </Box>
      <Divider />
      
      <Box sx={{ 
        p: compact ? 0.5 : 1, 
        overflow: 'auto', 
        flexGrow: 1,
        '&::-webkit-scrollbar': {
          display: 'none'
        },
        scrollbarWidth: 'none',  
        '-ms-overflow-style': 'none',  
      }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress size={30} />
          </Box>
        ) : error ? (
          <Typography color="error" sx={{ p: 2 }}>
            {error}
          </Typography>
        ) : clusters.length === 0 ? (
          <Typography sx={{ p: 2, color: 'text.secondary', textAlign: 'center' }}>
            No cluster labels available. Please add clusters with labels to use in binding policies.
          </Typography>
        ) : (
          <StrictModeDroppable droppableId="cluster-panel" type="CLUSTER_OR_WORKLOAD">
            {(provided) => (
              <Box
                ref={provided.innerRef}
                {...provided.droppableProps}
                data-rbd-droppable-id="cluster-panel"
                data-rfd-droppable-context-id={provided.droppableProps['data-rfd-droppable-context-id']}
                sx={{ minHeight: '100%' }}
              >
                {uniqueLabels.length === 0 ? (
                  <Typography sx={{ p: 2, color: 'text.secondary', textAlign: 'center' }}>
                    No labels found in available clusters.
                  </Typography>
                ) : (
                  uniqueLabels.map((labelGroup, index) => 
                    renderLabelItem(labelGroup, index)
                  )
                )}
                
                {provided.placeholder}
              </Box>
            )}
          </StrictModeDroppable>
        )}
      </Box>
    </Paper>
  );
};

export default React.memo(ClusterPanel);
