import { Box,Typography, TextField } from "@mui/material";
import type { HelmFormData } from "./HelmTab";

interface Props {
    formData: HelmFormData;
    setFormData: (data: HelmFormData) => void;
    error: string;
    theme: string;
}
export const CreateOwnHelmForm = ({ formData, setFormData, error, theme }: Props) => {
  return (
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
          <Typography
              variant="subtitle1"
              sx={{
                  fontWeight: 600,
                  fontSize: "20px",
                  color: theme === "dark" ? "#d4d4d4" : "#333",
                  mt: 1,
              }}
          >
              Create our Own Helm Chart and deploy!
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
                  Workload Label
              </Typography>
              <TextField
                  fullWidth
                  value={formData.workload_label}
                  onChange={(e) =>
                      setFormData({ ...formData, workload_label: e.target.value })
                  }
                  placeholder="e.g., my-helm-workload"
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
                      Add a label to identify your workload (optional)
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
                  Namespace *
              </Typography>
              <TextField
                  fullWidth
                  value={formData.namespace}
                  onChange={(e) =>
                      setFormData({ ...formData, namespace: e.target.value })
                  }
                  error={!!error && !formData.namespace}
                  placeholder="e.g., default, my-namespace"
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
                      Specify the namespace for the Helm chart
                  </Typography>
              </Box>
          </Box>
      </Box>
  )
}