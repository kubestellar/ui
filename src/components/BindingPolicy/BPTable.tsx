import React, { useState, useEffect } from "react";
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Button,
  Chip,
  IconButton,
  Box,
  Tooltip,
  Checkbox,
  Typography,
  TableContainer,
  Paper,
} from "@mui/material";
import {  Trash2,  CloudOff } from "lucide-react";
import { BindingPolicyInfo } from "../../types/bindingPolicy";
import PolicyDetailDialog from "./Dialogs/PolicyDetailDialog";
import useTheme from "../../stores/themeStore";
import { useBPQueries } from "../../hooks/queries/useBPQueries";
import { api } from "../../lib/api";

interface BPTableProps {
  policies: BindingPolicyInfo[];
  onDeletePolicy: (policy: BindingPolicyInfo) => void;
  onEditPolicy: (policy: BindingPolicyInfo) => void;
  activeFilters: { status?: "Active" | "Inactive" | "Pending" };
  selectedPolicies: string[];
  onSelectionChange: (selected: string[]) => void;
}

const BPTable: React.FC<BPTableProps> = ({
  policies,
  onDeletePolicy,
  onEditPolicy,
  activeFilters,
  selectedPolicies,
  onSelectionChange,
}): JSX.Element => {
  // Add debug log to see the policies structure
  console.log('BPTable - Received Policies:', policies);
  
  const [selectedPolicyName, setSelectedPolicyName] = useState<string | null>(null);
  const { useBindingPolicyDetails } = useBPQueries();
  const theme = useTheme((state) => state.theme);
  const isDark = theme === "dark";
  
  // Map to store policy statuses from API
  const [policyStatuses, setPolicyStatuses] = useState<Record<string, string>>({});
  
  // Add colors object similar to ClustersTable
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
  
  // Fetch detailed policy information when a policy is selected
  const { 
    data: selectedPolicyDetails, 
    isLoading: isLoadingDetails,
    error: detailsError
  } = useBindingPolicyDetails(selectedPolicyName || undefined);

  // Fetch status for each policy
  useEffect(() => {
    // Create a map to store statuses
    const newPolicyStatuses: Record<string, string> = {};
    
    // Only fetch statuses if we have valid policies
    if (!policies || policies.length === 0) {
      return; // Exit early if no policies exist
    }
    
    // Fetch status for each policy using the API directly
    const fetchStatuses = async () => {
      // First, get the current list of valid policies from the backend
      try {
        const validPoliciesResponse = await api.get('/api/bp');
        let validPolicies: string[] = [];
        
        // Extract policy names from the response
        if (validPoliciesResponse.data && validPoliciesResponse.data.bindingPolicies) {
          validPolicies = validPoliciesResponse.data.bindingPolicies
            .map((p: { name?: string; metadata?: { name?: string } }) => p.name || p.metadata?.name)
            .filter((name: string | undefined): name is string => name !== undefined);
        } else if (Array.isArray(validPoliciesResponse.data)) {
          validPolicies = validPoliciesResponse.data
            .map((p: { name?: string; metadata?: { name?: string } }) => p.name || p.metadata?.name)
            .filter((name: string | undefined): name is string => name !== undefined);
        }
        
        // Filter out any policies that don't exist in the backend
        const existingPolicies = policies.filter(policy => 
          policy && policy.name && validPolicies.includes(policy.name)
        );
        
        // Now only fetch status for policies that actually exist
        for (const policy of existingPolicies) {
          try {
            // Skip if policy is invalid or missing name
            if (!policy || !policy.name) {
              continue;
            }
            
            const response = await api.get(`/api/bp/status?name=${encodeURIComponent(policy.name)}`);
            if (response.data?.status) {
              // Capitalize the first letter of the status
              const status = response.data.status.charAt(0).toUpperCase() + 
                             response.data.status.slice(1).toLowerCase();
              newPolicyStatuses[policy.name] = status;
            }
          } catch (error) {
            console.error(`Error fetching status for policy ${policy.name}:`, error);
          }
        }
        
      } catch (error) {
        console.error("Error fetching valid policies:", error);
      }
      
      // Update state with all fetched statuses
      setPolicyStatuses(newPolicyStatuses);
    };
    
    fetchStatuses();
  }, [policies]);

  // Add debugging for policy details
  useEffect(() => {
    if (selectedPolicyDetails) {
      console.log('Selected policy details:', selectedPolicyDetails);
      console.log('YAML property present:', !!selectedPolicyDetails.yaml);
    }
  }, [selectedPolicyDetails]);

  const handlePolicyClick = (policy: BindingPolicyInfo) => {
    if (!policy || !policy.name) {
      console.warn('Attempted to view details for invalid policy');
      return;
    }
    
    console.log('Requesting details for policy:', policy.name);
    console.log('Policy namespace:', policy.namespace);
    console.log('Policy YAML availability:', policy.yaml ? 'Available' : 'Not available');
    
    // Store both name and namespace for API request
    localStorage.setItem('selectedPolicyNamespace', policy.namespace || 'default');
    
    // If the policy already has YAML content, we can log it for debugging
    if (policy.yaml) {
      console.log('Policy has YAML content of length:', policy.yaml.length);
      console.log('YAML content starts with:', policy.yaml.substring(0, 50));
    }
    
    setSelectedPolicyName(policy.name);
  };

  const handleCloseDialog = () => {
    setSelectedPolicyName(null);
    localStorage.removeItem('selectedPolicyNamespace');
  };

  const handleEdit = (policy: BindingPolicyInfo) => {
    setSelectedPolicyName(null);
    onEditPolicy(policy);
  };

  const handleCheckboxChange = (policyName: string) => {
    const newSelected = selectedPolicies.includes(policyName)
      ? selectedPolicies.filter(name => name !== policyName)
      : [...selectedPolicies, policyName];
    onSelectionChange(newSelected);
  };

  const filteredPolicies = policies.filter((policy) => {
    if (!policy) return false;
    
    // Get the API-provided status if available, otherwise use the policy's default status
    const currentStatus = policyStatuses[policy.name] || policy.status;
    
    if (activeFilters.status && currentStatus !== activeFilters.status) {
      return false;
    }
    return true;
  });


  const renderClusterChip = (policy: BindingPolicyInfo) => {
  
    const clusterCount = 
      typeof policy.clusters === 'number' ? policy.clusters : 
      policy.clusterList?.length ?? 0;

    // Return a greyed-out chip with "0" for policies with no clusters
    if (clusterCount === 0 || !policy.clusterList || policy.clusterList.length === 0) {
      return (
        <Tooltip title="No target clusters defined">
          <Chip 
            label="0" 
            size="small" 
            color="default"
            sx={{ 
              color: theme === "dark" ? "white" : "inherit",
              "& .MuiChip-label": {
                color: theme === "dark" ? "white" : "inherit"
              }
            }} 
          />
        </Tooltip>
      );
    }

    // If we have clusters, display the count
    return (
      <Tooltip 
        title={
          <React.Fragment>
            <Typography variant="subtitle2">Target Clusters:</Typography>
            {policy.clusterList.length > 0 ? (
              policy.clusterList.map((cluster, index) => (
                <Typography key={index} variant="body2" component="div">
                  {index + 1}. {cluster}
                </Typography>
              ))
            ) : (
              <Typography variant="body2">
                {clusterCount} cluster{clusterCount !== 1 ? 's' : ''} (details not available)
              </Typography>
            )}
          </React.Fragment>
        } 
        arrow
      >
        <Chip 
          label={clusterCount.toString()}
          size="small" 
          color="success"
          sx={{
            "& .MuiChip-label": {
              color: theme === "dark" ? "white" : "inherit"
            }
          }}
        />
      </Tooltip>
    );
  };

  const renderWorkloadChip = (policy: BindingPolicyInfo) => {
    // Determine the workload count - similar logic to cluster count
    const workloadCount = 
      typeof policy.workload === 'number' ? policy.workload : 
      policy.workloadList?.length ?? 0;

    // Return a different styled chip for policies with no workloads
    if (workloadCount === 0 || !policy.workloadList || policy.workloadList.length === 0) {
      return (
        <Tooltip title="No workloads defined">
          <Chip 
            label="None" 
            size="small" 
            color="secondary"
            sx={{ 
              "& .MuiChip-label": {
                color: theme === "dark" ? "white" : "inherit"
              }
            }}
          />
        </Tooltip>
      );
    }

    // Create a formatted display text for workloads
    let displayText = "";
    if (policy.workloadList.length === 1) {
      // If there's just one workload, show it
      displayText = formatWorkloadName(policy.workloadList[0]);
    } else {
      // If there are multiple workloads, show the first one plus a count
      displayText = `${formatWorkloadName(policy.workloadList[0])} +${policy.workloadList.length - 1}`;
    }

    return (
      <Tooltip 
        title={
          <React.Fragment>
            <Typography variant="subtitle2">Workloads:</Typography>
            {policy.workloadList.map((workload, index) => (
              <Typography key={index} variant="body2" component="div">
                {index + 1}. {workload}
              </Typography>
            ))}
          </React.Fragment>
        } 
        arrow
      >
        <Chip 
          label={displayText}
          size="small" 
          color="success"
          sx={{
            "& .MuiChip-label": {
              color: theme === "dark" ? "white" : "inherit"
            }
          }}
        />
      </Tooltip>
    );
  };

  // Helper function to format workload names for display
  const formatWorkloadName = (workload: string): string => {
    // If it's a full resource path with namespace, extract just the main part
    if (workload.includes(' (ns:')) {
      const parts = workload.split(' (ns:');
      return parts[0];
    }
    
    // If it's a "Specific:" workload, extract just the kind and name
    if (workload.startsWith('Specific:')) {
      const parts = workload.split(':');
      if (parts.length >= 3) {
        // Return just the kind and name, skipping the API version
        return parts[2].trim();
      }
    }
    
    return workload;
  };

  return (
    <>
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
          mt: 3,
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
              <TableCell padding="checkbox">
                <Checkbox
                  indeterminate={
                    selectedPolicies.length > 0 &&
                    selectedPolicies.length < policies.length
                  }
                  checked={
                    policies.length > 0 &&
                    selectedPolicies.length === policies.length
                  }
                  onChange={(e) => {
                    if (e.target.checked) {
                      onSelectionChange(policies.map((policy) => policy.name));
                    } else {
                      onSelectionChange([]);
                    }
                  }}
                  sx={{
                    color: colors.white,
                    '&.Mui-checked': {
                      color: colors.white,
                    },
                  }}
                />
              </TableCell>
              <TableCell>Binding Policy Name</TableCell>
              <TableCell>Clusters</TableCell>
              <TableCell>Workload</TableCell>
              <TableCell>Creation Date</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredPolicies.length > 0 ? (
              filteredPolicies.map((policy) => (
                <TableRow 
                  key={policy.name}
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
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selectedPolicies.includes(policy.name)}
                      onChange={() => handleCheckboxChange(policy.name)}
                      sx={{
                        color: colors.textSecondary,
                        '&.Mui-checked': {
                          color: colors.primary,
                        },
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      sx={{ 
                        textTransform: "none",
                        color: colors.primary,
                        fontWeight: "500",
                      }}
                      onClick={() => handlePolicyClick(policy)}
                    >
                      {policy.name}
                    </Button>
                  </TableCell>
                  <TableCell>{renderClusterChip(policy)}</TableCell>
                  <TableCell>{renderWorkloadChip(policy)}</TableCell>
                  <TableCell>{policy.creationDate}</TableCell>
                  <TableCell>
                    {/* Use the API status if available, otherwise use the policy's original status */}
                    <span
                      className="px-2 py-1 text-xs font-medium rounded-lg inline-flex items-center gap-1"
                      style={{
                        backgroundColor:
                          (policyStatuses[policy.name] || policy.status).toLowerCase() === "inactive"
                            ? isDark
                              ? "rgba(255, 107, 107, 0.2)"
                              : "rgba(255, 107, 107, 0.1)"
                            : (policyStatuses[policy.name] || policy.status).toLowerCase() === "pending"
                            ? isDark
                              ? "rgba(255, 179, 71, 0.2)"
                              : "rgba(255, 179, 71, 0.1)"
                            : isDark
                            ? "rgba(103, 192, 115, 0.2)"
                            : "rgba(103, 192, 115, 0.1)",
                        color:
                          (policyStatuses[policy.name] || policy.status).toLowerCase() === "inactive"
                            ? colors.error
                            : (policyStatuses[policy.name] || policy.status).toLowerCase() === "pending"
                            ? colors.warning
                            : colors.success,
                        border:
                          (policyStatuses[policy.name] || policy.status).toLowerCase() === "inactive"
                            ? `1px solid ${isDark ? "rgba(255, 107, 107, 0.4)" : "rgba(255, 107, 107, 0.3)"}`
                            : (policyStatuses[policy.name] || policy.status).toLowerCase() === "pending"
                            ? `1px solid ${isDark ? "rgba(255, 179, 71, 0.4)" : "rgba(255, 179, 71, 0.3)"}`
                            : `1px solid ${isDark ? "rgba(103, 192, 115, 0.4)" : "rgba(103, 192, 115, 0.3)"}`,
                      }}
                    >
                      <span className="w-2 h-2 rounded-full" style={{ 
                        backgroundColor: (policyStatuses[policy.name] || policy.status).toLowerCase() === "inactive" 
                          ? colors.error 
                          : (policyStatuses[policy.name] || policy.status).toLowerCase() === "pending" 
                            ? colors.warning 
                            : colors.success 
                      }}></span>
                      {policyStatuses[policy.name] || policy.status}
                    </span>
                  </TableCell>
                  <TableCell align="right">
                    <Box
                      sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}
                    >
                      <IconButton
                        size="small"
                        sx={{
                          color: colors.error,
                          opacity: 0.7,
                       "&:hover": { opacity: 1 },
                          border: 'none',
                          outline: 'none',
                          backgroundColor: 'transparent',
                          transition: 'opacity 0.2s ease',
                          WebkitAppearance: 'none'
                        }}
                        onClick={() => onDeletePolicy(policy)}
                      >
                        <Trash2 size={18} />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="py-12">
                  <div className="flex flex-col items-center justify-center text-center p-6">
                    <CloudOff size={48} style={{ color: colors.textSecondary, marginBottom: "16px" }} />
                    <h3 style={{ color: colors.text }} className="text-lg font-semibold mb-2">
                      No Binding Policies Found
                    </h3>
                    <p style={{ color: colors.textSecondary }} className="mb-4 max-w-md">
                      {activeFilters.status !== undefined
                        ? `No binding policies match your ${activeFilters.status} filter criteria`
                        : "No binding policies available"}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {selectedPolicyName && (
        <PolicyDetailDialog
          open={!!selectedPolicyName}
          onClose={handleCloseDialog}
          policy={selectedPolicyDetails || {
            name: selectedPolicyName,
            status: 'Loading...',
            clusters: 0,
            clusterList: [],
            workloadList: [],
            workload: 'Loading...',
            namespace: 'default',
            bindingMode: 'Unknown',
            creationDate: ''
          } as BindingPolicyInfo}
          onEdit={handleEdit}
          isLoading={isLoadingDetails}
          error={detailsError?.message}
        />
      )}
    </>
  );
};

export default BPTable;