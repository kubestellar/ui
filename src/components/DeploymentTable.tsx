import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  IconButton,
  Menu,
  MenuItem,
  Snackbar,
  Alert,
  TextField,
  Box,
  Typography,
  Paper,
} from "@mui/material";

import { FaCircle } from "react-icons/fa";
import { FiChevronDown, FiChevronUp, FiMoreVertical } from "react-icons/fi";
import Editor from "@monaco-editor/react";
import axios from "axios";
import LogModal from "./LogModal";
import yaml from "js-yaml";
import useTheme from "../stores/themeStore";

interface Workload {
  name: string;
  kind: string;
  namespace: string;
  creationTime: string;
  image: string;
  label: string;
  replicas: number;
}

interface DeploymentConfig {
  metadata: {
    namespace: string;
    name: string;
  };
  spec: {
    replicas?: number;
    template: {
      spec: {
        containers: {
          image: string;
        }[];
      };
    };
  };
}

interface Props {
  title: string;
  workloads: Workload[];
  setSelectedDeployment: (workload: Workload | null) => void;
}

const DeploymentTable = ({ title, workloads, setSelectedDeployment }: Props) => {
  const [showDetails, setShowDetails] = useState(true);
  const [menuOpen, setMenuOpen] = useState<number | null>(null);
  const [menuAnchorEl, setMenuAnchorEl] = useState<HTMLElement | null>(null);
  const [editYaml, setEditYaml] = useState(false);
  const [yamlData, setYamlData] = useState<string>("");
  const [selectedLog, setSelectedLog] = useState<{ namespace: string; deployment: string } | null>(null);
  const [scaleModalOpen, setScaleModalOpen] = useState(false);
  const [selectedWorkload, setSelectedWorkload] = useState<Workload | null>(null);
  const [replicaCount, setReplicaCount] = useState<number>();
  const [desiredReplicas, setDesiredReplicas] = useState<number | "">("");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [error, setError] = useState<string>("");
  const theme = useTheme((state) => state.theme);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" | "warning" | "info" }>({
    open: false,
    message: "",
    severity: "success",
  });

  console.log(error);

  // Menu dropdown
  const handleMenuClick = (event: React.MouseEvent, index: number) => {
    setMenuAnchorEl(event.currentTarget as HTMLElement);
    setMenuOpen(index);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
    setMenuOpen(null);
  };

  // Handle Edit Click (Open YAML Editor Modal)
  const handleEditClick = async (workload: Workload) => {
    setMenuOpen(null);
    setSelectedWorkload(workload);

    try {
      const response = await axios.get(
        `${process.env.VITE_BASE_URL}/api/wds/${workload.name}?namespace=${workload.namespace}`
      );
      const fullDeployment = response.data;

      const fetchedYaml = `
apiVersion: ${fullDeployment.apiVersion || "apps/v1"}
kind: ${fullDeployment.kind || "Deployment"}
metadata:
  name: ${fullDeployment.metadata?.name || "unknown-deployment"}
  namespace: ${fullDeployment.metadata?.namespace || "default"}
spec:
  replicas: ${fullDeployment.spec?.replicas ?? 1}
  selector:
    matchLabels:
      app: ${fullDeployment.spec?.selector?.matchLabels?.app || "unknown-label"}
  template:
    metadata:
      labels:
        app: ${fullDeployment.spec?.template?.metadata?.labels?.app || "unknown-label"}
    spec:
      containers:
        - name: ${fullDeployment.spec?.template?.spec?.containers?.[0]?.name || "unknown-container"}
          image: ${fullDeployment.spec?.template?.spec?.containers?.[0]?.image || "nginx:latest"}
          ports:
            - containerPort: ${
              fullDeployment.spec?.template?.spec?.containers?.[0]?.ports?.[0]?.containerPort || 80
            }`;

      setYamlData(fetchedYaml);
      setEditYaml(true);
    } catch (error) {
      console.error("Error fetching full deployment data:", error);
      setError("Failed to fetch deployment data.");
    }
  };

  // Handle Save Click (Update Deployment)
  const handleSave = async () => {
    try {
      if (!yamlData || !selectedWorkload) {
        setError("Invalid data.");
        return;
      }

      const parsedYaml = yaml.load(yamlData) as DeploymentConfig;
      const updatedDeployment = {
        namespace: parsedYaml.metadata.namespace,
        name: parsedYaml.metadata.name,
        image: parsedYaml.spec.template.spec.containers[0].image,
        replicas: parsedYaml.spec.replicas || 1,
      };

      await axios.put(
        `${process.env.VITE_BASE_URL}/api/wds/update`,
        updatedDeployment,
        { headers: { "Content-Type": "application/json" } }
      );

      showSnackbar(`Deployment "${updatedDeployment.name}" updated successfully!`, "success");
      setSelectedWorkload((prev) => (prev ? { ...prev, replicas: updatedDeployment.replicas } : null));
      setEditYaml(false);
    } catch (error: unknown) {
      showSnackbar(`Error updating selected deployment!`, "error");
      console.error("Error updating deployment:", error);
    }
  };

  // Handle Scaling
  const handleScaleClick = async (workload: Workload) => {
    setSelectedWorkload(workload);
    setMenuOpen(null);

    try {
      const response = await axios.get(
        `${process.env.VITE_BASE_URL}/api/wds/${workload.name}?namespace=${workload.namespace}`
      );
      const currentReplicas = response.data?.spec?.replicas ?? workload.replicas;
      setReplicaCount(currentReplicas);
      setScaleModalOpen(true);
    } catch (error) {
      console.error("Error fetching replica count:", error);
      setError("Failed to fetch replica count.");
    }
  };

  // Handle Scale Save (Update Replicas Only)
  const handleScaleSave = async () => {
    try {
      if (!selectedWorkload || desiredReplicas === undefined) {
        setError("Please select a workload and set the desired replicas.");
        return;
      }

      const scaleUpdate = {
        namespace: selectedWorkload.namespace,
        name: selectedWorkload.name,
        replicas: desiredReplicas,
      };

      await axios.put(
        `${process.env.VITE_BASE_URL}/api/wds/update`,
        scaleUpdate,
        { headers: { "Content-Type": "application/json" } }
      );

      showSnackbar(`Deployment "${scaleUpdate.name}" scaled to ${scaleUpdate.replicas} replicas successfully!`, "success");
      setScaleModalOpen(false);
    } catch (error) {
      showSnackbar(`Failed to update selected deployment`, "error");
      console.error("Error updating replicas:", error);
      setError("Failed to update replicas.");
    }
  };

  // Handle Delete Click
  const handleDeleteClick = (workload: Workload) => {
    setSelectedWorkload(workload);
    setDeleteModalOpen(true);
    setMenuOpen(null);
  };

  // Confirm Delete
  const confirmDelete = async () => {
    if (!selectedWorkload) return;

    try {
      // Construct the dynamic delete endpoint using kind, namespace, and name
      const endpoint = `${process.env.VITE_BASE_URL}/api/${selectedWorkload.kind.toLowerCase()}s/${selectedWorkload.namespace}/${selectedWorkload.name}`;
      await axios.delete(endpoint);

      showSnackbar(`Deployment "${selectedWorkload.name}" deleted successfully`, "success");
      setTimeout(() => {
        window.location.reload();
      }, 200);
    } catch (error) {
      showSnackbar(`Failed to delete "${selectedWorkload.name}" deployment`, "error");
      console.error("Failed to delete deployment:", error);
      setError("Failed to delete deployment.");
    }

    setDeleteModalOpen(false);
  };

  // Logs
  const handleLogsClick = (workload: Workload) => {
    setSelectedLog({ namespace: workload.namespace, deployment: workload.name });
  };

  const showSnackbar = (message: string, severity: "success" | "error") => {
    setSnackbar({ open: true, message, severity });
  };

  return (
    <Paper elevation={3} sx={{ mb: 3, p: 3, bgcolor: theme === "dark" ? "#2f86ff" : "background.paper", color: theme === "dark" ? "white" : "black", borderRadius: 2 }}>
      {/* Header Section */}
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="h6" fontWeight="bold">
          {title}
        </Typography>
        <Typography variant="body2" color="textSecondary" mr={2} sx={{ color: theme === "dark" ? "white" : "black" }}>
          Items: {workloads.length}
        </Typography>
        <IconButton sx={{ color: theme === "dark" ? "white" : "black" }} onClick={() => setShowDetails(!showDetails)}>
          {showDetails ? <FiChevronUp /> : <FiChevronDown />}
        </IconButton>
      </Box>

      {/* Table Section */}
      <Table>
        <TableHead>
          <TableRow>
            {showDetails && (
              <>
                <TableCell sx={{ color: theme === "dark" ? "white" : "black", align: "right" }}>Name</TableCell>
                <TableCell sx={{ color: theme === "dark" ? "white" : "black", align: "right" }}>Kind</TableCell>
                <TableCell sx={{ color: theme === "dark" ? "white" : "black", align: "right" }}>Namespace</TableCell>
                <TableCell sx={{ color: theme === "dark" ? "white" : "black", align: "right" }}>Created</TableCell>
                <TableCell align="right" sx={{ color: theme === "dark" ? "white" : "black", align: "right" }}></TableCell>
              </>
            )}
          </TableRow>
        </TableHead>
        <TableBody>
          {workloads.map((workload, index) => (
            <TableRow key={index}>
              {showDetails && (
                <>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                      <FaCircle color="green" size={12} />
                      <Typography
                        color="primary"
                        sx={{ textDecoration: "underline", cursor: "pointer" }}
                        onClick={() => setSelectedDeployment(workload)}
                      >
                        {workload.name}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell sx={{ color: theme === "dark" ? "white" : "black", align: "right" }}>{workload.kind}</TableCell>
                  <TableCell sx={{ color: theme === "dark" ? "white" : "black", align: "right" }}>{workload.namespace}</TableCell>
                  <TableCell sx={{ color: theme === "dark" ? "white" : "black", align: "right" }}>{new Date(workload.creationTime).toLocaleString()}</TableCell>
                  <TableCell align="right">
                    <IconButton sx={{ color: theme === "dark" ? "white" : "black", align: "right" }} onClick={(e) => handleMenuClick(e, index)}>
                      <FiMoreVertical />
                    </IconButton>
                  </TableCell>
                </>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Dropdown Menu */}
      <Menu
        open={menuOpen !== null}
        anchorEl={menuAnchorEl}
        onClose={handleMenuClose}
        MenuListProps={{
          sx: { bgcolor: theme === "dark" ? "#1F2937" : "background.paper", p: 0 } // Ensures full background coverage
        }}
        anchorReference="anchorPosition"
        anchorPosition={menuAnchorEl ? { top: menuAnchorEl.getBoundingClientRect().bottom, left: menuAnchorEl.getBoundingClientRect().left - 55 } : undefined} // Move left by 10px
      >
        <MenuItem
          onClick={() => {
            handleLogsClick(workloads[menuOpen!]);
            setMenuOpen(null);
          }}
          sx={{ color: theme === "dark" ? "white" : "black" }}
        >
          Logs
        </MenuItem>
        <MenuItem
          onClick={() => handleScaleClick(workloads[menuOpen!])}
          sx={{ color: theme === "dark" ? "white" : "black" }}
        >
          Scale
        </MenuItem>
        <MenuItem
          onClick={() => handleEditClick(workloads[menuOpen!])}
          sx={{ color: theme === "dark" ? "white" : "black" }}
        >
          Edit
        </MenuItem>
        <MenuItem
          onClick={() => handleDeleteClick(workloads[menuOpen!])}
          sx={{ color: theme === "dark" ? "white" : "black" }}
        >
          Delete
        </MenuItem>
      </Menu>

      {/* YAML Editor Modal */}
      <Dialog
        open={editYaml}
        onClose={() => setEditYaml(false)}
        sx={{
          "& .MuiPaper-root": {
            bgcolor: theme === "dark" ? "#1F2937" : "white",
            color: theme === "dark" ? "white" : "black",
          },
        }}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>Edit Resource</DialogTitle>
        <DialogContent>
          <Editor
            height="400px"
            defaultLanguage="yaml"
            value={yamlData}
            onChange={(value) => setYamlData(value || "")}
            theme={theme === "dark" ? "vs-dark" : "vs-dark"}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleSave} sx={{ color: theme === "dark" ? "white" : "black" }}>
            Upload
          </Button>
          <Button onClick={() => setEditYaml(false)} sx={{ color: theme === "dark" ? "white" : "black" }}>
            Cancel
          </Button>
        </DialogActions>
      </Dialog>

      {/* Scaling Modal */}
      <Dialog
        open={scaleModalOpen}
        onClose={() => setScaleModalOpen(false)}
        sx={{
          "& .MuiPaper-root": {
            bgcolor: theme === "dark" ? "#1F2937" : "white",
            color: theme === "dark" ? "white" : "black",
          },
        }}
      >
        <DialogTitle>Scale a Resource</DialogTitle>
        <DialogContent>
          <Typography variant="body1" mb={2} sx={{ color: theme === "dark" ? "white" : "black" }}>
            Deployment {selectedWorkload?.name} will be updated to reflect the desired replica count.
          </Typography>
          <Box display="flex" gap={2} mb={2}>
            <TextField
              label="Desired Replicas"
              type="number"
              value={desiredReplicas}
              onChange={(e) => {
                const value = e.target.value;
                setDesiredReplicas(value === "" ? "" : Number(value));
              }}
              fullWidth
              sx={{
                input: { color: theme === "dark" ? "white" : "black" },
                label: { color: theme === "dark" ? "white" : "black" },
                "& .MuiOutlinedInput-root": {
                  "& fieldset": { borderColor: theme === "dark" ? "white" : "black" },
                  "&:hover fieldset": { borderColor: theme === "dark" ? "gray" : "black" },
                },
              }}
            />
            <TextField
              label="Actual Replicas"
              type="number"
              value={replicaCount}
              fullWidth
              sx={{
                input: { color: theme === "dark" ? "white" : "black" },
                label: { color: theme === "dark" ? "white" : "black" },
                "& .MuiOutlinedInput-root": {
                  "& fieldset": { borderColor: theme === "dark" ? "white" : "black" },
                  "&:hover fieldset": { borderColor: theme === "dark" ? "gray" : "black" },
                },
              }}
            />
          </Box>
          <Alert severity="info" sx={{ mb: 2, color: theme === "dark" ? "white" : "black" }}>
            This action is equivalent to: kubectl scale -n deployment {selectedWorkload?.name} --replicas={replicaCount}
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleScaleSave} sx={{ color: theme === "dark" ? "white" : "black" }}>
            Scale
          </Button>
          <Button onClick={() => setScaleModalOpen(false)} sx={{ color: theme === "dark" ? "white" : "black" }}>
            Cancel
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Modal */}
      <Dialog
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        sx={{
          "& .MuiPaper-root": {
            backgroundColor: theme === "dark" ? "#1F2937" : "#fff",
            color: theme === "dark" ? "white" : "black",
          },
        }}
      >
        <DialogTitle sx={{ color: theme === "dark" ? "white" : "black" }}>
          Delete a Resource
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" mb={2} sx={{ color: theme === "dark" ? "white" : "black" }}>
            Are you sure you want to delete <strong>{selectedWorkload?.name}</strong> in namespace{" "}
            <strong>{selectedWorkload?.namespace}</strong>?
          </Typography>
          <Alert
            severity="info"
            sx={{
              mb: 2,
              backgroundColor: theme === "dark" ? "#444" : "inherit",
              color: theme === "dark" ? "white" : "black",
            }}
          >
            This action is equivalent to: kubectl delete -n default pod {selectedWorkload?.name} --cascade=background
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={confirmDelete} sx={{ color: theme === "dark" ? "white" : "black" }}>
            Delete
          </Button>
          <Button onClick={() => setDeleteModalOpen(false)} sx={{ color: theme === "dark" ? "white" : "black" }}>
            Cancel
          </Button>
        </DialogActions>
      </Dialog>

      {/* Logs Modal */}
      {selectedLog && (
        <LogModal
          namespace={selectedLog.namespace}
          deploymentName={selectedLog.deployment}
          onClose={() => setSelectedLog(null)}
        />
      )}

      {/* Error Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Paper>
  );
};

export default DeploymentTable;