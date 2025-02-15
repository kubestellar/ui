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
import { Search, Filter, Plus,  Info, Trash2 } from "lucide-react";
import CreateBindingPolicyDialog from "../components/CreateBindingPolicyDialog";

interface BindingPolicyInfo {
  name: string;
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

const BP = () => {
  const [bindingPolicies, setBindingPolicies] = useState<BindingPolicyInfo[]>(
    []
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  // const [showPreview, setShowPreview] = useState(false);
  const [selectedLabels] = useState<Record<string, string>>({});
  const [availableClusters, setAvailableClusters] = useState<ManagedCluster[]>(
    []
  );
  const [availableWorkloads, setAvailableWorkloads] = useState<Workload[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const [selectedPolicy, setSelectedPolicy] =
    useState<BindingPolicyInfo | null>(null);

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

  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);

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

  const handlePreviewMatches = () => {
    setPreviewDialogOpen(true);
  };

  // Add function to filter binding policies
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
        <CreateBindingPolicyDialog
          open={createDialogOpen}
          onClose={() => setCreateDialogOpen(false)}
          onCreatePolicy={handleCreatePolicySubmit}
        />

        <Box sx={{ display: "flex", gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<Plus size={20} />}
            onClick={() => setCreateDialogOpen(true)}
          >
            Create Binding Policy
          </Button>
       
        </Box>
      </Box>

      {/* Table Section */}
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Binding Policy Name</TableCell>
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
          {filteredPolicies.map((policy) => (
            <TableRow key={policy.name}>
              <TableCell>
                <Button color="primary" sx={{ textTransform: "none" }}>
                  {policy.name}
                </Button>
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
                    policy.status === "Active" ? <span>✓</span> : <span>✗</span>
                  }
                />
              </TableCell>
              <TableCell align="right">
                <Box
                  sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}
                >
                  <IconButton size="small">
                    <Info />
                  </IconButton>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => handleDeletePolicy(policy)}
                  >
                    <Trash2 />
                  </IconButton>
                </Box>
              </TableCell>
            </TableRow>
          ))}
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
          Showing {filteredPolicies.length} of {bindingPolicies.length} entries
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

      {/* Delete Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Delete Binding Policy</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the binding policy "
            {selectedPolicy?.name}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={confirmDelete}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default BP;
