import { useState, useContext } from "react";
import CreateOptions from "../components/CreateOptions";
import DeploymentTable from "../components/DeploymentTable";
import PieChartDisplay from "../components/PieChartDisplay";
import { Box, Button, Grid, Card, CardContent, Typography } from "@mui/material";
import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ThemeContext } from "../context/ThemeContext";
import { useWDSQueries } from "../hooks/queries/useWDSQueries";
import LoadingFallback from "../components/LoadingFallback";
import { toast } from "react-hot-toast";

const WDS = () => {
  const { theme } = useContext(ThemeContext);
  const [showCreateOptions, setShowCreateOptions] = useState(false);
  const [activeOption, setActiveOption] = useState<string | null>("option1");
  const navigate = useNavigate();

  const wdsQueries = useWDSQueries();
  
  const { data: workloads = [], isLoading: workloadsLoading } = wdsQueries.useWorkloads();
  const { data: statusData = [], isLoading: statusLoading } = wdsQueries.useWorkloadStatus();
  const createMutation = wdsQueries.useCreateWorkload();

  if (workloadsLoading || statusLoading) {
    return <LoadingFallback message="Loading workloads..." />;
  }

  const deployments = workloads.filter((w) => w.kind === "Deployment");

  const workloadCounts = workloads.reduce((acc, workload) => {
    acc[workload.kind] = (acc[workload.kind] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const handleDeploymentClick = (deployment: any) => {
    navigate(`/deploymentdetails/${deployment.namespace}/${deployment.name}`);
  };

  const handleCreateWorkload = async (data: any, isJson: boolean = false) => {
    try {
      await createMutation.mutateAsync({ data, isJson });
      setShowCreateOptions(false);
      toast.success('Workload created successfully');
    } catch (error) {
      toast.error('Failed to create workload');
      console.error('Error creating workload:', error);
    }
  };

  return (
    <div className={`w-full max-w-7xl mx-auto p-4`}>
      <Box sx={{ mb: 4, display: "flex", justifyContent: "space-between" }}>
        <Typography variant="h4" color={theme === "dark" ? "white" : "text.primary"}>
          WDS Workloads ({workloads.length})
        </Typography>
        <Button
          variant="contained"
          startIcon={<Plus />}
          onClick={() => setShowCreateOptions(true)}
        >
          Create Workload
        </Button>
      </Box>

      {/* Status Cards */}
      <Box sx={{ mb: 4 }}>
        {Object.keys(workloadCounts).length > 0 && (
          <Card>
            <CardContent>
              <Typography variant="h5" fontWeight="bold" color={theme === "dark" ? "white" : "text.primary"} mb={2}>
                Workload Status
              </Typography>
              <Grid container spacing={4} justifyContent="center">
                {Object.entries(workloadCounts).map(([kind, count], index) => (
                  <Grid item key={index}>
                    <PieChartDisplay workload={{ kind, count }} color="#4CAF50" />
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        )}
      </Box>

      {/* Deployments Table */}
      <DeploymentTable
        title="Deployments"
        workloads={deployments}
        setSelectedDeployment={handleDeploymentClick}
      />

      {/* Create Options Dialog */}
      <CreateOptions
        activeOption={activeOption}
        setActiveOption={setActiveOption}
        onCancel={() => setShowCreateOptions(false)}
        onSubmit={handleCreateWorkload}
        open={showCreateOptions}
      />
    </div>
  );
};

export default WDS;