# ITS.tsx copy

import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import { Button, TextField as Input, Badge, Table, TableHead as TableHeader, TableBody, TableRow, TableCell } from "@mui/material";

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
//  const [selectAll, setSelectAll] = useState<boolean>(false);
//  const [selectedClusters, setSelectedClusters] = useState<string[]>([]);
//  const [currentPage, setCurrentPage] = useState<number>(1);
 // const [itemsPerPage] = useState<number>(5); // Number of clusters per page
  // const [error, setError] = useState<string | null>(null);

  /*const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

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
  };*/

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

  // Handle filtering based on search and status
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value.toLowerCase();
    setSearchQuery(query);
  };

  const handleStatusFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value);
  };

 
   // Add this new function to filter clusters
  const filteredClusters = clusters.filter((cluster) => {
    const matchesSearch = cluster.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesStatus = !statusFilter || cluster.status === statusFilter;
    return matchesSearch && matchesStatus;
  });
 /*Calculate pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentClusters = filteredClusters.slice(
    indexOfFirstItem,
    indexOfLastItem
  );
 useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);*/

  if (loading) return <p className="text-center p-4">Loading ITS information...</p>;

  return (
    <div>
      <h2>Clusters</h2>
      {loading ? <p>Loading...</p> : <ClustersTable clusters={currentClusters} />}
      {/* Add pagination controls here if needed */}
    </div>
    /*<div className="w-full max-w-7xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6 text-center">Managed Clusters ({clusters.length})</h1>
      <div className="flex justify-between mb-4">
        <div className="flex items-center space-x-4">

          {/* Search Bar 
          <div>
            <Input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search"
              className="border p-2 rounded shadow-lg"
            />
          </div>

          {/* Filter Options 
          <div>
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

          {/* Create Cluster Button 
          <button className="bg-blue-500 text-white px-4 py-2 rounded shadow-lg hover:shadow-xl transition duration-200">
            Create Cluster
          </button>
          {/* Import Cluster Button 
          <button className="bg-white text-blue-500 border border-blue-500 px-4 py-2 rounded shadow-lg hover:shadow-xl transition duration-200">
            Import Cluster
          </button>
        </div>
      </div>

      {/* Table Container 
      <div className="overflow-x-auto rounded-lg shadow-lg">
        <Table className="w-full table-auto">
          <TableHeader>
            <TableRow className="text-white bg-[#5294f6]">
              {/* Select All Checkbox 
              <TableCell style={{ padding: '30px' }}>
                <TableHeader className="checkbox-column">
                  {/*<input
                    type="checkbox"
                    checked={selectAll}
                    onChange={handleSelectAll}
                  />
                </TableHeader>
              </TableCell>
              <TableCell className="p-3 text-left">Cluster Name</TableCell>
              <TableCell className="p-3 text-left">Namespace</TableCell>
              <TableCell className="p-3 text-left">Labels</TableCell>
              <TableCell className="p-3 text-left">Creation Time</TableCell>
              <TableCell className="p-3 text-left">Cluster Size</TableCell>
              <TableCell className="p-3 text-left">Status</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentClusters.map((cluster) => (
              <TableRow key={cluster.name}>
                <TableCell className="checkbox-cell" style={{ border: "bottom", padding: '30px' }}>
                  <input
                    type="checkbox"
                    checked={selectedClusters.includes(cluster.name)}
                    onChange={() => handleCheckboxChange(cluster.name)}
                  /></TableCell>
                <TableCell className="p-3 font-medium">{cluster.name || 'N/A'}</TableCell>
                <TableCell className="p-3 font-medium">Namespace</TableCell> {/* Placeholder for Namespace 
                <TableCell>
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
                </TableCell>
                <TableCell className="p-3">{new Date(cluster.creationTime).toLocaleString()}</TableCell>
                <TableCell className="p-3">
                  <Badge className="px-2 py-2 text-sm rounded-lg" style={{ border: "2px solid #9CCBA3", backgroundColor: "#D9F1D5", color: "#00000" }}>
                    N/A {/* Placeholder for cluster size 
                  </Badge></TableCell>
                <TableCell className="p-3" style={{ padding: '15px' }}>
                  <Badge className="font-bold px-2 py-1 text-sm rounded" style={{ border: "2px solid #9CCBA3", backgroundColor: "#D9F1D5", color: "#1B7939" }}>
                    Active✓
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {/* Pagination Controls 
        <div className="pagination-controls flex justify-end items-center gap-4 py-2">
          {/* Previous Button 
          <Button className="px-3 py-1" style={{ border: " 2px solid #007AFF", backgroundColor: "#3D93FE", color: "#FFFFFF" }}
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            {"<"}
          </Button>

          {/* Page Numbers 
          <span>
            Page {currentPage} of {Math.ceil(filteredClusters.length / itemsPerPage)}
          </span>

          {/* Next Button *
          <Button className="px-3 py-1" style={{ border: " 2px solid #007AFF", backgroundColor: "#3D93FE", color: "#FFFFFF" }}
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === Math.ceil(filteredClusters.length / itemsPerPage)}
          >
            {">"}
          </Button>
        </div>
      </div>
    </div>
     */
    
  );
};
export default ITS;