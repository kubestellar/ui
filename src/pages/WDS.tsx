import { useState, useEffect, useCallback,  } from "react";
import { api } from "../lib/api";
import CreateOptions from "../components/CreateOptions";
import DeploymentTable from "../components/DeploymentTable";
import PieChartDisplay from "../components/PieChartDisplay";
import { Box, Button } from "@mui/material";
import { Plus } from "lucide-react";
import { Grid, Card, CardContent, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import useTheme from "../stores/themeStore";
import LoadingFallback from "../components/LoadingFallback";

export interface Workload {
  name: string;
  kind: string;
  namespace: string;
  creationTime: string;
  image: string;
  label: string;
  replicas: number;
}

const COLORS = ["#28A745"];

const WDS = () => {
  const theme = useTheme((state) => state.theme)
  const [workloads, setWorkloads] = useState<Workload[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateOptions, setShowCreateOptions] = useState(false);
  const [activeOption, setActiveOption] = useState<string | null>("option1");
  const navigate = useNavigate();

  console.log(loading);
  console.log(error);

  const fetchWDSData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get<Workload[]>("/api/wds/workloads");
      if (Array.isArray(response.data)) {
        setWorkloads(response.data);
      } else {
        throw new Error("Invalid data format received from server");
      }
      setError(null);
    } catch (error) {
      console.error("Error fetching WDS information:", error);
      setError("Failed to fetch WDS workloads. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWDSData();
  }, [fetchWDSData]);

  const deployments = workloads.filter(
    (workload) => workload.kind === "Deployment"
  );

  const workloadCounts = workloads.reduce((acc, workload) => {
    acc[workload.kind] = (acc[workload.kind] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const handleCancel = () => {
    setShowCreateOptions(false);
  };

  const handleDeploymentClick = (workload: Workload | null) => {
    if (workload) {
      navigate(`/deploymentdetails/${workload.namespace}/${workload.name}`);
    }
  };

  if (loading) return <LoadingFallback message="Loading Wds Deployments..." size="medium" />;
  if (error) return (
    <div className="text-center p-4 text-red-600 dark:text-red-400">
      <p>{error}</p>
      <button 
        onClick={() => window.location.reload()} 
        className="mt-4 px-4 py-2 bg-primary rounded-md text-white hover:bg-primary/90 transition-colors duration-200"
      >
        Retry
      </button>
    </div>
  );

  return (
    <div className={`w-full p-4`}>
      <div className="flex justify-between items-center">
        <h1
          className={`text-2xl font-bold ${
            theme === "dark" ? "text-white" : "text-black"
          }`}
        >
          <span className="text-[#4498FF]">WDS Workloads</span>
          <span className="ml-2 px-3 py-1 bg-primary/10 rounded-full text-sm">
            {workloads?.length}
          </span>
        </h1>

        <Box sx={{ display: "flex", gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<Plus size={20} />}
            onClick={() => {
              setShowCreateOptions(true);
              setActiveOption("option1");
            }}
            sx={{
              borderColor: theme === "dark" ? "white" : "[#2f86ff]", // White border in dark mode
              color: theme === "dark" ? "white" : "#2f86ff", // White text in dark mode
              "&:hover": {
                borderColor: theme === "dark" ? "white" : "#2f86ff", // Keep white border on hover in dark mode
              },
            }}
          >
            Create Workload
          </Button>
        </Box>
      </div>
      {showCreateOptions && (
        <CreateOptions
          activeOption={activeOption}
          setActiveOption={setActiveOption}
          onCancel={handleCancel}
        />
      )}

      <Box
        sx={{
          mt: 3,
          mb: 3,
          backgroundColor: theme === "dark" ? "#2d3748" : "#fff",
        }}
      >
        {Object.keys(workloadCounts).length > 0 && (
          <Card
            sx={{
              p: 4,
              boxShadow: 3,
              backgroundColor: theme === "dark" ? "#1F2937" : "#fff",
            }}
          >
            <CardContent>
              <Typography
                variant="h5"
                fontWeight="bold"
                color={theme === "dark" ? "white" : "text.primary"}
                mb={2}
              >
                Workload Status
              </Typography>

              <Grid container spacing={65} justifyContent="center">
                {Object.entries(workloadCounts).map(([kind, count], index) => (
                  <Grid item key={index}>
                    <PieChartDisplay
                      workload={{ kind, count }}
                      color={COLORS[index % COLORS.length]}
                    />
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        )}
      </Box>

      <DeploymentTable
        title="Deployments"
        workloads={deployments}
        setSelectedDeployment={handleDeploymentClick}
      />
    </div>
  );
};

export default WDS;