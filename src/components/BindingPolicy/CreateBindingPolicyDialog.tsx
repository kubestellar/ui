import React, { useState, useEffect } from "react";
import Editor from "@monaco-editor/react";
import yaml from "js-yaml";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  Button,
  Tabs,
  Box,
  Alert,
  TextField,
  Snackbar,
  Typography,
  CircularProgress,
  useTheme as useMuiTheme,
} from "@mui/material";
import FileUploadIcon from '@mui/icons-material/FileUpload';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import useTheme from "../../stores/themeStore";
import CancelConfirmationDialog from './CancelConfirmationDialog';
import { 
  StyledTab, 
  StyledPaper,
  getBaseStyles,
  // getTabContentStyles,
  getEnhancedTabContentStyles,
  getTabsStyles,
  getDialogPaperProps
} from './styles/CreateBindingPolicyStyles';
import { DEFAULT_BINDING_POLICY_TEMPLATE } from "./constants/index"
import PolicyDragDrop from "./PolicyDragDrop";
import {  ManagedCluster, Workload } from "../../types/bindingPolicy";
import { PolicyConfiguration } from "./ConfigurationSidebar";
import { v4 as uuidv4 } from 'uuid';
import { useCanvasStore } from "../../stores/canvasStore";
import { usePolicyDragDropStore } from "../../stores/policyDragDropStore";

export interface PolicyData {
  name: string;
  workload: string;
  yaml: string;
}

interface YamlMetadata {
  metadata?: {
    name?: string;
  };
}
// interface BindingPolicyYaml extends YamlMetadata {
//   kind?: string;
//   spec?: {
//     downsync?: Array<{
//       apiGroup?: string;
//     }>;
//   };
// }
interface CreateBindingPolicyDialogProps {
  open: boolean;
  onClose: () => void;
  onCreatePolicy: (policyData: PolicyData) => void;
  clusters?: ManagedCluster[];
  workloads?: Workload[];
}

// Helper function to generate binding policy YAML
const generateBindingPolicyYAML = (config: PolicyConfiguration): string => {
  const bindingPolicyYaml = {
    apiVersion: "policy.kubestellar.io/v1alpha1",
    kind: "BindingPolicy",
    metadata: {
      name: config.name,
      namespace: config.namespace || "default"
    },
    spec: {
      clusterSelectors: [
        {
          matchLabels: {
            'kubernetes.io/cluster-name': config.deploymentType === 'SelectedClusters' ? '' : '*'
          }
        }
      ],
      downsync: [
        {
          apiGroup: "apps/v1",
          resources: ["deployments"],
          namespace: config.namespace || "default",
          resourceNames: []
        }
      ],
      propagationMode: config.propagationMode || "DownsyncOnly",
      updateStrategy: config.updateStrategy || "ServerSideApply"
    }
  };
  
  return yaml.dump(bindingPolicyYaml);
};

// Deployment policy interface
interface DeploymentPolicy {
  id: string;
  name: string;
  workloadId: string;
  clusterId: string;
  workloadName: string;
  clusterName: string;
  config: PolicyConfiguration;
  yaml: string;
}

