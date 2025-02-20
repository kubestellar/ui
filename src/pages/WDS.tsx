import { useState, useEffect, useCallback, useContext } from "react";
import { api } from "../lib/api";
import CreateOptions from "../components/CreateOptions";
import DeploymentTable from "../components/DeploymentTable";
import PieChartDisplay from "../components/PieChartDisplay";
import { Box, Button } from "@mui/material";
import { Plus } from "lucide-react";
import { Grid, Card, CardContent, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { ThemeContext } from "../context/ThemeContext"; 

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
  const { theme } = useContext(ThemeContext); 
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

  const deployments = workloads.filter((workload) => workload.kind === "Deployment");

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

  return (
    <div className={`w-full max-w-7xl mx-auto p-4`}>
      <h1 className={`text-2xl font-bold mb-6  ${theme === "dark" ? "text-white" : "text-black"}`}>WDS Workloads ({workloads.length})</h1>

      <Box sx={{ display: "flex", gap: 1 }}>
        <Button
          variant="outlined"
          startIcon={<Plus size={20} />}
          onClick={() => {
            setShowCreateOptions(true);
            setActiveOption("option1");
          }}
          sx={{
            borderColor: theme === "dark" ? "white" : "blue", // White border in dark mode
            color: theme === "dark" ? "white" : "blue", // White text in dark mode
            "&:hover": {
              borderColor: theme === "dark" ? "white" : "blue", // Keep white border on hover in dark mode
            },
          }}
        >
          Create Workload
        </Button>
      </Box>

      {showCreateOptions && (
        <CreateOptions
          activeOption={activeOption}
          setActiveOption={setActiveOption}
          onCancel={handleCancel}
        />
      )}

      <Box sx={{ mt: 6, mb: 6, backgroundColor: theme === "dark" ? "#2d3748" : "#fff" }}>
        {Object.keys(workloadCounts).length > 0 && (
          <Card sx={{ p: 4, boxShadow: 3, backgroundColor: theme === "dark" ? "#1F2937" : "#fff" }}>
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
                    <PieChartDisplay workload={{ kind, count }} color={COLORS[index % COLORS.length]} />
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