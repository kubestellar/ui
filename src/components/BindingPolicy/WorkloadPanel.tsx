import React, {useState} from 'react';
import { 
  Box, 
  Typography, 
  CircularProgress, 
  Paper, 
  Divider,
  useTheme,
  alpha,
  Button,
  Chip,
  Tooltip,
  InputBase,
  IconButton
} from '@mui/material';
import { Draggable } from '@hello-pangea/dnd';
import { Workload } from '../../types/bindingPolicy';
import StrictModeDroppable from './StrictModeDroppable';
import KubernetesIcon from './KubernetesIcon';
import AddIcon from '@mui/icons-material/Add';
import { useNavigate } from 'react-router-dom';
import CloseIcon from '@mui/icons-material/Close';
import { SearchIcon } from 'lucide-react';


interface WorkloadPanelProps {
  workloads: Workload[];
  loading: boolean;
  error?: string;
  compact?: boolean;
}

// Group representing a unique label key+value with workloads that share it
interface LabelGroup {
  key: string;
  value: string;
  workloads: Array<{
    name: string;
    kind: string;
    namespace: string;
  }>;
}

const WorkloadPanel: React.FC<WorkloadPanelProps> = ({
  workloads,
  loading,
  error,
  compact = false
}) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [showSearch, setShowSearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const handleCreateWorkload = () => {
    navigate('/workloads/manage');
  };

  // Extract unique labels from workloads
  const uniqueLabels = React.useMemo(() => {
    const labelMap: Record<string, LabelGroup> = {};
    
    workloads.forEach(workload => {
      if (workload.labels && Object.keys(workload.labels).length > 0) {
        Object.entries(workload.labels).forEach(([key, value]) => {
          const labelId = `${key}:${value}`;
          
          if (!labelMap[labelId]) {
            labelMap[labelId] = {
              key,
              value,
              workloads: []
            };
          }
          
          if (!labelMap[labelId].workloads.some(w => 
              w.name === workload.name && 
              w.namespace === (workload.namespace || 'default')
          )) {
            labelMap[labelId].workloads.push({
              name: workload.name,
              kind: workload.kind,
              namespace: workload.namespace || 'default'
            });
          }
        });
      }
    });
    
    return Object.values(labelMap);
  }, [workloads]);
  
// Filter labels based on search term
  const filteredLabels = React.useMemo(() => {
    if (!searchTerm) return uniqueLabels;
    
    return uniqueLabels.filter(label => 
      label.key.toLowerCase().includes(searchTerm.toLowerCase()) || 
      label.value.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [uniqueLabels, searchTerm]);

  // Render a label item
  const renderLabelItem = (labelGroup: LabelGroup, index: number) => {
    // Use first workload for the draggable ID
    const firstWorkload = labelGroup.workloads[0];
    
    return (
      <Draggable
        key={`${labelGroup.key}:${labelGroup.value}`}
        draggableId={`label-${labelGroup.key}-${labelGroup.value}`}
        index={index}
      >
        {(provided, snapshot) => (
          <Box
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            data-rbd-draggable-id={`label-${labelGroup.key}-${labelGroup.value}`}
            data-rfd-draggable-context-id={provided.draggableProps['data-rfd-draggable-context-id']}
            sx={{
              p: 1,
              m: compact ? 0.5 : 1,
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
            {/* Label key as the primary display */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Chip
                size="small"
                label={labelGroup.workloads[0].kind}
                sx={{ 
                  fontSize: '0.75rem',
                  maxWidth: '70%',
                  height: 24,
                  '& .MuiChip-label': { 
                    px: 1,
                    textOverflow: 'ellipsis',
                    overflow: 'hidden',
                    whiteSpace: 'nowrap'
                  },
                  bgcolor: alpha(theme.palette.secondary.main, 0.1),
                  color: theme.palette.secondary.main,
                  fontWeight: 500
                }}
              />
              
              {/* Workload count or most common type */}
              <Tooltip title={`${labelGroup.workloads.length} object(s)`}>
                <Chip 
                  size="small" 
                  label={`${labelGroup.workloads.length}`}
                  sx={{ 
                    fontSize: '0.5rem',
                    height: 16,
                    '& .MuiChip-label': { px: 0.5 },
                    bgcolor: alpha(theme.palette.info.main, 0.1),
                    color: theme.palette.info.main
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
                  bgcolor: alpha(theme.palette.grey[500], 0.1),
                  color: theme.palette.text.secondary,
                }}
              />
            </Box>
            
            {/* Workload summary */}
            <Box sx={{ mt: 0.5 }}>
              <Tooltip 
                title={
                  <React.Fragment>
                    <Typography variant="caption" sx={{ fontWeight: 'bold' }}>Objects:</Typography>
                    <ul style={{ margin: 0, paddingLeft: '1rem' }}>
                      {labelGroup.workloads.map(w => (
                        <li key={`${w.namespace}-${w.name}`}>
                          {w.namespace}/{w.name} ({w.kind})
                        </li>
                      ))}
                    </ul>
                  </React.Fragment>
                } 
                arrow 
                placement="top"
              >
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {labelGroup.workloads.length === 1 
                    ? `${firstWorkload.namespace}/${firstWorkload.name}`
                    : `${labelGroup.workloads.length} resource objects`}
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
        borderRadius: 2
      }}
    >
      <Box sx={{ p: compact ? 1 : 2, backgroundColor: theme.palette.secondary.main, color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
          <KubernetesIcon type="workload" size={compact ? 20 : 24} sx={{ mr: 1, color: 'white' }} />
          {showSearch ? (
            <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              borderRadius: 1,
              px:1,
              mr:1,
              bgcolor: alpha(theme.palette.common.white, 0.15),
              flexGrow: 1,

            }}
            >
              <InputBase
              placeholder="Search labels"
              value={searchTerm}
              onChange={(e)=>setSearchTerm(e.target.value)}
              sx={{
                color: 'white',
                flexGrow: 1,
                '& .MuiInputBase-input': {
                    py: 0.5,
                  }
              }}
              autoFocus
              />
               <IconButton size="small" onClick={() => {
                setSearchTerm("");
                setShowSearch(false);
              }} sx={{ color: 'white', p: 0.25 }}>
                <CloseIcon fontSize="small" />
              </IconButton>

            </Box>
          ):(
          <Typography variant={compact ? "subtitle1" : "h6"}>Workload Labels</Typography>
        )}
        {!showSearch && !compact && (
          <IconButton 
          size="small" 
          sx={{ ml: 1, color: 'white' }}
          onClick={() => setShowSearch(true)}
        >
          <SearchIcon fontSize="small" />
        </IconButton>
        )
          
        }
        </Box>
        {!compact && (
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
        ) : workloads.length === 0 ? (
          <Typography sx={{ p: 2, color: 'text.secondary', textAlign: 'center' }}>
            No workloads available. Please add workloads with labels to use in binding policies.
          </Typography>
        ) : (
          <StrictModeDroppable droppableId="workload-panel" type="CLUSTER_OR_WORKLOAD">
            {(provided) => (
              <Box
                ref={provided.innerRef}
                {...provided.droppableProps}
                data-rbd-droppable-id="workload-panel"
                data-rfd-droppable-context-id={provided.droppableProps['data-rfd-droppable-context-id']}
                sx={{ minHeight: '100%' }}
              >

                {filteredLabels.length === 0 ? (
                  <Typography sx={{ p: 2, color: 'text.secondary', textAlign: 'center' }}>
                    {searchTerm ? 'No labels match your search.' : 'No labels found in available clusters.'}
                    </Typography>
                ) : (
                  filteredLabels.map((labelGroup, index) => 
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

export default React.memo(WorkloadPanel);