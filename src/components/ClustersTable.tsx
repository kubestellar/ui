import { useState, useEffect, useCallback } from "react";
import {
  Badge,
  Button,
  Checkbox,
  FormControl,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Table,
  TableContainer,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TextField,
  Paper,
  SelectChangeEvent,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import useTheme from "../hooks/useTheme";
import {Plus} from "lucide-react";
import CreateOptions from "./ImportClusters";

interface ManagedClusterInfo {
  name: string;
  labels: { [key: string]: string };
  creationTime: string;
  status?: string;
  context: string;
}

interface ClustersTableProps {
  clusters: ManagedClusterInfo[];
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const ClustersTable: React.FC<ClustersTableProps> = ({
  clusters,
  currentPage,
  totalPages,
  onPageChange,
}) => {
  const [query, setQuery] = useState("");
  const [filteredClusters, setFilteredClusters] = useState<ManagedClusterInfo[]>(clusters);
  const [filter, setFilter] = useState<string>("");
  const [selectAll, setSelectAll] = useState(false);
  const [selectedClusters, setSelectedClusters] = useState<string[]>([]);
  const [showCreateOptions, setShowCreateOptions] = useState(false);
  const [activeOption, setActiveOption] = useState<string | null>("option1");
  const { theme } = useTheme();

  useEffect(() => {
    setFilteredClusters(clusters);
  }, [clusters]);

  // Combined search and filter function
  const filterClusters = useCallback(() => {
    let result = [...clusters];

    // Apply search query
    if (query.trim()) {
      result = result.filter((cluster) => {
        const searchLower = query.toLowerCase().trim();
        const nameMatch = cluster.name.toLowerCase().includes(searchLower);
        const labelMatch = Object.entries(cluster.labels || {}).some(
          ([key, value]) =>
            key.toLowerCase().includes(searchLower) ||
            value.toLowerCase().includes(searchLower)
        );
        const contextMatch = cluster.context.toLowerCase().includes(searchLower);
        return nameMatch || labelMatch || contextMatch;
      });
    }

    // Apply status filter
    if (filter) {
      result = result.filter((cluster) => {
        const currentStatus = cluster.status || 'Active✓';
        return currentStatus.toLowerCase() === filter.toLowerCase();
      });
    }

    setFilteredClusters(result);
  }, [clusters, query, filter]);

  // Apply filtering whenever search query, filter, or clusters change
  useEffect(() => {
    filterClusters();
  }, [filterClusters, query, filter, clusters]);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(event.target.value);
  };

  const handleFilterChange = (event: SelectChangeEvent<string>) => {
    setFilter(event.target.value);
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

  const handleCancel = () => {
    setShowCreateOptions(false);
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
                <SearchIcon className={theme === "dark" ? "text-white" : ""} />
              </InputAdornment>
            ),
          }}
          InputLabelProps={{
            style: {
              color: theme === "dark" ? "white" : "inherit",
            },
          }}
          sx={{
            "& .MuiOutlinedInput-root": {
              "& input": {
                color: theme === "dark" ? "white" : "inherit",
              },
              "& fieldset": {
                borderColor: theme === "dark" ? "white" : "inherit",
              },
            },
          }}
        />

        <FormControl className="w-32">
          <InputLabel
            style={{
              color: theme === "dark" ? "white" : "inherit",
            }}
          >
            Filter
          </InputLabel>
          <Select
            value={filter}
            label="Filter"
            onChange={handleFilterChange}
            sx={{
              "& .MuiSelect-select": {
                color: theme === "dark" ? "white" : "inherit",
              },
              "& .MuiOutlinedInput-notchedOutline": {
                borderColor: theme === "dark" ? "white" : "inherit",
              },
              "& .MuiSelect-icon": {
                color: theme === "dark" ? "white" : "inherit",
              },
            }}
            MenuProps={{
              PaperProps: {
                sx: {
                  bgcolor: theme === "dark" ? "rgb(30 41 59)" : "white", // bg-slate-800
                },
              },
            }}
          >
            <MenuItem className={theme === "dark" ? "!bg-slate-800 !text-white hover:!bg-slate-900" : ""} value="">All</MenuItem>
            <MenuItem className={theme === "dark" ? "!bg-slate-800 !text-white hover:!bg-slate-900" : ""} value="Active✓">Active</MenuItem>
            <MenuItem className={theme === "dark" ? "!bg-slate-800 !text-white hover:!bg-slate-900" : ""} value="Inactive">Inactive</MenuItem>
            <MenuItem className={theme === "dark" ? "!bg-slate-800 !text-white hover:!bg-slate-900" : ""} value="Pending">Pending</MenuItem>
          </Select>
        </FormControl>


        <div className="flex gap-2">
          <Button
            variant="outlined"
            startIcon={<Plus size={20} />}
            onClick={() => {
              setShowCreateOptions(true);
              setActiveOption("option1");
            }}
            sx={{
              borderColor: theme === "dark" ? "#60A5FA" : "#2563EB", // blue-400 in dark, blue-600 in light
              color: theme === "dark" ? "#60A5FA" : "#2563EB",
              backgroundColor: theme === "dark" ? "rgba(96, 165, 250, 0.1)" : "transparent",
              "&:hover": {
                borderColor: theme === "dark" ? "#93C5FD" : "#1D4ED8", // blue-300 in dark, blue-700 in light
                backgroundColor: theme === "dark" ? "rgba(96, 165, 250, 0.2)" : "rgba(37, 99, 235, 0.1)",
              },
              textTransform: "none",
              fontWeight: "600",
              padding: "8px 16px",
              borderRadius: "8px",
            }}
          >
            Import Cluster
          </Button>
          {showCreateOptions && (
            <CreateOptions
              activeOption={activeOption}
              setActiveOption={setActiveOption}
              onCancel={handleCancel}
            />
          )}
        </div>
      </div>

      {/* Table */}
      <TableContainer component={Paper} className="overflow-auto">
        <Table>
          <TableHead>
            <TableRow className={theme === "dark" ? "bg-blue-800 !text-white" : "bg-blue-500" }>
              <TableCell>
                <Checkbox checked={selectAll} onChange={handleSelectAll} />
              </TableCell>
              <TableCell className="!text-lg !text-inherit">Name</TableCell>
              <TableCell className="!text-lg !text-inherit">Labels</TableCell>
              <TableCell className="!text-lg !text-inherit">Creation Time</TableCell>
              <TableCell className="!text-lg !text-inherit">Context</TableCell>
              <TableCell className="!text-lg !text-inherit">Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredClusters.length > 0 ? (
              filteredClusters.map((cluster) => (
                <TableRow key={cluster.name} className={`${theme === "dark" ? "bg-gray-800 !text-white" : "!text-black"}`}>
                  <TableCell>
                    <Checkbox
                      checked={selectedClusters.includes(cluster.name)}
                      onChange={() => handleCheckboxChange(cluster.name)}
                    />
                  </TableCell>
                  <TableCell className="!text-inherit">{cluster.name}</TableCell>
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
                  <TableCell className="!text-inherit">
                    {new Date(cluster.creationTime).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Badge className="px-2 py-1 text-sm rounded-lg bg-green-200 border border-green-500">
                      {cluster.context}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      className={`font-bold px-2 py-1 text-sm rounded border ${
                        cluster.status === 'Inactive' 
                          ? 'bg-red-200 border-red-500'
                          : cluster.status === 'Pending'
                          ? 'bg-yellow-200 border-yellow-500'
                          : 'bg-green-200 border-green-500'
                      }`}
                    >
                      {cluster.status || 'Active✓'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow className={theme === "dark" ? "!bg-slate-800" : "bg-gray-50"}>
                <TableCell colSpan={6} className="py-8">
                  <div className="flex flex-col items-center justify-center text-center p-6">
                    <svg
                      className={`w-16 h-16 mb-4 ${theme === "dark" ? "text-slate-600" : "text-gray-400"}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <h3 className={`text-lg font-semibold mb-2 ${theme === "dark" ? "text-slate-200" : "text-gray-700"}`}>
                      No Clusters Found
                    </h3>
                    <p className={`${theme === "dark" ? "text-slate-400" : "text-gray-500"} mb-4`}>
                      {query && filter
                        ? "No clusters match both your search and filter criteria"
                        : query
                        ? "No clusters match your search term"
                        : filter
                        ? "No clusters match your filter selection"
                        : "No clusters available"}
                    </p>
                    {(query || filter) && (
                      <div className="flex gap-2">
                        {query && (
                          <Button
                            onClick={() => setQuery("")}
                            size="small"
                            sx={{
                              color: theme === "dark" ? "#60A5FA" : "#2563EB",
                              borderColor: theme === "dark" ? "#60A5FA" : "#2563EB",
                              backgroundColor: theme === "dark" ? "rgba(96, 165, 250, 0.1)" : "transparent",
                              "&:hover": {
                                borderColor: theme === "dark" ? "#93C5FD" : "#1D4ED8",
                                backgroundColor: theme === "dark" ? "rgba(96, 165, 250, 0.2)" : "rgba(37, 99, 235, 0.1)",
                              },
                              textTransform: "none",
                              fontWeight: "600",
                            }}
                            variant="outlined"
                          >
                            Clear Search
                          </Button>
                        )}
                        {filter && (
                          <Button
                            onClick={() => setFilter("")}
                            size="small"
                            sx={{
                              color: theme === "dark" ? "#60A5FA" : "#2563EB",
                              borderColor: theme === "dark" ? "#60A5FA" : "#2563EB",
                              backgroundColor: theme === "dark" ? "rgba(96, 165, 250, 0.1)" : "transparent",
                              "&:hover": {
                                borderColor: theme === "dark" ? "#93C5FD" : "#1D4ED8",
                                backgroundColor: theme === "dark" ? "rgba(96, 165, 250, 0.2)" : "rgba(37, 99, 235, 0.1)",
                              },
                              textTransform: "none",
                              fontWeight: "600",
                            }}
                            variant="outlined"
                          >
                            Clear Filter
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination Controls */}
      <div className="flex justify-between items-center mt-4 px-2">
        <Button
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
          sx={{
            color: theme === "dark" ? "#60A5FA" : "#2563EB",
            borderColor: theme === "dark" ? "#60A5FA" : "#2563EB",
            backgroundColor: theme === "dark" ? "rgba(96, 165, 250, 0.1)" : "transparent",
            "&:hover": {
              borderColor: theme === "dark" ? "#93C5FD" : "#1D4ED8",
              backgroundColor: theme === "dark" ? "rgba(96, 165, 250, 0.2)" : "rgba(37, 99, 235, 0.1)",
            },
            "&.Mui-disabled": {
              color: theme === "dark" ? "#475569" : "#94A3B8", // slate-600 in dark, slate-400 in light
              borderColor: theme === "dark" ? "#475569" : "#94A3B8",
            },
            textTransform: "none",
            fontWeight: "600",
            padding: "6px 16px",
            borderRadius: "6px",
          }}
          variant="outlined"
        >
          Previous
        </Button>
        <span className={`${
          theme === "dark" ? "text-gray-300" : "text-gray-700"
        } font-medium`}>
          Page {currentPage} of {totalPages}
        </span>
        <Button
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          sx={{
            color: theme === "dark" ? "#60A5FA" : "#2563EB",
            borderColor: theme === "dark" ? "#60A5FA" : "#2563EB",
            backgroundColor: theme === "dark" ? "rgba(96, 165, 250, 0.1)" : "transparent",
            "&:hover": {
              borderColor: theme === "dark" ? "#93C5FD" : "#1D4ED8",
              backgroundColor: theme === "dark" ? "rgba(96, 165, 250, 0.2)" : "rgba(37, 99, 235, 0.1)",
            },
            "&.Mui-disabled": {
              color: theme === "dark" ? "#475569" : "#94A3B8",
              borderColor: theme === "dark" ? "#475569" : "#94A3B8",
            },
            textTransform: "none",
            fontWeight: "600",
            padding: "6px 16px",
            borderRadius: "6px",
          }}
          variant="outlined"
        >
          Next
        </Button>
      </div>
    </div>
  );
};

export default ClustersTable;
