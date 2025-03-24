import React from 'react';
import { 
  Box, 
  Typography, 
  CircularProgress, 
  Paper, 
  Divider,
  useTheme,
  alpha
} from '@mui/material';
import { Draggable } from '@hello-pangea/dnd';
import { ManagedCluster } from '../../types/bindingPolicy';
import StrictModeDroppable from './StrictModeDroppable';
import KubernetesIcon from './KubernetesIcon';

interface ClusterPanelProps {
  clusters: ManagedCluster[];
  loading: boolean;
  error?: string;
}

const ClusterPanel: React.FC<ClusterPanelProps> = ({
  clusters,
  loading,
  error
}) => {
  const theme = useTheme();

  const renderClusterItem = (cluster: ManagedCluster, index: number) => {
    return (
      <Draggable
        key={cluster.name}
        draggableId={`cluster-${cluster.name}`}
        index={index}
      >
        {(provided, snapshot) => (
          <Box
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            data-rbd-draggable-id={`cluster-${cluster.name}`}
            data-rfd-draggable-context-id={provided.draggableProps['data-rfd-draggable-context-id']}
            sx={{
              p: 1,
              m: 1,
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
              }
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <KubernetesIcon type="cluster" size={24} sx={{ mr: 1 }} />
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {cluster.name}
              </Typography>
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
      <Box sx={{ p: 2, backgroundColor: theme.palette.primary.main, color: 'white' }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <KubernetesIcon type="cluster" size={24} sx={{ mr: 1, color: 'white' }} />
          <Typography variant="h6">Clusters</Typography>
        </Box>
      </Box>
      <Divider />
      
      <Box sx={{ 
        p: 1, 
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
            No clusters available
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
                {clusters.length === 0 ? (
                  <Typography sx={{ p: 2, color: 'text.secondary', textAlign: 'center' }}>
                    All clusters are on the canvas
                  </Typography>
                ) : (
                  clusters.map((cluster, index) => renderClusterItem(cluster, index))
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