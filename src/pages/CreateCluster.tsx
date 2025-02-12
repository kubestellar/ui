import { useState } from 'react';
import {
  Box,
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

  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
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

          {/* Cluster Name Field */}
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel shrink>Cluster name *</InputLabel>
            <TextField
              fullWidth
              placeholder="Enter cluster name"
              value={clusterName}
              onChange={(e) => setClusterName(e.target.value)}
            />
          </FormControl>

          {/* Cluster Set Dropdown */}
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Cluster Set</InputLabel>
            <Select
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
            <InputLabel>Import mode</InputLabel>
            <Select
              value={importMode}
              onChange={(e) => setImportMode(e.target.value)}
              displayEmpty
            >
              <MenuItem value="kubeconfig">kubectl</MenuItem>
              <MenuItem value="manual">Manual</MenuItem>
              <MenuItem value="api">API/URL</MenuItem>
            </Select>
          </FormControl>
        </CardContent>
      </Card>
    </Box>
  );
};

export default CreateCluster;