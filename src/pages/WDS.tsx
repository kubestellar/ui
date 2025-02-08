
import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';

// Components
import CreateOptions from '../components/CreateOptions';
import DeploymentTable from '../components/DeploymentTable';
import PieChartDisplay from '../components/PieChartDisplay';

const API_BASE_URL = window.location.origin;

interface WorkloadInfo {
  name: string;
  kind: string;
  namespace: string;
  creationTime: string;
}

const COLORS = ["#28A745"];

const WDS = () => {
  const [workloads, setWorkloads] = useState<WorkloadInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateOptions, setShowCreateOptions] = useState(false);
  const [activeOption, setActiveOption] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const fetchWDSData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/wds/workloads');
      if (Array.isArray(response.data)) {
        setWorkloads(response.data);
      } else {
        throw new Error('Invalid data format received from server');
      }
      setError(null);
    } catch (error) {
      console.error('Error fetching WDS information:', error);
      setError('Failed to fetch WDS workloads. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWDSData();
  }, [fetchWDSData]);

  // Group workloads by kind and count them
  const workloadCounts = workloads.reduce((acc, workload) => {
    acc[workload.kind] = (acc[workload.kind] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (loading) return <p className="text-center p-4">Loading WDS information...</p>;
  if (error) return <p className="text-center p-4 text-red-600">{error}</p>;

  return (
    <div className="w-full max-w-7xl mx-auto p-4 text-white">
      <h1 className="text-2xl font-bold mb-6">WDS Workloads ({workloads.length})</h1>

      {/* Create Workload Button */}
      <button
        className="mb-4 px-4 py-2 bg-blue-500 rounded text-white"
        onClick={() => {
          setActiveOption("option1"); // Set first option as default
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
          onCancel={() => {
            if (hasUnsavedChanges && !window.confirm('You have unsaved changes. Discard them?')) return;
            setShowCreateOptions(false);
          }}
        />
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

      {/* Workload Table */}
      <DeploymentTable title="Deployments" workloads={workloads} baseUrl={API_BASE_URL} />
    </div>
  );
};

export default WDS;
