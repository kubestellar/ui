import { useEffect, useState } from "react";
import { Paper, Box } from "@mui/material";
import BPHeader from "../components/BindingPolicy/Dialogs/BPHeader";
import BPTable from "../components/BindingPolicy/BPTable";
import BPPagination from "../components/BindingPolicy/BPPagination";
import PreviewDialog from "../components/BindingPolicy/PreviewDialog";
import DeleteDialog from "../components/BindingPolicy/Dialogs/DeleteDialog";
import {
  BindingPolicyInfo,
  ManagedCluster,
  Workload,
} from "../types/bindingPolicy";

const BP = () => {
  const [bindingPolicies, setBindingPolicies] = useState<BindingPolicyInfo[]>(
    []
  );
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
    status?: "Active" | "Inactive";
  }>({});

  useEffect(() => {
    // Simulate loading initial data
    setTimeout(() => {
      setBindingPolicies([
        {
          name: "winions-central",
          clusters: 2,
          workload: "workload0",
          creationDate: "1/24/2025 9:12:18 AM",
          status: "Active",
        },
        {
          name: "Map This to That",
          clusters: 1,
          workload: "workload1",
          creationDate: "1/20/2025 7:42:25 PM",
          status: "Inactive",
        },
        {
          name: "my nginx app on dev",
          clusters: 3,
          workload: "workload2",
          creationDate: "1/15/2025 9:12:18 PM",
          status: "Inactive",
        },
        {
          name: "my nginx app on prod",
          clusters: 1,
          workload: "workload3",
          creationDate: "12/24/2025 4:20:50 AM",
          status: "Active",
        },
        {
          name: "my nginx app on staging",
          clusters: 2,
          workload: "workload4",
          creationDate: "4/20/2024 6:04:20 AM",
          status: "Active",
        },
        {
          name: "new app on dev",
          clusters: 5,
          workload: "workload5",
          creationDate: "4/20/2024 9:04:20 PM",
          status: "Inactive",
        },
      ]);

      // Simulate loading clusters and workloads
      setAvailableClusters([
        {
          name: "cluster-1",
          labels: { region: "aleolia", environment: "prod" },
          status: "Ready",
        },
        {
          name: "cluster-2",
          labels: { region: "us-west-2", environment: "dev" },
          status: "Ready",
        },
      ]);

      setAvailableWorkloads([
        {
          name: "workload0",
          namespace: "winions-central",
          labels: { app: "winions", type: "web" },
        },
        {
          name: "workload1",
          namespace: "my-this-and-that",
          labels: { app: "mod", type: "api" },
        },
      ]);

      setLoading(false);
    }, 1000);
  }, []);

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

  const handleDeletePolicy = (policy: BindingPolicyInfo) => {
    setSelectedPolicy(policy);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (selectedPolicy) {
      setBindingPolicies((policies) =>
        policies.filter((p) => p.name !== selectedPolicy.name)
      );
      setDeleteDialogOpen(false);
      setSelectedPolicy(null);
    }
  };

  const handleCreatePolicySubmit = (
    policyData: Omit<BindingPolicyInfo, "creationDate" | "clusters" | "status">
  ) => {
    setBindingPolicies((prev) => [
      ...prev,
      {
        ...policyData,
        clusters: 0,
        creationDate: new Date().toLocaleString(),
        status: "Active" as const,
      },
    ]);
    setCreateDialogOpen(false);
  };

  const filteredPolicies = bindingPolicies.filter((policy) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      policy.name.toLowerCase().includes(searchLower) ||
      policy.workload.toLowerCase().includes(searchLower) ||
      policy.status.toLowerCase().includes(searchLower)
    );
  });

  if (loading) {
    return (
      <Box sx={{ textAlign: "center", color: "text.secondary", py: 3 }}>
        Loading KubeStellar Binding Policies...
      </Box>
    );
  }

  const { matchedClusters, matchedWorkloads } = getMatches();

  return (
    <Paper sx={{ maxWidth: "100%", margin: "auto", p: 3 }}>
      <BPHeader
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        createDialogOpen={createDialogOpen}
        setCreateDialogOpen={setCreateDialogOpen}
        onCreatePolicy={handleCreatePolicySubmit}
        activeFilters={activeFilters}
        setActiveFilters={setActiveFilters}
      />

      <BPTable
        policies={filteredPolicies}
        onPreviewMatches={() => setPreviewDialogOpen(true)}
        onDeletePolicy={handleDeletePolicy}
        activeFilters={activeFilters}
      />

      <BPPagination
        filteredCount={filteredPolicies.length}
        totalCount={bindingPolicies.length}
      />

      <PreviewDialog
        open={previewDialogOpen}
        onClose={() => setPreviewDialogOpen(false)}
        matchedClusters={matchedClusters}
        matchedWorkloads={matchedWorkloads}
      />

      <DeleteDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={confirmDelete}
        policyName={selectedPolicy?.name}
      />
    </Paper>
  );
};

export default BP;
