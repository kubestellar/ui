// src/pages/Plugins.tsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Tabs,
  Tab,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Fade,
  Slide,
} from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';
import InstalledApps from '../plugins/InstalledApps';
import ExploreApps from '../plugins/ExploreApps';

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
      <Fade in={value === index} timeout={300}>
        <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
          {children}
        </Box>
      </Fade>
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
    // Add actual refresh logic here
    setTimeout(() => setLoading(false), 1000);
  };

  useEffect(() => {
    setLoading(true);
    setTimeout(() => setLoading(false), 1000);
  }, []);

  return (
    <Box sx={{ 
      p: { xs: 2, sm: 3, md: 4 },
      minHeight: '100vh',
      bgcolor: 'transparent',
    }}>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        mb: 3,
        flexDirection: { xs: 'column', sm: 'row' },
        gap: 2,
      }}>
        <Typography 
          variant="h3" 
          component="h1"
          sx={{
            fontSize: { xs: '1.8rem', sm: '2.2rem', md: '2.5rem' },
            fontWeight: 700,
            background: 'linear-gradient(135deg, #3b82f6, #06b6d4)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            lineHeight: 1.2,
          }}
        >
          Plugin Marketplace
        </Typography>
        
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={handleRefresh}
          disabled={loading}
          sx={{
            color: '#7dd3fc',
            borderColor: 'rgba(59, 130, 246, 0.3)',
            '&:hover': {
              borderColor: '#3b82f6',
              bgcolor: 'rgba(59, 130, 246, 0.1)',
            },
            '&:disabled': {
              borderColor: 'rgba(100, 116, 139, 0.2)',
              color: 'rgba(100, 116, 139, 0.5)',
            },
          }}
        >
          Refresh
        </Button>
      </Box>

      {error && (
        <Slide direction="down" in={Boolean(error)} mountOnEnter unmountOnExit>
          <Alert 
            severity="error" 
            sx={{ 
              mb: 3,
              bgcolor: 'rgba(220, 38, 38, 0.1)',
              color: '#fecaca',
              border: '1px solid rgba(220, 38, 38, 0.3)',
              borderRadius: 2,
              '& .MuiAlert-icon': {
                color: '#f87171',
              },
            }}
          >
            {error}
          </Alert>
        </Slide>
      )}

      {loading ? (
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          mt: 4,
          height: '60vh',
          alignItems: 'center',
        }}>
          <CircularProgress 
            size={60}
            sx={{
              color: '#3b82f6',
              '& .MuiCircularProgress-circle': {
                strokeLinecap: 'round',
              },
            }}
          />
        </Box>
      ) : (
        <Box
          sx={{
            bgcolor: 'transparent',
            borderRadius: 3,
            border: '1px solid rgba(59, 130, 246, 0.2)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
            backdropFilter: 'blur(10px)',
            overflow: 'hidden',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '2px',
              background: 'linear-gradient(90deg, #3b82f6, #1e40af, #3b82f6)',
              animation: 'shimmer 3s ease-in-out infinite',
            },
            '@keyframes shimmer': {
              '0%, 100%': { opacity: 0.5 },
              '50%': { opacity: 1 },
            },
          }}
        >
          <Tabs
            value={tabValue}
            onChange={handleChange}
            aria-label="plugins tabs"
            sx={{
              '& .MuiTabs-root': {
                bgcolor: 'transparent',
              },
              '& .MuiTabs-flexContainer': {
                borderBottom: '1px solid rgba(59, 130, 246, 0.2)',
              },
              '& .MuiTab-root': {
                color: '#94a3b8',
                fontWeight: 500,
                fontSize: '0.95rem',
                textTransform: 'none',
                minHeight: 48,
                transition: 'all 0.3s ease',
                '&:hover': {
                  color: '#7dd3fc',
                  bgcolor: 'rgba(59, 130, 246, 0.1)',
                },
                '&.Mui-selected': {
                  color: '#7dd3fc',
                  fontWeight: 600,
                },
              },
              '& .MuiTabs-indicator': {
                backgroundColor: '#3b82f6',
                height: 3,
                borderRadius: '2px 2px 0 0',
              },
            }}
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
        </Box>
      )}
    </Box>
  );
};

export default Plugins;
