import { Box, Button, TextField, Typography, FormControlLabel, Radio, RadioGroup, Checkbox, MenuItem, Menu, Dialog, DialogTitle, DialogContent, DialogActions } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { StyledContainer } from "../StyledComponents";
import useTheme from "../../stores/themeStore";
import { useState, useEffect, useCallback } from "react";
import axios, { AxiosError } from "axios";
import { toast } from "react-hot-toast";
import { MoreVerticalIcon } from "lucide-react";

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

interface Deployment {
  id: string;
  timestamp: string;
  repoName: string;
  repoURL: string;
  chartName: string;
  releaseName: string;
  namespace: string;
  version: string;
  releaseInfo: string;
  chartVersion: string;
  values: Record<string, unknown>;
}

// Define CreateOwnHelmForm as a separate component
const CreateOwnHelmForm = ({ formData, setFormData, error, theme }: {
  formData: HelmFormData;
  setFormData: (data: HelmFormData) => void;
  error: string;
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
);

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
  const theme = useTheme((state) => state.theme);
  const [selectedOption, setSelectedOption] = useState("createOwn");
  const [selectedChart, setSelectedChart] = useState<string | null>(null);
  const [popularLoading, setPopularLoading] = useState(false);
  const [userCharts, setUserCharts] = useState<Deployment[]>([]);
  const [userLoading, setUserLoading] = useState(false);

  const popularHelmCharts = [
    "airflow", "apache", "apisix", "appsmith", "argo-cd", "argo-workflows", "aspnet-core", "cassandra",
    "cert-manager", "chainloop", "cilium", "clickhouse", "common", "concourse", "consul", "contour",
    "deepspeed", "discourse", "dremio", "drupal", "ejbca", "fluent-bit", "postgresql-ha", "postgresql",
    "prometheus", "pytorch", "rabbitmq-cluster-operator", "rabbitmq", "redis-cluster", "redis", "redmine",
    "schema-registry", "scylladb", "sealed-secrets", "seaweedfs", "solr", "sonarqube", "spark",
    "spring-cloud-dataflow", "superset", "tensorflow-resnet", "thanos", "tomcat", "valkey-cluster",
    "valkey", "vault", "victoriametrics", "whereabouts", "wildfly", "wordpress", "zipkin"
  ];

  // Fetch user-created charts
  useEffect(() => {
    const fetchUserCharts = async () => {
      setUserLoading(true);
      try {
        const response = await axios.get("http://localhost:4000/api/deployments/helm/list");
        if (response.status === 200) {
          const deployments = response.data.deployments;
          setUserCharts(deployments);
        } else {
          throw new Error("Failed to fetch user-created charts");
        }
      } catch (error: unknown) {
        const err = error as AxiosError;
        console.error("User Charts Fetch error:", err);
        toast.error("Failed to load user-created charts!");
      } finally {
        setUserLoading(false);
      }
    };

    if (selectedOption === "userCharts") {
      fetchUserCharts();
    }
  }, [selectedOption]);

  const handleOptionChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedOption(event.target.value);
    setSelectedChart(null);
  };

  const handleChartSelection = (chartValue: string) => {
    // For userCharts, use id to find chartName; for popularCharts, use the chart name directly
    const chart = selectedOption === "userCharts"
      ? userCharts.find(c => c.id === chartValue)?.chartName || null
      : chartValue;
    setSelectedChart(chart === selectedChart ? null : chart);
  };

  const handlePopularHelmDeploy = async () => {
    if (!selectedChart) {
      toast.error("Please select a Helm chart to deploy.");
      return;
    }

    setPopularLoading(true);

    try {
      const requestBody = {
        repoName: "bitnami",
        repoURL: "https://charts.bitnami.com/bitnami",
        chartName: selectedChart,
        releaseName: selectedChart,
        namespace: selectedChart,
      };

      const response = await axios.post(
        "http://localhost:4000/deploy/helm?store=true",
        requestBody,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (response.status === 200 || response.status === 201) {
        toast.success(`Selected ${selectedChart} Helm chart deployed successfully!`);
        setSelectedChart(null);
        setTimeout(() => window.location.reload(), 4000);
      } else {
        throw new Error("Unexpected response status: " + response.status);
      }
    } catch (error: unknown) {
      const err = error as AxiosError;
      console.error("Popular Helm Deploy error:", err);

      if (err.response) {
        if (err.response.status === 500) {
          toast.error("Deployment failed: failed to install chart: cannot re-use a name that is still in use!");
        } else if (err.response.status === 400) {
          toast.error("Failed to deploy popular Helm chart!");
        } else {
          toast.error(`Popular Helm deployment failed! (${err.response.status})`);
        }
      } else {
        toast.error("Popular Helm deployment failed due to network error!");
      }
    } finally {
      setPopularLoading(false);
    }
  };

  const PopularHelmChartsForm = () => (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        overflow: "hidden",
      }}
    >
      {/* Sticky Header */}
      <Box
        sx={{
          position: "sticky",
          top: 0,
          zIndex: 1,
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
          Select a Popular Helm Chart to deploy!
        </Typography>
        {selectedChart && (
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
                <strong>{selectedChart}</strong>
              </Typography>
            </Box>
          </Box>
        )}
      </Box>

      {/* Scrollable List */}
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
        {popularHelmCharts.map((chart) => (
          <Box
            key={chart}
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
              checked={selectedChart === chart}
              onChange={() => handleChartSelection(chart)}
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
              {chart}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );

const UserCreatedChartsForm = () => {
  const [contextMenu, setContextMenu] = useState<{ chartId: string; x: number; y: number } | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);
  const [deleteChartId, setDeleteChartId] = useState<string | null>(null);

  const handleMenuOpen = useCallback((event: React.MouseEvent, chartId: string) => {
    event.preventDefault();
    event.stopPropagation();
    setContextMenu({ chartId, x: event.clientX, y: event.clientY });
  }, []);

  const handleMenuClose = useCallback(() => {
    setContextMenu(null);
  }, []);

  const handleDeleteChart = useCallback(async (chartId: string) => {
    try {
      const response = await axios.delete(`http://localhost:4000/api/deployments/helm/${chartId}`);
      if (response.status === 200) {
        setUserCharts(prev => prev.filter(chart => chart.id !== chartId));
        toast.success(`Chart ${chartId} deleted successfully!`);
      } else {
        toast.error(`Chart ${chartId} not deleted!`);
      }
    } catch (error: unknown) {
      const err = error as AxiosError;
      console.error("Delete Chart error:", err);
      toast.error(`Chart ${chartId} not deleted!`);
    } finally {
      setDeleteDialogOpen(false);
      setDeleteChartId(null);
    }
  }, []);

  const handleDeleteClick = useCallback(() => {
    if (contextMenu?.chartId) {
      setDeleteChartId(contextMenu.chartId);
      setDeleteDialogOpen(true);
    }
    handleMenuClose();
  }, [contextMenu, handleMenuClose]);

  const handleDeleteConfirm = useCallback(() => {
    if (deleteChartId) {
      handleDeleteChart(deleteChartId);
    }
  }, [deleteChartId, handleDeleteChart]);

  const handleDeleteCancel = useCallback(() => {
    setDeleteDialogOpen(false);
    setDeleteChartId(null);
  }, []);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        overflow: "hidden",
      }}
      onClick={handleMenuClose} // Close menu when clicking outside
    >
      {/* Sticky Header */}
      <Box
        sx={{
          position: "sticky",
          top: 0,
          zIndex: 1,
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
          List of User Created Charts
        </Typography>
        {selectedChart && (
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
                <strong>{selectedChart}</strong>
              </Typography>
            </Box>
          </Box>
        )}
      </Box>

      {/* Scrollable List */}
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
        {userLoading ? (
          <Typography sx={{ color: theme === "dark" ? "#d4d4d4" : "#333", textAlign: "center" }}>
            Loading user charts...
          </Typography>
        ) : userCharts.length > 0 ? (
          userCharts.map((chart) => (
            <Box
              key={chart.id}
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
              <Box sx={{ display: "flex", alignItems: "center" }} onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  checked={selectedChart === chart.chartName}
                  onChange={() => handleChartSelection(chart.id)}
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
                  {chart.id}
                </Typography>
              </Box>
              <Box
                sx={{ cursor: "pointer" }}
                onClick={(e) => handleMenuOpen(e, chart.id)}
              >
                <MoreVerticalIcon
                  style={{ color: theme === "dark" ? "#d4d4d4" : "#666" }}
                />
              </Box>
            </Box>
          ))
        ) : (
          <Typography sx={{ color: theme === "dark" ? "#d4d4d4" : "#333", textAlign: "center" }}>
            No user-created charts available.
          </Typography>
        )}
      </Box>

      {contextMenu && (
        <Menu
          open={Boolean(contextMenu)}
          onClose={handleMenuClose}
          anchorReference="anchorPosition"
          anchorPosition={contextMenu ? { top: contextMenu.y, left: contextMenu.x } : undefined}
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
            height: "250px",
          },
        }}
      >
        <DialogTitle id="delete-confirmation-dialog-title" sx={{ display: "flex", alignItems: "center", gap: 1, fontSize: "18px", fontWeight: 600, color: theme === "dark" ? "#fff" : "333" }}>
          <WarningAmberIcon sx={{ color: "#FFA500", fontSize: "34px" }} />
          Confirm Resource Deletion
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: "16px", color: theme === "dark" ? "#fff" : "333", mt: 2 }}>
            Are you sure you want to delete "{deleteChartId}"? This action cannot be undone.
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
};

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
            label="Create your own Helm chart"
            sx={{
              "& .MuiTypography-root": {
                color: theme === "dark" ? "#d4d4d4" : "#333",
                fontSize: "0.875rem",
              },
            }}
          />
          <FormControlLabel
            value="popularCharts"
            control={<Radio />}
            label="Deploy from popular Helm charts"
            sx={{
              "& .MuiTypography-root": {
                color: theme === "dark" ? "#d4d4d4" : "#333",
                fontSize: "0.875rem",
              },
            }}
          />
          <FormControlLabel
            value="userCharts"
            control={<Radio />}
            label="List of user created Charts"
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
        <CreateOwnHelmForm
          formData={formData}
          setFormData={setFormData}
          error={error}
          theme={theme}
        />
      ) : selectedOption === "popularCharts" ? (
        <PopularHelmChartsForm />
      ) : (
        <UserCreatedChartsForm />
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
          disabled={loading || popularLoading || userLoading}
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
              handlePopularHelmDeploy();
            }
          }}
          disabled={
            (selectedOption === "createOwn" && (!hasChanges || loading)) ||
            (selectedOption === "popularCharts" && (!selectedChart || popularLoading)) ||
            (selectedOption === "userCharts" && (!selectedChart || userLoading))
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
          {(selectedOption === "createOwn" && loading) || (selectedOption === "popularCharts" && popularLoading) || (selectedOption === "userCharts" && userLoading)
            ? "Deploying..."
            : "Apply"}
        </Button>
      </Box>
    </StyledContainer>
  );
};  