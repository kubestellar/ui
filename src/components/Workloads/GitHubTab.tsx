import { Box, Button, FormControl, MenuItem, Select, SelectChangeEvent, TextField, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { StyledContainer } from "../StyledComponents";
import useTheme from "../../stores/themeStore"; // Import useTheme for dark mode support

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
  const theme = useTheme((state) => state.theme); // Get the current theme

  return (
    // --- GitHub Tab Section ---
    <StyledContainer>
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
            Repository URL
          </Typography>
          <TextField
            fullWidth
            value={formData.repositoryUrl}
            onChange={(e) =>
              setFormData({ ...formData, repositoryUrl: e.target.value })
            }
            error={!!error && !formData.repositoryUrl}
            placeholder="e.g., https://github.com/username/repo"
            InputProps={{
              startAdornment: (
                <span style={{ fontSize: "0.9rem", marginRight: "8px" }}>
                  *
                </span>
              ),
            }}
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: "8px",
                backgroundColor: theme === "dark" ? "#252526" : "#fff",
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
            Path
          </Typography>
          <TextField
            fullWidth
            value={formData.path}
            onChange={(e) =>
              setFormData({ ...formData, path: e.target.value })
            }
            error={!!error && !formData.path}
            placeholder="e.g., /path/to/yaml"
            InputProps={{
              startAdornment: (
                <span style={{ fontSize: "0.9rem", marginRight: "8px" }}>
                  *
                </span>
              ),
            }}
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: "8px",
                backgroundColor: theme === "dark" ? "#252526" : "#fff",
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
            Branch (default: main)
          </Typography>
          <TextField
            fullWidth
            value={formData.branchSpecifier}
            onChange={(e) =>
              setFormData({ ...formData, branchSpecifier: e.target.value })
            }
            placeholder="e.g., master, dev-branch"
            InputProps={{
              startAdornment: (
                <span style={{ fontSize: "0.9rem", marginRight: "8px" }}>
                  *
                </span>
              ),
            }}
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: "8px",
                backgroundColor: theme === "dark" ? "#252526" : "#fff",
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
                  <Box sx={{ display: "flex", alignItems: "center", color: theme === "dark" ? "#858585" : "#666" }}>
                    <span style={{ fontSize: "0.9rem", marginRight: "8px" }}>
                      *
                    </span>
                    <Typography sx={{ fontSize: "0.875rem" }}>
                      e.g., username-pat
                    </Typography>
                  </Box>
                )
              }
              sx={{
                borderRadius: "8px",
                backgroundColor: theme === "dark" ? "#252526" : "#fff",
                "& .MuiOutlinedInput-root": {
                  "& fieldset": {
                    borderColor: theme === "dark" ? "#444" : "#e0e0e0",
                    borderWidth: "2px",
                  },
                  "&:hover fieldset": {
                    borderColor: "#1976d2",
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: "#1976d2",
                    borderWidth: "2px",
                  },
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
          startIcon={<AddIcon />}
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
              mb: 1,
            }}
          >
            Webhooks
          </Typography>
          <FormControl fullWidth>
            <Select
              value={formData.webhook}
              onChange={handleWebhookChange}
              displayEmpty
              renderValue={(selected) =>
                selected ? (
                  selected
                ) : (
                  <Box sx={{ display: "flex", alignItems: "center", color: theme === "dark" ? "#858585" : "#666" }}>
                    <span style={{ fontSize: "0.9rem", marginRight: "8px" }}>
                      *
                    </span>
                    <Typography sx={{ fontSize: "0.875rem" }}>
                      e.g., webhook-url-pat
                    </Typography>
                  </Box>
                )
              }
              sx={{
                borderRadius: "8px",
                backgroundColor: theme === "dark" ? "#252526" : "#fff",
                "& .MuiOutlinedInput-root": {
                  "& fieldset": {
                    borderColor: theme === "dark" ? "#444" : "#e0e0e0",
                    borderWidth: "2px",
                  },
                  "&:hover fieldset": {
                    borderColor: "#1976d2",
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: "#1976d2",
                    borderWidth: "2px",
                  },
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
              {webhooksList.map((webhook) => (
                <MenuItem key={webhook} value={webhook}>
                  {webhook}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
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
          startIcon={<AddIcon />}
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
      <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1, mt: 2 }}>
        <Button
          onClick={handleCancelClick}
          disabled={loading}
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
            if (validateForm()) handleDeploy();
          }}
          disabled={!hasChanges || loading}
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
          {loading ? "Deploying..." : "Apply"}
        </Button>
      </Box>
    </StyledContainer>
  );
};