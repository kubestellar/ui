import { useEffect, useState } from "react";
import {
  Button,
  TextField,
  InputAdornment,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  IconButton,
  Tooltip,
  Paper,
  Box,
  Typography,
} from "@mui/material";
import { Search, Filter, Plus, Upload, Info, Edit, Trash } from "lucide-react";

interface BindingPolicyInfo {
  name: string;
  namespace: string;
  labels: string[];
  clusters: number;
  workload: string;
  creationDate: string;
  status: "Active" | "Inactive";
}

interface ManagedCluster {
  name: string;
  labels: Record<string, string>;
  status: string;
}

interface Workload {
  name: string;
  namespace: string;
  labels: Record<string, string>;
}

interface CreateBindingPolicyData {
  name: string;
  namespace: string;
  labels: string[];
  workload: string;
}

interface UpdateBindingPolicyData extends CreateBindingPolicyData {
  status: "Active" | "Inactive";
}

const BP = () => {
  const [bindingPolicies, setBindingPolicies] = useState<BindingPolicyInfo[]>(
    []
  );
  const [loading, setLoading] = useState<boolean>(true);
  // const [showPreview, setShowPreview] = useState(false);
  const [selectedLabels] = useState<Record<string, string>>({});
  const [availableClusters, setAvailableClusters] = useState<ManagedCluster[]>(
    []
  );
  const [availableWorkloads, setAvailableWorkloads] = useState<Workload[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedPolicy, setSelectedPolicy] =
    useState<BindingPolicyInfo | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    // Simulate loading initial data
    setTimeout(() => {
      setBindingPolicies([
        {
          name: "winions-central",
          namespace: "winions-central",
          labels: ["region=aleolia", "cluster-opening"],
          clusters: 2,
          workload: "workload0",
          creationDate: "1/24/2025 9:12:18 AM",
          status: "Active",
        },
        {
          name: "Map This to That",
          namespace: "my-this-and-that",
          labels: ["app=mod", "cluster-open-mangeme..."],
          clusters: 1,
          workload: "workload1",
          creationDate: "1/20/2025 7:42:25 PM",
          status: "Inactive",
        },
        {
          name: "my nginx app on dev",
          namespace: "nginx",
          labels: ["kubestellarVersion", "location-group=edge"],
          clusters: 3,
          workload: "workload2",
          creationDate: "1/15/2025 9:12:18 PM",
          status: "Inactive",
        },
        {
          name: "my nginx app on prod",
          namespace: "nginx",
          labels: ["devteam=owner", "tier=candybar", "name=beriberi-langnahm"],
          clusters: 1,
          workload: "workload3",
          creationDate: "12/24/2025 4:20:50 AM",
          status: "Active",
        },
        {
          name: "my nginx app on staging",
          namespace: "nginx",
          labels: [
            "environment=daze",
            "region=us-west-2",
            "datacenter=deep-core",
          ],
          clusters: 2,
          workload: "workload4",
          creationDate: "4/20/2024 6:04:20 AM",
          status: "Active",
        },
        {
          name: "new app on dev",
          namespace: "new-app",
          labels: [
            "environment=daze",
            "region=us-east-2",
            "datacenter=deep-space",
          ],
          clusters: 5,
          workload: "workload5",
          creationDate: "4/20/2024 9:04:20 PM",
          status: "Inactive",
        },
        // ... other policies as in your data
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

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);

  const handleCreatePolicy = (policyData: CreateBindingPolicyData) => {
    const newPolicy: BindingPolicyInfo = {
      ...policyData,
      clusters: 0, // Initial cluster count
      creationDate: new Date().toLocaleString(),
      status: "Inactive" as const,
    };

    setBindingPolicies([...bindingPolicies, newPolicy]);
    setCreateDialogOpen(false);
  };

  const handlePreviewMatches = () => {
    setPreviewDialogOpen(true);
  };

  // Calculate matches based on selected labels
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

  // Add function to filter binding policies based on search
  const filteredBindingPolicies = bindingPolicies.filter((policy) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      policy.name.toLowerCase().includes(searchLower) ||
      policy.namespace.toLowerCase().includes(searchLower) ||
      policy.labels.some((label) =>
        label.toLowerCase().includes(searchLower)
      ) ||
      policy.workload.toLowerCase().includes(searchLower)
    );
  });

  // CRUD Operations
  const handleUpdatePolicy = (policyData: UpdateBindingPolicyData) => {
    setBindingPolicies(
      bindingPolicies.map((policy) =>
        policy.name === policyData.name ? { ...policy, ...policyData } : policy
      )
    );
    setEditDialogOpen(false);
    setSelectedPolicy(null);
  };

  const handleDeletePolicy = (policyName: string) => {
    setBindingPolicies(
      bindingPolicies.filter((policy) => policy.name !== policyName)
    );
    setDeleteDialogOpen(false);
    setSelectedPolicy(null);
  };

  const PolicyForm = ({
    initialData,
    onSubmit,
    onCancel,
    mode,
  }: {
    initialData?: Partial<BindingPolicyInfo>;
    onSubmit: (data: UpdateBindingPolicyData) => void;
    onCancel: () => void;
    mode: "create" | "edit";
  }) => {
    const [formData, setFormData] = useState<UpdateBindingPolicyData>({
      name: initialData?.name || "",
      namespace: initialData?.namespace || "",
      labels: initialData?.labels || [],
      workload: initialData?.workload || "",
      status: (initialData as BindingPolicyInfo)?.status || "Inactive",
    });
    const [newLabel, setNewLabel] = useState("");

    const handleAddLabel = () => {
      if (newLabel && !formData.labels.includes(newLabel)) {
        setFormData({
          ...formData,
          labels: [...formData.labels, newLabel],
        });
        setNewLabel("");
      }
    };

    const handleRemoveLabel = (labelToRemove: string) => {
      setFormData({
        ...formData,
        labels: formData.labels.filter((label) => label !== labelToRemove),
      });
    };

    return (
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 2 }}>
        <TextField
          label="Name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          disabled={mode === "edit"}
          required
        />
        <TextField
          label="Namespace"
          value={formData.namespace}
          onChange={(e) =>
            setFormData({ ...formData, namespace: e.target.value })
          }
          required
        />
        <TextField
          label="Workload"
          value={formData.workload}
          onChange={(e) =>
            setFormData({ ...formData, workload: e.target.value })
          }
          required
        />
        <Box>
          <Box sx={{ display: "flex", gap: 1, mb: 1 }}>
            <TextField
              label="Add Label"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              size="small"
            />
            <Button onClick={handleAddLabel} variant="outlined">
              Add
            </Button>
          </Box>
          <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
            {formData.labels.map((label, index) => (
              <Chip
                key={index}
                label={label}
                onDelete={() => handleRemoveLabel(label)}
                size="small"
              />
            ))}
          </Box>
        </Box>
        <DialogActions>
          <Button onClick={onCancel}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => onSubmit(formData)}
            disabled={
              !formData.name || !formData.namespace || !formData.workload
            }
          >
            {mode === "create" ? "Create" : "Update"}
          </Button>
        </DialogActions>
      </Box>
    );
  };

  if (loading) {
    return (
      <Box sx={{ textAlign: "center", color: "text.secondary", py: 3 }}>
        Loading KubeStellar Binding Policies...
      </Box>
    );
  }

  return (
    <Paper sx={{ maxWidth: "100%", margin: "auto", p: 3 }}>
      {/* Header Section */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Box sx={{ display: "flex", gap: 2 }}>
          <TextField
            size="small"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={20} />
                </InputAdornment>
              ),
            }}
          />
          <Button startIcon={<Filter size={20} />} variant="outlined">
            Filter
          </Button>
        </Box>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<Plus size={20} />}
            onClick={() => setCreateDialogOpen(true)}
          >
            Create Binding Policy
          </Button>
          <Button variant="contained" startIcon={<Upload size={20} />}>
            Import Binding Policy
          </Button>
        </Box>
      </Box>

      {/* Table Section */}
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Binding Policy Name</TableCell>
            <TableCell>Namespace</TableCell>
            <TableCell>Labels</TableCell>
            <TableCell>Clusters</TableCell>
            <TableCell>Workload</TableCell>
            <TableCell>Creation Date</TableCell>
            <TableCell>Status</TableCell>
            <TableCell align="right">
              <Tooltip title="Preview matches">
                <IconButton size="small" onClick={handlePreviewMatches}>
                  <Info />
                </IconButton>
              </Tooltip>
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {filteredBindingPolicies.length > 0 ? (
            filteredBindingPolicies.map((policy) => (
              <TableRow key={policy.name}>
                <TableCell>
                  <Button color="primary" sx={{ textTransform: "none" }}>
                    {policy.name}
                  </Button>
                </TableCell>
                <TableCell>{policy.namespace}</TableCell>
                <TableCell>
                  <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                    {policy.labels.slice(0, 2).map((label, index) => (
                      <Chip
                        key={index}
                        label={label}
                        size="small"
                        sx={{ backgroundColor: "#e3f2fd" }}
                      />
                    ))}
                    {policy.labels.length > 2 && (
                      <Chip
                        label={`+${policy.labels.length - 2}`}
                        size="small"
                        sx={{ backgroundColor: "#f5f5f5" }}
                      />
                    )}
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip label={policy.clusters} size="small" color="success" />
                </TableCell>
                <TableCell>
                  <Chip label={policy.workload} size="small" color="success" />
                </TableCell>
                <TableCell>{policy.creationDate}</TableCell>
                <TableCell>
                  <Chip
                    label={policy.status}
                    size="small"
                    color={policy.status === "Active" ? "success" : "error"}
                    sx={{
                      "& .MuiChip-label": {
                        display: "flex",
                        alignItems: "center",
                        gap: 0.5,
                      },
                    }}
                    icon={
                      policy.status === "Active" ? (
                        <span>✓</span>
                      ) : (
                        <span>✗</span>
                      )
                    }
                  />
                </TableCell>
                <TableCell align="right">
                  <Box
                    sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}
                  >
                    <IconButton
                      size="small"
                      onClick={() => {
                        setSelectedPolicy(policy);
                        setEditDialogOpen(true);
                      }}
                    >
                      <Edit size={18} />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => {
                        setSelectedPolicy(policy);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash size={18} />
                    </IconButton>
                  </Box>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={8} sx={{ textAlign: "center", py: 3 }}>
                <Typography color="text.secondary">
                  No binding policies found matching "{searchQuery}"
                </Typography>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {/* Pagination */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mt: 2,
        }}
      >
        <Typography variant="body2" color="text.secondary">
          Showing {filteredBindingPolicies.length} of {bindingPolicies.length}{" "}
          entries
        </Typography>
        <Box sx={{ display: "flex", gap: 1 }}>
          {[1, 2, 3, "...", 40].map((page, index) => (
            <Button
              key={index}
              variant="outlined"
              size="small"
              sx={{ minWidth: 40 }}
            >
              {page}
            </Button>
          ))}
        </Box>
      </Box>

      {/* Create Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create Binding Policy</DialogTitle>
        <DialogContent>
          <PolicyForm
            mode="create"
            onSubmit={handleCreatePolicy}
            onCancel={() => setCreateDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Edit Binding Policy</DialogTitle>
        <DialogContent>
          <PolicyForm
            mode="edit"
            initialData={selectedPolicy || undefined}
            onSubmit={handleUpdatePolicy}
            onCancel={() => setEditDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Delete Binding Policy</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the binding policy "
            {selectedPolicy?.name}"?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={() =>
              selectedPolicy && handleDeletePolicy(selectedPolicy.name)
            }
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog
        open={previewDialogOpen}
        onClose={() => setPreviewDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Preview Matches</DialogTitle>
        <DialogContent>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 2,
              mt: 2,
            }}
          >
            <Box>
              <Typography variant="h6" gutterBottom>
                Matched Clusters
              </Typography>
              {getMatches().matchedClusters.map((cluster) => (
                <Paper key={cluster.name} sx={{ p: 2, mb: 1 }}>
                  <Typography variant="subtitle1">{cluster.name}</Typography>
                  <Box
                    sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", mt: 1 }}
                  >
                    {Object.entries(cluster.labels).map(([key, value]) => (
                      <Chip
                        key={key}
                        label={`${key}=${value}`}
                        size="small"
                        sx={{ backgroundColor: "#e3f2fd" }}
                      />
                    ))}
                  </Box>
                </Paper>
              ))}
            </Box>
            <Box>
              <Typography variant="h6" gutterBottom>
                Matched Workloads
              </Typography>
              {getMatches().matchedWorkloads.map((workload) => (
                <Paper key={workload.name} sx={{ p: 2, mb: 1 }}>
                  <Typography variant="subtitle1">{workload.name}</Typography>
                  <Box
                    sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", mt: 1 }}
                  >
                    {Object.entries(workload.labels).map(([key, value]) => (
                      <Chip
                        key={key}
                        label={`${key}=${value}`}
                        size="small"
                        sx={{ backgroundColor: "#e3f2fd" }}
                      />
                    ))}
                  </Box>
                </Paper>
              ))}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default BP;
