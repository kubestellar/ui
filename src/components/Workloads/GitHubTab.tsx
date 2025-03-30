import { Box, Button, FormControl, MenuItem, Select, SelectChangeEvent, TextField, Typography, FormControlLabel, Radio, RadioGroup, Checkbox } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { StyledContainer } from "../StyledComponents";
import useTheme from "../../stores/themeStore";
import { useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";

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

  const handleOptionChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedOption(event.target.value);
    setSelectedRepo(null);
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
        `http://localhost:4000/api/deploy?branch=${selectedRepoData.branch}`,
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
      ) : (
        <PopularRepositoriesForm />
      )}

      <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1, mt: 2 }}>
        <Button
          onClick={handleCancelClick}
          disabled={loading || popularLoading}
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
            (selectedOption === "popularRepos" && (!selectedRepo || popularLoading))
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
          {(selectedOption === "createOwn" && loading) || (selectedOption === "popularRepos" && popularLoading)
            ? "Deploying..."
            : "Apply"}
        </Button>
      </Box>
    </StyledContainer>
  );
};