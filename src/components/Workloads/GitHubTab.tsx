import { Box, Button, FormControl, MenuItem, Select, SelectChangeEvent, TextField, Typography, FormControlLabel, Radio, RadioGroup, Checkbox, Menu, Dialog, DialogTitle, DialogContent, DialogActions } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { StyledContainer } from "../StyledComponents";
import useTheme from "../../stores/themeStore";
import { useState, useEffect, useCallback } from "react";
import axios, { AxiosError } from "axios";
import { toast } from "react-hot-toast";
import { MoreVerticalIcon } from "lucide-react";

interface FormData {
  repositoryUrl: string;
  path: string;
  credentials: string;
  branchSpecifier: string;
  webhook: string;
}

interface Props {
  formData: FormData;
  setFormData: (data: FormData) => void;
  error: string;
  credentialsList: string[];
  webhooksList: string[];
  loading: boolean;
  hasChanges: boolean;
  handleCredentialChange: (event: SelectChangeEvent<string>) => void;
  handleOpenCredentialDialog: () => void;
  handleWebhookChange: (event: SelectChangeEvent<string>) => void;
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
  webhooksList: string[];
  handleCredentialChange: (event: SelectChangeEvent<string>) => void;
  handleOpenCredentialDialog: () => void;
  handleWebhookChange: (event: SelectChangeEvent<string>) => void;
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
    }}
  >
    <Typography
      variant="subtitle1"
      sx={{
        fontWeight: 600,
        fontSize: "20px",
        color: theme === "dark" ? "#d4d4d4" : "#333",
        mt: 1,
      }}
    >
      Create from your GitHub Repository and deploy!
    </Typography>
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
  webhooksList,
  loading,
  hasChanges,
  handleCredentialChange,
  handleOpenCredentialDialog,
  handleWebhookChange,
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
        const response = await axios.get("http://localhost:4000/api/deployments/github/list");
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

  const extractRepoName = (url: string) => {
    const parts = url.split('/');
    return parts[parts.length - 1];
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

      const response = await axios.post(
        `http://localhost:4000/api/deploy?created_by_me=true&branch=${selectedRepoData.branch}`,
        {
          repo_url: selectedRepoData.repo_url,
          folder_path: selectedRepoData.folder_path
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
    // Use fixed positioning instead of mouse position to make menu more stable
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    setContextMenu({ 
      deploymentId, 
      x: rect.right, 
      y: rect.top 
    });
  }, []);

  const handleMenuClose = useCallback(() => {
    setContextMenu(null);
  }, []);

  const handleDeleteDeployment = useCallback(async (deploymentId: string) => {
    try {
      const response = await axios.delete(`http://localhost:4000/api/deployments/github/${deploymentId}`);
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

  const handleDeleteClick = useCallback(() => {
    if (contextMenu?.deploymentId) {
      setDeleteDeploymentId(contextMenu.deploymentId);
      setDeleteDialogOpen(true);
    }
    handleMenuClose();
  }, [contextMenu, handleMenuClose]);

  const handleDeleteConfirm = useCallback(() => {
    if (deleteDeploymentId) {
      handleDeleteDeployment(deleteDeploymentId);
    }
  }, [deleteDeploymentId, handleDeleteDeployment]);

  const handleDeleteCancel = useCallback(() => {
    setDeleteDialogOpen(false);
    setDeleteDeploymentId(null);
  }, []);

  const PopularRepositoriesForm = () => (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        overflow: "hidden",
      }}
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
          Select a Popular Repository to deploy!
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
  );

  const PreviousDeploymentsForm = () => (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        overflow: "hidden",
      }}
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
                sx={{ cursor: "pointer" }}
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
          // Adding these properties to make the menu more stable and prevent flickering
          keepMounted
          disablePortal
          slotProps={{
            paper: {
              elevation: 3
            }
          }}
        >
          <MenuItem onClick={handleDeleteClick}>Delete</MenuItem>
        </Menu>
      )}

      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
        aria-labelledby="delete-confirmation-dialog-title"
        sx={{
          "& .MuiDialog-paper": {
            padding: "16px",
            width: "500px",
            backgroundColor: theme === "dark" ? "rgb(15, 23, 42)" : "#fff",
            borderRadius: "4px",
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.1)",
            maxWidth: "480px",
            height: "260px",
          },
        }}
      >
        <DialogTitle id="delete-confirmation-dialog-title" sx={{ display: "flex", alignItems: "center", gap: 1, fontSize: "18px", fontWeight: 600, color: theme === "dark" ? "#fff" : "333" }}>
          <WarningAmberIcon sx={{ color: "#FFA500", fontSize: "34px" }} />
          Confirm Resource Deletion
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: "16px", color: theme === "dark" ? "#fff" : "333", mt: 2 }}>
            Are you sure you want to delete "{deleteDeploymentId}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ justifyContent: "space-between", padding: "0 16px 16px 16px" }}>
          <Button
            onClick={handleDeleteCancel}
            sx={{
              textTransform: "none",
              color: "#2F86FF",
              fontWeight: 600,
              "&:hover": { backgroundColor: "rgba(47, 134, 255, 0.1)" },
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            sx={{
              textTransform: "none",
              fontWeight: 500,
              backgroundColor: "#d32f2f",
              color: "#fff",
              padding: "6px 16px",
              borderRadius: "4px",
              "&:hover": {
                backgroundColor: "#b71c1c",
              },
            }}
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

      {selectedOption === "createOwn" ? (
        <CreateFromYourGitHub
          formData={formData}
          setFormData={setFormData}
          error={error}
          credentialsList={credentialsList}
          webhooksList={webhooksList}
          handleCredentialChange={handleCredentialChange}
          handleOpenCredentialDialog={handleOpenCredentialDialog}
          handleWebhookChange={handleWebhookChange}
          handleOpenWebhookDialog={handleOpenWebhookDialog}
          theme={theme}
        />
      ) : selectedOption === "popularRepos" ? (
        <PopularRepositoriesForm />
      ) : (
        <PreviousDeploymentsForm />
      )}

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