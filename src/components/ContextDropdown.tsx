import { useState, useEffect } from "react";
import { Box, MenuItem, Select, Typography, Chip, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, CircularProgress } from "@mui/material";
import { SelectChangeEvent } from "@mui/material/Select";
import { toast } from "react-hot-toast";
import useTheme from "../stores/themeStore";
import { api } from "../lib/api";
import FilterListIcon from '@mui/icons-material/FilterList';
import AddIcon from "@mui/icons-material/Add";
import { useContextCreationWebSocket } from "../hooks/useWebSocket";

interface ContextDropdownProps {
  onContextFilter: (context: string) => void;
  resourceCounts?: Record<string, number>; // Map of context to resource count
  totalResourceCount?: number; // Total resources across all contexts
}

const ContextDropdown = ({ 
  onContextFilter, 
  resourceCounts = {}, 
  totalResourceCount = 0 
}: ContextDropdownProps) => {
  const [contexts, setContexts] = useState<string[]>([]);
  const [selectedContext, setSelectedContext] = useState<string>("all"); // Default to show all contexts
  const { theme } = useTheme();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [contextName, setContextName] = useState("");
  const [contextVersion, setContextVersion] = useState("0.27.0");
  const [isCreating, setIsCreating] = useState(false);
  const [creationError, setCreationError] = useState("");
  const [creationSuccess, setCreationSuccess] = useState("");
  const [messages, setMessages] = useState<string[]>([]);

  useEffect(() => {
    api.get("/wds/get/context")
      .then((response) => {
        const contextList = response.data["other-wds-context"] || [];
        const uniqueContexts = [...new Set([...contextList])];
        setContexts(uniqueContexts);
      })
      .catch((error) => console.error("Error fetching contexts:", error));
  }, []);

  const handleContextChange = (event: SelectChangeEvent<string>) => {
    const newContext = event.target.value as string;
    setSelectedContext(newContext);
    
    // Notify parent component about the filter change
    if (onContextFilter) onContextFilter(newContext);
    
    // Show success toast with appropriate message
    if (newContext === "all") {
      toast.success("Showing resources from all contexts", {
          position: "top-center",
        });
    } else {
      toast.success(`Filtering to show only ${newContext} context`, {
          position: "top-center",
      });
    }
  };

  // Get count for a specific context
  const getContextCount = (context: string) => {
    if (context === "all") return totalResourceCount;
    return resourceCounts[context] || 0;
  };

  const handleOpenCreateDialog = () => {
    setContextName("");
    setContextVersion("0.27.0");
    setCreationError("");
    setCreationSuccess("");
    setCreateDialogOpen(true);
  };

  const handleCloseCreateDialog = () => {
    setCreateDialogOpen(false);
  };

  const handleSocketError = (error: Error) => {
    setCreationError(error.message);
  };

  const handleSocketMessage = (event: MessageEvent) => {
    setMessages([...messages, event.data]);
    // eslint-disable-next-line no-control-regex
    const cleanData = event.data.replace(/\x1b\[[0-9;]*m/g, '').trim(); 
    if (cleanData.includes("Context") && cleanData.includes("set successfully:")) {
      contextCreationWs.disconnect();
      handleCloseCreateDialog();
      setCreationSuccess("Context created successfully!");
      window.location.reload();
    }
  };

  const handleSocketClose = (event: CloseEvent) => {
    console.log("WebSocket connection closed:", event.code, event.reason);
    if (messages.join("").includes("Error") || messages.join("").includes("Failed")) {
      setCreationError(messages.join("\n"));
    } else if (messages.length > 0) {
      setCreationSuccess("Context created successfully!");
    } else {
      setCreationError("WebSocket connection closed unexpectedly");
    }
  };

  const contextCreationWs = useContextCreationWebSocket(contextName, contextVersion, handleSocketMessage, handleSocketError, handleSocketClose);


  const handleCreateContext = async () => {
    if (!contextName) {
      setCreationError("Context name is required");
      return;
    }

    if (!contextVersion) {
      setCreationError("KubeStellar version is required");
      return;
    }

    setIsCreating(true);
    setCreationError("");
    setCreationSuccess("");

    try {
      contextCreationWs.connect();

      // Use a promise to handle WebSocket connection
      const connectWebSocket = () => {
        return new Promise<{success: boolean, messages: string[]}>((resolve, reject) => {
          const messages: string[] = [];
        
          
          // Set a timeout in case the socket doesn't close
          setTimeout(() => {
            if (contextCreationWs.isConnected) {
              const msgText = messages.join("");
              // Check if we've received enough indicators of progress to consider it a success
              if (msgText.includes("Switching to kind-kubeflex context") || 
                 (msgText.includes("Context") && messages.length > 2)) {
                // If we've made good progress, close the socket and consider it a success
                contextCreationWs.disconnect();
                resolve({
                  success: true,
                  messages
                });
              } else {
                // Otherwise, this is taking too long or something went wrong
                contextCreationWs.disconnect();
                reject(new Error("Operation timed out. The process might still be running in the background."));
              }
            }
          }, 15000); // 15 second timeout
        });
      };
      
      const result = await connectWebSocket();
      
      if (result.success) {
        setCreationSuccess(`Context "${contextName}" created successfully!`);
        setTimeout(() => {
          handleCloseCreateDialog();
          // Refresh contexts or update UI as needed
          window.location.reload(); // Simple refresh for now
        }, 2000);
      } else {
        setCreationError("Failed to create context");
      }
    } catch (error) {
      console.error("Error creating context:", error);
      // Extract more helpful error message if possible
      const errorMessage = error instanceof Error ? error.message : "An error occurred while creating the context";
      
      if (errorMessage.includes("timed out")) {
        setCreationError("Connection timed out. The context might still be created successfully in the background.");
      } else if (errorMessage.includes("WebSocket connection failed")) {
        setCreationError("Could not connect to the server. Please check your network connection and try again.");
      } else {
        setCreationError(errorMessage);
      }
    } finally {
      setIsCreating(false);

    }
  };

  return (
    <>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Typography variant="body2" sx={{ color: theme === "dark" ? "#FFFFFF" : "#121212" }}>
          Filter by context:
        </Typography>
        
        <Box sx={{ position: "relative", minWidth: 200 }}>
      <Select
            value={selectedContext}
        onChange={handleContextChange}
        sx={{ 
              width: "100%",
              height: "40px", 
              borderRadius: 1,
          color: theme === "dark" ? "#FFFFFF" : "#121212",
              backgroundColor: "transparent",
              border: theme === "dark" ? "1px solid rgba(255, 255, 255, 0.23)" : "1px solid rgba(0, 0, 0, 0.23)",
          "& .MuiSvgIcon-root": { 
            color: theme === "dark" ? "#FFFFFF" : "inherit"
          },
          "& .MuiOutlinedInput-notchedOutline": {
            borderColor: theme === "dark" ? "rgba(255, 255, 255, 0.23)" : "rgba(0, 0, 0, 0.23)"
          },
          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: theme === "dark" ? "#FFFFFF" : "rgba(0, 0, 0, 0.87)"
          },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderColor: theme === "dark" ? "#90CAF9" : "#1976D2"
          }
        }}
        variant="outlined"
            displayEmpty
            renderValue={(selected) => (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <FilterListIcon fontSize="small" sx={{ 
                  color: theme === "dark" ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.54)"
                }} />
                {selected === "all" ? (
                  <Typography sx={{ fontWeight: 400, fontSize: "0.9rem" }}>All Contexts</Typography>
                ) : (
                  <Chip 
                    label={selected} 
                    size="small" 
                    sx={{ 
                      backgroundColor: theme === "dark" ? "rgba(144, 202, 249, 0.08)" : "rgba(25, 118, 210, 0.08)",
                      color: theme === "dark" ? "#90CAF9" : "#1976d2",
                      fontWeight: 500,
                      height: "24px"
                    }}
                  />
                )}
              </Box>
            )}
        MenuProps={{
          PaperProps: {
            sx: {
                  maxHeight: 300,
                  marginTop: 1,
              backgroundColor: theme === "dark" ? "#333333" : "#FFFFFF",
              "& .MuiMenuItem-root": {
                    color: theme === "dark" ? "#FFFFFF" : "inherit",
                    fontSize: "0.9rem",
                    padding: "8px 16px",
                    "&:hover": {
                      backgroundColor: theme === "dark" ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.04)"
                    },
                    "&.Mui-selected": {
                      backgroundColor: theme === "dark" ? "rgba(144, 202, 249, 0.16)" : "rgba(25, 118, 210, 0.08)"
                    }
              }
            }
          }
        }}
      >
            <MenuItem 
              value="all" 
              sx={{ 
                fontWeight: selectedContext === "all" ? 500 : 400,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}
            >
              <span>All Contexts</span>
              <Chip 
                label={totalResourceCount.toString()} 
                size="small"
                sx={{
                  height: '20px',
                  fontSize: '0.75rem',
                  backgroundColor: theme === "dark" ? "rgba(144, 202, 249, 0.16)" : "rgba(25, 118, 210, 0.08)",
                  color: theme === "dark" ? "#90CAF9" : "#1976d2"
                }}
              />
            </MenuItem>
        {contexts.map((context) => (
              <MenuItem 
                key={context} 
                value={context} 
                sx={{ 
                  fontWeight: selectedContext === context ? 500 : 400,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center"
                }}
              >
                <span>{context}</span>
                <Chip 
                  label={getContextCount(context).toString()}
                  size="small"
                  sx={{
                    height: '20px',
                    fontSize: '0.75rem',
                    backgroundColor: getContextCount(context) > 0 
                      ? (theme === "dark" ? "rgba(144, 202, 249, 0.16)" : "rgba(25, 118, 210, 0.08)")
                      : (theme === "dark" ? "rgba(244, 67, 54, 0.16)" : "rgba(244, 67, 54, 0.08)"),
                    color: getContextCount(context) > 0
                      ? (theme === "dark" ? "#90CAF9" : "#1976d2")
                      : (theme === "dark" ? "#f44336" : "#d32f2f")
                  }}
                />
          </MenuItem>
        ))}
            
            <Box sx={{ borderTop: `1px solid ${theme === "dark" ? "#333" : "#e0e0e0"}`, mt: 1, pt: 1 }}>
              <MenuItem 
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenCreateDialog();
                }}
                sx={{ 
                  color: theme === "dark" ? "#90caf9" : "#1976d2",
                  display: "flex",
                  alignItems: "center",
                  gap: 1
                }}
              >
                <AddIcon fontSize="small" />
                <span>Create Context</span>
              </MenuItem>
            </Box>
      </Select>
    </Box>
      </Box>

      {/* Create Context Dialog */}
      <Dialog 
        open={createDialogOpen} 
        onClose={handleCloseCreateDialog}
        maxWidth="sm"
        PaperProps={{
          sx: {
            backgroundColor: theme === "dark" ? "#1a1a1a" : "#fff",
            color: theme === "dark" ? "#fff" : "#333",
            minWidth: "400px",
            borderRadius: "10px",
          }
        }}
      >
        <DialogTitle sx={{ borderBottom: `1px solid ${theme === "dark" ? "#333" : "#e0e0e0"}` }}>
          Create New Context
        </DialogTitle>
        <DialogContent sx={{ mt: 1, pb:1}}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 4, mb: 2 ,mt:2}}>
            <TextField
              label="Context Name"
              fullWidth
              value={contextName}
              onChange={(e) => setContextName(e.target.value)}
              error={!!creationError && !contextName}
              helperText={!contextName && creationError ? "Context name is required" : ""}
              size="small"
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: "8px",
                  backgroundColor: theme === "dark" ? "rgba(255, 255, 255, 0.05)" : "rgba(25, 118, 210, 0.05)",
                  "& fieldset": {
                    borderColor: theme === "dark" ? "#444" : "#e0e0e0",
                  },
                  "&:hover fieldset": {
                    borderColor: theme === "dark" ? "#90caf9" : "#1976d2",
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: theme === "dark" ? "#90caf9" : "#1976d2",
                  },
                },
                "& .MuiInputLabel-root": {
                  color: theme === "dark" ? "#90caf9" : "#1976d2",
                },
                "& .MuiInputBase-input": {
                  color: theme === "dark" ? "#fff" : "#333",
                }
              }}
            />
            <TextField
              label="KubeStellar Version"
              fullWidth
              value={contextVersion}
              onChange={(e) => setContextVersion(e.target.value)}
              error={!!creationError && !contextVersion}
              helperText={!contextVersion && creationError ? "Version is required" : ""}
              size="small"
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: "8px",
                  backgroundColor: theme === "dark" ? "rgba(255, 255, 255, 0.05)" : "rgba(25, 118, 210, 0.05)",
                  "& fieldset": {
                    borderColor: theme === "dark" ? "#444" : "#e0e0e0",
                  },
                  "&:hover fieldset": {
                    borderColor: theme === "dark" ? "#90caf9" : "#1976d2",
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: theme === "dark" ? "#90caf9" : "#1976d2",
                  },
                },
                "& .MuiInputLabel-root": {
                  color: theme === "dark" ? "#90caf9" : "#1976d2",
                },
                "& .MuiInputBase-input": {
                  color: theme === "dark" ? "#fff" : "#333",
                }
              }}
            />
          </Box>
           
          {creationError && (
            <Box 
              sx={{ 
                bgcolor: theme === "dark" ? "rgba(255, 87, 34, 0.1)" : "rgba(255, 87, 34, 0.05)", 
                color: theme === "dark" ? "#ff9800" : "#d84315",
                p: 1.5,
                borderRadius: 1,
                mt: 1, 
                mb: 2
              }}
            >
              <Typography variant="body2">{creationError}</Typography>
            </Box>
          )}
          
          {creationSuccess && (
            <Box 
              sx={{ 
                bgcolor: theme === "dark" ? "rgba(76, 175, 80, 0.1)" : "rgba(76, 175, 80, 0.08)", 
                color: theme === "dark" ? "#81c784" : "#2e7d32",
                p: 1.5,
                borderRadius: 1,
                mt: 1, 
                mb: 2
              }}
            >
              <Typography variant="body2">{creationSuccess}</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 1, display: "flex", justifyContent: "space-between" }}>
          <Button 
            onClick={handleCloseCreateDialog}
            sx={{
              color: theme === "dark" ? "#fff" : "#666",
              "&:hover": {
                backgroundColor: theme === "dark" ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.04)",
              },
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleCreateContext}
            disabled={isCreating}
            variant="contained"
            startIcon={isCreating ? <CircularProgress size={16} color="inherit" /> : null}
            sx={{
              backgroundColor: theme === "dark" ? "#1976d2" : "#1976d2",
              color: "#fff",
              "&:hover": {
                backgroundColor: theme === "dark" ? "#1565c0" : "#1565c0",
              },
            }}
          >
            {isCreating ? "Creating..." : "Create Context"}
          </Button>                                
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ContextDropdown;

