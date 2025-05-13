import React, { useState, useEffect, useRef, KeyboardEvent as ReactKeyboardEvent, useCallback } from 'react';
import { 
  Box, 
  Typography, 
  CircularProgress, 
  Paper,
  alpha,
  Button,
  Chip,
  Tooltip,
  InputBase,
  IconButton,
  LinearProgress,
  useTheme as useMuiTheme,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Zoom,
  InputAdornment,
  List,
  ListItemText,
  ListItemButton,
  Divider
} from '@mui/material';
import { Workload } from '../../types/bindingPolicy';
import AddIcon from '@mui/icons-material/Add';
import { useNavigate } from 'react-router-dom';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import DeleteIcon from '@mui/icons-material/Delete';
import LabelIcon from '@mui/icons-material/Label';
import { Tag, Tags } from 'lucide-react';
import { usePolicyDragDropStore } from '../../stores/policyDragDropStore';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useBPQueries } from '../../hooks/queries/useBPQueries';
import { toast } from 'react-hot-toast';
import useTheme from "../../stores/themeStore";
import { api } from "../../lib/api";
import { BsTagFill } from 'react-icons/bs';
import { AxiosError } from 'axios';

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

interface LabelEditDialogProps {
  open: boolean;
  onClose: () => void;
  workload: Workload | null;
  onSave: (workloadName: string, namespace: string, kind: string, labels: { [key: string]: string }) => void;
  isDark: boolean;
  colors: ColorTheme;
}

interface SelectWorkloadDialogProps {
  open: boolean;
  onClose: () => void;
  workloads: Workload[];
  onSelectWorkload: (workload: Workload) => void;
  isDark: boolean;
  colors: ColorTheme;
}

interface ColorTheme {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  secondary: string;
  white: string;
  background: string;
  paper: string;
  text: string;
  textSecondary: string;
  border: string;
  success: string;
  warning: string;
  error: string;
  disabled: string;
}

