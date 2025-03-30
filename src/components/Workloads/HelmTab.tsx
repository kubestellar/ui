import { Box, Button, TextField, Typography, FormControlLabel, Radio, RadioGroup, Checkbox } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle"; // Added import for CheckCircleIcon
import { StyledContainer } from "../StyledComponents";
import useTheme from "../../stores/themeStore"; // Import useTheme for dark mode support
import { useState } from "react";
import axios, { AxiosError } from "axios";
import { toast } from "react-hot-toast";

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
        // mb: 2,
        mt: 1,
        // ml:1
        // textAlign: "center",
      }}
    >
      Create our Own  Helm Chart and deploy!
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
  const theme = useTheme((state) => state.theme); // Get the current theme
  const [selectedOption, setSelectedOption] = useState("createOwn");
  const [selectedChart, setSelectedChart] = useState<string | null>(null);
  const [popularLoading, setPopularLoading] = useState(false);

  const popularHelmCharts = [
    "airflow", "apache", "apisix", "appsmith", "argo-cd", "argo-workflows", "aspnet-core", "cassandra",
    "cert-manager", "chainloop", "cilium", "clickhouse", "common", "concourse", "consul", "contour",
    "deepspeed", "discourse", "dremio", "drupal", "ejbca", "fluent-bit", "postgresql-ha", "postgresql",
    "prometheus", "pytorch", "rabbitmq-cluster-operator", "rabbitmq", "redis-cluster", "redis", "redmine",
    "schema-registry", "scylladb", "sealed-secrets", "seaweedfs", "solr", "sonarqube", "spark",
    "spring-cloud-dataflow", "superset", "tensorflow-resnet", "thanos", "tomcat", "valkey-cluster",
    "valkey", "vault", "victoriametrics", "whereabouts", "wildfly", "wordpress", "zipkin"
  ];

  const handleOptionChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedOption(event.target.value);
    setSelectedChart(null); // Reset selected chart when switching options
  };

  const handleChartSelection = (chart: string) => {
    setSelectedChart(selectedChart === chart ? null : chart);
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
        "http://localhost:4000/deploy/helm",
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
        overflow: "hidden", // Prevent outer container from scrolling
        
      }}
    >
      {/* Sticky Header */}
      <Box
        sx={{
          position: "sticky",
          top: 0,
          zIndex: 1,
          // backgroundColor: theme === "dark" ? "#00000033" : "#fff", // Match the background to avoid transparency issues
          borderRadius: "4px"
        }}
      >
          <Typography
          variant="subtitle1"
          sx={{
            // backgroundColor: theme === "dark" ? "#fff" : "rgba(255, 255, 255, 0.8)", // Dark background in dark mode
            fontWeight: 600,
            fontSize: "20px",
            color: theme === "dark" ? "#d4d4d4" : "#333",
            mb: 3,
            mt: 1,
            // textAlign: "center",
            // ml:1
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
              // backgroundColor: theme === "dark" ? "#fff" : "rgba(255, 255, 255, 0.8)", // Dark background in dark mode
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", borderColor: theme === "dark" ? "rgba(25, 118, 210, 0.2)" : "rgba(25, 118, 210, 0.1)" }}>
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
          display: "flex", // Added to apply gap correctly
          flexDirection: "column",
          gap: 2, // Restored the original gap between Helm charts
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

  return (
    <StyledContainer>
      <Box sx={{ display: "flex", justifyContent: "flex-start", mb: 1 }}>
        <RadioGroup
          row
          value={selectedOption}
          onChange={handleOptionChange}
          sx={{ gap: 4 }} // Added gap to create space between radio buttons
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
        </RadioGroup>
      </Box>

      {selectedOption === "createOwn" ? (
        <CreateOwnHelmForm
          formData={formData}
          setFormData={setFormData}
          error={error}
          theme={theme}
        />
      ) : (
        <PopularHelmChartsForm />
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
              handlePopularHelmDeploy();
            }
          }}
          disabled={
            (selectedOption === "createOwn" && (!hasChanges || loading)) ||
            (selectedOption === "popularCharts" && (!selectedChart || popularLoading))
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
          {(selectedOption === "createOwn" && loading) || (selectedOption === "popularCharts" && popularLoading)
            ? "Deploying..."
            : "Apply"}
        </Button>
      </Box>
    </StyledContainer>
  );
};