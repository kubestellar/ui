import React, { useState, useEffect } from "react";

interface ClusterData {
  clusters: Array<{
    id: string;
    name: string;
    status: string;
    nodes: number;
    pods: number;
  }>;
  total_clusters: number;
  healthy_clusters: number;
  warning_clusters: number;
}

const ClusterMonitor: React.FC = () => {
  const [clusterData, setClusterData] = useState<ClusterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchClusterData();
  }, []);

  const fetchClusterData = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/plugins/cluster-monitor/data");
      if (!response.ok) {
        throw new Error("Failed to fetch cluster data");
      }
      const data = await response.json();
      setClusterData(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading cluster data...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (!clusterData) {
    return <div>No cluster data available</div>;
  }

  return (
    <div className="cluster-monitor">
      <h2>Cluster Monitor</h2>

      <div className="summary">
        <div className="summary-item">
          <h3>Total Clusters</h3>
          <p>{clusterData.total_clusters}</p>
        </div>
        <div className="summary-item">
          <h3>Healthy</h3>
          <p className="healthy">{clusterData.healthy_clusters}</p>
        </div>
        <div className="summary-item">
          <h3>Warning</h3>
          <p className="warning">{clusterData.warning_clusters}</p>
        </div>
      </div>

      <div className="clusters-list">
        <h3>Clusters</h3>
        {clusterData.clusters.map((cluster) => (
          <div key={cluster.id} className={`cluster-item ${cluster.status}`}>
            <h4>{cluster.name}</h4>
            <p>Status: {cluster.status}</p>
            <p>Nodes: {cluster.nodes}</p>
            <p>Pods: {cluster.pods}</p>
          </div>
        ))}
      </div>

      <button onClick={fetchClusterData}>Refresh Data</button>
    </div>
  );
};

export default ClusterMonitor;
