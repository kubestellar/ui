import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import ClustersTable from '../components/ClustersTable';

interface ManagedClusterInfo {
  name: string;
  labels: { [key: string]: string };
  creationTime: string;
  status: string;
}

const ITS = () => {
  const [clusters, setClusters] = useState<ManagedClusterInfo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  // const [error, setError] = useState<string | null>(null);

  const handleFetchCluster = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/clusters');
      console.log('itsData:', response);
      const itsData: ManagedClusterInfo[] = response.data.itsData || [];

      if (Array.isArray(itsData)) {
        console.log('Setting clusters state:', itsData);
        setClusters(itsData);
      }
    } catch (error) {
      console.error('Error fetching ITS information:', error);
    } finally {
      setLoading(false);
    }
  }, []);


  useEffect(() => {
    handleFetchCluster();
  }, [handleFetchCluster]);


  if (loading) return <p className="text-center p-4">Loading ITS information...</p>;

  return (
    <div>
      <div className="w-full max-w-7xl mx-auto p-4">
        <h1 className="text-2xl font-bold mb-6 text-center">Managed Clusters ({clusters.length})</h1>
            {loading ? <p>Loading...</p> : <ClustersTable clusters={clusters} currentPage={1} totalPages={1} onPageChange={function (): void {
          throw new Error('Function not implemented.');
        } } />}
          </div>
        </div>
  );
};
export default ITS;