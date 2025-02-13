import { useState } from 'react';
import {
  Box,
  Button,
  Typography,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Card,
  CardContent,
} from "@mui/material";

const CreateCluster = () => {
  const [clusterName, setClusterName] = useState("");
  const [clusterSet, setClusterSet] = useState("");
  const [importMode, setImportMode] = useState("");

  const handleCreateCluster = () => {
    console.log("Creating cluster with:", { clusterName, clusterSet });
    // Add logic here to handle form submission (e.g., API call)
  };

  /* const ClusterSetDropdown = () => {
    console.log("Creating cluster with:", { clusterSet, clusterSet });
  };

  const ClusterImportMode = () => {
    console.log("Creating cluster with:", { clusterName, clusterSet });
  };*/

  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      height="100vh"
      bgcolor="#E0F2F1"
    >
      <Card sx={{ width: 600, p: 2, boxShadow: 3, borderRadius: 2 }}>
        <Typography variant="h5" fontWeight="bold" sx={{ mb: 2 }}>
          Create Cluster
        </Typography>
        <CardContent>
          <Typography variant="h6" fontWeight="bold">
            Cluster Details
          </Typography>

          {/* Cluster Name Input */}
          <TextField
            fullWidth
            label="Cluster Name *"
            placeholder="Enter cluster name"
            value={clusterName}
            onChange={(e) => setClusterName(e.target.value)}
            variant="outlined"
            slotProps={{
              inputLabel: { shrink: true },
            }}
            sx={{ mt: 3 }}
          />

          {/* Cluster Set Dropdown */}
          <FormControl fullWidth sx={{ mt: 3 }}>
            <InputLabel id="cluster-set-label" shrink>
              Cluster Set
            </InputLabel>
            <Select
              labelId="cluster-set-label"
              value={clusterSet}
              onChange={(e) => setClusterSet(e.target.value)}
              displayEmpty
            >
              <MenuItem value="">Select a cluster set</MenuItem>
              <MenuItem value="set1">Set 1</MenuItem>
              <MenuItem value="set2">Set 2</MenuItem>
              <MenuItem value="set3">Set 3</MenuItem>
            </Select>
          </FormControl>

          {/* Import Mode Dropdown */}
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Select import mode</InputLabel>
            <Select
              value={importMode}
              onChange={(e) => setImportMode(e.target.value)}
              displayEmpty
            >
              <MenuItem value="kubeconfig">kubeconfig</MenuItem>
              <MenuItem value="manual">Manual</MenuItem>
              <MenuItem value="api">API/URL</MenuItem>
            </Select>
          </FormControl>
        </CardContent>

        {/* "Create Cluster" Button */}
        <Button
          variant="contained"
          color="primary"
          onClick={handleCreateCluster}
          sx={{  display: "block" }} // Fix: Ensures it takes up space
          disabled={!clusterName || !clusterSet} // Disable until form is filled
        >
          Create Cluster
        </Button>

      </Card>
    </Box>
  );
};

export default CreateCluster;