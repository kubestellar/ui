import { useEffect, useState } from "react";
import { Paper, Box } from "@mui/material";
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
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  useEffect(() => {
    // Simulate loading initial data
    setTimeout(() => {
      setBindingPolicies([
        {
          name: "winions-central",
          clusters: 2,
          workload: "workload0",
          creationDate: "1/24/2025 9:12:18 AM",
          lastModifiedDate: "1/25/2025 10:15:00 AM",
          status: "Active",
          yaml: `apiVersion: control.kubestellar.io/v1alpha1
kind: BindingPolicy
metadata:
  name: winions-central
  namespace: kubestellar
spec:
  subject:
    kind: Application
    apiGroup: app.kubestellar.io
    name: workload0
    namespace: default
  placement:
    clusterSelector:
      matchLabels:
        environment: production
        region: us-east
    staticPlacement:
      clusterNames:
        - cluster-a
        - cluster-b
  bindingMode: Propagate`,
        },
        {
          name: "Map This to That",
          clusters: 1,
          workload: "workload1",
          creationDate: "1/20/2025 7:42:25 PM",
          lastModifiedDate: "1/21/2025 3:30:00 PM",
          status: "Inactive",
          yaml: `apiVersion: control.kubestellar.io/v1alpha1
kind: BindingPolicy
metadata:
  name: Map This to That
  namespace: kubestellar
spec:
  subject:
    kind: Application
    apiGroup: app.kubestellar.io
    name: workload1
    namespace: default
  placement:
    clusterSelector:
      matchLabels:
        environment: staging
        region: us-west
    staticPlacement:
      clusterNames:
        - cluster-c
  bindingMode: Propagate`,
        },
        {
          name: "my nginx app on dev",
          clusters: 3,
          workload: "workload2",
          creationDate: "1/15/2025 9:12:18 PM",
          lastModifiedDate: "1/16/2025 2:45:00 PM",
          status: "Inactive",
          yaml: `apiVersion: control.kubestellar.io/v1alpha1
kind: BindingPolicy
metadata:
  name: my nginx app on dev
  namespace: kubestellar
spec:
  subject:
    kind: Application
    apiGroup: app.kubestellar.io
    name: workload2
    namespace: default
  placement:
    clusterSelector:
      matchLabels:
        environment: development
  bindingMode: Propagate`,
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

  const handleEditPolicy = (policy: BindingPolicyInfo) => {
    setSelectedPolicy(policy);
    setEditDialogOpen(true);
  };

  const handleSaveEdit = (updatedPolicy: Partial<BindingPolicyInfo>) => {
    setBindingPolicies((policies) =>
      policies.map((p) =>
        p.name === updatedPolicy.name ? { ...p, ...updatedPolicy } : p
      )
    );
    setEditDialogOpen(false);
    setSelectedPolicy(null);
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
        onEditPolicy={handleEditPolicy}
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
  );
};

export default BP;
