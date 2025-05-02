import { Box, Button, FormControl, MenuItem, Select, SelectChangeEvent, TextField, Typography, FormControlLabel, Radio, RadioGroup, Checkbox, Menu, Dialog, DialogTitle, DialogContent, DialogActions } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { StyledContainer } from "../StyledComponents";
import useTheme from "../../stores/themeStore";
import { useState, useEffect, useCallback } from "react";
import { AxiosError } from "axios";
import { toast } from "react-hot-toast";
import { MoreVerticalIcon } from "lucide-react";
import { api } from "../../lib/api";
import WorkloadLabelInput from "./WorkloadLabelInput";

interface FormData {
  repositoryUrl: string;
  path: string;
  credentials: string;
  branchSpecifier: string;
  webhook: string;
  workload_label: string;
}

interface Props {
  formData: FormData;
  setFormData: (data: FormData) => void;
  error: string;
  credentialsList: string[];
  loading: boolean;
  hasChanges: boolean;
  handleCredentialChange: (event: SelectChangeEvent<string>) => void;
  handleOpenCredentialDialog: () => void;
  handleOpenWebhookDialog: () => void;
  validateForm: () => boolean;
  handleDeploy: () => void;
  handleCancelClick: () => void;
}

const CreateFromYourGitHub = ({ formData, setFormData, error, credentialsList, handleCredentialChange, handleOpenCredentialDialog, handleOpenWebhookDialog, theme }: {
  formData: FormData;
  setFormData: (data: FormData) => void;
  error: string;
  credentialsList: string[];
  handleCredentialChange: (event: SelectChangeEvent<string>) => void;
  handleOpenCredentialDialog: () => void;
  handleOpenWebhookDialog: () => void;
  theme: string;
}) => (
  <Box
    sx={{
      display: "flex",
      flexDirection: "column",
      gap: 3,
      flex: 1,
      overflowY: "auto",
      "&::-webkit-scrollbar": {
        display: "none",
      },
      scrollbarWidth: "none",
      "-ms-overflow-style": "none",
      height: "55vh",
    }}
  >
    <Box  sx={{marginTop: "20px"}}>
      <WorkloadLabelInput handleChange={(e) => setFormData({ ...formData, workload_label: e.target.value })} isError={false} theme={theme} value={formData.workload_label} />
    </Box>

    <Box>
      <Typography
        variant="subtitle1"
        sx={{
          fontWeight: 600,
          fontSize: "13px",
          color: theme === "dark" ? "#d4d4d4" : "#333",
          mb: 1,
        }}
      >
        Repository URL *
      </Typography>
      <TextField
        fullWidth
        value={formData.repositoryUrl}
        onChange={(e) =>
          setFormData({ ...formData, repositoryUrl: e.target.value })
        }
        error={!!error && !formData.repositoryUrl}
        placeholder="e.g., https://github.com/username/repo"
        sx={{
          "& .MuiOutlinedInput-root": {
            borderRadius: "8px",
            "& fieldset": {
              borderColor: theme === "dark" ? "#444" : "#e0e0e0",
              borderWidth: "1px",
            },
            "&:hover fieldset": {
              borderColor: "#1976d2",
            },
            "&.Mui-focused fieldset": {
              borderColor: "#1976d2",
              borderWidth: "1px",
            },
            "&.Mui-error fieldset": {
              borderColor: "red",
            },
          },
          "& .MuiInputBase-input": {
            padding: "12px 14px",
            fontSize: "0.875rem",
            color: theme === "dark" ? "#d4d4d4" : "#666",
          },
          "& .MuiInputBase-input::placeholder": {
            color: theme === "dark" ? "#858585" : "#666",
            opacity: 1,
          },
        }}
      />
      <Box sx={{ display: "flex", alignItems: "center", mt: 1 }}>
        <span role="img" aria-label="tip" style={{ fontSize: "0.8rem", marginRight: "8px" }}>
          💡
        </span>
        <Typography variant="caption" sx={{ color: theme === "dark" ? "#858585" : "#666" }}>
          Use a valid GitHub repository URL
        </Typography>
      </Box>
    </Box>

    <Box>
      <Typography
        variant="subtitle1"
        sx={{
          fontWeight: 600,
          fontSize: "13px",
          color: theme === "dark" ? "#d4d4d4" : "#333",
          mb: 1,
        }}
      >
        Path *
      </Typography>
      <TextField
        fullWidth
        value={formData.path}
        onChange={(e) =>
          setFormData({ ...formData, path: e.target.value })
        }
        error={!!error && !formData.path}
        placeholder="e.g., /path/to/yaml"
        sx={{
          "& .MuiOutlinedInput-root": {
            borderRadius: "8px",
            "& fieldset": {
              borderColor: theme === "dark" ? "#444" : "#e0e0e0",
              borderWidth: "1px",
            },
            "&:hover fieldset": {
              borderColor: "#1976d2",
            },
            "&.Mui-focused fieldset": {
              borderColor: "#1976d2",
              borderWidth: "1px",
            },
            "&.Mui-error fieldset": {
              borderColor: "red",
            },
          },
          "& .MuiInputBase-input": {
            padding: "12px 14px",
            fontSize: "0.875rem",
            color: theme === "dark" ? "#d4d4d4" : "#666",
          },
          "& .MuiInputBase-input::placeholder": {
            color: theme === "dark" ? "#858585" : "#666",
            opacity: 1,
          },
        }}
      />
      <Box sx={{ display: "flex", alignItems: "center", mt: 1 }}>
        <span role="img" aria-label="tip" style={{ fontSize: "0.8rem", marginRight: "8px" }}>
          💡
        </span>
        <Typography variant="caption" sx={{ color: theme === "dark" ? "#858585" : "#666" }}>
          Specify the path to your YAML files in the repository
        </Typography>
      </Box>
    </Box>

    <Box>
      <Typography
        variant="subtitle1"
        sx={{
          fontWeight: 600,
          fontSize: "13px",
          color: theme === "dark" ? "#d4d4d4" : "#333",
          mb: 1,
        }}
      >
        Branch (default: main) *
      </Typography>
      <TextField
        fullWidth
        value={formData.branchSpecifier}
        onChange={(e) =>
          setFormData({ ...formData, branchSpecifier: e.target.value })
        }
        placeholder="e.g., master, dev-branch"
        sx={{
          "& .MuiOutlinedInput-root": {
            borderRadius: "8px",
            "& fieldset": {
              borderColor: theme === "dark" ? "#444" : "#e0e0e0",
              borderWidth: "1px",
            },
            "&:hover fieldset": {
              borderColor: "#1976d2",
            },
            "&.Mui-focused fieldset": {
              borderColor: "#1976d2",
              borderWidth: "1px",
            },
          },
          "& .MuiInputBase-input": {
            padding: "12px 14px",
            fontSize: "0.875rem",
            color: theme === "dark" ? "#d4d4d4" : "#666",
          },
          "& .MuiInputBase-input::placeholder": {
            color: theme === "dark" ? "#858585" : "#666",
            opacity: 1,
          },
        }}
      />
      <Box sx={{ display: "flex", alignItems: "center", mt: 1 }}>
        <span role="img" aria-label="tip" style={{ fontSize: "0.8rem", marginRight: "8px" }}>
          💡
        </span>
        <Typography variant="caption" sx={{ color: theme === "dark" ? "#858585" : "#666" }}>
          Specify the branch to deploy from
        </Typography>
      </Box>
    </Box>

    <Box>
      <Typography
        variant="subtitle1"
        sx={{
          fontWeight: 600,
          fontSize: "13px",
          color: theme === "dark" ? "#d4d4d4" : "#333",
          mb: 1,
        }}
      >
        Credentials
      </Typography>
      <FormControl fullWidth>
        <Select
          value={formData.credentials}
          onChange={handleCredentialChange}
          displayEmpty
          renderValue={(selected) =>
            selected ? (
              selected
            ) : (
              <Typography sx={{ fontSize: "0.875rem", color: theme === "dark" ? "#858585" : "#666" }}>
                e.g., username-pat
              </Typography>
            )
          }
          sx={{
            borderRadius: "8px",
            "& .MuiOutlinedInput-notchedOutline": {
              borderColor: theme === "dark" ? "#444" : "#e0e0e0",
              borderWidth: "1px",
            },
            "&:hover .MuiOutlinedInput-notchedOutline": {
              borderColor: "#1976d2",
            },
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
              borderColor: "#1976d2",
              borderWidth: "1x",
            },
            "& .MuiSelect-select": {
              padding: "12px 14px",
              fontSize: "0.875rem",
              color: theme === "dark" ? "#d4d4d4" : "#666",
            },
          }}
          MenuProps={{
            PaperProps: {
              sx: {
                bgcolor: theme === "dark" ? "#252526" : "#fff",
                color: theme === "dark" ? "#d4d4d4" : "#333",
              },
            },
          }}
        >
          {credentialsList.map((credential) => (
            <MenuItem key={credential} value={credential}>
              {credential}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <Box sx={{ display: "flex", alignItems: "center", mt: 1 }}>
        <span role="img" aria-label="tip" style={{ fontSize: "0.8rem", marginRight: "8px" }}>
          💡
        </span>
        <Typography variant="caption" sx={{ color: theme === "dark" ? "#858585" : "#666" }}>
          Select or add credentials for private repositories
        </Typography>
      </Box>
    </Box>
    <Button
      variant="contained"
      onClick={handleOpenCredentialDialog}
      sx={{
        alignSelf: "flex-start",
        padding: "1px 8px",
        backgroundColor: "#1976d2",
        color: "#fff",
        "&:hover": {
          backgroundColor: "#1565c0",
        },
      }}
    >
      Add Cred
    </Button>

    <Box>
      <Typography
        variant="subtitle1"
        sx={{
          fontWeight: 600,
          fontSize: "13px",
          color: theme === "dark" ? "#d4d4d4" : "#333",
        }}
      >
        Webhooks
      </Typography>
      <Box sx={{ display: "flex", alignItems: "center", mt: 1 }}>
        <span role="img" aria-label="tip" style={{ fontSize: "0.8rem", marginRight: "8px" }}>
          💡
        </span>
        <Typography variant="caption" sx={{ color: theme === "dark" ? "#858585" : "#666" }}>
          Select or add a webhook for automated deployments
        </Typography>
      </Box>
    </Box>
    <Button
      variant="contained"
      onClick={handleOpenWebhookDialog}
      sx={{
        alignSelf: "flex-start",
        padding: "1px 6px",
        backgroundColor: "#1976d2",
        color: "#fff",
        "&:hover": {
          backgroundColor: "#1565c0",
        },
      }}
    >
      Add Webhook
    </Button>
  </Box>
);

export const GitHubTab = ({
  formData,
  setFormData,
  error,
  credentialsList,
  loading,
  hasChanges,
  handleCredentialChange,
  handleOpenCredentialDialog,
  handleOpenWebhookDialog,
  validateForm,
  handleDeploy,
  handleCancelClick,
}: Props) => {
  const theme = useTheme((state) => state.theme);
  const [selectedOption, setSelectedOption] = useState("createOwn");
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null);
  const [popularLoading, setPopularLoading] = useState(false);
  const [previousDeployments, setPreviousDeployments] = useState<string[]>([]);
  const [previousLoading, setPreviousLoading] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ deploymentId: string | null; x: number; y: number } | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);
  const [deleteDeploymentId, setDeleteDeploymentId] = useState<string | null>(null);

  const popularRepositories = [
    {
      repo_url: "https://github.com/onkar717/gitops-example",
      folder_path: "k8s-specifications",
      branch: "main"
    },
    {
      repo_url: "https://github.com/example/repo1",
      folder_path: "manifests",
      branch: "main"
    },
    {
      repo_url: "https://github.com/example/repo2",
      folder_path: "kubernetes",
      branch: "master"
    }
  ];

  // Fetch previous deployments
  useEffect(() => {
    const fetchPreviousDeployments = async () => {
      setPreviousLoading(true);
      try {
        const response = await api.get("/api/deployments/github/list");
        if (response.status === 200) {
          const deployments = response.data.deployments.map((deployment: { id: string }) => deployment.id);
          setPreviousDeployments(deployments);
        } else {
          throw new Error("Failed to fetch previous deployments");
        }
      } catch (error: unknown) {
        const err = error as AxiosError;
        console.error("Previous Deployments Fetch error:", err);
        toast.error("Failed to load previous deployments!");
      } finally {
        setPreviousLoading(false);
      }
    };

    if (selectedOption === "previousDeployments") {
      fetchPreviousDeployments();
    }
  }, [selectedOption]);

  const handleOptionChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedOption(event.target.value);
    setSelectedRepo(null); // Reset selected repo when switching options
  };

  const handleRepoSelection = (repoUrl: string) => {
    setSelectedRepo(selectedRepo === repoUrl ? null : repoUrl);
  };

  const handlePopularRepoDeploy = async () => {
    if (!selectedRepo) {
      toast.error("Please select a repository to deploy.");
      return;
    }

    setPopularLoading(true);

    try {
      const selectedRepoData = popularRepositories.find(repo => repo.repo_url === selectedRepo);
      if (!selectedRepoData) {
        throw new Error("Selected repository data not found");
      }

      const response = await api.post(
        `/api/deploy?created_by_me=true&branch=${selectedRepoData.branch}`,
        {
          repo_url: selectedRepoData.repo_url,
          folder_path: selectedRepoData.folder_path,
          workload_label: formData.workload_label
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (response.status === 200 || response.status === 201) {
        toast.success(`Selected repository deployed successfully!`);
        setSelectedRepo(null);
        setTimeout(() => window.location.reload(), 4000);
      } else {
        throw new Error("Unexpected response status: " + response.status);
      }
    } catch (error) {
      console.error("Popular Repo Deploy error:", error);
      toast.error("Failed to deploy popular repository!");
    } finally {
      setPopularLoading(false);
    }
  };

  const handleMenuOpen = useCallback((event: React.MouseEvent, deploymentId: string) => {
    event.preventDefault();
    event.stopPropagation();
    // Use fixed positioning based on the element's position instead of mouse coordinates
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    setContextMenu({
      deploymentId,
      x: rect.right,  // Position at the right edge of the icon
      y: rect.top + rect.height / 2  // Position at the vertical center
    });
  }, []);

  const handleMenuClose = useCallback(() => {
    setContextMenu(null);
  }, []);

  const handleDeleteClick = useCallback(() => {
    if (contextMenu?.deploymentId) {
      const deploymentId = contextMenu.deploymentId;
      // First close the menu completely
      handleMenuClose();

      // Use a slightly longer timeout to ensure complete separation between menu closing and dialog opening
      setTimeout(() => {
        // Only then set the deployment ID and open the dialog
        setDeleteDeploymentId(deploymentId);
        setDeleteDialogOpen(true);
      }, 100);
    } else {
      handleMenuClose();
    }
  }, [contextMenu, handleMenuClose]);

  const handleDeleteDeployment = useCallback(async (deploymentId: string) => {
    try {
      const response = await api.delete(`/api/deployments/github/${deploymentId}`);
      if (response.status === 200) {
        setPreviousDeployments((prev) => prev.filter((id) => id !== deploymentId));
        toast.success(`Deployment "${deploymentId}" deleted successfully!`);
      } else {
        throw new Error("Failed to delete deployment");
      }
    } catch (error) {
      console.error("Delete Deployment error:", error);
      toast.error(`Failed to delete deployment "${deploymentId}"!`);
    } finally {
      setDeleteDialogOpen(false);
      setDeleteDeploymentId(null);
    }
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    if (deleteDeploymentId) {
      handleDeleteDeployment(deleteDeploymentId);
    }
  }, [deleteDeploymentId, handleDeleteDeployment]);

  const handleDeleteCancel = useCallback(() => {
    setDeleteDialogOpen(false);
    setDeleteDeploymentId(null);
  }, []);

  // Create a stable function reference for dialog operations - moved after handleDeleteCancel
  const dialogProps = useCallback(() => ({
    open: deleteDialogOpen,
    onClose: (e: React.SyntheticEvent) => {
      e.preventDefault();
      e.stopPropagation();
      handleDeleteCancel();
    },
    'aria-labelledby': "delete-confirmation-dialog-title",
    keepMounted: false,
    disablePortal: true,
    disableEscapeKeyDown: false,
    disableAutoFocus: true,
    // Completely disable transitions to prevent flickering
    transitionDuration: { enter: 0, exit: 0 },
    // Create a constant backdrop to prevent flashing
    hideBackdrop: false,
    className: "stable-dialog", // Add a custom class
    BackdropProps: {
      transitionDuration: 0,
      onClick: (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        handleDeleteCancel();
      },
      sx: {
        backdropFilter: "blur(2px)",
        pointerEvents: "auto", // Ensure backdrop receives events
        transition: "none" // Disable backdrop transitions
      }
    },
    PaperProps: {
      elevation: 24,
      sx: {
        overflow: "visible",
        position: "relative", // Ensure proper stacking
        zIndex: 1400, // High z-index to stay on top
        transition: "none" // Disable paper transitions
      }
    },
    // Disable all MUI transitions that could cause flickering
    TransitionProps: {
      timeout: 0,
      appear: false,
      enter: false,
      exit: false
    },
    sx: {
      zIndex: 1500, // Even higher z-index for the dialog
      position: "fixed", // Use fixed positioning
      transition: "none !important", // Disable ALL transitions
      "& .MuiDialog-paper": {
        padding: "16px",
        width: "500px",
        backgroundColor: theme === "dark" ? "rgb(15, 23, 42)" : "#fff",
        borderRadius: "4px",
        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.1)",
        maxWidth: "480px",
        height: "260px",
        transition: "none !important" // Disable paper transitions
      },
      "& .MuiBackdrop-root": {
        backgroundColor: theme === "dark" ? "rgba(0, 0, 0, 0.7)" : "rgba(0, 0, 0, 0.5)",
        transition: "none !important" // Disable backdrop transitions
      },
      // Target all child elements to disable transitions
      "& *": {
        transition: "none !important"
      }
    },
    onClick: (e: React.MouseEvent) => e.stopPropagation()
  }), [deleteDialogOpen, handleDeleteCancel, theme]);

  // Add a helper function to create no-flicker button styles
  const createStableButtonStyle = useCallback((isDelete = false) => {
    const baseColor = isDelete ? "#d32f2f" : "transparent";
    const hoverColor = isDelete ? "#b71c1c" : "rgba(47, 134, 255, 0.1)";
    const textColor = isDelete ? "#fff" : "#2F86FF";

    return {
      textTransform: "none",
      fontWeight: isDelete ? 500 : 600,
      backgroundColor: baseColor,
      color: textColor,
      padding: "6px 16px",
      minWidth: "80px",
      minHeight: "36px",
      border: "none",
      outline: "none",
      borderRadius: "4px",
      position: "relative",
      boxShadow: "none",
      transition: "none",
      animation: "none",
      opacity: 1,
      // Prevent hover state transitions
      "&:hover": {
        backgroundColor: hoverColor,
        boxShadow: "none",
        transition: "none"
      },
      // Prevent any focus animations
      "&:focus": {
        outline: "none",
        boxShadow: "none"
      },
      // Prevent ripple animations
      "&::before, &::after": {
        display: "none"
      }
    };
  }, []);



  const PreviousDeploymentsForm = () => (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        overflow: "hidden",
        height: "55vh",
      }}
      onClick={handleMenuClose}
    >
      <Box
        sx={{
          position: "sticky",
          top: 0,
          zIndex: 1,
          borderRadius: "4px"
        }}
      >
        <Typography
          variant="subtitle1"
          sx={{
            fontWeight: 600,
            fontSize: "20px",
            color: theme === "dark" ? "#d4d4d4" : "#333",
            mb: 3,
            mt: 1,
          }}
        >
          List of Previous Deployments
        </Typography>
        {selectedRepo && (
          <Box
            sx={{
              width: "100%",
              margin: "0 auto 25px auto",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              p: 1.6,
              borderRadius: "4px",
              border: "1px solid",
              borderColor: theme === "dark" ? "#444" : "#e0e0e0",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <CheckCircleIcon color="success" sx={{ mr: 1 }} />
              <Typography variant="body1" sx={{ color: theme === "dark" ? "#fff" : "#333" }}>
                <strong>{selectedRepo}</strong>
              </Typography>
            </Box>
          </Box>
        )}
      </Box>

      <Box
        sx={{
          flex: 1,
          overflowY: "auto",
          "&::-webkit-scrollbar": {
            display: "none",
          },
          scrollbarWidth: "none",
          "-ms-overflow-style": "none",
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        {previousLoading ? (
          <Typography sx={{ color: theme === "dark" ? "#d4d4d4" : "#333", textAlign: "center" }}>
            Loading previous deployments...
          </Typography>
        ) : previousDeployments.length > 0 ? (
          previousDeployments.map((deployment) => (
            <Box
              key={deployment}
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px",
                borderRadius: "4px",
                backgroundColor: theme === "dark" ? "#00000033" : "#f9f9f9",
                "&:hover": {
                  backgroundColor: theme === "dark" ? "#2a2a2a" : "#f1f1f1",
                },
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <Checkbox
                  checked={selectedRepo === deployment}
                  onChange={() => handleRepoSelection(deployment)}
                  sx={{
                    color: theme === "dark" ? "#d4d4d4" : "#666",
                    "&.Mui-checked": {
                      color: "#1976d2",
                    },
                  }}
                />
                <Typography
                  sx={{
                    fontSize: "0.875rem",
                    color: theme === "dark" ? "#d4d4d4" : "#333",
                  }}
                >
                  {deployment}
                </Typography>
              </Box>
              <Box
                sx={{
                  cursor: "pointer",
                  padding: "4px",
                  borderRadius: "4px",
                  "&:hover": {
                    backgroundColor: theme === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
                  }
                }}
                onClick={(e) => handleMenuOpen(e, deployment)}
              >
                <MoreVerticalIcon
                  style={{ color: theme === "dark" ? "#d4d4d4" : "#666" }}
                />
              </Box>
            </Box>
          ))
        ) : (
          <Typography sx={{ color: theme === "dark" ? "#d4d4d4" : "#333", textAlign: "center" }}>
            No previous deployments available.
          </Typography>
        )}
      </Box>

      {contextMenu && (
        <Menu
          open={Boolean(contextMenu)}
          onClose={handleMenuClose}
          anchorReference="anchorPosition"
          anchorPosition={contextMenu ? { top: contextMenu.y, left: contextMenu.x } : undefined}
          keepMounted
          disablePortal
          transitionDuration={0}
          slotProps={{
            paper: {
              elevation: 3,
              sx: {
                minWidth: "120px",
                boxShadow: theme === "dark"
                  ? "0 4px 8px rgba(0, 0, 0, 0.4)"
                  : "0 4px 8px rgba(0, 0, 0, 0.1)"
              }
            }
          }}
          MenuListProps={{
            sx: {
              py: 0.5
            }
          }}
        >
          <MenuItem
            onClick={handleDeleteClick}
            sx={{
              px: 2,
              py: 1,
              fontSize: "14px"
            }}
          >
            Delete
          </MenuItem>
        </Menu>
      )}

      <Dialog {...dialogProps()}>
        <DialogTitle
          id="delete-confirmation-dialog-title"
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            fontSize: "18px",
            fontWeight: 600,
            color: theme === "dark" ? "#fff" : "333"
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <WarningAmberIcon sx={{ color: "#FFA500", fontSize: "34px" }} />
          Confirm Resource Deletion
        </DialogTitle>
        <DialogContent onClick={(e) => e.stopPropagation()}>
          <Typography sx={{ fontSize: "16px", color: theme === "dark" ? "#fff" : "333", mt: 2 }}>
            Are you sure you want to delete "{deleteDeploymentId}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions
          sx={{
            justifyContent: "space-between",
            padding: "0 16px 16px 16px",
            // Prevent any layout shifts that could cause flickering
            minHeight: '48px',
            '& button': {
              // Make button size stable
              minWidth: '80px',
              transition: 'none',
              animation: 'none'
            }
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            variant="text"
            disableRipple
            disableElevation
            disableFocusRipple
            disableTouchRipple
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleDeleteCancel();
            }}
            sx={createStableButtonStyle(false)}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            disableRipple
            disableElevation
            disableFocusRipple
            disableTouchRipple
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleDeleteConfirm();
            }}
            sx={createStableButtonStyle(true)}
          >
            Yes, Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );

  return (
    <StyledContainer>
      <Box sx={{ display: "flex", justifyContent: "flex-start", mb: 1 }}>
        <RadioGroup
          row
          value={selectedOption}
          onChange={handleOptionChange}
          sx={{ gap: 4 }}
        >
          <FormControlLabel
            value="createOwn"
            control={<Radio />}
            label="Create from your GitHub"
            sx={{
              "& .MuiTypography-root": {
                color: theme === "dark" ? "#d4d4d4" : "#333",
                fontSize: "0.875rem",
              },
            }}
          />
          <FormControlLabel
            value="popularRepos"
            control={<Radio />}
            label="Deploy from popular Repositories"
            sx={{
              "& .MuiTypography-root": {
                color: theme === "dark" ? "#d4d4d4" : "#333",
                fontSize: "0.875rem",
              },
            }}
          />
          <FormControlLabel
            value="previousDeployments"
            control={<Radio />}
            label="List of Previous Deployments"
            sx={{
              "& .MuiTypography-root": {
                color: theme === "dark" ? "#d4d4d4" : "#333",
                fontSize: "0.875rem",
              },
            }}
          />
        </RadioGroup>
      </Box>

      {/* Wrapper Box to maintain consistent height */}
      <Box sx={{ height: "55vh", overflow: "hidden" }}>
        {selectedOption === "createOwn" ? (
          <CreateFromYourGitHub
            formData={formData}
            setFormData={setFormData}
            error={error}
            credentialsList={credentialsList}
            handleCredentialChange={handleCredentialChange}
            handleOpenCredentialDialog={handleOpenCredentialDialog}
            handleOpenWebhookDialog={handleOpenWebhookDialog}
            theme={theme}
          />
        ) : selectedOption === "popularRepos" ? (
          <PopularRepositoriesForm theme={theme} selectedRepo={selectedRepo} handleRepoSelection={handleRepoSelection} popularRepositories={popularRepositories}/>
        ) : (
          <PreviousDeploymentsForm />
        )}
      </Box>

      <Box sx={{
        display: "flex",
        justifyContent: "flex-end",
        gap: 1,
        mt: 2,
        position: "relative",
        width: "100%",
        height: "auto",
        minHeight: "40px",
        padding: "8px 0",
        zIndex: 1
      }}>
        <Button
          onClick={handleCancelClick}
          disabled={loading || popularLoading || previousLoading}
          sx={{
            textTransform: "none",
            fontWeight: 600,
            color: theme === "dark" ? "#d4d4d4" : "#666",
            padding: "8px 16px",
            "&:hover": {
              backgroundColor: theme === "dark" ? "#333" : "#f5f5f5",
            },
          }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={() => {
            if (selectedOption === "createOwn") {
              if (validateForm()) handleDeploy();
            } else {
              handlePopularRepoDeploy();
            }
          }}
          disabled={
            (selectedOption === "createOwn" && (!hasChanges || loading)) ||
            (selectedOption === "popularRepos" && (!selectedRepo || popularLoading)) ||
            (selectedOption === "previousDeployments" && (!selectedRepo || previousLoading))
          }
          sx={{
            textTransform: "none",
            fontWeight: "600",
            backgroundColor: "#1976d2",
            color: "#fff",
            padding: "8px 16px",
            borderRadius: "8px",
            "&:hover": {
              backgroundColor: "#1565c0",
            },
            "&:disabled": {
              backgroundColor: "#b0bec5",
              color: "#fff",
            },
          }}
        >
          {(selectedOption === "createOwn" && loading) || (selectedOption === "popularRepos" && popularLoading) || (selectedOption === "previousDeployments" && previousLoading)
            ? "Deploying..."
            : "Apply"}
        </Button>
      </Box>
    </StyledContainer>
  );
};

interface PopularRepositoriesFormProps {
  theme: string;
  selectedRepo: string | null;
  handleRepoSelection: (repoUrl: string) => void;
  popularRepositories: {
    repo_url: string;
    folder_path: string;
    branch: string;
  }[]
}

const PopularRepositoriesForm = ({ theme, selectedRepo, popularRepositories, handleRepoSelection }: PopularRepositoriesFormProps) => {
  const [workloadLabel, setWorkloadLabel] = useState<string | null>(null);

  const extractRepoName = (url: string) => {
    const parts = url.split('/');
    return parts[parts.length - 1];
  };

  return ( 
    <>
  <Box
    sx={{
      display: "flex",
      flexDirection: "column",
      flex: 1,
      overflow: "hidden",
      height: "55vh",
    }}
  >
        <Box sx={{ marginTop: "20px" }}>
          <WorkloadLabelInput handleChange={(e) => setWorkloadLabel(e.target.value)} isError={false} theme={theme} value={workloadLabel ? workloadLabel:""} />
        </Box>
    <Box
      sx={{
        position: "sticky",
        top: 0,
        zIndex: 1,
        borderRadius: "4px"
      }}
    >
      {selectedRepo && (
        <Box
          sx={{
            width: "100%",
            margin: "0 auto 25px auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            p: 1.6,
            borderRadius: "4px",
            border: "1px solid",
            borderColor: theme === "dark" ? "#444" : "#e0e0e0",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <CheckCircleIcon color="success" sx={{ mr: 1 }} />
            <Typography variant="body1" sx={{ color: theme === "dark" ? "#fff" : "#333" }}>
              <strong>{extractRepoName(selectedRepo)}</strong>
            </Typography>
          </Box>
        </Box>
      )}
    </Box>

    <Box
      sx={{
        flex: 1,
        overflowY: "auto",
        "&::-webkit-scrollbar": {
          display: "none",
        },
        scrollbarWidth: "none",
        "-ms-overflow-style": "none",
        display: "flex",
        flexDirection: "column",
        gap: 2,
      }}
    >
      {popularRepositories.map((repo) => (
        <Box
          key={repo.repo_url}
          sx={{
            display: "flex",
            alignItems: "center",
            padding: "8px",
            borderRadius: "4px",
            backgroundColor: theme === "dark" ? "#00000033" : "#f9f9f9",
            "&:hover": {
              backgroundColor: theme === "dark" ? "#2a2a2a" : "#f1f1f1",
            },
          }}
        >
          <Checkbox
            checked={selectedRepo === repo.repo_url}
            onChange={() => handleRepoSelection(repo.repo_url)}
            sx={{
              color: theme === "dark" ? "#d4d4d4" : "#666",
              "&.Mui-checked": {
                color: "#1976d2",
              },
            }}
          />
          <Typography
            sx={{
              fontSize: "0.875rem",
              color: theme === "dark" ? "#d4d4d4" : "#333",
            }}
          >
            {extractRepoName(repo.repo_url)}
          </Typography>
        </Box>
      ))}
    </Box>
  </Box>
  </>
);
}