import { useEffect, useState, useCallback } from "react";
import { Paper, Box, Snackbar, Alert, Typography, Button } from "@mui/material";
import BPHeader from "../components/BindingPolicy/Dialogs/BPHeader";
import BPTable from "../components/BindingPolicy/BPTable";
import BPPagination from "../components/BindingPolicy/BPPagination";
import PreviewDialog from "../components/BindingPolicy/PreviewDialog";
import DeleteDialog from "../components/BindingPolicy/Dialogs/DeleteDialog";
import EditBindingPolicyDialog from "../components/BindingPolicy/Dialogs/EditBindingPolicyDialog";
import {
  BindingPolicyInfo,
  ManagedCluster,
  Workload,
} from "../types/bindingPolicy";
import useTheme from "../stores/themeStore";
import { api } from "../lib/api";

// Define type for the raw binding policy from API
interface RawBindingPolicy {
  metadata: {
    name: string;
    creationTimestamp?: string;
    managedFields?: Array<{
      time?: string;
    }>;
    annotations?: {
      yaml?: string;
    };
  };
  spec: {
    clusterSelectors?: Array<unknown>;
    downsync?: Array<{
      apiGroup?: string;
    }>;
  };
}

const BP = () => {
  const [bindingPolicies, setBindingPolicies] = useState<BindingPolicyInfo[]>(
    []
  );
  const theme = useTheme((state) => state.theme)
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedLabels] = useState<Record<string, string>>({});
  const [availableClusters, setAvailableClusters] = useState<ManagedCluster[]>(
    []
  );
  const [availableWorkloads, setAvailableWorkloads] = useState<Workload[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [selectedPolicy, setSelectedPolicy] =
    useState<BindingPolicyInfo | null>(null);

  const [activeFilters, setActiveFilters] = useState<{
    status?: "Active" | "Inactive" | "Pending";
  }>({});

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [successMessage, setSuccessMessage] = useState<string>("");

  // Extract the fetch binding policies 
 // Updated fetchBindingPolicies function to handle 500 errors gracefully
const fetchBindingPolicies = useCallback(async () => {
  try {
    setLoading(true);
    const response = await api.get("/api/bp");
    const data = response.data;

    if (data.error) {
      throw new Error(data.error);
    }

    // If there are no binding policies, return an empty array
    if (!data.bindingPolicies || data.bindingPolicies.length === 0) {
      setBindingPolicies([]);
      return;
    }

    // Fetch status for each binding policy
    const policiesWithStatus = await Promise.all(
      data.bindingPolicies.map(async (policy: RawBindingPolicy) => {
        try {
          const statusResponse = await api.get(
            `/api/bp/status?name=${policy.metadata.name}`
          );

          // Use the data directly from the status response
          const statusData = statusResponse.data;

          return {
            name: policy.metadata.name,
            // Use clusters from the status API
            clusters: statusData.clusters?.length || 0,
            // Use the actual clusters from the API
            clusterList: statusData.clusters || [],
            // Use actual workloads from the API
            workloadList: statusData.workloads || [],
            // Create a workload display string
            workload:
              statusData.workloads?.length > 0
                ? statusData.workloads[0]
                : "No workload specified",
            creationDate: policy.metadata.creationTimestamp
              ? new Date(policy.metadata.creationTimestamp).toLocaleString()
              : "Unknown",
            lastModifiedDate: policy.metadata.managedFields?.[0]?.time
              ? new Date(
                  policy.metadata.managedFields[0].time
                ).toLocaleString()
              : undefined,
            // Map status from API to component status with proper capitalization
            status:
              statusData.status === "active"
                ? "Active"
                : statusData.status === "pending"
                ? "Pending"
                : "Inactive",
            // Store the binding mode from the API
            bindingMode: statusData.bindingMode || "N/A",
            // Store the namespace from the API
            namespace: statusData.namespace || "default",
            // Store any conditions returned by the API
            conditions: statusData.conditions || null,
            yaml:
              policy.metadata.annotations?.yaml ||
              JSON.stringify(policy, null, 2),
          };
        } catch (error) {
          console.error(
            `Error fetching status for ${policy.metadata.name}:`,
            error
          );
          return {
            name: policy.metadata.name,
            clusters: policy.spec.clusterSelectors?.length || 0,
            clusterList: [],
            workloadList: [],
            workload:
              policy.spec.downsync?.[0]?.apiGroup || "No workload specified",
            creationDate: policy.metadata.creationTimestamp
              ? new Date(policy.metadata.creationTimestamp).toLocaleString()
              : "Unknown",
            lastModifiedDate: policy.metadata.managedFields?.[0]?.time
              ? new Date(
                  policy.metadata.managedFields[0].time
                ).toLocaleString()
              : undefined,
            status: "Inactive", 
            bindingMode: "N/A",
            namespace: "default",
            conditions: null,
            yaml:
              policy.metadata.annotations?.yaml ||
              JSON.stringify(policy, null, 2),
          };
        }
      })
    );

    setBindingPolicies(policiesWithStatus);
  } catch (error: any) {
    console.error("Error fetching binding policies:", error);
    // Handle 500 errors gracefully
    if (error.response && error.response.status === 500) {
      console.warn("Server returned 500 error, likely no binding policies exist");
      setBindingPolicies([]);
    }
  } finally {
    setLoading(false);
  }
}, []);

  useEffect(() => {
    setAvailableClusters([]);
    setAvailableWorkloads([]);

    // Initial data fetch
    fetchBindingPolicies();
  }, [fetchBindingPolicies]);

  const getMatches = () => {
    const matchedClusters = availableClusters.filter((cluster) => {
      return Object.entries(selectedLabels).every(
        ([key, value]) => cluster.labels[key] === value
      );
    });

    const matchedWorkloads = availableWorkloads.filter((workload) => {
      return Object.entries(selectedLabels).every(
        ([key, value]) => workload.labels[key] === value
      );
    });

    return { matchedClusters, matchedWorkloads };
  };

  const handleDeletePolicy = async (policy: BindingPolicyInfo) => {
    setSelectedPolicy(policy);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (selectedPolicy) {
      try {
        // Call the API to delete the policy
        await api.get(
          `/api/bp/delete?name=${selectedPolicy.name}&namespace=${selectedPolicy.namespace}`
        );

        // Update UI state after successful deletion
        await fetchBindingPolicies(); // Refresh the list after deletion
        setSuccessMessage(
          `Binding Policy "${selectedPolicy.name}" deleted successfully`
        );
      } catch (error) {
        console.error("Error deleting binding policy:", error);
        setSuccessMessage(
          `Error deleting binding policy "${selectedPolicy.name}"`
        );
      } finally {
        setDeleteDialogOpen(false);
        setSelectedPolicy(null);
      }
    }
  };

  const handleCreatePolicySubmit = async (
    policyData: Omit<BindingPolicyInfo, "creationDate" | "clusters" | "status">
  ) => {
    try {
      setCreateDialogOpen(false);

      // Set a success message
      setSuccessMessage(
        `Binding Policy "${policyData.name}" created successfully`
      );

      // Refresh the binding policies list
      await fetchBindingPolicies();
    } catch (error) {
      console.error("Error refreshing after policy creation:", error);
      setSuccessMessage(
        `Binding Policy "${policyData.name}" created, but there was an error refreshing the list`
      );
    }
  };

  const handleEditPolicy = (policy: BindingPolicyInfo) => {
    setSelectedPolicy(policy);
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async (updatedPolicy: Partial<BindingPolicyInfo>) => {
    try {
    setBindingPolicies((policies) =>
        policies.map((p) =>
          p.name === updatedPolicy.name ? { ...p, ...updatedPolicy } : p
        )
      );
      setEditDialogOpen(false);
      setSelectedPolicy(null);
      setSuccessMessage(
        `Binding Policy "${updatedPolicy.name}" updated successfully`
      );
    } catch (error) {
      console.error("Error updating binding policy:", error);
      setSuccessMessage(
        `Error updating binding policy "${updatedPolicy.name}"`
      );
    }
  };

  const handlePreviewPolicy = (policy: BindingPolicyInfo) => {
    setSelectedPolicy(policy);
    setPreviewDialogOpen(true);
  };

  const getFilteredPolicies = () => {
    return bindingPolicies.filter((policy) => {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        policy.name.toLowerCase().includes(searchLower) ||
        policy.workload.toLowerCase().includes(searchLower) ||
        policy.status.toLowerCase().includes(searchLower);

      const matchesStatus =
        !activeFilters.status || policy.status === activeFilters.status;

      return matchesSearch && matchesStatus;
    });
  };

  const filteredPolicies = getFilteredPolicies();
  const paginatedPolicies = filteredPolicies.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const EmptyState = () => (
    <Box 
      sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        py: 8,
        textAlign: 'center'
      }}
    >
      <Typography variant="h6" color="text.secondary" gutterBottom>
        No Binding Policies Found
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Get started by creating your first binding policy
      </Typography>
      <Button 
        variant="contained" 
        color="primary"
        onClick={() => setCreateDialogOpen(true)}
      >
        Create Binding Policy
      </Button>
    </Box>
  );

  if (loading) {
    return (
      <Box sx={{ textAlign: "center", color: "text.secondary", py: 3 }}>
        Loading KubeStellar Binding Policies...
      </Box>
    );
  }

  const { matchedClusters, matchedWorkloads } = getMatches();

  return (
    <>
      <Paper
        sx={{
          maxWidth: "100%",
          margin: "auto",
          p: 3,
          backgroundColor: theme === "dark" ? "#1F2937" : "#fff",
        }}
      >
        <BPHeader
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          createDialogOpen={createDialogOpen}
          setCreateDialogOpen={setCreateDialogOpen}
          onCreatePolicy={handleCreatePolicySubmit}
          activeFilters={activeFilters}
          setActiveFilters={setActiveFilters}
        />

        {bindingPolicies.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <BPTable
              policies={paginatedPolicies}
              onPreviewMatches={(policy) => handlePreviewPolicy(policy)}
              onDeletePolicy={handleDeletePolicy}
              onEditPolicy={handleEditPolicy}
              activeFilters={activeFilters}
            />

            <BPPagination
              filteredCount={filteredPolicies.length}
              totalCount={bindingPolicies.length}
              itemsPerPage={itemsPerPage}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
            />
          </>
        )}

        <PreviewDialog
          open={previewDialogOpen}
          onClose={() => setPreviewDialogOpen(false)}
          matchedClusters={matchedClusters}
          matchedWorkloads={matchedWorkloads}
          policy={selectedPolicy || undefined}
        />

        {selectedPolicy && (
          <EditBindingPolicyDialog
            open={editDialogOpen}
            onClose={() => setEditDialogOpen(false)}
            onSave={handleSaveEdit}
            policy={selectedPolicy}
          />
        )}

        <DeleteDialog
          open={deleteDialogOpen}
          onClose={() => setDeleteDialogOpen(false)}
          onConfirm={confirmDelete}
          policyName={selectedPolicy?.name}
        />
      </Paper>

      <Snackbar
        open={!!successMessage}
        autoHideDuration={6000}
        onClose={() => setSuccessMessage("")}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSuccessMessage("")}
          severity="success"
          sx={{ width: "100%" }}
        >
          {successMessage}
        </Alert>
      </Snackbar>
    </>
  );
};

export default BP;