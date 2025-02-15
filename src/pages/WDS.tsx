import { useState, useEffect, useCallback } from "react";
import { api } from "../lib/api";
import CreateOptions from "../components/CreateOptions";
import DeploymentTable from "../components/DeploymentTable";
import PieChartDisplay from "../components/PieChartDisplay";
import { Box, Button } from "@mui/material";
import { Plus } from "lucide-react";
import { Grid, Card, CardContent, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";

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
  const [workloads, setWorkloads] = useState<Workload[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateOptions, setShowCreateOptions] = useState(false);
  const [activeOption, setActiveOption] = useState<string | null>("option1");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [pendingCancel, setPendingCancel] = useState<(() => void) | null>(null);
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
    if (hasUnsavedChanges) {
      setShowUnsavedModal(true);
      setPendingCancel(() => () => setShowCreateOptions(false));
    } else {
      setShowCreateOptions(false);
    }
  };

  const handleDeploymentClick = (workload: Workload | null) => {
    if (workload) {
      navigate(`/deploymentdetails/${workload.namespace}/${workload.name}`);
    }
  };
  

  return (
    <div className="w-full max-w-7xl mx-auto p-4 text-white">
      <h1 className="text-2xl text-black font-bold mb-6">WDS Workloads ({workloads.length})</h1>

      <Box sx={{ display: "flex", gap: 1 }}>
        <Button
          variant="outlined"
          startIcon={<Plus size={20} />}
          onClick={() => { setShowCreateOptions(true); setActiveOption("option1"); }}
        >
          Create Workload
        </Button>
      </Box>

      {showCreateOptions && (
        <CreateOptions
          activeOption={activeOption}
          setActiveOption={setActiveOption}
          setHasUnsavedChanges={setHasUnsavedChanges}
          onCancel={handleCancel}
        />
      )}

      {showUnsavedModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg w-7xl">
            <h2 className="text-xl font-bold mb-6">Unsaved changes</h2>
            <p className="mb-4">The form has not been submitted yet, do you really want to leave?</p>
            <div className="flex justify space-x-4">
              <button
                className="px-4 py-2 hover:bg-gray-600 bg-gray-800 rounded text-white"
                onClick={() => setShowUnsavedModal(false)}
              >
                No
              </button>
              <button
                className="px-4 py-2 hover:bg-gray-700 rounded text-blue-500 bg-gray-800"
                onClick={() => {
                  if (pendingCancel) pendingCancel();
                  setHasUnsavedChanges(false);
                  setShowUnsavedModal(false);
                }}
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}

      <Box sx={{ mt: 6, mb: 6 }}>
        {Object.keys(workloadCounts).length > 0 && (
          <Card sx={{ p: 4, boxShadow: 3 }}>
            <CardContent>
              <Typography variant="h5" fontWeight="bold" color="text.primary" mb={2}>
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