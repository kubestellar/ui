import React, { useState, useEffect } from 'react';
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
  IconButton,
  LinearProgress
} from '@mui/material';
import { Workload } from '../../types/bindingPolicy';
import AddIcon from '@mui/icons-material/Add';
import { useNavigate } from 'react-router-dom';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import { usePolicyDragDropStore } from '../../stores/policyDragDropStore';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useBPQueries } from '../../hooks/queries/useBPQueries';

interface WorkloadPanelProps {
  workloads: Workload[];
  loading: boolean;
  error?: string;
  compact?: boolean;
  onItemClick?: (workloadId: string) => void;
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
  workloads: propWorkloads,
  loading: propLoading,
  error: propError,
  compact = false,
  onItemClick,
}) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [showSearch, setShowSearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Use the SSE API to get workload data
  const { useWorkloadSSE } = useBPQueries();
  const { state, startSSEConnection, extractWorkloads } = useWorkloadSSE();

  // Use SSE or prop workloads based on SSE connection status
  const workloads = state.data ? extractWorkloads() : propWorkloads;
  const loading = (state.status === 'loading' || state.status === 'idle') && propLoading;
  const error = state.error?.message || propError;

  // Start SSE connection when component mounts
  useEffect(() => {
    const cleanup = startSSEConnection();
    return cleanup;
  }, [startSSEConnection]);

  const handleCreateWorkload = () => {
    navigate("/workloads/manage");
  };

  // Extract unique labels from workloads
  const uniqueLabels = React.useMemo(() => {
    const labelMap: Record<string, LabelGroup> = {};
    
    // Define system labels to filter out 
    const systemLabelPrefixes = [
      'pod-template-hash',
      'controller-revision-hash',
      'statefulset.kubernetes.io/',
      'batch.kubernetes.io/',
      'controller-uid',
      'kubernetes.io/config.',
      'pod-template-generation'
    ];
    
    // Define special labels that should never be filtered out
    const importantLabelKeys = [
      'app.kubernetes.io/part-of',
      'app.kubernetes.io/name',
      'app.kubernetes.io/instance',
      'app.kubernetes.io/component',
      'app.kubernetes.io/version',
      'app',
      'app.kubernetes.io/created-by',
      'app.kubernetes.io/team'
    ];

    const excludedKinds: string[] = [];

    workloads.forEach((workload) => {
      // Skip excluded kinds
      if (excludedKinds.includes(workload.kind)) {
        return;
      }
      
      if (workload.labels && Object.keys(workload.labels).length > 0) {
        Object.entries(workload.labels).forEach(([key, value]) => {
          const isSystemLabel = systemLabelPrefixes.some(prefix => key.startsWith(prefix));
          
          const isDefaultNamespace = key === 'kubernetes.io/metadata.name' && value === 'default';
          
          if ((isSystemLabel || isDefaultNamespace) && !importantLabelKeys.includes(key)) {
            return;
          }

          const labelId = `${key}:${value}`;

          if (!labelMap[labelId]) {
            labelMap[labelId] = {
              key,
              value,
              workloads: [],
            };
          }

          if (
            !labelMap[labelId].workloads.some(
              (w) =>
                w.name === workload.name &&
                w.namespace === (workload.namespace || "default")
            )
          ) {
            labelMap[labelId].workloads.push({
              name: workload.name,
              kind: workload.kind,
              namespace: workload.namespace || "default",
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

  // Render a label item - modified to use Box instead of Draggable
  const renderLabelItem = (labelGroup: LabelGroup) => {
    // Use first workload for the item ID
    const firstWorkload = labelGroup.workloads[0];
    const itemId = `label-${labelGroup.key}:${labelGroup.value}`;

    // Check if this item is in the canvas
    const { canvasEntities } = usePolicyDragDropStore.getState();
    const isInCanvas = canvasEntities.workloads.includes(itemId);
    
    // Check if this is from a cluster-scoped resource
    const isClusterScoped = firstWorkload.namespace === 'cluster-scoped';

    return (
      <Box
        key={`${labelGroup.key}:${labelGroup.value}`}
        onClick={(e) => {
          e.stopPropagation();
          if (onItemClick) {
            console.log("Workload clicked:", itemId);
            console.log(`Label details - key: "${labelGroup.key}", value: "${labelGroup.value}"`);
            
            // Check if this item is already in the canvas
            if (isInCanvas) {
              console.log(`⚠️ Workload ${itemId} is already in the canvas`);
              return;
            }
            
            onItemClick(itemId);
          }
        }}
        sx={{
          p: 1,
          m: compact ? 0.5 : 1,
          borderRadius: 1,
          backgroundColor: theme.palette.background.paper,
          border: `1px solid ${theme.palette.divider}`,
          boxShadow: 0,
          cursor: "pointer",
          position: 'relative', 
          "&:hover": {
            backgroundColor: alpha(theme.palette.secondary.main, 0.1),
            boxShadow: 2,
          },
          ...(isClusterScoped && {
            borderLeft: `3px solid ${theme.palette.warning.main}`,
          }),
        }}
      >
        {/* Label key as the primary display */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Tooltip 
            title={labelGroup.workloads.length > 1 
              ? `Multiple resource types: ${Array.from(new Set(labelGroup.workloads.map(w => w.kind))).join(", ")}` 
              : `Resource type: ${labelGroup.workloads[0].kind}`}
            arrow
          >
            <Chip
              size="small"
              label={labelGroup.workloads.length > 1 
                ? "Label Selector" 
                : isClusterScoped 
                  ? `${labelGroup.workloads[0].kind}` 
                  : labelGroup.workloads[0].kind}
              sx={{
                fontSize: "0.75rem",
                maxWidth: "70%",
                height: 24,
                "& .MuiChip-label": {
                  px: 1,
                  textOverflow: "ellipsis",
                  overflow: "hidden",
                  whiteSpace: "nowrap",
                },
                bgcolor: isClusterScoped ? alpha(theme.palette.warning.main, 0.1) : alpha(theme.palette.secondary.main, 0.1),
                color: isClusterScoped ? theme.palette.warning.main : theme.palette.secondary.main,
                fontWeight: 500,
              }}
            />
          </Tooltip>
          <Tooltip title={`${labelGroup.workloads.length} object(s)`}>
            <Chip
              size="small"
              label={`${labelGroup.workloads.length}`}
              sx={{
                fontSize: "0.8rem",
                height: 16,
                "& .MuiChip-label": { px: 0.5 },
                bgcolor: alpha(theme.palette.info.main, 0.1),
                color: theme.palette.info.main,
                ml: "auto", 
              }}
            />
          </Tooltip>
        </Box>

        {labelGroup.workloads.length === 1 && (
          <Box sx={{ mt: 0.5 }}>
            <Typography variant="caption" sx={{ fontWeight: 500, color: "text.primary" }}>
              {firstWorkload.name}
            </Typography>
          </Box>
        )}

        {/* Namespace (if not cluster-scoped) */}
        {labelGroup.workloads.length === 1 && !isClusterScoped && (
          <Box sx={{ mt: 0.25 }}>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              {firstWorkload.namespace}
            </Typography>
          </Box>
        )}

        {/* Multiple objects summary */}
        {labelGroup.workloads.length > 1 && (
          <Box sx={{ mt: 0.5 }}>
            <Tooltip
              title={
                <React.Fragment>
                  <Typography variant="caption" sx={{ fontWeight: "bold" }}>
                    Objects:
                  </Typography>
                  <ul style={{ margin: 0, paddingLeft: "1rem" }}>
                    {labelGroup.workloads.map((w) => (
                      <li key={`${w.namespace}-${w.name}`}>
                        {w.namespace === 'cluster-scoped' ? w.name : `${w.namespace}/${w.name}`} ({w.kind})
                      </li>
                    ))}
                  </ul>
                  {labelGroup.workloads.length > 1 && (
                    <Typography variant="caption" sx={{ fontWeight: "bold", mt: 1, display: "block" }}>
                      Resource types: {Array.from(new Set(labelGroup.workloads.map(w => w.kind))).join(", ")}
                    </Typography>
                  )}
                </React.Fragment>
              }
              arrow
              placement="top"
            >
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                {`${labelGroup.workloads.length} resource objects`}
              </Typography>
            </Tooltip>
          </Box>
        )}

        <Box sx={{ mt: 0.5 }}>
          <Chip
            size="small"
            label={`${labelGroup.key} = ${labelGroup.value}`}
            sx={{
              fontSize: "1rem",
              height: 20,
              "& .MuiChip-label": {
                px: 0.75,
                textOverflow: "ellipsis",
                overflow: "hidden",
              },
              bgcolor: alpha(theme.palette.grey[500], 0.1),
              color: theme.palette.text.secondary,
            }}
          />
        </Box>
        
        {isInCanvas && (
          <CheckCircleIcon 
            sx={{ 
              position: 'absolute',
              bottom: 4,
              right: 4,
              fontSize: '1.2rem',
              color: theme.palette.success.main,
              backgroundColor: alpha(theme.palette.background.paper, 0.7),
              borderRadius: '50%'
            }}
          />
        )}
      </Box>
    );
  };

  return (
    <Paper
      elevation={2}
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        borderRadius: 2,
      }}
    >
      <Box
        sx={{
          p: compact ? 1 : 2,
          backgroundColor: theme.palette.secondary.main,
          color: "white",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", flexGrow: 1 }}>
       
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
          <Typography variant={compact ? "subtitle1" : "h6"}>
            Workloads
          </Typography>
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
              bgcolor: "white",
              color: theme.palette.secondary.main,
              "&:hover": {
                bgcolor: alpha(theme.palette.common.white, 0.9),
              },
            }}
          >
            Create
          </Button>
        )}
      </Box>
      <Divider />

      {/* Show progress bar during SSE loading */}
      {state.status === 'loading' && (
        <Box sx={{ width: '100%', height: '4px' }}>
          <LinearProgress 
            variant="determinate" 
            value={state.progress}
            sx={{
              backgroundColor: alpha(theme.palette.primary.main, 0.1),
              '& .MuiLinearProgress-bar': {
                backgroundColor: theme.palette.primary.main,
              }
            }}
          />
        </Box>
      )}

      <Box
        sx={{
          p: compact ? 0.5 : 1,
          overflow: "auto",
          flexGrow: 1,
          "&::-webkit-scrollbar": {
            display: "none",
          },
          scrollbarWidth: "none",
          "-ms-overflow-style": "none",
        }}
      >
        {loading && !state.data ? (
          <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
            <CircularProgress size={30} />
          </Box>
        ) : error ? (
          <Typography color="error" sx={{ p: 2 }}>
            {error}
          </Typography>
        ) : workloads.length === 0 ? (
          <Typography
            sx={{ p: 2, color: "text.secondary", textAlign: "center" }}
          >
            {state.status === 'loading' 
              ? "Loading workloads and their labels..." 
              : "No workloads available. Please add workloads with labels to use in binding policies."}
          </Typography>
        ) : (
          <Box sx={{ minHeight: "100%" }}>
            {filteredLabels.length === 0 ? (
              <Typography sx={{ p: 2, color: "text.secondary", textAlign: "center" }}>
                {searchTerm 
                  ? 'No labels match your search.' 
                  : 'No suitable labels found in available workloads. Note: ConfigMaps, Secrets, and system resources are excluded.'}
              </Typography>
            ) : (
              <>
                {(state.status === 'success' || state.status === 'loading') && state.data && (
                  <Typography variant="caption" color="text.secondary" sx={{ px: 2, display: 'block' }}>
                    {filteredLabels.length} unique labels across {workloads.length} workloads
                    {state.status === 'loading' ? " (loading...)" : " (includes cluster-scoped resources like CRDs and Namespaces)"}
                  </Typography>
                )}
                {filteredLabels.map((labelGroup) => renderLabelItem(labelGroup))}
              </>
            )}
          </Box>
        )}
      </Box>
    </Paper>
  );
};

export default React.memo(WorkloadPanel);