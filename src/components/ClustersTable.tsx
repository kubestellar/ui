import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Badge, Button, Checkbox, FormControl, InputAdornment, InputLabel, MenuItem, Select, Table, TableContainer, TableHead, TableBody, TableRow, TableCell, TextField, Paper, SelectChangeEvent } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";

interface ManagedClusterInfo {
  name: string;
  labels: { [key: string]: string };
  creationTime: string;
  status: string;
  context: string;
}

interface ClustersTableProps {
  clusters: ManagedClusterInfo[];
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const ClustersTable: React.FC<ClustersTableProps> = ({ clusters, currentPage, totalPages, onPageChange }) => {
    const [query, setQuery] = useState('');
    const [filteredClusters, setFilteredClusters] = useState<ManagedClusterInfo[]>(clusters);
    const [filter, setFilter] = useState<string>('');
  const [selectAll, setSelectAll] = useState(false);
  const [selectedClusters, setSelectedClusters] = useState<string[]>([]);

  useEffect(() => {
    setFilteredClusters(clusters);
  }, [clusters]);

  // Combined search and filter function
  const filterClusters = useCallback(() => {
    let result = [...clusters];

    // Apply search query
    if (query) {
      result = result.filter(
        (cluster) =>
          cluster.name.toLowerCase().includes(query.toLowerCase()) ||
          Object.entries(cluster.labels || {}).some(
            ([key, value]) =>
              key.toLowerCase().includes(query.toLowerCase()) ||
              value.toLowerCase().includes(query.toLowerCase())
          )
      );
    }

    // Apply status filter
    if (filter) {
      result = result.filter((cluster) => {
        switch (filter.toLowerCase()) {
          case "active":
            return cluster.status === "Active";
          case "inactive":
            return cluster.status === "Inactive";
          case "pending":
            return cluster.status === "Pending";
          default:
            return true;
        }
      });
    }

    setFilteredClusters(result);
  }, [clusters, query, filter]);

  // Apply filtering whenever search query or filter changes
  useEffect(() => {
    filterClusters();
  }, [filterClusters]);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(event.target.value);
  };

  const handleFilterChange = (event: SelectChangeEvent<string>) => {
    setFilter(event.target.value as string);
  };

  const navigate = useNavigate();

  const navigateToCreateCluster = () => {
    navigate("/createcluster"); // Navigate to the page
  };

  const handleCheckboxChange = (clusterName: string) => {
    setSelectedClusters((prev) =>
      prev.includes(clusterName)
        ? prev.filter((name) => name !== clusterName)
        : [...prev, clusterName]
    );
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedClusters([]);
    } else {
      setSelectedClusters(clusters.map((cluster) => cluster.name));
    }
    setSelectAll(!selectAll);
  };

  return (
    <div className="p-4">
      {/* Search, Filter, and Buttons */}
      <div className="flex flex-wrap gap-4 items-center justify-between mb-4">
        <TextField
          label="Search"
          value={query}
          onChange={handleSearchChange}
          variant="outlined"
          className="w-full sm:w-1/2 md:w-1/3"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />

        <FormControl className="w-32">
          <InputLabel>Filter</InputLabel>
          <Select value={filter} label="Filter" onChange={handleFilterChange}>
            <MenuItem value="">All</MenuItem>
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="inactive">Inactive</MenuItem>
            <MenuItem value="pending">Pending</MenuItem>
          </Select>
        </FormControl>

        <div className="flex gap-2">
          <Button variant="contained" onClick={navigateToCreateCluster}>
            Create Cluster
          </Button>
          <Button variant="outlined">Import Cluster</Button>
        </div>
      </div>

      {/* Table */}
      <TableContainer component={Paper} className="overflow-auto">
        <Table>
          <TableHead>
            <TableRow className="bg-blue-500 text-white">
              <TableCell>
                <Checkbox checked={selectAll} onChange={handleSelectAll} />
              </TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Labels</TableCell>
              <TableCell>Creation Time</TableCell>
              <TableCell>Context</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredClusters.length > 0 ? (
              filteredClusters.map((cluster) => (
                <TableRow key={cluster.name}>
                  <TableCell>
                    <Checkbox
                      checked={selectedClusters.includes(cluster.name)}
                      onChange={() => handleCheckboxChange(cluster.name)}
                    />
                  </TableCell>
                  <TableCell>{cluster.name}</TableCell>
                  <TableCell>
                    {cluster.labels &&
                    Object.keys(cluster.labels).length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(cluster.labels).map(([key, value]) => (
                          <span
                            key={`${key}-${value}`}
                            className="bg-blue-200 text-blue-800 px-2 py-1 rounded text-sm"
                          >
                            {key}={value}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p>No labels</p>
                    )}
                  </TableCell>
                  <TableCell>
                    {new Date(cluster.creationTime).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Badge className="px-2 py-1 text-sm rounded-lg bg-green-200 border border-green-500">
                      {cluster.context}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className="font-bold px-2 py-1 text-sm rounded bg-green-200 border border-green-500">
                      Active✓
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  No clusters found matching your criteria
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination Controls */}
      <div className="flex justify-between items-center mt-4">
                <Button disabled={currentPage === 1} onClick={() => onPageChange(currentPage - 1)}>
          Previous
        </Button>
                <span>Page {currentPage} of {totalPages}</span>
                <Button disabled={currentPage === totalPages} onClick={() => onPageChange(currentPage + 1)}>
          Next
        </Button>
      </div>
    </div>
  );
};

export default ClustersTable;
