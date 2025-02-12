import { useState, useEffect, useCallback } from "react";
import { api } from "../lib/api";
import CreateOptions from "../components/CreateOptions";
import DeploymentTable from "../components/DeploymentTable";
import PieChartDisplay from "../components/PieChartDisplay";
import DeploymentDetails from "../components/DeploymentDetails";

export interface Workload {
  name: string;
  kind: string;
  namespace: string;
  creationTime: string;
  image: string;
  label: string;
}


const COLORS = ["#28A745"];

const WDS = () => {
  const [workloads, setWorkloads] = useState<Workload[]>([]);
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);
  const [showCreateOptions, setShowCreateOptions] = useState(false);
  const [activeOption, setActiveOption] = useState<string | null>("option1");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [selectedDeployment, setSelectedDeployment] = useState<Workload | null>(null);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [pendingCancel, setPendingCancel] = useState<(() => void) | null>(null);

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
  
  console.log(loading);
  console.log(error);
  
  useEffect(() => {
    fetchWDSData();
  }, [fetchWDSData]);

  // Filter only deployments
  const deployments = workloads.filter((workload) => workload.kind === "Deployment");

  
  // Group workloads by kind and count them
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

  return (
    <div className="w-full max-w-7xl mx-auto p-4 text-white">
      <h1 className="text-2xl font-bold mb-6">WDS Workloads ({workloads.length})</h1>

      {/* Create Workload Button */}
      <button
        className="mb-4 px-4 py-2 bg-blue-500 rounded text-white"
        onClick={() => {
          setActiveOption("option1");
          setShowCreateOptions(true);
        }}
      >
        Create Workload
      </button>

      {/* Create Options */}
      {showCreateOptions && (
        <CreateOptions
          activeOption={activeOption}
          setActiveOption={setActiveOption}
          setHasUnsavedChanges={setHasUnsavedChanges}
          onCancel={handleCancel}
        />
      )}

      {/* Unsaved Changes Modal */}
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

      {/* Workload Status */}
      <section className="mt-12">
        {Object.keys(workloadCounts).length > 0 && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">Workload Status</h2>
            <div className="flex justify-around items-center">
              {Object.entries(workloadCounts).map(([kind, count], index) => (
                <PieChartDisplay key={index} workload={{ kind, count }} color={COLORS[0]} />
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Deployment Table */}
      {selectedDeployment ? (
        <DeploymentDetails
          deploymentName={selectedDeployment.name}
          namespace={selectedDeployment.namespace}
          onClose={() => setSelectedDeployment(null)}
        />
      ) : (
        <DeploymentTable
          title="Deployments"
          workloads={deployments}
          setSelectedDeployment={setSelectedDeployment}
        />
      )}
    </div>
  );
};

export default WDS;

