import React, { useState, useEffect, useCallback } from "react";
import {
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
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { Plus, CloudOff, Filter } from "lucide-react";
import CreateOptions from "./ImportClusters"; // Dialog for cluster import (if needed)
import useTheme from "../stores/themeStore";

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
  const theme = useTheme((state) => state.theme);
  const isDark = theme === "dark";

  useEffect(() => {
    setFilteredClusters(clusters);
  }, [clusters]);

  const filterClusters = useCallback(() => {
    let result = [...clusters];
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
    if (filter && filter !== "All") {
      result = result.filter((cluster) => {
        const currentStatus = cluster.status || "Active✓";
        return currentStatus.toLowerCase() === filter.toLowerCase();
      });
    }
    setFilteredClusters(result);
  }, [clusters, query, filter]);

  useEffect(() => {
    filterClusters();
  }, [filterClusters, query, filter, clusters]);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(event.target.value);
  };

  const handleFilterChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    setFilter(event.target.value as string);
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
      setSelectedClusters(filteredClusters.map((cluster) => cluster.name));
    }
    setSelectAll(!selectAll);
  };

  const handleCancel = () => {
    setShowCreateOptions(false);
  };

  const colors = {
    primary: "#2f86ff",
    primaryLight: "#9ad6f9",
    primaryDark: "#1a65cc",
    secondary: "#67c073",
    white: "#ffffff",
    background: isDark ? "#0f172a" : "#ffffff",
    paper: isDark ? "#1e293b" : "#f8fafc",
    text: isDark ? "#f1f5f9" : "#1e293b",
    textSecondary: isDark ? "#94a3b8" : "#64748b",
    border: isDark ? "#334155" : "#e2e8f0",
    success: "#67c073",
    warning: "#ffb347",
    error: "#ff6b6b",
    disabled: isDark ? "#475569" : "#94a3b8",
  };

  return (
    <div className="p-4" style={{ backgroundColor: colors.background, color: colors.text }}>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2" style={{ color: colors.primary }}>
          <div>Manage Clusters</div>
          <span
            className="text-sm px-3 py-1 rounded-full"
            style={{
              backgroundColor: isDark ? "rgba(47, 134, 255, 0.2)" : "rgba(47, 134, 255, 0.1)",
              color: colors.primary,
            }}
          >
            {clusters.length}
          </span>
        </h1>
        <p className="text-lg" style={{ color: colors.textSecondary }}>
          Manage and monitor your Kubernetes clusters
        </p>
      </div>

      <div className="flex flex-wrap gap-4 items-center justify-between mb-4">
        <TextField
          label="Search Clusters"
          placeholder="Search by name, label, or context"
          value={query}
          onChange={handleSearchChange}
          variant="outlined"
          className="w-full sm:w-1/2 md:w-1/3"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon style={{ color: colors.textSecondary }} />
              </InputAdornment>
            ),
          }}
          InputLabelProps={{
            style: { color: colors.textSecondary },
          }}
          sx={{
            "& .MuiOutlinedInput-root": {
              "& input": { color: colors.text },
              "& fieldset": { borderColor: colors.border },
              "&:hover fieldset": { borderColor: colors.primaryLight },
              "&.Mui-focused fieldset": { borderColor: colors.primary },
            },
          }}
        />

        <FormControl className="w-40">
          <InputLabel style={{ color: colors.textSecondary }}>Status Filter</InputLabel>
          <Select
            value={filter}
            label="Status Filter"
            onChange={handleFilterChange}
            sx={{
              "& .MuiSelect-select": {
                color: colors.text,
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              },
              "& .MuiOutlinedInput-notchedOutline": { borderColor: colors.border },
              "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: colors.primaryLight },
              "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: colors.primary },
              "& .MuiSelect-icon": { color: colors.textSecondary },
            }}
            IconComponent={() => (
              <Filter size={18} style={{ color: colors.textSecondary, marginRight: "8px" }} />
            )}
          >
            <MenuItem value="">All Status</MenuItem>
            <MenuItem value="active✓">
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: colors.success }}></span>
                Active
              </span>
            </MenuItem>
            <MenuItem value="inactive">
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: colors.error }}></span>
                Inactive
              </span>
            </MenuItem>
            <MenuItem value="pending">
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: colors.warning }}></span>
                Pending
              </span>
            </MenuItem>
          </Select>
        </FormControl>

        <div className="flex gap-2">
          <Button
            variant="contained"
            startIcon={<Plus size={18} />}
            onClick={() => {
              setShowCreateOptions(true);
              setActiveOption("option1");
            }}
            sx={{
              bgcolor: colors.primary,
              color: colors.white,
              "&:hover": { bgcolor: colors.primaryDark },
              textTransform: "none",
              fontWeight: "600",
              padding: "8px 20px",
              borderRadius: "8px",
              boxShadow: isDark
                ? "0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -2px rgba(0, 0, 0, 0.2)"
                : "0 4px 6px -1px rgba(47, 134, 255, 0.2), 0 2px 4px -2px rgba(47, 134, 255, 0.1)",
            }}
          >
            Import Cluster
          </Button>
          {showCreateOptions && (
            <CreateOptions activeOption={activeOption} setActiveOption={setActiveOption} onCancel={handleCancel} />
          )}
        </div>
      </div>

      <TableContainer
        component={Paper}
        className="overflow-auto"
        sx={{
          backgroundColor: colors.paper,
          boxShadow: isDark
            ? "0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -2px rgba(0, 0, 0, 0.2)"
            : "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.05)",
          borderRadius: "12px",
          border: `1px solid ${colors.border}`,
        }}
      >
        <Table>
          <TableHead>
            <TableRow
              sx={{
                background: colors.primary,
                "& .MuiTableCell-head": {
                  color: colors.white,
                  fontWeight: 600,
                  padding: "16px",
                  fontSize: "0.95rem",
                },
              }}
            >
              <TableCell>
                <Checkbox
                  checked={selectAll}
                  onChange={handleSelectAll}
                  sx={{
                    color: colors.white,
                    "&.Mui-checked": { color: colors.white },
                  }}
                />
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
                <TableRow
                  key={cluster.name}
                  sx={{
                    backgroundColor: colors.paper,
                    "&:hover": {
                      backgroundColor: isDark ? "rgba(47, 134, 255, 0.08)" : "rgba(47, 134, 255, 0.04)",
                    },
                    "& .MuiTableCell-body": {
                      color: colors.text,
                      borderColor: colors.border,
                      padding: "12px 16px",
                    },
                  }}
                >
                  <TableCell>
                    <Checkbox
                      checked={selectedClusters.includes(cluster.name)}
                      onChange={() => handleCheckboxChange(cluster.name)}
                      sx={{
                        color: colors.textSecondary,
                        "&.Mui-checked": { color: colors.primary },
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{cluster.name}</div>
                  </TableCell>
                  <TableCell>
                    {cluster.labels && Object.keys(cluster.labels).length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(cluster.labels).map(([key, value]) => (
                          <span
                            key={`${key}-${value}`}
                            style={{
                              backgroundColor: isDark ? "rgba(47, 134, 255, 0.15)" : "rgba(47, 134, 255, 0.08)",
                              color: colors.primary,
                              border: `1px solid ${isDark ? "rgba(47, 134, 255, 0.4)" : "rgba(47, 134, 255, 0.3)"}`,
                            }}
                            className="px-2 py-1 rounded text-xs font-medium"
                          >
                            {key}={value}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span style={{ color: colors.textSecondary }}>No labels</span>
                    )}
                  </TableCell>
                  <TableCell>{new Date(cluster.creationTime).toLocaleString()}</TableCell>
                  <TableCell>
                    <span
                      style={{
                        backgroundColor: isDark ? "rgba(103, 192, 115, 0.2)" : "rgba(103, 192, 115, 0.1)",
                        color: isDark ? "rgb(154, 214, 249)" : "rgb(47, 134, 255)",
                        border: `1px solid ${isDark ? "rgba(103, 192, 115, 0.4)" : "rgba(103, 192, 115, 0.3)"}`,
                      }}
                      className="px-2 py-1 text-xs font-medium rounded-lg"
                    >
                      {cluster.context}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span
                      className="px-2 py-1 text-xs font-medium rounded-lg inline-flex items-center gap-1"
                      style={{
                        backgroundColor:
                          cluster.status === "Inactive"
                            ? isDark
                              ? "rgba(255, 107, 107, 0.2)"
                              : "rgba(255, 107, 107, 0.1)"
                            : cluster.status === "Pending"
                            ? isDark
                              ? "rgba(255, 179, 71, 0.2)"
                              : "rgba(255, 179, 71, 0.1)"
                            : isDark
                            ? "rgba(103, 192, 115, 0.2)"
                            : "rgba(103, 192, 115, 0.1)",
                        color:
                          cluster.status === "Inactive"
                            ? colors.error
                            : cluster.status === "Pending"
                            ? colors.warning
                            : colors.success,
                        border:
                          cluster.status === "Inactive"
                            ? `1px solid ${isDark ? "rgba(255, 107, 107, 0.4)" : "rgba(255, 107, 107, 0.3)"}`
                            : cluster.status === "Pending"
                            ? `1px solid ${isDark ? "rgba(255, 179, 71, 0.4)" : "rgba(255, 179, 71, 0.3)"}`
                            : `1px solid ${isDark ? "rgba(103, 192, 115, 0.4)" : "rgba(103, 192, 115, 0.3)"}`,
                      }}
                    >
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cluster.status === "Inactive" ? colors.error : cluster.status === "Pending" ? colors.warning : colors.success }}></span>
                      {cluster.status || "Active✓"}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="py-12">
                  <div className="flex flex-col items-center justify-center text-center p-6">
                    <CloudOff size={48} style={{ color: colors.textSecondary, marginBottom: "16px" }} />
                    <h3 style={{ color: colors.text }} className="text-lg font-semibold mb-2">
                      No Clusters Found
                    </h3>
                    <p style={{ color: colors.textSecondary }} className="mb-4 max-w-md">
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
                              color: colors.primary,
                              borderColor: colors.primary,
                              backgroundColor: isDark ? "rgba(47, 134, 255, 0.1)" : "transparent",
                              "&:hover": {
                                borderColor: colors.primaryLight,
                                backgroundColor: isDark ? "rgba(47, 134, 255, 0.2)" : "rgba(47, 134, 255, 0.1)",
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
                              color: colors.primary,
                              borderColor: colors.primary,
                              backgroundColor: isDark ? "rgba(47, 134, 255, 0.1)" : "transparent",
                              "&:hover": {
                                borderColor: colors.primaryLight,
                                backgroundColor: isDark ? "rgba(47, 134, 255, 0.2)" : "rgba(47, 134, 255, 0.1)",
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

      <div className="flex justify-between items-center mt-6 px-2">
        <Button
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
          sx={{
            color: currentPage === 1 ? colors.disabled : colors.primary,
            borderColor: currentPage === 1 ? colors.disabled : colors.primary,
            backgroundColor: isDark && currentPage !== 1 ? "rgba(47, 134, 255, 0.1)" : "transparent",
            "&:hover": {
              borderColor: colors.primaryLight,
              backgroundColor: isDark ? "rgba(47, 134, 255, 0.2)" : "rgba(47, 134, 255, 0.1)",
            },
            "&.Mui-disabled": {
              color: colors.disabled,
              borderColor: colors.disabled,
            },
            textTransform: "none",
            fontWeight: "600",
            padding: "6px 16px",
            borderRadius: "8px",
          }}
          variant="outlined"
        >
          Previous
        </Button>
        <div className="flex items-center gap-2">
          <span style={{ color: colors.textSecondary }} className="font-medium">
            Page {currentPage} of {totalPages}
          </span>
        </div>
        <Button
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          sx={{
            color: currentPage === totalPages ? colors.disabled : colors.primary,
            borderColor: currentPage === totalPages ? colors.disabled : colors.primary,
            backgroundColor: isDark && currentPage !== totalPages ? "rgba(47, 134, 255, 0.1)" : "transparent",
            "&:hover": {
              borderColor: colors.primaryLight,
              backgroundColor: isDark ? "rgba(47, 134, 255, 0.2)" : "rgba(47, 134, 255, 0.1)",
            },
            "&.Mui-disabled": {
              color: colors.disabled,
              borderColor: colors.disabled,
            },
            textTransform: "none",
            fontWeight: "600",
            padding: "6px 16px",
            borderRadius: "8px",
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
