import { Box, Button, TextField, Typography } from "@mui/material";
import { StyledContainer } from "../StyledComponents";
import useTheme from "../../stores/themeStore"; // Import useTheme for dark mode support

interface HelmFormData {
  repoName: string;
  repoUrl: string;
  chartName: string;
  releaseName: string;
  version: string;
  namespace: string;
}

interface Props {
  formData: HelmFormData;
  setFormData: (data: HelmFormData) => void;
  error: string;
  loading: boolean;
  hasChanges: boolean;
  validateForm: () => boolean;
  handleDeploy: () => void;
  handleCancelClick: () => void;
}

export const HelmTab = ({
  formData,
  setFormData,
  error,
  loading,
  hasChanges,
  validateForm,
  handleDeploy,
  handleCancelClick,
}: Props) => {
  const theme = useTheme((state) => state.theme); // Get the current theme

  return (
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
            Repository Name *
          </Typography>
          <TextField
            fullWidth
            value={formData.repoName}
            onChange={(e) =>
              setFormData({ ...formData, repoName: e.target.value })
            }
            error={!!error && !formData.repoName}
            placeholder="e.g., my-helm-repo"
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
              Specify the name of the Helm repository
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
            Repository URL *
          </Typography>
          <TextField
            fullWidth
            value={formData.repoUrl}
            onChange={(e) =>
              setFormData({ ...formData, repoUrl: e.target.value })
            }
            error={!!error && !formData.repoUrl}
            placeholder="e.g., https://charts.helm.sh/stable"
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
              Use a valid Helm repository URL
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
            Chart Name *
          </Typography>
          <TextField
            fullWidth
            value={formData.chartName}
            onChange={(e) =>
              setFormData({ ...formData, chartName: e.target.value })
            }
            error={!!error && !formData.chartName}
            placeholder="e.g., nginx"
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
              Specify the name of the Helm chart to deploy
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
            Release Name *
          </Typography>
          <TextField
            fullWidth
            value={formData.releaseName}
            onChange={(e) =>
              setFormData({ ...formData, releaseName: e.target.value })
            }
            error={!!error && !formData.releaseName}
            placeholder="e.g., my-release"
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
              Specify the release name for this Helm deployment
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
            Version (default: latest)
          </Typography>
          <TextField
            fullWidth
            value={formData.version}
            onChange={(e) =>
              setFormData({ ...formData, version: e.target.value })
            }
            placeholder="e.g., 1.2.3"
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
              Specify the chart version to deploy
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
            Namespace (default: default)
          </Typography>
          <TextField
            fullWidth
            value={formData.namespace}
            onChange={(e) =>
              setFormData({ ...formData, namespace: e.target.value })
            }
            placeholder="e.g., kube-system"
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
              Specify the namespace for the Helm deployment
            </Typography>
          </Box>
        </Box>
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