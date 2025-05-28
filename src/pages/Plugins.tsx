// src/pages/Plugins.tsx
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Tab,
  Tabs,
  Typography,
  // Upload as UploadIcon,
} from '@mui/material';
import React, { useEffect, useState } from 'react';
// import { Add as AddIcon, Refresh as RefreshIcon } from '@mui/icons-material';
// import { Plugin } from '../plugins/InstalledApps';
import { Refresh as RefreshIcon } from '@mui/icons-material';
import ExploreApps from '../plugins/ExploreApps';
import InstalledApps from '../plugins/InstalledApps';
import UploadPlugin from '../plugins/UploadPlugin'; // Assuming UploadPlugin is defined in this file

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
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
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
        <Paper
          sx={{
            p: 2,
            bgcolor: '#1e293b',
            color: '#e2e8f0',
            borderRadius: 2,
            border: '1px solid rgba(148, 163, 184, 0.2)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
          }}
        >
          <Tabs
            value={tabValue}
            onChange={handleChange}
            variant="fullWidth"
            sx={{
              mb: 2,
              '& button': {
                color: '#e2e8f0',
                fontWeight: 'medium',
                '&.Mui-selected': {
                  color: '#3b82f6',
                },
              },
            }}
          >
            <Tab label="Installed" />
            <Tab label="Explore" />
            <Tab label="Upload" />
          </Tabs>

          <TabPanel value={tabValue} index={0}>
            <InstalledApps />
          </TabPanel>
          <TabPanel value={tabValue} index={1}>
            <ExploreApps />
          </TabPanel>
          <TabPanel value={tabValue} index={2}>
            <UploadPlugin />
          </TabPanel>
        </Paper>
      )}
    </Box>
  );
};

export default Plugins;
