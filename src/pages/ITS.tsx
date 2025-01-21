import { useState, useEffect } from 'react';
import { api } from '../lib/api';

interface ManagedClusterInfo {
  name: string;
  labels: { [key: string]: string };
  creationTime: string;
}

const ITS = () => {
  const [clusters, setClusters] = useState<ManagedClusterInfo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get('/api/clusters')
      .then(response => {
        if (response.data !== clusters) {
          setClusters(response.data.itsData || []);
        }
        setError(null);
        console.log('Response data:', response.data);
        const itsData: ManagedClusterInfo[] = response.data.itsData || [];

        console.log('itsData:', itsData);

        if (Array.isArray(itsData)) {
          console.log('Setting clusters state:', itsData);
          setClusters(itsData);

        } else {
          console.error('Invalid data format received:', response.data);
          setError('Invalid data format received from server');
        }
        setLoading(false);
      })
      .catch((error) => {
        console.error('Error fetching ITS information:', error);
        setError('Error fetching ITS information');
        setLoading(false);
      });
    console.log('Loading state:', loading);
    console.log('Clusters state:', clusters);
  }, [loading]);

  if (loading) return <p className="text-center p-4">Loading ITS information...</p>;
  if (error) return <p className="text-center p-4 text-error">{error}</p>;
  if (!clusters.length) return <p className="text-center p-4">No clusters found</p>;
  console.log('Loading state:', loading);
  console.log('Clusters state:', clusters);

  return (
    <div className="w-full max-w-7xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Managed Clusters ({clusters.length})</h1>
      <div className="grid gap-4">
        {clusters.map((cluster) => (
          <div key={cluster.name} className="card bg-base-200 shadow-xl">
            <div className="card-body">
            <h2 className="card-title">{cluster.name ? `Name: ${cluster.name}`: 'No Name Available'}</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                <h3 className="font-semibold flex mb-2">Labels: </h3>
                  {cluster.labels && Object.keys(cluster.labels).length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(cluster.labels).map(([key, value]) => (
                        <span
                          key={`${key}-${value}`}
                          className="badge badge-primary"
                          title={`${key}: ${value}`}
                        >
                          {key}={value}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p>No labels available.</p>
                  )}
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Creation Time</h3>
                  <p>{new Date(cluster.creationTime).toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ITS;
