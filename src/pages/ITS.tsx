import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import ClustersTable from '../components/ClustersTable';

interface ManagedClusterInfo {
  name: string;
  labels: { [key: string]: string };
  creationTime: string;
  status: string;
  context: string;
}

const ITS = () => {
  const [clusters, setClusters] = useState<ManagedClusterInfo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [totalPages, setTotalPages] = useState<number>(1);
  // const [error, setError] = useState<string | null>(null);

  const handleFetchCluster = useCallback(async (page: number) => {
    setLoading(true);
    try {
      const response = await api.get('/api/clusters', { params: { page } }); // Send page param
      console.log('itsData:', response);
      const itsData: ManagedClusterInfo[] = response.data.itsData || [];

      if (Array.isArray(itsData)) {
        console.log('Setting clusters state:', itsData);
        setClusters(itsData);
        setTotalPages(response.data.totalPages || 1);
      }
    } catch (error) {
      console.error('Error fetching ITS information:', error);
    } finally {
      setLoading(false);
    }
  }, []);


  useEffect(() => {
    handleFetchCluster(1); // Default to page 1
  }, []);


  if (loading) return <p className="text-center p-4">Loading ITS information...</p>;

  return (
    <div>
      <div className="w-full max-w-7xl mx-auto p-4">
        <h1 className="text-2xl font-bold mb-6 text-center">Managed Clusters ({clusters.length})</h1>
        <ClustersTable
          clusters={clusters}
          currentPage={1} // ClustersTable will handle page state
          totalPages={totalPages}
          onPageChange={(newPage) => handleFetchCluster(newPage)} // Fetch new data on page change
        />
      </div>
    </div>
  );
};
export default ITS;