// src/pages/Plugins.tsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Tabs,
  Tab,
  Typography,
  Paper,
//   Grid,
  Button,
  CircularProgress,
  Alert,
//   IconButton,
} from '@mui/material';
// import { Add as AddIcon, Refresh as RefreshIcon } from '@mui/icons-material';
// import { Plugin } from '../plugins/InstalledApps';
import InstalledApps from '../plugins/InstalledApps';
import ExploreApps from '../plugins/ExploreApps';
import { Refresh as RefreshIcon } from '@mui/icons-material';
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel = (props: TabPanelProps) => {
  const { children, value, index, ...other } = props;
  
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
};

const Plugins: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleRefresh = () => {
    setLoading(true);
    setError(null);
    // Trigger refresh of both components
  };

  useEffect(() => {
    // Initial load
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  }, []);

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Plugins Marketplace
        </Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleRefresh}
            disabled={loading}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Paper sx={{ p: 2 }}>
          <Tabs
            value={tabValue}
            onChange={handleChange}
            aria-label="plugins tabs"
          >
            <Tab label="Installed Plugins" />
            <Tab label="Explore Plugins" />
          </Tabs>

          <TabPanel value={tabValue} index={0}>
            <InstalledApps />
          </TabPanel>
          <TabPanel value={tabValue} index={1}>
            <ExploreApps />
          </TabPanel>
        </Paper>
      )}
    </Box>
  );
};

export default Plugins;