const WorkloadPanel: React.FC<WorkloadPanelProps> = ({
  workloads: propWorkloads,
  loading: propLoading,
  error: propError,
  compact = false,
  onItemClick,
}) => {
  const muiTheme = useMuiTheme(); 
  const theme = useTheme((state) => state.theme); // Get custom theme state (dark/light)
  const navigate = useNavigate();
  const [showSearch, setShowSearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedWorkload, setSelectedWorkload] = useState<Workload | null>(null);
  const [loadingWorkloadEdit, setLoadingWorkloadEdit] = useState<string | null>(null);
  const [selectWorkloadDialogOpen, setSelectWorkloadDialogOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0); // Add refresh trigger state
  
  const isDarkTheme = theme === "dark";
  
  // Use the SSE API to get workload data
  const { useWorkloadSSE } = useBPQueries();
  const { state, startSSEConnection, extractWorkloads } = useWorkloadSSE();

  // Use SSE or prop workloads based on SSE connection status
  const workloads = state.data ? extractWorkloads() : propWorkloads;
  const loading = (state.status === 'loading' || state.status === 'idle') && propLoading;
  const error = state.error?.message || propError;

  // Start SSE connection when component mounts or refresh is triggered
  useEffect(() => {
    console.log("Starting SSE connection, refreshTrigger:", refreshTrigger);
    const cleanup = startSSEConnection();
    return cleanup;
  }, [startSSEConnection, refreshTrigger]);

  const refreshWorkloads = useCallback(() => {
    console.log("Manually refreshing workloads data");
    setRefreshTrigger(prev => prev + 1);
  }, []);

  const handleCreateWorkload = () => {
    navigate("/workloads/manage");
  };

  const handleAddLabels = () => {
    if (workloads.length > 0) {
      setSelectWorkloadDialogOpen(true);
    } else {
      toast.error('No workloads available to edit');
    }
  };

  const handleEditSpecificWorkload = (workload: Workload) => {
    console.log("handleEditSpecificWorkload called with:", JSON.stringify(workload, null, 2));
    
    if (workload.kind === "Namespace") {
      console.log("===== NAMESPACE EDIT DEBUG =====");
      console.log("Original workload object:", JSON.stringify(workload, null, 2));
      
      const namespaceWorkload = JSON.parse(JSON.stringify(workload));
      
      // Namespaces don't have a namespace themselves
      namespaceWorkload.namespace = "";
      
      // Log the namespace object for debugging
      console.log("Modified namespace workload:", JSON.stringify(namespaceWorkload, null, 2));
      console.log("===== END NAMESPACE EDIT DEBUG =====");
      
      setSelectedWorkload(namespaceWorkload);
    } else {
      setSelectedWorkload(workload);
    }
    setEditDialogOpen(true);
    setSelectWorkloadDialogOpen(false);
  };

  const handleSaveLabels = async (
    workloadName: string, 
    namespace: string, 
    kind: string, 
    labels: { [key: string]: string }
  ) => {
    setLoadingWorkloadEdit(workloadName);
    
    try {
      // Special handling for Namespace resources
      if (kind === "Namespace") {
        console.log("===== NAMESPACE LABELS DEBUG =====");
        console.log("Input parameters:");
        console.log("- workloadName:", workloadName);
        console.log("- namespace:", namespace);
        console.log("- kind:", kind);
        console.log("- labels:", JSON.stringify(labels, null, 2));
        
        // Get the current namespace details
        const getUrl = `/api/namespaces/${workloadName}`;
        console.log("Fetching namespace from:", getUrl);
        
        const getResponse = await api.get(getUrl);
        console.log("Namespace API response status:", getResponse.status);
        console.log("Namespace data:", JSON.stringify(getResponse.data, null, 2));
        
        const currentResource = getResponse.data;
        
        if (!currentResource) {
          console.error("No namespace data returned from API");
          throw new Error(`Namespace ${workloadName} not found`);
        }
        
        // For namespaces, the labels are at the top level, not in metadata
        const updatedResource = {
          ...currentResource,
          // Update the labels field directly 
          labels: labels
        };
        
        const updateUrl = `/api/namespaces/update/${workloadName}`;
        console.log(`Sending update to: ${updateUrl}`);
        
        try {
          const updateResponse = await api.put(updateUrl, updatedResource);
          console.log("Update response status:", updateResponse.status);
          console.log("Update response data:", JSON.stringify(updateResponse.data, null, 2));
          
          
          console.log("Forcing refresh of workload data...");
          
          try {
            console.log("Attempting direct label update as fallback...");
            
            // Create a simplified update payload with just the labels
            const directUpdatePayload = {
              name: workloadName,
              labels: labels
            };
            
            // Make a direct update request
            const directResponse = await api.put(`/api/namespaces/update/${workloadName}`, directUpdatePayload);
            console.log("Direct update response:", JSON.stringify(directResponse.data, null, 2));
          } catch (directError) {
            console.error("Failed direct label update:", directError);
          }
          
          // small delay to allow the backend to process the update, then fetch fresh data
          setTimeout(async () => {
            try {
              // Call API directly to refresh namespace data
              const refreshResponse = await api.get(`/api/namespaces/${workloadName}`);
              console.log("Refresh namespace response:", JSON.stringify(refreshResponse.data, null, 2));
              
              // Check if the labels in the fresh data match what we tried to set
              const freshLabels = refreshResponse.data?.labels || {};
              const missingLabels = Object.entries(labels).filter(
                ([key, value]) => freshLabels[key] !== value
              );
              
              if (missingLabels.length > 0) {
                console.warn("Some labels are missing in the fresh data:", missingLabels);
                const finalPayload = {
                  name: workloadName,
                  labels: {
                    ...freshLabels,
                    ...labels
                  }
                };
                const finalResponse = await api.put(`/api/namespaces/update/${workloadName}`, finalPayload);
                console.log("Final update response:", JSON.stringify(finalResponse.data, null, 2));
              } else {
                console.log("All labels were successfully set");
              }
            } catch (refreshError) {
              console.error("Error refreshing namespace data:", refreshError);
            }
            
            // Trigger a global refresh after all attempts
            refreshWorkloads();
          }, 1000);
          
          console.log("===== END NAMESPACE LABELS DEBUG =====");
        } catch (error) {
          const updateError = error as AxiosError;
          console.error("Update API error:", updateError);
          console.error("Update API error response:", updateError.response?.data);
          console.log("===== END NAMESPACE LABELS DEBUG (WITH ERROR) =====");
          throw updateError;
        }

        toast.success(`Labels updated for Namespace ${workloadName}`, {
          icon: '🏷️',
          style: {
            borderRadius: '10px',
            background: isDarkTheme ? '#1e293b' : '#ffffff',
            color: isDarkTheme ? '#f1f5f9' : '#1e293b',
            border: `1px solid ${isDarkTheme ? '#334155' : '#e2e8f0'}`,
          },
        });
      } else {
        const kindToPluralMap: Record<string, string> = {
          Deployment: "deployments",
          StatefulSet: "statefulsets",
          DaemonSet: "daemonsets",
          Pod: "pods",
          Service: "services",
          ConfigMap: "configmaps",
          Secret: "secrets",
          // need to add more mappings here
        };
        
        const pluralForm = kindToPluralMap[kind] || `${kind.toLowerCase()}s`;
        
        // Get the current resource
        const getUrl = `/api/${pluralForm}/${namespace}/${workloadName}`;
        const getResponse = await api.get(getUrl);
        const currentResource = getResponse.data;
        
        if (!currentResource) {
          throw new Error(`Resource ${kind}/${namespace}/${workloadName} not found`);
        }
        
        // Update the resource with new labels
        const updatedResource = {
          ...currentResource,
          metadata: {
            ...currentResource.metadata,
            labels: labels  // Set the new labels directly
          }
        };
        
        // Update the resource
        const updateUrl = `/api/${pluralForm}/${namespace}/${workloadName}`;
        console.log(`Updating resource at: ${updateUrl}`, updatedResource);
        await api.put(updateUrl, updatedResource);
        
        toast.success(`Labels updated for ${kind} ${workloadName}`, {
          icon: '🏷️',
          style: {
            borderRadius: '10px',
            background: isDarkTheme ? '#1e293b' : '#ffffff',
            color: isDarkTheme ? '#f1f5f9' : '#1e293b',
            border: `1px solid ${isDarkTheme ? '#334155' : '#e2e8f0'}`,
          },
        });
      }
      
      // Schedule a refresh after the save is complete
      setTimeout(() => {
        refreshWorkloads();
      }, 1000);
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error("Error updating workload labels:", axiosError);
      toast.error(`Failed to update labels for ${kind} ${workloadName}`, {
        icon: '❌',
        style: {
          borderRadius: '10px',
          background: isDarkTheme ? '#1e293b' : '#ffffff',
          color: isDarkTheme ? '#f1f5f9' : '#1e293b',
          border: `1px solid ${isDarkTheme ? '#334155' : '#e2e8f0'}`,
        },
      });
    } finally {
      setLoadingWorkloadEdit(null);
    }
  };

  // Colors for theming the dialogs
  const colors = {
    primary: muiTheme.palette.secondary.main,
    primaryLight: muiTheme.palette.secondary.light,
    primaryDark: muiTheme.palette.secondary.dark,
    secondary: muiTheme.palette.primary.main,
    white: "#ffffff",
    background: isDarkTheme ? "#0f172a" : "#ffffff",
    paper: isDarkTheme ? "#1e293b" : "#f8fafc",
    text: isDarkTheme ? "#f1f5f9" : "#1e293b",
    textSecondary: isDarkTheme ? "#94a3b8" : "#64748b",
    border: isDarkTheme ? "#334155" : "#e2e8f0",
    success: "#67c073",
    warning: "#ffb347",
    error: "#ff6b6b",
    disabled: isDarkTheme ? "#475569" : "#94a3b8",
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
    const workloadObjects = labelGroup.workloads.map(w => 
      workloads.find(workload => 
        workload.name === w.name && 
        workload.kind === w.kind && 
        (workload.namespace || "default") === w.namespace
      )
    ).filter((w): w is Workload => w !== undefined);

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
          backgroundColor: isDarkTheme ? 'rgba(30, 41, 59, 0.8)' : muiTheme.palette.background.paper,
          border: `1px solid ${isDarkTheme ? 'rgba(255, 255, 255, 0.12)' : muiTheme.palette.divider}`,
          boxShadow: 0,
          cursor: "pointer",
          position: 'relative', 
          transition: 'all 0.2s ease',
          "&:hover": {
            backgroundColor: isDarkTheme 
              ? 'rgba(30, 41, 59, 0.95)' 
              : alpha(muiTheme.palette.secondary.main, 0.1),
            boxShadow: 2,
            transform: 'translateY(-2px)',
          },
          ...(isClusterScoped && {
            borderLeft: `3px solid ${isDarkTheme ? muiTheme.palette.warning.dark : muiTheme.palette.warning.main}`,
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
                bgcolor: isClusterScoped 
                  ? isDarkTheme 
                    ? alpha(muiTheme.palette.warning.dark, 0.2) 
                    : alpha(muiTheme.palette.warning.main, 0.1)
                  : isDarkTheme 
                    ? alpha(muiTheme.palette.secondary.dark, 0.2) 
                    : alpha(muiTheme.palette.secondary.main, 0.1),
                color: isClusterScoped 
                  ? isDarkTheme 
                    ? muiTheme.palette.warning.light 
                    : muiTheme.palette.warning.main
                  : isDarkTheme 
                    ? muiTheme.palette.secondary.light 
                    : muiTheme.palette.secondary.main,
                fontWeight: 500,
              }}
            />
          </Tooltip>
          
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            {/*  edit button */}
            <Tooltip title="Edit workload labels">
              <IconButton 
                size="small" 
                onClick={(e) => {
                  e.stopPropagation(); 
                  
                  if (workloadObjects.length === 1) {
                    // If only one workload, edit it directly
                    handleEditSpecificWorkload(workloadObjects[0]);
                  } else if (workloadObjects.length > 0) {
                    // If multiple workloads, open the select dialog
                    setSelectWorkloadDialogOpen(true);
                  }
                }}
                sx={{ 
                  p: 0.5, 
                  bgcolor: isDarkTheme
                    ? alpha(muiTheme.palette.secondary.main, 0.2)
                    : alpha(muiTheme.palette.secondary.main, 0.1),
                  color: isDarkTheme
                    ? muiTheme.palette.secondary.light
                    : muiTheme.palette.secondary.main,
                  '&:hover': {
                    bgcolor: isDarkTheme
                      ? alpha(muiTheme.palette.secondary.main, 0.3)
                      : alpha(muiTheme.palette.secondary.main, 0.2),
                  },
                  height: 24,
                  width: 24
                }}
              >
                <EditIcon sx={{ fontSize: '0.9rem' }} />
              </IconButton>
            </Tooltip>
            
            <Tooltip title={`${labelGroup.workloads.length} object(s)`}>
              <Chip
                size="small"
                label={`${labelGroup.workloads.length}`}
                sx={{
                  fontSize: "0.8rem",
                  height: 16,
                  "& .MuiChip-label": { px: 0.5 },
                  bgcolor: isDarkTheme 
                    ? alpha(muiTheme.palette.info.dark, 0.2)
                    : alpha(muiTheme.palette.info.main, 0.1),
                  color: isDarkTheme 
                    ? muiTheme.palette.info.light
                    : muiTheme.palette.info.main,
                }}
              />
            </Tooltip>
          </Box>
        </Box>

        {labelGroup.workloads.length === 1 && (
          <Box sx={{ mt: 0.5 }}>
            <Typography 
              variant="caption" 
              sx={{ 
                fontWeight: 500, 
                color: isDarkTheme ? "rgba(255, 255, 255, 0.9)" : "text.primary" 
              }}
            >
              {firstWorkload.name}
            </Typography>
          </Box>
        )}

        {/* Namespace (if not cluster-scoped) */}
        {labelGroup.workloads.length === 1 && !isClusterScoped && (
          <Box sx={{ mt: 0.25 }}>
            <Typography 
              variant="caption" 
              sx={{ 
                color: isDarkTheme ? "rgba(255, 255, 255, 0.7)" : "text.secondary" 
              }}
            >
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
              <Typography 
                variant="caption" 
                sx={{ 
                  color: isDarkTheme ? "rgba(255, 255, 255, 0.7)" : "text.secondary" 
                }}
              >
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
              bgcolor: isDarkTheme 
                ? 'rgba(255, 255, 255, 0.1)' 
                : alpha(muiTheme.palette.grey[500], 0.1),
              color: isDarkTheme 
                ? "rgba(255, 255, 255, 0.9)" 
                : muiTheme.palette.text.secondary,
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
              color: muiTheme.palette.success.main,
              backgroundColor: isDarkTheme 
                ? 'rgba(17, 25, 40, 0.8)'
                : alpha(muiTheme.palette.background.paper, 0.7),
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
        backgroundColor: isDarkTheme ? "rgba(17, 25, 40, 0.8)" : muiTheme.palette.background.paper,
        border: isDarkTheme ? '1px solid rgba(255, 255, 255, 0.15)' : 'none',
        backdropFilter: 'blur(10px)',
      }}
    >
      <Box 
        sx={{ 
          p: compact ? 1 : 2, 
          backgroundColor: isDarkTheme 
            ? "rgba(37, 99, 235, 0.9)" 
            : muiTheme.palette.secondary.main, 
          color: "white", 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center",
          borderBottom: isDarkTheme 
            ? '1px solid rgba(255, 255, 255, 0.15)' 
            : 'none',
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", flexGrow: 1 }}>
       
          {showSearch ? (
            <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              borderRadius: 1,
              px: 1,
              mr: 1,
              bgcolor: alpha(muiTheme.palette.common.white, 0.15),
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
               <IconButton 
                 size="small" 
                 onClick={() => {
                  setSearchTerm("");
                  setShowSearch(false);
                }} 
                sx={{ 
                  color: 'white', 
                  p: 0.25,
                  '&:hover': {
                    backgroundColor: isDarkTheme 
                      ? 'rgba(255, 255, 255, 0.15)' 
                      : 'rgba(255, 255, 255, 0.25)'
                  }
                }}
               >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
          ) : (
          <Typography variant={compact ? "subtitle1" : "h6"}>
            Workloads
          </Typography>
        )}
        {!showSearch && !compact && (
          <IconButton 
          size="small" 
          sx={{ 
            ml: 1, 
            color: 'white',
            '&:hover': {
              backgroundColor: isDarkTheme 
                ? 'rgba(255, 255, 255, 0.15)' 
                : 'rgba(255, 255, 255, 0.25)'
            }
          }}
          onClick={() => {
            setShowSearch(true);
            setSearchTerm("kubestellar.io/workload");
          }}
        >
          <SearchIcon fontSize="small" />
        </IconButton>
        )}
        </Box>
        {!compact && (
          <Box sx={{ display: 'flex', gap: 1 }}>
            {/* "Add Labels" button */}
            <Button
  variant="contained"
  endIcon={<BsTagFill />}
  onClick={handleAddLabels}
  size="small"
  sx={{ 
    bgcolor: isDarkTheme 
      ? alpha(muiTheme.palette.common.white, 0.15)  
      : muiTheme.palette.common.white,
    color: isDarkTheme 
      ? muiTheme.palette.common.white
      : muiTheme.palette.secondary.main,
    borderColor: isDarkTheme ? 'rgba(255, 255, 255, 0.3)' : undefined,
    transition: 'all 0.2s ease',
    fontWeight: 500,
    "&:hover": {
      bgcolor: isDarkTheme 
        ? alpha(muiTheme.palette.common.white, 0.25)
        : alpha(muiTheme.palette.common.white, 0.9),
      transform: 'translateY(-2px)',
      boxShadow: isDarkTheme
        ? '0 4px 12px rgba(0,0,0,0.4)'
        : '0 4px 8px rgba(0,0,0,0.2)'
    },
  }}
>
  Labels
</Button>
<Button
  variant="contained"
  startIcon={<AddIcon />}
  onClick={handleCreateWorkload}
  size="small"
  sx={{
    bgcolor: isDarkTheme 
      ? alpha(muiTheme.palette.common.white, 0.15)
      : muiTheme.palette.common.white,
    color: isDarkTheme 
      ? muiTheme.palette.common.white
      : muiTheme.palette.secondary.main,
    borderColor: isDarkTheme ? 'rgba(255, 255, 255, 0.3)' : undefined,
    transition: 'all 0.2s ease',
    fontWeight: 500,
    "&:hover": {
      bgcolor: isDarkTheme 
        ? alpha(muiTheme.palette.common.white, 0.25)
        : alpha(muiTheme.palette.common.white, 0.9),
      transform: 'translateY(-2px)',
      boxShadow: isDarkTheme
        ? '0 4px 12px rgba(0,0,0,0.4)'
        : '0 4px 8px rgba(0,0,0,0.2)'
    },
  }}
>
  Create
</Button>
          </Box>
        )}
      </Box>

      {/* Show progress bar during SSE loading */}
      {state.status === 'loading' && (
        <Box sx={{ width: '100%', height: '4px' }}>
          <LinearProgress 
            variant="determinate" 
            value={state.progress}
            sx={{
              backgroundColor: isDarkTheme 
                ? alpha(muiTheme.palette.primary.dark, 0.2)
                : alpha(muiTheme.palette.primary.main, 0.1),
              '& .MuiLinearProgress-bar': {
                backgroundColor: isDarkTheme 
                  ? muiTheme.palette.primary.light
                  : muiTheme.palette.primary.main,
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
          backgroundColor: isDarkTheme 
            ? 'rgba(17, 25, 40, 0.8)' 
            : 'transparent',
        }}
      >
        {loading && !state.data ? (
          <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
            <CircularProgress size={30} sx={{
              color: isDarkTheme ? '#60a5fa' : undefined
            }} />
          </Box>
        ) : error ? (
          <Typography color="error" sx={{ p: 2 }}>
            {error}
          </Typography>
        ) : workloads.length === 0 ? (
          <Typography
            sx={{ 
              p: 2, 
              color: isDarkTheme ? "rgba(255, 255, 255, 0.7)" : "text.secondary", 
              textAlign: "center" 
            }}
          >
            {state.status === 'loading' 
              ? "Loading workloads and their labels..." 
              : "No workloads available. Please add workloads with labels to use in binding policies."}
          </Typography>
        ) : (
          <Box sx={{ minHeight: "100%" }}>
            {filteredLabels.length === 0 ? (
              <Typography sx={{ 
                p: 2, 
                color: isDarkTheme ? "rgba(255, 255, 255, 0.7)" : "text.secondary", 
                textAlign: "center" 
              }}>
                {searchTerm 
                  ? 'No labels match your search.' 
                  : 'No suitable labels found in available workloads. Note: ConfigMaps, Secrets, and system resources are excluded.'}
              </Typography>
            ) : (
              <>
                {(state.status === 'success' || state.status === 'loading') && state.data && (
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      px: 2, 
                      display: 'block',
                      color: isDarkTheme ? "rgba(255, 255, 255, 0.7)" : "text.secondary"
                    }}
                  >
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

      {/* Label Edit Dialog */}
      <LabelEditDialog
        open={editDialogOpen}
        onClose={() => {
          setEditDialogOpen(false);
          if (loadingWorkloadEdit && selectedWorkload) {
            setLoadingWorkloadEdit(null);
          }
        }}
        workload={selectedWorkload}
        onSave={handleSaveLabels}
        isDark={isDarkTheme}
        colors={colors}
      />

      {/* Select Workload Dialog */}
      <SelectWorkloadDialog
        open={selectWorkloadDialogOpen}
        onClose={() => setSelectWorkloadDialogOpen(false)}
        workloads={workloads}
        onSelectWorkload={handleEditSpecificWorkload}
        isDark={isDarkTheme}
        colors={colors}
      />
    </Paper>
  );
};

// LabelEditDialog component for workloads
const LabelEditDialog: React.FC<LabelEditDialogProps> = ({ 
  open, 
  onClose, 
  workload, 
  onSave,
  isDark,
  colors
}) => {
  const [labels, setLabels] = useState<Array<{ key: string; value: string }>>([]);
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [labelSearch, setLabelSearch] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedLabelIndex, setSelectedLabelIndex] = useState<number | null>(null);
  const keyInputRef = useRef<HTMLInputElement>(null);
  const valueInputRef = useRef<HTMLInputElement>(null);

  // Filter labels based on search
  const filteredLabels = labelSearch.trim() === "" 
    ? labels 
    : labels.filter(label => 
        label.key.toLowerCase().includes(labelSearch.toLowerCase()) || 
        label.value.toLowerCase().includes(labelSearch.toLowerCase())
      );

  useEffect(() => {
    if (workload && open) {
      console.log("LabelEditDialog opened with workload:", JSON.stringify(workload, null, 2));
      
      const labelArray = Object.entries(workload.labels || {}).map(([key, value]) => ({
        key,
        value,
      }));
      console.log("Initial labels array:", JSON.stringify(labelArray, null, 2));
      
      setLabels(labelArray);
      
      setNewKey("");
      setNewValue("");
      setLabelSearch("");
      setIsSearching(false);
      setSelectedLabelIndex(null);
      
      setTimeout(() => {
        if (keyInputRef.current) {
          keyInputRef.current.focus();
        }
      }, 100);
    }
  }, [workload, open]);

  const handleAddLabel = () => {
    if (newKey.trim() && newValue.trim()) {
      // Check for duplicates
      const isDuplicate = labels.some(label => label.key === newKey.trim());
      
      if (isDuplicate) {
        // Update existing label with same key
        setLabels(labels.map(label => 
          label.key === newKey.trim() 
            ? { ...label, value: newValue.trim() } 
            : label
        ));
        toast.success(`Updated existing label: ${newKey}`);
      } else {
        // Add new label with animation effect
        setLabels(prev => [...prev, { key: newKey.trim(), value: newValue.trim() }]);
        toast.success(`Added new label: ${newKey}`);
      }
      
      setNewKey("");
      setNewValue("");
      if (keyInputRef.current) {
        keyInputRef.current.focus();
      }
    }
  };

  const handleKeyDown = (e: ReactKeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      
      if (newKey && !newValue && valueInputRef.current) {
        valueInputRef.current.focus();
      } else if (newKey && newValue) {
        handleAddLabel();
      }
    } else if (e.key === 'Escape') {
      setNewKey("");
      setNewValue("");
      if (keyInputRef.current) {
        keyInputRef.current.focus();
      }
    }
  };

  const handleRemoveLabel = (index: number) => {
    const labelToRemove = labels[index];
    setLabels(labels.filter((_, i) => i !== index));
    toast.success(`Removed label: ${labelToRemove.key}`);
  };

  const handleSave = () => {
    if (!workload) return;
    
    setSaving(true);
    
    // Convert array back to object format
    const labelObject: { [key: string]: string } = {};
    labels.forEach(({ key, value }) => {
      labelObject[key] = value;
    });

    console.log("===== LABEL SAVE DEBUG =====");
    console.log("Workload being saved:", JSON.stringify(workload, null, 2));
    console.log("Labels being saved:", JSON.stringify(labelObject, null, 2));
    
    
    // Add a slight delay to show loading state
    setTimeout(() => {
      onSave(
        workload.name, 
        workload.namespace || "default", 
        workload.kind, 
        labelObject
      );
      setSaving(false);
      onClose();
    }, 300);
  };

  const toggleSearchMode = () => {
    setIsSearching(!isSearching);
    if (!isSearching) {
      setTimeout(() => {
        const searchInput = document.getElementById('label-search-input');
        if (searchInput) {
          searchInput.focus();
        }
      }, 100);
    } else {
      setLabelSearch("");
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      TransitionComponent={Zoom}
      transitionDuration={300}
      PaperProps={{
        style: {
          backgroundColor: colors.paper,
          color: colors.text,
          border: `1px solid ${colors.border}`,
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: isDark 
            ? '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.4)' 
            : '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
        }
      }}
    >
      <DialogTitle 
        style={{ 
          color: colors.primary,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 24px',
          borderBottom: `1px solid ${colors.border}`,
        }}
      >
        <div className="flex items-center gap-2">
          <LabelIcon style={{ color: colors.primary }} />
          <Typography variant="h6" component="span">
            Edit Labels for <span style={{ fontWeight: 'bold' }}>{workload?.name}</span> 
            <Typography component="span" style={{ fontSize: '0.8rem', marginLeft: '8px', color: colors.textSecondary }}>
              ({workload?.kind})
            </Typography>
          </Typography>
        </div>
        <IconButton onClick={onClose} size="small" style={{ color: colors.textSecondary }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      
      <DialogContent style={{ padding: '24px' }}>
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <Typography variant="body2" style={{ color: colors.textSecondary }}>
              Add or remove labels to organize and categorize your workload.
            </Typography>
            
            <div className="flex gap-2">
              <Tooltip title={isSearching ? "Exit search" : "Search labels"}>
                <IconButton 
                  size="small" 
                  onClick={toggleSearchMode}
                  style={{ 
                    color: isSearching ? colors.primary : colors.textSecondary,
                    backgroundColor: isSearching ? (isDark ? 'rgba(47, 134, 255, 0.15)' : 'rgba(47, 134, 255, 0.1)') : 'transparent',
                  }}
                >
                  <SearchIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              {labels.length > 0 && (
                <Chip 
                  size="small" 
                  label={`${labels.length} label${labels.length !== 1 ? 's' : ''}`}
                  style={{
                    backgroundColor: isDark ? 'rgba(47, 134, 255, 0.15)' : 'rgba(47, 134, 255, 0.1)',
                    color: colors.primary,
                    fontSize: '0.75rem',
                  }}
                />
              )}
            </div>
          </div>
          
          <Zoom in={isSearching} mountOnEnter unmountOnExit>
            <div className="mb-4">
              <TextField
                id="label-search-input"
                placeholder="Search labels..."
                value={labelSearch}
                onChange={(e) => setLabelSearch(e.target.value)}
                fullWidth
                variant="outlined"
                size="small"
                autoFocus
                InputProps={{
                  style: { color: colors.text },
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon style={{ color: colors.primary, fontSize: '1.2rem' }} />
                    </InputAdornment>
                  ),
                  endAdornment: labelSearch && (
                    <InputAdornment position="end">
                      <IconButton 
                        size="small" 
                        onClick={() => setLabelSearch('')}
                        style={{ color: colors.textSecondary }}
                      >
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
                    "& fieldset": { borderColor: colors.border },
                    "&:hover fieldset": { borderColor: colors.primaryLight },
                    "&.Mui-focused fieldset": { borderColor: colors.primary },
                  },
                }}
              />
            </div>
          </Zoom>
          
          <Zoom in={!isSearching}>
            <div className="mb-5">
              <div className="flex flex-col sm:flex-row gap-2 mb-2">
                <TextField
                  label="Label Key"
                  placeholder="e.g. app"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  inputRef={keyInputRef}
                  onKeyDown={handleKeyDown}
                  fullWidth
                  variant="outlined"
                  size="small"
                  autoComplete="off"
                  InputProps={{
                    style: { color: colors.text }
                  }}
                  InputLabelProps={{
                    style: { color: colors.textSecondary },
                    shrink: true,
                  }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      "& fieldset": { borderColor: colors.border },
                      "&:hover fieldset": { borderColor: colors.primaryLight },
                      "&.Mui-focused fieldset": { borderColor: colors.primary },
                    },
                  }}
                />
                <TextField
                  label="Label Value"
                  placeholder="e.g. frontend"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  inputRef={valueInputRef}
                  onKeyDown={handleKeyDown}
                  fullWidth
                  variant="outlined"
                  size="small"
                  autoComplete="off"
                  InputProps={{
                    style: { color: colors.text }
                  }}
                  InputLabelProps={{
                    style: { color: colors.textSecondary },
                    shrink: true,
                  }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      "& fieldset": { borderColor: colors.border },
                      "&:hover fieldset": { borderColor: colors.primaryLight },
                      "&.Mui-focused fieldset": { borderColor: colors.primary },
                    },
                  }}
                />
                <Button 
                  onClick={handleAddLabel}
                  variant="contained"
                  disabled={!newKey.trim() || !newValue.trim()}
                  startIcon={<AddIcon />}
                  style={{ 
                    backgroundColor: (!newKey.trim() || !newValue.trim()) ? colors.disabled : colors.primary,
                    color: colors.white,
                    minWidth: '100px',
                    transition: 'all 0.2s ease',
                  }}
                >
                  Add
                </Button>
              </div>
              <Typography variant="caption" style={{ color: colors.textSecondary }}>
                Tip: Press <span style={{ fontFamily: 'monospace', backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)', padding: '1px 4px', borderRadius: '2px' }}>Enter</span> to move between fields or add a label
              </Typography>
            </div>
          </Zoom>

          <Divider style={{ backgroundColor: colors.border, margin: '16px 0' }} />
          
          <div className="max-h-60 overflow-y-auto pr-1">
            {filteredLabels.length > 0 ? (
              <div className="space-y-2">
                {filteredLabels.map((label, index) => (
                  <Zoom in={true} style={{ transitionDelay: `${index * 25}ms` }} key={`${label.key}-${index}`}>
                    <div 
                      className={`flex items-center justify-between gap-2 p-2 rounded transition-all duration-200 ${selectedLabelIndex === index ? 'ring-1' : ''}`} 
                      style={{ 
                        backgroundColor: selectedLabelIndex === index 
                          ? (isDark ? 'rgba(47, 134, 255, 0.2)' : 'rgba(47, 134, 255, 0.1)') 
                          : (isDark ? 'rgba(47, 134, 255, 0.1)' : 'rgba(47, 134, 255, 0.05)'),
                        border: `1px solid ${selectedLabelIndex === index ? colors.primary : colors.border}`,
                        boxShadow: selectedLabelIndex === index 
                          ? (isDark ? '0 0 0 1px rgba(47, 134, 255, 0.4)' : '0 0 0 1px rgba(47, 134, 255, 0.2)')
                          : 'none',
                        cursor: 'default',
                      }} 
                      onClick={() => setSelectedLabelIndex(selectedLabelIndex === index ? null : index)}
                    >
                      <div className="flex items-center gap-2">
                        <Tag size={16} style={{ color: colors.primary }} />
                        <span style={{ color: colors.text }}>
                          <span style={{ fontWeight: 500 }}>{label.key}</span>
                          <span style={{ color: colors.textSecondary }}> = </span>
                          <span>{label.value}</span>
                        </span>
                      </div>
                      <Tooltip title="Remove Label">
                        <IconButton 
                          size="small" 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveLabel(labels.findIndex(l => l.key === label.key && l.value === label.value));
                          }}
                          style={{ 
                            color: selectedLabelIndex === index ? colors.primary : colors.textSecondary,
                            opacity: 0.8,
                            transition: 'all 0.2s ease',
                          }}
                          className="hover:opacity-100"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </div>
                  </Zoom>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center p-6 mt-2">
                <Tags size={28} style={{ color: colors.textSecondary, marginBottom: '12px' }} />
                <Typography variant="body2" style={{ color: colors.text, fontWeight: 500, marginBottom: '4px' }}>
                  {labelSearch ? "No matching labels found" : "No labels added yet"}
                </Typography>
                <Typography variant="caption" style={{ color: colors.textSecondary, maxWidth: '300px', margin: '0 auto' }}>
                  {labelSearch 
                    ? "Try a different search term or clear the search"
                    : "Add your first label using the fields above to help organize this workload."
                  }
                </Typography>
                
                {labelSearch && (
                  <Button
                    size="small"
                    variant="text"
                    style={{ color: colors.primary, marginTop: '12px' }}
                    onClick={() => setLabelSearch('')}
                  >
                    Clear Search
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
      
      <DialogActions 
        style={{ 
          padding: '16px 24px',
          borderTop: `1px solid ${colors.border}`,
          justifyContent: 'space-between',
        }}
      >
        <Button 
          onClick={onClose}
          style={{ 
            color: colors.textSecondary,
          }}
          variant="text"
          startIcon={<CloseIcon />}
          disabled={saving}
        >
          Cancel
        </Button>
        
        <Button 
          onClick={handleSave}
          variant="contained"
          disabled={saving}
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
          style={{ 
            backgroundColor: colors.primary,
            color: colors.white,
            minWidth: '120px',
          }}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// Select Workload Dialog Component
const SelectWorkloadDialog: React.FC<SelectWorkloadDialogProps> = ({
  open,
  onClose,
  workloads,
  onSelectWorkload,
  isDark,
  colors
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  const filteredWorkloads = searchTerm 
    ? workloads.filter(workload => 
        workload.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        workload.kind.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (workload.namespace && workload.namespace.toLowerCase().includes(searchTerm.toLowerCase())) ||
        Object.entries(workload.labels || {}).some(
          ([key, value]) => 
            key.toLowerCase().includes(searchTerm.toLowerCase()) || 
            value.toLowerCase().includes(searchTerm.toLowerCase())
        )
      )
    : workloads;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      PaperProps={{
        style: {
          backgroundColor: colors.paper,
          color: colors.text,
          border: `1px solid ${colors.border}`,
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: isDark 
            ? '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.4)' 
            : '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
        }
      }}
    >
      <DialogTitle 
        style={{ 
          color: colors.primary,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 24px',
          borderBottom: `1px solid ${colors.border}`,
        }}
      >
        <div className="flex items-center gap-2">
          <Typography variant="h6" component="span">
            Select Workload to Edit
          </Typography>
        </div>
        <IconButton onClick={onClose} size="small" style={{ color: colors.textSecondary }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      
      <DialogContent style={{ padding: '16px 24px' }}>
        <TextField
          placeholder="Search workloads..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          fullWidth
          variant="outlined"
          size="small"
          autoFocus
          margin="normal"
          InputProps={{
            style: { color: colors.text },
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon style={{ color: colors.primary, fontSize: '1.2rem' }} />
              </InputAdornment>
            ),
            endAdornment: searchTerm && (
              <InputAdornment position="end">
                <IconButton 
                  size="small" 
                  onClick={() => setSearchTerm('')}
                  style={{ color: colors.textSecondary }}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ),
          }}
          sx={{
            "& .MuiOutlinedInput-root": {
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
              "& fieldset": { borderColor: colors.border },
              "&:hover fieldset": { borderColor: colors.primaryLight },
              "&.Mui-focused fieldset": { borderColor: colors.primary },
            },
            mb: 2,
          }}
        />
        
        <List
          sx={{
            maxHeight: '400px',
            overflow: 'auto',
            '&::-webkit-scrollbar': {
              width: '8px',
            },
            '&::-webkit-scrollbar-track': {
              background: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
              borderRadius: '4px',
            },
            '&::-webkit-scrollbar-thumb': {
              background: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
              borderRadius: '4px',
              '&:hover': {
                background: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)',
              },
            },
          }}
        >
          {filteredWorkloads.length > 0 ? (
            filteredWorkloads.map((workload) => (
              <ListItemButton
                key={`${workload.kind}-${workload.namespace || 'default'}-${workload.name}`}
                onClick={() => onSelectWorkload(workload)}
                sx={{
                  borderRadius: '8px',
                  mb: 1,
                  border: `1px solid ${colors.border}`,
                  backgroundColor: isDark ? 'rgba(47, 134, 255, 0.08)' : 'rgba(47, 134, 255, 0.04)',
                  '&:hover': {
                    backgroundColor: isDark ? 'rgba(47, 134, 255, 0.15)' : 'rgba(47, 134, 255, 0.08)',
                  },
                  transition: 'all 0.2s ease',
                }}
              >
                <ListItemText 
                  primary={
                    <React.Fragment>
                      {workload.name}
                      <Chip
                        size="small"
                        label={workload.kind}
                        sx={{
                          ml: 1,
                          fontSize: '0.7rem',
                          height: 20,
                          bgcolor: isDark
                            ? alpha(colors.secondary, 0.2)
                            : alpha(colors.secondary, 0.1),
                          color: isDark
                            ? colors.secondary
                            : colors.secondary,
                        }}
                      />
                    </React.Fragment>
                  } 
                  secondary={
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mt: 0.5 }}>
                      <Typography variant="caption" sx={{ color: colors.textSecondary }}>
                        {workload.namespace || 'default'}
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {Object.entries(workload.labels || {}).slice(0, 3).map(([key, value]) => (
                          <Chip
                            key={`${key}-${value}`}
                            size="small"
                            label={`${key}=${value}`}
                            sx={{ 
                              height: 20,
                              fontSize: '0.7rem',
                              bgcolor: alpha(colors.primary, 0.1),
                              color: colors.primary,
                            }}
                          />
                        ))}
                        {Object.keys(workload.labels || {}).length > 3 && (
                          <Chip
                            size="small"
                            label={`+${Object.keys(workload.labels || {}).length - 3} more`}
                            sx={{ 
                              height: 20,
                              fontSize: '0.7rem',
                              bgcolor: alpha(colors.secondary, 0.1),
                              color: colors.secondary,
                            }}
                          />
                        )}
                      </Box>
                    </Box>
                  }
                  primaryTypographyProps={{
                    style: { 
                      color: colors.text,
                      fontWeight: 500,
                      display: 'flex',
                      alignItems: 'center',
                    }
                  }}
                  secondaryTypographyProps={{
                    style: { 
                      color: colors.textSecondary,
                    },
                    component: 'div'
                  }}
                />
                <EditIcon fontSize="small" sx={{ color: colors.primary, opacity: 0.7 }} />
              </ListItemButton>
            ))
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4 }}>
              <Typography variant="body1" sx={{ color: colors.text, fontWeight: 500, mb: 1 }}>
                No workloads found
              </Typography>
              <Typography variant="body2" sx={{ color: colors.textSecondary }}>
                {searchTerm ? 'Try a different search term' : 'No workloads available to edit'}
              </Typography>
            </Box>
          )}
        </List>
      </DialogContent>
      
      <DialogActions
        style={{ 
          padding: '16px 24px',
          borderTop: `1px solid ${colors.border}`,
        }}
      >
        <Button 
          onClick={onClose}
          style={{ 
            color: colors.textSecondary,
          }}
          variant="text"
        >
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default React.memo(WorkloadPanel);