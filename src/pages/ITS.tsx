import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';

interface ManagedClusterInfo {
  name: string;
  labels: { [key: string]: string };
  creationTime: string;
  status: string;
}

const ITS = () => {
  const [clusters, setClusters] = useState<ManagedClusterInfo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>(''); // For filter dropdown
  const [selectAll, setSelectAll] = useState<boolean>(false);
  const [selectedClusters, setSelectedClusters] = useState<string[]>([]);
  // const [error, setError] = useState<string | null>(null);
  const [checkedClusters, setCheckedClusters] = useState<Set<string>>(new Set());


  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { checked } = event.target;
    setSelectAll(checked);

    if (checked) {
      // If "select all" is checked, select all clusters
      const allClusterNames = clusters.map((cluster) => cluster.name);
      setSelectedClusters(Array.from(allClusterNames));
    } else {
      // If "select all" is unchecked, uncheck all clusters
      setSelectedClusters([]);
    }
  };

  const handleCheckboxChange = (name: string) => {
    const updatedSelectedClusters = new Set(selectedClusters);

    if (updatedSelectedClusters.has(name)) {
      updatedSelectedClusters.delete(name); // Uncheck the box
    } else {
      updatedSelectedClusters.add(name); // Check the box
    }

    setSelectedClusters(Array.from(updatedSelectedClusters));

    // If all checkboxes are checked, set selectAll to true
    if (updatedSelectedClusters.size === clusters.length) {
      setSelectAll(true);
    } else {
      setSelectAll(false);
    }
  };

  const handleFetchCluster = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/clusters');
      console.log(response);
      const itsData: ManagedClusterInfo[] = response.data.itsData || [];
      console.log('itsData:', itsData);
      if (Array.isArray(itsData)) {
        console.log('Setting clusters state:', itsData);
        setClusters(itsData);
      }
      // setError(null);
    } catch (error) {
      console.error('Error fetching ITS information:', error);
      // setError('Error fetching ITS information');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    handleFetchCluster();
  }, [handleFetchCluster]);

  // Handle filtering based on search and status
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value.toLowerCase();
    setSearchQuery(query);
  };

  const handleStatusFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value);
  };

  if (loading) return <p className="text-center p-4">Loading ITS information...</p>;

  return (
    <div className="w-full max-w-7xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6 text-center">Managed Clusters ({clusters.length})</h1>
      <div className="flex justify-between mb-4">
        <div className="flex items-center space-x-4">

          {/* Search Bar */}
          <div className="mb-4">
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search"
              className="border p-2 rounded shadow-lg"
            />
          </div>

          {/* Filter Options */}
          <div className="mb-4">
            <select
              id="statusFilter"
              value={statusFilter}
              onChange={handleStatusFilterChange}
              className="border p-2 rounded shadow-lg"
            >
              <option value="">Filter by Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="Pending">Pending</option>
            </select>
          </div>

          {/* Create Cluster Button */}
          <button className="bg-blue-500 text-white px-4 py-2 rounded shadow-lg hover:shadow-xl transition duration-200">
            Create Cluster
          </button>
          {/* Import Cluster Button */}
          <button className="bg-white text-blue-500 px-4 py-2 rounded shadow-lg hover:shadow-xl transition duration-200">
            Import Cluster
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto rounded-md shadow-lg">
        <table className="min-w-full border border-gray-700">
          <thead>
            <tr className="text-white bg-[#5294f6]">
              {/* Select All Checkbox */}
              <td style={{ padding: '30px' }}>
                <th className="checkbox-column">
                  <input
                    type="checkbox"
                    checked={selectAll}
                    onChange={handleSelectAll}
                  />
                </th>
              </td>
              <th className="p-3 text-left">Cluster Name</th>
              <th className="p-3 text-left">Namespace</th>
              <th className="p-3 text-left">Labels</th>
              <th className="p-3 text-left">Creation Time</th>
              <th className="p-3 text-left">Cluster Size</th>
              <th className="p-3 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {clusters.map((cluster, index) => (
              <tr key={cluster.name}>
                <td className="checkbox-cell" style={{ padding: '30px' }}>
                  <input
                    type="checkbox"
                    checked={selectedClusters.includes(cluster.name)}
                    onChange={() => handleCheckboxChange(cluster.name)}
                  /></td>
                <td className="p-3 font-medium">{cluster.name || 'N/A'}</td>
                <td className="p-3 font-medium">Namespace</td> {/* Placeholder for Namespace */}
                <td className="p-3">
                  {cluster.labels && Object.keys(cluster.labels).length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(cluster.labels).map(([key, value]) => (
                        <span key={`${key}-${value}`} className="bg-blue-200 text-blue-800 px-2 py-1 rounded text-sm">
                          {key}={value}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p>No labels</p>
                  )}
                </td>
                <td className="p-3">{new Date(cluster.creationTime).toLocaleString()}</td>
                <td className="p-3">N/A</td> {/* Placeholder for cluster size */}
                <td className="p-3">
                  <span className="px-2 py-1 text-sm bg-green-200 text-green-800 rounded">Active</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ITS;