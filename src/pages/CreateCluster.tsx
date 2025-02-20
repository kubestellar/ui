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
  CircularProgress,
  FormHelperText,
} from "@mui/material";
import axios from "axios";
import { BASE_URL } from "../utils/credentials";

const CreateCluster = () => {
  const [clusterName, setClusterName] = useState("");
  const [clusterSet, setClusterSet] = useState("");
  const [importMode, setImportMode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCreateCluster = async () => {
    setError("");
    setLoading(true);
    try {
      const response = await axios.post(`${BASE_URL}/clusters/create`, {
        clusterName,
        clusterSet,
        importMode,
      });
      if (response.status !== 200 && response.status !== 202) {
        throw new Error("Network response was not ok");
      }
      console.log("Cluster creation initiated:", response.data);
      // Optionally reset form fields after success
      setClusterName("");
      setClusterSet("");
      setImportMode("");
    } catch (err) {
      console.error("Error creating cluster:", err);
      setError("Failed to initiate cluster creation. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      height="80vh"
      p={2}
    >
      <Card sx={{ width: 600, p: 2, boxShadow: 3, borderRadius: 2 }}>
        <form onSubmit={handleCreateCluster}>
          <CardContent>
            <Typography variant="h5" fontWeight="bold" sx={{ mb: 2 }}>
              Create Cluster
            </Typography>
            <Typography variant="subtitle1" sx={{ mb: 2 }}>
              Please fill in the details below:
            </Typography>

            <TextField
              fullWidth
              required
              label="Cluster Name"
              placeholder="Enter cluster name"
              value={clusterName}
              onChange={(e) => setClusterName(e.target.value)}
              variant="outlined"
              sx={{ mb: 3 }}
            />

            <FormControl fullWidth required sx={{ mb: 3 }}>
              <InputLabel id="cluster-set-label">Cluster Set</InputLabel>
              <Select
                labelId="cluster-set-label"
                value={clusterSet}
                label="Cluster Set"
                onChange={(e) => setClusterSet(e.target.value)}
              >
                <MenuItem value="set1">Set 1</MenuItem>
                <MenuItem value="set2">Set 2</MenuItem>
                <MenuItem value="set3">Set 3</MenuItem>
              </Select>
              {!clusterSet && (
                <FormHelperText>Please select a cluster set.</FormHelperText>
              )}
            </FormControl>

            {/* Import Mode Dropdown */}
            <FormControl fullWidth required sx={{ mb: 3 }}>
              <InputLabel id="import-mode-label">Import Mode</InputLabel>
              <Select
                labelId="import-mode-label"
                value={importMode}
                label="Import Mode"
                onChange={(e) => setImportMode(e.target.value)}
              >
                <MenuItem value="kubeconfig">kubeconfig</MenuItem>
                <MenuItem value="manual">Manual</MenuItem>
                <MenuItem value="api">API/URL</MenuItem>
              </Select>
            </FormControl>

            {error && (
              <Typography color="error" sx={{ mb: 2 }}>
                {error}
              </Typography>
            )}

            <Box display="flex" justifyContent="flex-end">
              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={!clusterName || !clusterSet || !importMode || loading}
                sx={{ minWidth: 150 }}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : "Create Cluster"}
              </Button>
            </Box>
          </CardContent>
        </form>
      </Card>
    </Box>
  );
};

export default CreateCluster;