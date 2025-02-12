import { useEffect, useState } from "react";
import { FiChevronDown, FiChevronUp } from "react-icons/fi";
import { api } from "../lib/api";
import { FiX } from "react-icons/fi"; // Import close (X) icon


interface DeploymentInfo {
  name: string;
  namespace: string;
  createdAt?: string;
  age?: string;
  uid?: string;
  rollingUpdateStrategy?: {
    maxSurge?: string;
    maxUnavailable?: string;
  };
  replicas?: number;
  updatedReplicas?: number;
  availableReplicas?: number;
  conditions?: { type: string; status: string; lastProbeTime?: string; reason?: string; message?: string }[];
  containerImages?: string[];
  resourceInfo?: {
    strategy?: string;
    minReadySeconds?: number;
    revisionHistoryLimit?: number;
  };
  newReplicaSet?: ReplicaSetInfo;
  oldReplicaSet?: ReplicaSetInfo;
  events?: EventInfo[];
}

interface ReplicaSetInfo {
  name: string;
  namespace: string;
  age: string;
  pods: number;
  labels: string;
  images: string[];
}

interface EventInfo {
  type: string;
  reason: string;
  message: string;
  count: number;
  firstTimestamp: string;
  lastTimestamp: string;
}

interface Props {
  deploymentName: string;
  namespace: string;
  onClose: () => void;
}

const DeploymentDetails = ({ deploymentName, namespace, onClose }: Props) => {
  const [deployment, setDeployment] = useState<DeploymentInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDeploymentData = async () => {
      try {
        const response = await api.get(`/api/wds/${deploymentName}?namespace=${namespace}`);
        const data = response.data;

        setDeployment({
          name: data.metadata?.name || "Unknown",
          namespace: data.metadata?.namespace || "Unknown",
          createdAt: data.metadata?.creationTimestamp || "N/A",
          age: "TODO: Calculate Age",
          uid: data.metadata?.uid || "N/A",
          rollingUpdateStrategy: data.spec?.strategy?.rollingUpdate || {},
          replicas: data.status?.replicas || 0,
          updatedReplicas: data.status?.updatedReplicas || 0,
          availableReplicas: data.status?.availableReplicas || 0,
          conditions: data.status?.conditions?.map((cond: { type: string; status: string; lastProbeTime?: string; reason?: string; message?: string }) => ({
            type: cond.type,
            status: cond.status,
            lastProbeTime: cond.lastProbeTime || "N/A",
            reason: cond.reason || "N/A",
            message: cond.message || "N/A"
          })) || [],
          containerImages: data.spec?.template?.spec?.containers?.map((container: { image: string }) => container.image) || [],
          resourceInfo: {
            strategy: data.spec?.strategy?.type || "N/A",
            minReadySeconds: data.spec?.minReadySeconds || 0,
            revisionHistoryLimit: data.spec?.revisionHistoryLimit || 0,
          },
          newReplicaSet: data.status?.newReplicaSet || {},
          oldReplicaSet: data.status?.oldReplicaSet || {},
          events: data.status?.events || [],
        });

        setError(null);
      } catch (err) {
        console.error("Error fetching deployment details:", err);
        setError("Failed to load deployment details.");
      } finally {
        setLoading(false);
      }
    };

    fetchDeploymentData();
  }, [deploymentName, namespace]);

  if (loading) return <p className="text-center">Loading deployment details...</p>;
  if (error) return <p className="text-center text-red-600">{error}</p>;

  return (
    <div className="mt-6 bg-gray-800 p-6 rounded-2xl text-white">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl">Deployemnt Details: {deployment?.name}</h2>
        <button className="text-red-500 bg-gray-800 p-2  rounded-full border border-transparent hover:border-red-500 text-xl" onClick={onClose}>
          <FiX />
        </button>      
        </div>

      <div className="mt-4 space-y-3">
        <Table title="Metadata" headers={["Name", "Namespace", "Created At", "Age", "UID"]} rows={[
          [deployment?.name, deployment?.namespace, deployment?.createdAt, deployment?.age, deployment?.uid]
        ]} />

        <Table title="Resource Information" headers={["Strategy", "Min Ready Seconds", "Revision History Limit"]} rows={[
          [deployment?.resourceInfo?.strategy, deployment?.resourceInfo?.minReadySeconds, deployment?.resourceInfo?.revisionHistoryLimit]
        ]} />

        <Table title="Rolling Update Strategy" headers={["Max Surge", "Max Unavailable"]} rows={[
          [deployment?.rollingUpdateStrategy?.maxSurge || "N/A", deployment?.rollingUpdateStrategy?.maxUnavailable || "N/A"]
        ]} />

        <Table title="Pod Status" headers={["Updated", "Available", "Total"]} rows={[
          [deployment?.updatedReplicas, deployment?.availableReplicas, deployment?.replicas]
        ]} />

        <Table title="Conditions" headers={["Type", "Status", "Reason", "Message"]} rows={
          deployment?.conditions?.map(cond => [cond.type, cond.status, cond.reason, cond.message]) || []
        } />

        <Table title="Container Images" headers={["Image"]} rows={
          deployment?.containerImages?.map(img => [img]) || []
        } />

        <Table title="New Replica Set" headers={["Name", "Namespace", "Age", "Pods", "Labels", "Images"]} rows={[
          [deployment?.newReplicaSet?.name, deployment?.newReplicaSet?.namespace, deployment?.newReplicaSet?.age, deployment?.newReplicaSet?.pods, deployment?.newReplicaSet?.labels, deployment?.newReplicaSet?.images?.join(", ")]
        ]} />
        <Table title="Old Replica Set" headers={["Name", "Namespace", "Age", "Pods", "Labels", "Images"]} rows={[
          [deployment?.oldReplicaSet?.name, deployment?.oldReplicaSet?.namespace, deployment?.oldReplicaSet?.age, deployment?.oldReplicaSet?.pods, deployment?.oldReplicaSet?.labels, deployment?.oldReplicaSet?.images?.join(", ")]
        ]} />

        <Table title="Events" headers={["Type", "Reason", "Message", "Count", "First Timestamp", "Last Timestamp"]} rows={
          deployment?.events?.map(event => [event.type, event.reason, event.message, event.count, event.firstTimestamp, event.lastTimestamp]) || []
        } />
      </div>
    </div>
  );
};





const Table = ({ title, headers, rows }: { title: string; headers: string[]; rows: (string | number | React.ReactNode)[][] }) => {
  const [showDetails, setShowDetails] = useState(true);
  return (
    <div className={`p-4 ${showDetails ? "bg-gray-900" : "bg-gray-800"} rounded-lg`}>
      <div className="flex justify-between items-center">
        <h3 className="text-2xl">{title}</h3>
        <button className={`${showDetails ? "bg-gray-900" : "bg-gray-800"} p-2 rounded-full hover:border hover:border-white`} onClick={() => setShowDetails(!showDetails)}>
          {showDetails ? <FiChevronUp /> : <FiChevronDown />}
        </button>
      </div>
      {showDetails && (
        <div className="max-h-80 overflow-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-900 text-lg text-gray-400 h-16">
                {headers.map((header, idx) => (
                  <td key={idx} className="border-b border-gray-900">{header}</td>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length > 0 ? (
                rows.map((row, rowIndex) => (
                  <tr key={rowIndex} className="h-14">
                    {row.map((cell, cellIndex) => (
                      <td key={cellIndex} className="text-lg text-left border-b border-gray-900">{cell || "-"}</td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr className="h-14">
                  <td colSpan={headers.length} className="p-4 text-center">No data available</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};


export default DeploymentDetails;