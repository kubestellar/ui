import { useState } from "react";
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
  Stack,
  Button,
} from "@mui/material";
import { useNavigate } from "react-router-dom";

const OnboardingCluster = () => {
  const [clusterName, setClusterName] = useState("");
  type ImportMode = "kubeconfig" | "manual" | "api";
  const [importMode, setImportMode] = useState<ImportMode>("kubeconfig");

  const routes: Record<ImportMode, string> = {
    kubeconfig: "/kubeconfigOnboarding",
    manual: "/manualOnboarding",
    api: "/apiOnboarding",
  };

  const navigate = useNavigate();

  const handleNavigation = () => {
    const route = routes[importMode];
    if (route) navigate(route, { state: { clusterName, importMode } });
  };

  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="100vh"
      p={2}
    >
      <Card sx={{ width: "100%", maxWidth: 600, p: 3, boxShadow: 3, borderRadius: 2 }}>
        <Typography variant="h5" fontWeight="bold" align="center" sx={{ mb: 2 }}>
          Onboarding Cluster
        </Typography>
        <CardContent>
          <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
            Cluster Details
          </Typography>

          <Stack spacing={3}>
            {/* Cluster Name Field */}
            <TextField
              fullWidth
              label="Cluster Name *"
              placeholder="Enter cluster name"
              value={clusterName}
              onChange={(e) => setClusterName(e.target.value)}
              variant="outlined"
            />

            {/* Import Mode Dropdown */}
            <FormControl fullWidth>
              <InputLabel>Import Mode</InputLabel>
              <Select
                value={importMode}
                onChange={(e) => setImportMode(e.target.value as ImportMode)}
              >
                <MenuItem value="kubeconfig">KubeConfig</MenuItem>
                <MenuItem value="manual">Manual</MenuItem>
                <MenuItem value="api">Server URL and API Token</MenuItem>
              </Select>
            </FormControl>

            <Button variant="contained" onClick={handleNavigation}>
              Next
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
};

export default OnboardingCluster;
