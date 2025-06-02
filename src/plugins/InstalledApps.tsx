import {
  Code as CodeIcon,
  Delete as DeleteIcon,
  Info as InfoIcon,
  Person as PersonIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  IconButton,
  Paper,
  Tooltip,
  Typography,
  Zoom,
} from '@mui/material';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

interface Plugin {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  compatibility: {
    kubestellar: string;
    go: string;
  };
  endpoints: any[];
  ui_components: any[];
  dependencies: any[];
  permissions: any[];
  enabled?: boolean;
}

const InstalledApps: React.FC = () => {
  const navigate = useNavigate();
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [uninstallingPlugin, setUninstallingPlugin] = useState<string | null>(null);

  const fetchPlugins = async () => {
    setLoading(true);
    setError(null);
    console.log('Fetching plugins...');
  
    try {
      const response = await api.get('api/plugin-management/listAllPlugins');
      console.log('API response:', response.data);
  
      const data = response.data;
      // Extract the installed_plugins array from the response
      const rawPlugins = data.installed_plugins || [];
      
      console.log('Parsed plugin data:', rawPlugins);
  
      const pluginsWithState = rawPlugins
        .filter((plugin: any) => plugin.name && plugin.version) // Ensure name and version exist
        .map((plugin: any, index: number) => {
          const id = plugin.id?.trim() || `plugin-${index}`; // Fallback ID if not provided
          return {
            ...plugin,
            id,
            enabled: true,
            description: plugin.description || 'No description available', // Fallback for description
            author: plugin.author || 'Unknown', // Fallback for author
            endpoints: plugin.endpoints || [], // Default to empty array if not present
            ui_components: plugin.ui_components || [], // Default to empty array if not present
            dependencies: plugin.dependencies || [], // Default to empty array if not present
            permissions: plugin.permissions || [], // Default to empty array if not present
          };
        });
  
      console.log('Transformed plugins with state:', pluginsWithState);
      setPlugins(pluginsWithState);
    } catch (err) {
      console.error('Failed to fetch plugins:', err);
      setError('Failed to load plugins. Please try again later.');
    } finally {
      setLoading(false);
    }
  };
  

  useEffect(() => {
    console.log('Component mounted, fetching plugins...');
    fetchPlugins();
  }, []);

  const handleUninstall = async (pluginId: string) => {
    console.log(`Attempting to uninstall plugin with ID: ${pluginId}`);
    if (!window.confirm('Are you sure you want to uninstall this plugin?')) return;

    setUninstallingPlugin(pluginId);
    try {
      console.log('Simulating uninstall delay...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      setPlugins(prev => {
        const updated = prev.filter(p => p.id !== pluginId);
        console.log('Updated plugins after uninstall:', updated);
        return updated;
      });
    } catch (error) {
      console.error('Failed to uninstall plugin:', error);
    } finally {
      setUninstallingPlugin(null);
    }
  };

  const handleRefresh = () => {
    console.log('Refresh button clicked');
    fetchPlugins();
  };

  const handlePluginClick = (pluginId: string) => {
    console.log(`Plugin ${pluginId} clicked, navigating to test plugin page`);
    navigate('/plugins/test-plugin');
  };

  const getPluginIcon = () => {
    return <CodeIcon />;
  };

  if (loading && plugins.length === 0) {
    console.log('Loading plugins...');
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    console.warn('Error loading plugins:', error);
    return (
      <Alert
        severity="error"
        action={
          <Button color="inherit" size="small" onClick={handleRefresh}>
            Retry
          </Button>
        }
      >
        {error}
      </Alert>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Installed Plugins</Typography>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={handleRefresh}
          disabled={loading}
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </Button>
      </Box>

      {plugins.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'background.paper' }}>
          <Typography variant="body1" color="text.secondary">
            No plugins installed. Install a plugin to get started.
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {plugins.map((plugin) => (
            <Grid item xs={12} sm={6} md={4} key={plugin.id}>
              <Zoom in={true}>
                <Paper
                  elevation={2}
                  onClick={() => handlePluginClick(plugin.id)}
                  sx={{
                    p: 2,
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: 3,
                      cursor: 'pointer',
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: '8px',
                        bgcolor: 'primary.main',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'primary.contrastText',
                        mr: 2,
                      }}
                    >
                      {getPluginIcon()}
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" noWrap>
                        {plugin.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        v{plugin.version}
                      </Typography>
                    </Box>
                    <Chip
                      label={plugin.enabled ? 'Enabled' : 'Disabled'}
                      size="small"
                      color={plugin.enabled ? 'success' : 'default'}
                      variant="outlined"
                    />
                  </Box>

                  <Typography variant="body2" sx={{ mb: 2, flexGrow: 1 }}>
                    {plugin.description}
                  </Typography>

                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <PersonIcon fontSize="small" color="action" sx={{ mr: 0.5 }} />
                    <Typography variant="caption" color="text.secondary">
                      {plugin.author}
                    </Typography>
                  </Box>

                  <Divider sx={{ my: 1 }} />

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 'auto' }}>
                    <Box>
                      <Tooltip title="Uninstall">
                        <IconButton
                          size="small"
                          onClick={() => handleUninstall(plugin.id)}
                          disabled={uninstallingPlugin === plugin.id}
                          color="error"
                        >
                          {uninstallingPlugin === plugin.id ? (
                            <CircularProgress size={20} />
                          ) : (
                            <DeleteIcon fontSize="small" />
                          )}
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="View Details">
                        <IconButton size="small" color="primary">
                          <InfoIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                </Paper>
              </Zoom>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default InstalledApps;