const CreateBindingPolicyDialog: React.FC<CreateBindingPolicyDialogProps> = ({
  open,
  onClose,
  onCreatePolicy,
  clusters = [],
  workloads = [],
}) => {
  const muiTheme = useMuiTheme();
  const theme = useTheme((state) => state.theme);
  const {  textColor, helperTextColor } = getBaseStyles(theme);
  //const tabContentStyles = getTabContentStyles(theme);
  const enhancedTabContentStyles = getEnhancedTabContentStyles(theme);
  
  const [activeTab, setActiveTab] = useState<string>("dragdrop");
  const [editorContent, setEditorContent] = useState<string>(DEFAULT_BINDING_POLICY_TEMPLATE);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const [policyName, setPolicyName] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [showCancelConfirmation, setShowCancelConfirmation] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragDropYaml, setDragDropYaml] = useState<string>("");


  // Get the connection lines and canvas entities from their respective stores
  const connectionLines = useCanvasStore(state => state.connectionLines);
  const policyCanvasEntities = usePolicyDragDropStore(state => state.canvasEntities);

  const handleTabChange = (_event: React.SyntheticEvent, value: string) => {
    setActiveTab(value);
    if (value === "yaml" && !editorContent) {
      setEditorContent(DEFAULT_BINDING_POLICY_TEMPLATE);
    }
   
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelection(file);
    }
  };

  const handleFileSelection = (file: File) => {
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result;
      if (typeof result === "string") {
        setFileContent(result);
        try {
          const parsedYaml = yaml.load(result) as YamlMetadata;
          if (parsedYaml?.metadata?.name) {
            setPolicyName(parsedYaml.metadata.name);
          }
        } catch (e) {
          console.error("Error parsing YAML:", e);
        }
      }
    };
    reader.readAsText(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      const fileType = file.name.split('.').pop()?.toLowerCase();
      
      if (fileType === 'yaml' || fileType === 'yml') {
        handleFileSelection(file);
      } else {
        setError("Only YAML files are allowed. Please drop a .yaml or .yml file.");
      }
    }
  };

  // const validateYaml = (content: string): boolean => {
  //   try {
  //     const parsedYaml = yaml.load(content) as YamlMetadata;

  //     // Check for required fields
  //     if (!parsedYaml) {
  //       setError("YAML content is empty or invalid");
  //       return false;
  //     }

  //     if (!parsedYaml.metadata) {
  //       setError("YAML must include metadata section");
  //       return false;
  //     }

  //     if (!parsedYaml.metadata.name) {
  //       setError("YAML must include metadata.name field");
  //       return false;
  //     }

  //     // Update policy name from YAML if needed
  //     if (parsedYaml.metadata.name !== policyName) {
  //       setPolicyName(parsedYaml.metadata.name);
  //     }

  //     return true;
  //   } catch (e) {
  //     if (e instanceof Error) {
  //       setError(`Invalid YAML format: ${e.message}`);
  //     } else {
  //       setError("Invalid YAML format");
  //     }
  //     return false;
  //   }
  // };

  // const handleCreate = async () => {
  //   // Determine which content to use based on active tab
  //   let content = "";
  //   if (activeTab === "yaml") {
  //     content = editorContent;
  //   } else if (activeTab === "file") {
  //     content = fileContent;
  //   } else if (activeTab === "dragdrop") {
  //     content = dragDropYaml;
  //   }

  //   if (!content) {
  //     setError("YAML content is required");
  //     return;
  //   }

  //   if (!validateYaml(content)) {
  //     return;
  //   }

  //   setIsLoading(true);
  //   setError(""); // Clear any previous errors
    
  //   try {
  //     // Extract additional info from YAML if needed
  //     let workloadInfo = "default-workload";
  //     try {
  //       const parsedYaml = yaml.load(content) as BindingPolicyYaml;
  //       // Try to extract workload info from downsync if available
  //       if (parsedYaml?.spec?.downsync?.[0]?.apiGroup) {
  //         workloadInfo = parsedYaml.spec.downsync[0].apiGroup;
  //       } else if (parsedYaml?.kind) {
  //         // If no downsync, try to use the kind
  //         workloadInfo = parsedYaml.kind;
  //       }
  //     } catch (e) {
  //       console.error("Error parsing YAML for workload info:", e);
  //     }

  //     // Call the onCreatePolicy callback with the created policy data
  //     onCreatePolicy({
  //       name: policyName,
  //       workload: workloadInfo,
  //       yaml: content
  //     });

  //     // Reset form (will only happen if no errors occur)
  //     setTimeout(() => {
  //       setEditorContent(DEFAULT_BINDING_POLICY_TEMPLATE);
  //       setPolicyName("");
  //       setSelectedFile(null);
  //       setFileContent("");
  //       setDragDropYaml("");
  //     }, 500);
      
  //   } catch (error) {
  //     console.error("Error preparing binding policy data:", error);
  //     setError(
  //       error instanceof Error
  //         ? `Error: ${error.message}`
  //         : "Failed to prepare binding policy data"
  //     );
  //     setIsLoading(false); // Only reset loading state on error
  //   }
  //   // Note: We don't set loading to false or close the dialog here
  //   // This will be handled by the parent component based on API response
  // };

  // Function to prepare policies for deployment
  const prepareForDeployment = () => {
    if (!connectionLines || connectionLines.length === 0) {
      setError("No connections found between workloads and clusters");
      return;
    }
    
    // Generate policies from connection lines
    const policies = connectionLines.map(line => {
      // Extract workload and cluster IDs from the connection line
      const workloadId = line.source.startsWith('workload-') 
        ? line.source.replace('workload-', '') 
        : line.target.replace('workload-', '');
      
      const clusterId = line.source.startsWith('cluster-') 
        ? line.source.replace('cluster-', '') 
        : line.target.replace('cluster-', '');
      
      // Find the workload and cluster
      const workload = workloads.find(w => w.name === workloadId);
      const cluster = clusters.find(c => c.name === clusterId);
      
      if (!workload || !cluster) {
        console.error('Could not find workload or cluster for connection:', line);
        return null;
      }
      
      // Create a unique policy name if it doesn't exist
      const policyName = `${workload.name}-to-${cluster.name}`;
      
      // Create a default configuration
      const config: PolicyConfiguration = {
        name: policyName,
        namespace: workload.namespace || 'default',
        propagationMode: 'DownsyncOnly',
        updateStrategy: line.color === '#2196f3' ? 'RollingUpdate' :
                      line.color === '#009688' ? 'BlueGreenDeployment' :
                      line.color === '#ff9800' ? 'ForceApply' : 'ServerSideApply',
        deploymentType: 'SelectedClusters',
        schedulingRules: [],
        customLabels: {},
        tolerations: []
      };
      
      // Generate YAML for the policy
      const yaml = generateBindingPolicyYAML(config);
      
      return {
        id: uuidv4(), // Generate a unique ID
        name: policyName,
        workloadId,
        clusterId,
        workloadName: workload.name,
        clusterName: cluster.name,
        config,
        yaml
      };
    }).filter(Boolean) as DeploymentPolicy[];
    
    // For each policy, generate the YAML and process it through handleCreate
    if (policies.length === 0) {
      setError("No valid connections between workloads and clusters found");
      return;
    }
    
    // Set loading state
    setIsLoading(true);
    setError(""); // Clear any previous errors
    
    // Process all policies
    try {
      // Create combined YAML document with all policies
      const allPolicyYamls = policies.map(policy => policy.yaml).join("\n---\n");
      const combinedPolicyName = `binding-policies-${new Date().getTime()}`;
      
      // Call the onCreatePolicy callback with the combined policy data
      onCreatePolicy({
        name: combinedPolicyName,
        workload: "combined-workloads",
        yaml: allPolicyYamls
      });
      
      // Reset form (will only happen if no errors occur)
      setTimeout(() => {
        setEditorContent(DEFAULT_BINDING_POLICY_TEMPLATE);
        setPolicyName("");
        setSelectedFile(null);
        setFileContent("");
        setDragDropYaml("");
      }, 500);
    } catch (error) {
      console.error("Error preparing binding policy data:", error);
      setError(
        error instanceof Error
          ? `Error: ${error.message}`
          : "Failed to prepare binding policy data"
      );
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      setEditorContent(DEFAULT_BINDING_POLICY_TEMPLATE);
      setPolicyName("");
      setSelectedFile(null);
      setFileContent("");
      setError("");
      setIsLoading(false); // Reset loading state when dialog is opened
      setDragDropYaml("");
    }
    
    // Cleanup function to ensure loading state is reset when dialog closes
    return () => {
      if (!open) {
        setIsLoading(false);
      }
    };
  }, [open]);

  // Extract policy name from the YAML content when it changes
  useEffect(() => {
    if (activeTab === "yaml" && editorContent) {
      try {
        const parsedYaml = yaml.load(editorContent) as YamlMetadata;
        if (parsedYaml?.metadata?.name) {
          setPolicyName(parsedYaml.metadata.name);
        }
      } catch (e) {
        // Don't show error here, just don't update the policy name
        console.debug("Error parsing YAML while typing:", e);
      }
    }
  }, [activeTab, editorContent]);

  const handleCancelClick = () => {
    if (
      activeTab === "yaml"
        ? editorContent !== DEFAULT_BINDING_POLICY_TEMPLATE
        : activeTab === "file" 
          ? fileContent || policyName
          : dragDropYaml
    ) {
      setShowCancelConfirmation(true);
    } else {
      onClose();
    }
  };

  const handleConfirmCancel = () => {
    setShowCancelConfirmation(false);
    setIsLoading(false); // Ensure loading state is reset when user cancels
    onClose();
  };

  // Handler for when a binding policy is created from drag and drop
  const handleCreateBindingPolicy = (clusterId: string, workloadId: string, config?: PolicyConfiguration) => {
    if (!config) return;
    
    // Generate YAML from config
    const bindingPolicyYaml = {
      apiVersion: "policy.kubestellar.io/v1alpha1",
      kind: "BindingPolicy",
      metadata: {
        name: config.name,
        namespace: config.namespace || "default"
      },
      spec: {
        clusterSelectors: [
          {
            matchLabels: {
              'kubernetes.io/cluster-name': clusterId
            }
          }
        ],
        downsync: [
          {
            apiGroup: "apps/v1",
            resources: ["deployments"],
            namespace: config.namespace || "default",
            resourceNames: [workloadId]
          }
        ],
        propagationMode: config.propagationMode || "DownsyncOnly",
        updateStrategy: config.updateStrategy || "ServerSideApply"
      }
    };

    // Convert to YAML string
    const yamlString = yaml.dump(bindingPolicyYaml);
    setDragDropYaml(yamlString);
    setPolicyName(config.name);
    
    // Return a promise that resolves immediately for compatibility with existing code
    return Promise.resolve();
  };

  // Function to generate YAML preview for all connections
 
  
  // // Update generated YAML when connections change
  // useEffect(() => {
  //   if (activeTab === "previewYaml") {
  //     updateGeneratedYaml();
  //   }
  // }, [connectionLines, activeTab]);

  const isDarkTheme = theme === "dark";

  return (
    <>
      <Dialog
        open={open}
        onClose={handleCancelClick}
        maxWidth="xl"
        fullWidth
        PaperProps={{
          sx: {
            ...getDialogPaperProps(theme),
            height: "95vh",
            maxHeight: "95vh",
            minWidth: "90vw"
          }
        }}
      >
        <DialogTitle
          sx={{
            borderBottom: 1,
            borderColor: "divider",
            p: 2,
            flex: "0 0 auto",
            display: 'flex',
            flexDirection: 'column',
            backdropFilter: 'blur(10px)',
            // bgcolor: theme === "dark" ? "rgba(0, 0, 0, 0.2)" : "rgba(0, 0, 0, 0.02)",
          }}
        >
          <Typography variant="h6" component="span" fontWeight={600}>
            Create Binding Policy
          </Typography>
          <Typography variant="caption" component="div" sx={{ 
                  fontSize: "0.75rem",
                  color: muiTheme.palette.text.secondary, 
                  mt: 0.25,
                  display: { xs: "none", sm: "block" } 
                }}>
            Create Binding Policies
          </Typography>
     
          <Tabs
              value={activeTab}
              onChange={handleTabChange}
              variant="scrollable"
              scrollButtons="auto"
              sx={getTabsStyles(theme)}
            >
              
            <StyledTab 
                icon={<span role="img" aria-label="yaml" style={{ fontSize: "0.9rem" }}>📄</span>} 
                iconPosition="start" 
                label="YAML" 
                value="yaml" 
              />
              <StyledTab 
                icon={<span role="img" aria-label="file" style={{ fontSize: "0.9rem" }}>📁</span>
              } 
                iconPosition="start" 
                label="Upload File" 
                value="file" 
              />
              <StyledTab 
                icon={<DragIndicatorIcon />}
                iconPosition="start" 
                label="Drag & Drop" 
                value="dragdrop" 
                sx={{ 
                  color: "primary.main",
                  "&:hover": {
                    bgcolor: "rgba(25, 118, 210, 0.04)",
                  }
                }}
              />
              
            </Tabs>
            </DialogTitle>
        <DialogContent
          sx={{
            p: 2,
            flex: 1,
            overflow: "hidden",
            mt: 2,
            height: "calc(95vh - 140px)" // Adjust to account for title and actions
          }}
        >
          <Box
            sx={{
              height: "100%",
              display: "flex",
              flexDirection: "column",
              border: `1px solid ${theme === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"}`,
              backgroundColor: theme === "dark" ? "rgba(0, 0, 0, 0.2)" : "rgba(255, 255, 255, 0.8)",
              boxShadow: theme === "dark" 
                ? "0 4px 12px rgba(0, 0, 0, 0.3)" 
                : "0 4px 12px rgba(0, 0, 0, 0.05)",
              mb: 1,
              borderRadius: { xs: 1.5, sm: 2 },
            }}
          >
            <Box sx={{ px: 2 }}>
              {(activeTab !== "dragdrop") && (
                <TextField
                  fullWidth
                  label="Binding Policy Name"
                  value={policyName}
                  onChange={(e) => setPolicyName(e.target.value)}
                  required
                  sx={{
                    my: 1,
                    "& .MuiInputBase-input": { color: textColor },
                    "& .MuiInputLabel-root": { color: textColor },
                    "& .MuiOutlinedInput-notchedOutline": {
                      borderColor: "divider",
                      borderRadius: '8px',
                    },
                    "& .MuiFormHelperText-root": {
                      color: helperTextColor,
                      marginTop: 0.5,
                    },
                    "& .MuiOutlinedInput-root": {
                      "&:hover .MuiOutlinedInput-notchedOutline": {
                        borderColor: 'primary.main',
                      },
                    },
                  }}
                  InputProps={{
                    readOnly: true,
                  }}
                  helperText="Policy name is extracted from YAML metadata.name"
                />
              )}
            </Box>

            <Box
              sx={{
                flex: 1,
                overflow: "hidden",
                p: 2,
              }}
            >
              {activeTab === "yaml" && (
                <Box sx={{
                  ...enhancedTabContentStyles,
                  border: "none",
                  boxShadow: "none",
                  bgcolor: "transparent",
                  p: 0,
                  flex: 1,
                  height: "65vh",
                }} >
                <StyledPaper elevation={0} sx={{ height: '100%', overflow: 'hidden' }}>
                  <Editor
                    height="100%"
                    language="yaml"
                    value={editorContent}
                    theme={isDarkTheme ? "vs-dark" : "light"}
                    options={{
                      minimap: { enabled: false },
                      fontSize: 14,
                      lineNumbers: "on",
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                      fontFamily: "'JetBrains Mono', monospace",
                      padding: { top: 10 },
                    }}
                    onChange={(value) => setEditorContent(value || "")}
                  />
                </StyledPaper>
                </Box>
              )}

              {activeTab === "file" && (
                <Box sx={{
                  ...enhancedTabContentStyles,
                  border: "none",
                  boxShadow: "none",
                  bgcolor: "transparent",
                  p: 0,
                }}>
  
                <StyledPaper
                  elevation={0}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  sx={{
                    height: "100%",
                    border: "2px dashed",
                    borderColor: isDragging ? 'primary.main' : "divider",
                    borderRadius: '8px',
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: 'all 0.2s ease',
                    
                    backgroundColor: isDragging 
                      ? (isDarkTheme ? 'rgba(25, 118, 210, 0.08)' : 'rgba(25, 118, 210, 0.04)') 
                      : 'transparent',
                    '&:hover': {
                      borderColor: 'primary.main',
                      backgroundColor: isDarkTheme ? 'rgba(25, 118, 210, 0.04)' : 'rgba(25, 118, 210, 0.04)'
                    }
                  }}
                >
                  <Box sx={{ textAlign: "center" }}>
                    <span role="img" aria-label="upload" style={{ fontSize: "1.75rem" }}>📤</span>
                    <Typography variant="h6" gutterBottom>
                      {selectedFile 
                        ? 'YAML File Selected' 
                        : isDragging 
                          ? 'Drop YAML File Here' 
                          : 'Choose or Drag & Drop a YAML File'}
                    </Typography>
                   <Box sx={{ color: muiTheme.palette.text.secondary, mb: 2, fontSize: "0.85rem" }}>
                        - or -
                      </Box>
                    <Button
                      variant="contained"
                      component="label"
                      sx={{ 
                        mb: 2,
                        textTransform: 'none',
                        borderRadius: '8px',
                        fontWeight: 500,
                        px: 3,
                        py: 1,
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          transform: 'translateY(-2px)',
                          boxShadow: '0 4px 8px rgba(0,0,0,0.2)'
                        }
                      }}
                      startIcon={<FileUploadIcon />}
                    >
                      {selectedFile ? 'Choose Different File' : 'Choose YAML File'}
                      <input
                        type="file"
                        hidden
                        accept=".yaml,.yml"
                        onChange={handleFileChange}
                      />
                    </Button>
                    {selectedFile && (
                      <Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mt: 1
                      }}>
                        <CheckCircleIcon color="success" sx={{ mr: 1 }} />
                        <Typography variant="body2" color="text.secondary">
                          Selected: <strong>{selectedFile.name}</strong> ({(selectedFile.size / 1024).toFixed(1)} KB)
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </StyledPaper>
                </Box>
                
              )}

              {activeTab === "dragdrop" && (
                <Box sx={{
                  ...enhancedTabContentStyles,
                  height: "65vh",
                  border: "none",
                  boxShadow: "none",
                  bgcolor: "transparent",
                  p: 0,
                  overflow: "hidden"
                }}>
                  <PolicyDragDrop
                    clusters={clusters}
                    workloads={workloads}
                    onCreateBindingPolicy={handleCreateBindingPolicy}
                    dialogMode={true}
                  />
                </Box>
              )}

             
            </Box>

            <DialogActions
              sx={{
                p: 1.5,
                bgcolor: isDarkTheme ? 'rgba(31, 41, 55, 0.8)' : 'rgba(255, 255, 255, 0.8)',
                backdropFilter: 'blur(10px)',
                borderTop: `1px solid transparent`,
              }}
            >
              <Button 
                onClick={handleCancelClick} 
                disabled={isLoading}
                sx={{ 
                  px: 3,
                  py: 1,
                  textTransform: 'none',
                  fontWeight: 500,
                  borderRadius: '8px',
                  '&:hover': {
                    backgroundColor: isDarkTheme ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)'
                  }
                }}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={prepareForDeployment}
                color="primary"
                disabled={
                  isLoading ||
                  !connectionLines?.length ||
                  !policyCanvasEntities?.clusters?.length || 
                  !policyCanvasEntities?.workloads?.length
                }
                sx={{
                  bgcolor: "#1976d2 !important",
                  color: "#fff !important",
                  "&:hover": {
                    bgcolor: "#1565c0 !important",
                    transform: 'translateY(-2px)',
                    boxShadow: '0 4px 8px rgba(0,0,0,0.2)'
                  },
                  "&:disabled": {
                    bgcolor: "rgba(25, 118, 210, 0.5) !important",
                    color: "rgba(255, 255, 255, 0.7) !important",
                  },
                  textTransform: 'none',
                  fontWeight: 500,
                  borderRadius: '8px',
                  px: 3,
                  py: 1,
                  transition: 'all 0.2s ease',
                }}
              >
                {isLoading ? (
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    <CircularProgress size={20} sx={{ mr: 1 }} />
                    Deploying...
                  </Box>
                ) : (
                  "Deploy Binding Policies"
                )}
              </Button>
            </DialogActions>
          </Box>
        </DialogContent>
      </Dialog>
   

      <CancelConfirmationDialog
        open={showCancelConfirmation}
        onClose={() => setShowCancelConfirmation(false)}
        onConfirm={handleConfirmCancel}
      />

      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError("")}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity="error"
          variant="filled"
          onClose={() => setError("")}
          sx={{ 
            width: "100%",
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(211, 47, 47, 0.2)'
          }}
        >
          {error}
        </Alert>
      </Snackbar>
    </>
  );
};

export default CreateBindingPolicyDialog;