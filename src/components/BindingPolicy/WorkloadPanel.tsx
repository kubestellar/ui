import React from 'react';
import { 
  Box, 
  Typography, 
  CircularProgress, 
  Paper, 
  Divider,
  useTheme,
  alpha,
  Button
} from '@mui/material';
import { Draggable } from '@hello-pangea/dnd';
import { Workload } from '../../types/bindingPolicy';
import StrictModeDroppable from './StrictModeDroppable';
import KubernetesIcon from './KubernetesIcon';
import AddIcon from '@mui/icons-material/Add';
import { useNavigate } from 'react-router-dom';

interface WorkloadPanelProps {
  workloads: Workload[];
  loading: boolean;
  error?: string;
}

const WorkloadPanel: React.FC<WorkloadPanelProps> = ({
  workloads,
  loading,
  error
}) => {
  const theme = useTheme();
  const navigate = useNavigate();

  const handleCreateWorkload = () => {
    navigate('/workloads/manage');
  };

  const renderWorkloadItem = (workload: Workload, index: number) => {
    return (
      <Draggable
        key={workload.name}
        draggableId={`workload-${workload.name}`}
        index={index}
      >
        {(provided, snapshot) => (
          <Box
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            data-rbd-draggable-id={`workload-${workload.name}`}
            data-rbd-draggable-context-id={provided.draggableProps['data-rfd-draggable-context-id']}
            sx={{
              p: 1,
              m: 1,
              borderRadius: 1,
              backgroundColor: snapshot.isDragging
                ? alpha(theme.palette.secondary.main, 0.1)
                : theme.palette.background.paper,
              border: `1px solid ${snapshot.isDragging 
                ? theme.palette.secondary.main 
                : theme.palette.divider}`,
              boxShadow: snapshot.isDragging ? 2 : 0,
              '&:hover': {
                backgroundColor: alpha(theme.palette.secondary.main, 0.05),
                cursor: 'grab'
              }
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <KubernetesIcon type="workload" size={24} sx={{ mr: 1 }} />
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {workload.name}
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
        borderRadius: 2
      }}
    >
      <Box sx={{ p: 2, backgroundColor: theme.palette.secondary.main, color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <KubernetesIcon type="workload" size={24} sx={{ mr: 1, color: 'white' }} />
          <Typography variant="h6">Workloads</Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreateWorkload}
          size="small"
          sx={{ 
            bgcolor: 'white', 
            color: theme.palette.secondary.main,
            '&:hover': {
              bgcolor: alpha(theme.palette.common.white, 0.9),
            }
          }}
        >
          Create
        </Button>
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
        ) : workloads.length === 0 ? (
          <Typography sx={{ p: 2, color: 'text.secondary', textAlign: 'center' }}>
            No workloads available
          </Typography>
        ) : (
          <StrictModeDroppable droppableId="workload-panel" type="CLUSTER_OR_WORKLOAD">
            {(provided) => (
              <Box
                ref={provided.innerRef}
                {...provided.droppableProps}
                data-rbd-droppable-id="workload-panel"
                data-rbd-droppable-context-id={provided.droppableProps['data-rfd-droppable-context-id']}
                sx={{ minHeight: '100%' }}
              >
                {workloads.length === 0 ? (
                  <Typography sx={{ p: 2, color: 'text.secondary', textAlign: 'center' }}>
                    All workloads are on the canvas
                  </Typography>
                ) : (
                  workloads.map((workload, index) => renderWorkloadItem(workload, index))
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

export default React.memo(WorkloadPanel); 