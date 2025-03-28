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
import { usePolicyDragDropStore } from "../../stores/policyDragDropStore";
import { useBPQueries } from "../../hooks/queries/useBPQueries";

export interface PolicyData {
  name: string;
  workloads: string[];
  clusters: string[];
  namespace: string;
  yaml: string;
}

interface YamlPolicySpec {
  downsync?: Array<{
    apiGroup?: string;
    namespaces?: string[];
  }>;
}

interface YamlPolicy {
  metadata?: {
    name?: string;
    namespace?: string;
  };
  spec?: YamlPolicySpec;
}

interface ApiError {
  response?: {
    data?: {
      message?: string;
    };
    status?: number;
  };
  message: string;
}

interface CreateBindingPolicyDialogProps {
  open: boolean;
  onClose: () => void;
  onCreatePolicy: (policyData: PolicyData) => void;
  clusters?: ManagedCluster[];
  workloads?: Workload[];
}



const CreateBindingPolicyDialog: React.FC<CreateBindingPolicyDialogProps> = ({
  open,
  onClose,
  onCreatePolicy,
  clusters = [],
  workloads = [],
}) => {
  const theme = useTheme((state) => state.theme);
  const {  textColor, helperTextColor } = getBaseStyles(theme);
  //const tabContentStyles = getTabContentStyles(theme);
  const enhancedTabContentStyles = getEnhancedTabContentStyles(theme);
  
  const [activeTab, setActiveTab] = useState<string>("yaml");
  const [editorContent, setEditorContent] = useState<string>(DEFAULT_BINDING_POLICY_TEMPLATE);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const [policyName, setPolicyName] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [showCancelConfirmation, setShowCancelConfirmation] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragDropYaml, setDragDropYaml] = useState<string>("");
  const [previewYaml, setPreviewYaml] = useState<string>("");
  const [, setSuccessMessage] = useState<string>("");
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);

  // Get the connection lines and canvas entities from their respective stores

  const policyCanvasEntities = usePolicyDragDropStore(state => state.canvasEntities);

  // Get the mutations
  const { useGenerateBindingPolicyYaml, useQuickConnect } = useBPQueries();
  const generateYamlMutation = useGenerateBindingPolicyYaml();
  const quickConnectMutation = useQuickConnect();


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
          const parsedYaml = yaml.load(result) as YamlPolicy;
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

  // Function to prepare policies for deployment
  const prepareForDeployment = async () => {
    // Check if we have clusters and workloads
    if (policyCanvasEntities.clusters.length === 0 || policyCanvasEntities.workloads.length === 0) {
      setError("Both clusters and workloads are required to create binding policies");
      return;
    }
    
    setIsLoading(true);
    setError("");
    
    try {
      // Create a single binding policy with all workloads and all clusters
      // Generate a unique policy name using timestamp
      const timestamp = Date.now();
      const workloadNames = policyCanvasEntities.workloads.join("-");
      const policyName = `${workloadNames}-binding-${timestamp}`;
      
      console.log(`Creating a single policy with workloads: ${policyCanvasEntities.workloads} and clusters: ${policyCanvasEntities.clusters}`);
      
      try {
        // Call quick-connect API with all workloads and all clusters
        const result = await quickConnectMutation.mutateAsync({
          workloadIds: policyCanvasEntities.workloads,
          clusterIds: policyCanvasEntities.clusters,
          policyName,
          namespace: 'default'
        });
        console.log(result);
        // Show success message
        setSuccessMessage(`Successfully created binding policy "${policyName}"`);
        
        // Close dialog
        onClose();
      } catch (error: unknown) {
        const apiError = error as ApiError;
        // Extract error message from response if available
        const errorMessage = apiError.response?.data?.message || apiError.message || 'Unknown error occurred';
        console.error("Error creating binding policy:", error);
        
        // If it's a conflict error, provide more specific message
        if (apiError.response?.status === 409) {
          throw new Error(`A binding policy with this name already exists. Please try again.`);
        }
        
        throw new Error(`Failed to create binding policy: ${errorMessage}`);
      }
    } catch (error: unknown) {
      const apiError = error as ApiError;
      console.error("Error creating binding policy:", error);
      setError(apiError.message || "Failed to create binding policy");
    } finally {
      setIsLoading(false);
    }
  };

  // Function to handle file upload binding policy creation
  const handleCreateFromFile = () => {
    // Validate input based on the active tab
    if (activeTab === "file") {
      if (!fileContent) {
        setError("Please select a YAML file first");
        return;
      }
      
      if (!policyName) {
        setError("Could not extract policy name from YAML. Please ensure your YAML has metadata.name");
        return;
      }
    } else if (activeTab === "yaml") {
      if (!editorContent) {
        setError("YAML content is required");
        return;
      }
      
      if (!policyName) {
        setError("Could not extract policy name from YAML. Please ensure your YAML has metadata.name");
        return;
      }
    }
    
    // Set loading state
    setIsLoading(true);
    setError(""); // Clear any previous errors
    
    try {
      // Determine which content to use based on active tab
      let content = "";
      if (activeTab === "yaml") {
        content = editorContent;
      } else if (activeTab === "file") {
        content = fileContent;
      }

      // Extract workload info for better categorization
      let workloadInfo = "default-workload";
      try {
        const parsedYaml = yaml.load(content) as YamlPolicy;
        if (parsedYaml?.spec?.downsync?.[0]?.apiGroup) {
          workloadInfo = parsedYaml.spec.downsync[0].apiGroup;
        }
      } catch (e) {
        console.error("Error parsing YAML for workload info:", e);
      }
      
      // Call the onCreatePolicy callback with the policy data
      onCreatePolicy({
        name: policyName,
        workloads: [workloadInfo],
        clusters: policyCanvasEntities.clusters,
        namespace: 'default',
        yaml: content
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
      console.error("Error creating binding policy:", error);
      setError(
        error instanceof Error
          ? `Error: ${error.message}`
          : "Failed to create binding policy"
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
        const parsedYaml = yaml.load(editorContent) as YamlPolicy;
        if (parsedYaml?.metadata?.name) {
          setPolicyName(parsedYaml.metadata.name);
          console.log("Detected policy name:", parsedYaml.metadata.name);
        } else {
          console.debug("No metadata.name found in YAML");
        }
      } catch (e) {
        // Don't show error here, just don't update the policy name
        console.debug("Error parsing YAML while typing:", e);
      }
    }
  }, [activeTab, editorContent]);

  // Also extract policy name on initial load
  useEffect(() => {
    if (open && activeTab === "yaml" && editorContent) {
      try {
        const parsedYaml = yaml.load(editorContent) as YamlPolicy;
        if (parsedYaml?.metadata?.name) {
          setPolicyName(parsedYaml.metadata.name);
        }
      } catch (e) {
        console.debug("Error parsing initial YAML:", e);
      }
    }
  }, [open, activeTab, editorContent]);

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
  const handleCreateBindingPolicy = async (clusterIds: string[], workloadIds: string[], config?: PolicyConfiguration) => {
    if (!config) return;
    
    try {
      const clusterId = clusterIds[0]; // For backward compatibility
      const workloadId = workloadIds[0]; // For backward compatibility
      
      if (!clusterId || !workloadId) {
        console.error('Missing cluster or workload ID');
        return;
      }
      
      // First generate the YAML preview
      const generateYamlResponse = await generateYamlMutation.mutateAsync({
        workloadIds: [workloadId],
        clusterIds: [clusterId],
        namespace: config.namespace || "default",
        policyName: config.name
      });
      
      // Update the preview YAML and show dialog
      setPreviewYaml(generateYamlResponse.yaml);
      setShowPreviewDialog(true);
      
      // Return a promise that resolves immediately for compatibility
      return Promise.resolve();
    } catch (error) {
      console.error("Error generating binding policy YAML:", error);
      setError("Failed to generate binding policy YAML");
      return Promise.reject(error);
    }
  };

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
                  color: theme === "dark" ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.9)", 
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
                icon={<span role="img" aria-label="yaml" style={{ 
                  fontSize: "0.9rem", 
                  color: isDarkTheme ? '#FFFFFF' : 'inherit' 
                }}>📄</span>} 
                iconPosition="start" 
                label="YAML" 
                value="yaml" 
              />
              <StyledTab 
                icon={<span role="img" aria-label="file" style={{ 
                  fontSize: "0.9rem", 
                  color: isDarkTheme ? '#FFFFFF' : 'inherit' 
                }}>📁</span>
              } 
                iconPosition="start" 
                label="Upload File" 
                value="file" 
              />
              <StyledTab 
                icon={<DragIndicatorIcon sx={{ color: isDarkTheme ? '#FFFFFF' : 'inherit' }} />}
                iconPosition="start" 
                label="Drag & Drop" 
                value="dragdrop" 
                sx={{ 
                  color: isDarkTheme ? '#FFFFFF' : "primary.main",
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
            height: "calc(95vh - 140px)" 
          }}
        >
          <Box
            sx={{
              height: "100%",
              display: "flex",
              flexDirection: "column",
              border: `1px solid ${theme === "dark" ? "rgba(255, 255, 255, 0.15)" : "rgba(0, 0, 0, 0.1)"}`,
              backgroundColor: theme === "dark" ? "rgba(17, 25, 40, 0.8)" : "rgba(255, 255, 255, 0.8)",
              boxShadow: theme === "dark" 
                ? "0 4px 12px rgba(0, 0, 0, 0.5)" 
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
                    "& .MuiInputBase-input": { 
                      color: textColor,
                      backgroundColor: theme === "dark" ? "rgba(0, 0, 0, 0.1)" : "transparent" 
                    },
                    "& .MuiInputLabel-root": { 
                      color: theme === "dark" ? "rgba(255, 255, 255, 0.9)" : textColor,
                      ...(policyName && { 
                        color: theme === "dark" ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.9)" 
                      })
                    },
                    "& .MuiOutlinedInput-notchedOutline": {
                      borderColor: policyName 
                        ? theme === "dark" ? "rgba(255, 255, 255, 0.5)" : "rgba(0, 0, 0, 0.5)" 
                        : theme === "dark" ? "rgba(255, 255, 255, 0.23)" : "divider",
                      borderRadius: '8px',
                    },
                    "& .MuiFormHelperText-root": {
                      color: policyName 
                        ? theme === "dark" ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.9)" 
                        : theme === "dark" ? "rgba(255, 255, 255, 0.7)" : helperTextColor,
                      marginTop: 0.5,
                    },
                    "& .MuiOutlinedInput-root": {
                      "&:hover .MuiOutlinedInput-notchedOutline": {
                        borderColor: policyName 
                          ? theme === "dark" ? "rgba(255, 255, 255, 0.5)" : "rgba(0, 0, 0, 0.5)" 
                          : theme === "dark" ? "rgba(255, 255, 255, 0.5)" : 'primary.main',
                      },
                      "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                        borderColor: policyName 
                          ? theme === "dark" ? "" : "" 
                          : theme === "dark" ? "#2563eb" : 'primary.main',
                        borderWidth: 2,
                      },
                    },
                  }}
                  InputProps={{
                    readOnly: true,
                  }}
                  
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
                  height: "75vh",
                  display: "flex",
                  flexDirection: "column"
                }} >
                <StyledPaper elevation={0} sx={{ 
                  height: '100%', 
                  overflow: 'auto', 
                  flexGrow: 1,
                  border: `1px solid ${theme === "dark" ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.12)"}`,
                  borderRadius: '8px',
                  display: 'flex',
                  flexDirection: 'column'
                }}>
                  <Editor
                    height="100%"
                    language="yaml"
                    value={editorContent}
                    theme={isDarkTheme ? "vs-dark" : "light"}
                    options={{
                      minimap: { enabled: false },
                      fontSize: 14,
                      lineNumbers: "on",
                      scrollBeyondLastLine: true,
                      automaticLayout: true,
                      fontFamily: "'JetBrains Mono', monospace",
                      padding: { top: 10, bottom: 10 },
                    }}
                    onChange={(value) => {
                      setEditorContent(value || "");
                      // Try to extract policy name immediately on change
                      if (value) {
                        try {
                          const parsedYaml = yaml.load(value) as YamlPolicy;
                          if (parsedYaml?.metadata?.name) {
                            setPolicyName(parsedYaml.metadata.name);
                          }
                        } catch (e) {
                          console.log("Error parsing YAML on change:", e);
                        }
                      }
                    }}
                  />
                </StyledPaper>
                </Box>
              )}

              {activeTab === "file" && (
                <Box sx={{
                  ...enhancedTabContentStyles,
                  height: "75vh",
                  border: "none",
                  boxShadow: "none",
                  bgcolor: "transparent",
                  p: 0,
                  overflow: "hidden"
                }}>
                  {!selectedFile ? (
                    <StyledPaper
                      elevation={0}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      sx={{
                        height: "100%",
                        border: "2px dashed",
                        borderColor: isDragging ? 'primary.main' : theme === "dark" ? "rgba(255, 255, 255, 0.2)" : "divider",
                        borderRadius: '8px',
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transition: 'all 0.2s ease',
                        
                        backgroundColor: isDragging 
                          ? (isDarkTheme ? 'rgba(25, 118, 210, 0.12)' : 'rgba(25, 118, 210, 0.04)') 
                          : 'transparent',
                        '&:hover': {
                          borderColor: 'primary.main',
                          backgroundColor: isDarkTheme ? 'rgba(25, 118, 210, 0.08)' : 'rgba(25, 118, 210, 0.04)'
                        }
                      }}
                    >
                      <Box sx={{ textAlign: "center" }}>
                        <span role="img" aria-label="upload" style={{ fontSize: "1.75rem" }}>📤</span>
                        <Typography variant="h6" gutterBottom sx={{ color: theme === "dark" ? "#d4d4d4" : "#333" }}>
                          {isDragging ? 'Drop YAML File Here' : 'Choose or Drag & Drop a YAML File'}
                        </Typography>
                        <Box sx={{ color: theme === "dark" ? "#d4d4d4" : "#333", mb: 2, fontSize: "0.85rem" }}>
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
                          Choose YAML File
                          <input
                            type="file"
                            hidden
                            accept=".yaml,.yml"
                            onChange={handleFileChange}
                          />
                        </Button>
                      </Box>
                    </StyledPaper>
                  ) : (
                    <Box sx={{ 
                      height: '100%', 
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 2
                    }}>
                      <Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        mb: 2,
                        p: 2,
                        borderRadius: '8px',
                        bgcolor: isDarkTheme ? 'rgba(25, 118, 210, 0.08)' : 'rgba(25, 118, 210, 0.04)',
                        border: '1px solid',
                        borderColor: isDarkTheme ? 'rgba(25, 118, 210, 0.2)' : 'rgba(25, 118, 210, 0.1)',
                      }}>
                        <Box sx={{
                          display: 'flex',
                          alignItems: 'center',
                        }}>
                          <CheckCircleIcon color="success" sx={{ mr: 1 }} />
                          <Typography variant="body1">
                            <strong>{selectedFile.name}</strong> ({(selectedFile.size / 1024).toFixed(1)} KB)
                          </Typography>
                        </Box>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => {
                            setSelectedFile(null);
                            setFileContent("");
                            setPolicyName("");
                          }}
                          sx={{ 
                            textTransform: 'none',
                            borderRadius: '8px'
                          }}
                        >
                          Choose Different File
                        </Button>
                      </Box>
                      <Typography variant="subtitle1" fontWeight={500} sx={{ mb: 1 }}>
                        File Preview:
                      </Typography>
                      <StyledPaper elevation={0} sx={{ 
                        flexGrow: 1, 
                        height: 'calc(100% - 90px)', 
                        overflow: 'auto',
                        border: `1px solid ${theme === "dark" ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.12)"}`,
                        borderRadius: '8px',
                        display: 'flex',
                        flexDirection: 'column',
                        mb: 2 
                      }}>
                        <Editor
                          height="100%"
                          language="yaml"
                          value={fileContent}
                          theme={isDarkTheme ? "vs-dark" : "light"}
                          options={{
                            minimap: { enabled: false },
                            fontSize: 14,
                            lineNumbers: "on",
                            scrollBeyondLastLine: true,
                            automaticLayout: true,
                            fontFamily: "'JetBrains Mono', monospace",
                            padding: { top: 10, bottom: 10 },
                            readOnly: true
                          }}
                        />
                      </StyledPaper>
                    </Box>
                  )}
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
                bgcolor: isDarkTheme ? 'rgba(17, 25, 40, 0.9)' : 'rgba(255, 255, 255, 0.8)',
                backdropFilter: 'blur(10px)',
                borderTop: `1px solid ${isDarkTheme ? 'rgba(255, 255, 255, 0.12)' : 'transparent'}`,
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
                  color: isDarkTheme ? 'rgba(255, 255, 255, 0.9)' : undefined,
                  '&:hover': {
                    backgroundColor: isDarkTheme ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.04)'
                  }
                }}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={activeTab === "dragdrop" ? prepareForDeployment : handleCreateFromFile}
                color="primary"
                disabled={
                  isLoading ||
                  (activeTab === "dragdrop" && (
                    !policyCanvasEntities?.clusters?.length || 
                    !policyCanvasEntities?.workloads?.length
                  )) ||
                  (activeTab === "file" && !fileContent) ||
                  (activeTab === "yaml" && !editorContent)
                }
                sx={{
                  bgcolor: isDarkTheme ? "#2563eb !important" : "#1976d2 !important",
                  color: "#fff !important",
                  "&:hover": {
                    bgcolor: isDarkTheme ? "#1d4ed8 !important" : "#1565c0 !important",
                    transform: 'translateY(-2px)',
                    boxShadow: '0 4px 8px rgba(0,0,0,0.2)'
                  },
                  "&:disabled": {
                    bgcolor: isDarkTheme ? "rgba(37, 99, 235, 0.5) !important" : "rgba(25, 118, 210, 0.5) !important",
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
                  activeTab === "dragdrop" ? "Deploy Binding Policies" : "Create Binding Policy"
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

      <Dialog
        open={showPreviewDialog}
        onClose={() => setShowPreviewDialog(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            height: "80vh",
            maxHeight: "80vh",
            bgcolor: isDarkTheme ? "#1A2231" : undefined,
            color: isDarkTheme ? "#FFFFFF" : undefined,
            border: isDarkTheme ? '1px solid rgba(255, 255, 255, 0.12)' : undefined,
          }
        }}
      >
        <DialogTitle>
          <Typography variant="h6" sx={{ color: isDarkTheme ? "#FFFFFF" : undefined }}>
            Preview Generated YAML
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ p: 2 }}>
          <StyledPaper elevation={0} sx={{ 
            height: 'calc(100% - 32px)', 
            overflow: 'hidden',
            bgcolor: isDarkTheme ? 'rgba(30, 41, 59, 0.8)' : undefined,
            border: isDarkTheme ? '1px solid rgba(255, 255, 255, 0.12)' : undefined,
          }}>
            <Editor
              height="100%"
              language="yaml"
              value={previewYaml}
              theme={isDarkTheme ? "vs-dark" : "light"}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: "on",
                scrollBeyondLastLine: false,
                automaticLayout: true,
                fontFamily: "'JetBrains Mono', monospace",
                padding: { top: 10 },
                readOnly: true
              }}
            />
          </StyledPaper>
        </DialogContent>
        <DialogActions sx={{ 
          p: 2,
          bgcolor: isDarkTheme ? 'rgba(17, 25, 40, 0.9)' : undefined,
          borderTop: isDarkTheme ? '1px solid rgba(255, 255, 255, 0.12)' : undefined,
        }}>
          <Button 
            onClick={() => setShowPreviewDialog(false)}
            sx={{ 
              color: isDarkTheme ? 'rgba(255, 255, 255, 0.9)' : undefined,
              '&:hover': {
                backgroundColor: isDarkTheme ? 'rgba(255, 255, 255, 0.1)' : undefined
              }
            }}
          >
            Close
          </Button>
          <Button 
            variant="contained" 
            color="primary"
            onClick={prepareForDeployment}
            disabled={isLoading}
            sx={{
              bgcolor: isDarkTheme ? "#2563eb" : undefined,
              '&:hover': {
                bgcolor: isDarkTheme ? "#1d4ed8" : undefined,
              },
              '&:disabled': {
                bgcolor: isDarkTheme ? "rgba(37, 99, 235, 0.5)" : undefined,
              },
            }}
          >
            {isLoading ? (
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <CircularProgress size={20} sx={{ mr: 1 }} />
                Deploying...
              </Box>
            ) : (
              "Deploy Binding Policy"
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default CreateBindingPolicyDialog;