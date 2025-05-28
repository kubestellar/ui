import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Chip,
  Tooltip,
  IconButton,
  // Switch,
  List,
  ListItem,
  CircularProgress,
  // Fade,
  Zoom,
  // Dialog,
  // DialogActions,
  // Button,
  // useTheme,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Power as PowerIcon,
  // PowerOff as PowerOffIcon,
  // ContentCopy as ContentCopyIcon,
  Link as LinkIcon,
} from '@mui/icons-material';

interface Plugin {
  name: string;
  description: string;
  icon: JSX.Element;
  enabled: boolean;
  route: string;
  visible: boolean;
  version: string;
  tags: string[];
}

const InstalledApps: React.FC = () => {
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [uninstallingPlugin, setUninstallingPlugin] = useState<string | null>(null);

  // const theme = useTheme();

  // Initialize default plugins in localStorage if not present
  useEffect(() => {
    const savedPlugins = localStorage.getItem('installedPlugins');
    if (!savedPlugins) {
      const defaultPlugins = ['log-summarizer']; // Add more default plugins as needed
      localStorage.setItem('installedPlugins', JSON.stringify(defaultPlugins));
    }
  }, []);

  // Load plugins from localStorage
  useEffect(() => {
    const savedPlugins = localStorage.getItem('installedPlugins');
    if (savedPlugins) {
      const pluginNames = JSON.parse(savedPlugins);
      const pluginsData = pluginNames.map((name: string) => {
        switch (name) {
          case 'secrets-manager':
            return {
              name: 'Secrets Manager',
              description: 'Manage Kubernetes secrets and configurations',
              icon: <PowerIcon />,
              enabled: true,
              route: '/plugins/secrets-ui-manager',
              visible: true,
              version: '1.0.0',
              tags: ['security', 'configuration']
            };
          case 'log-summarizer':
            return {
              name: 'Log Summarizer',
              description: 'View summarized logs for your pods',
              icon: <LinkIcon />,
              enabled: true,
              route: '/plugin/log-summarizer',
              visible: true,
              version: '1.1.0',
              tags: ['logging', 'monitoring']
            };
          case 'quota-visualiser':
            return {
              name: 'Quota visualiser',
              description: 'Resource quota visualization plugin',
              icon: <PowerIcon />,
              enabled: true,
              route: '/plugin/quota-visualiser',
              visible: true,
              version: '0.9.4',
              tags: ['resource', 'visualization']
            };
          default:
            return null;
        }
      }).filter(Boolean);
      setPlugins(pluginsData);
    }
  }, []);

  // Handle URL activation parameter
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const activatePlugin = urlParams.get('activate');
    
    if (activatePlugin === 'quota-visualiser') {
      // Add quota-visualiser to installed plugins
      const installedPlugins = JSON.parse(localStorage.getItem('installedPlugins') || '[]');
      if (!installedPlugins.includes('quota-visualiser')) {
        localStorage.setItem('installedPlugins', JSON.stringify([...installedPlugins, 'quota-visualiser']));
        // Refresh plugins list
        setPlugins(prev => [...prev, {
          name: 'Quota visualiser',
          description: 'Resource quota visualization plugin',
          icon: <PowerIcon />,
          enabled: true,
          route: '/plugin/quota-visualiser',
          visible: true,
          version: '0.9.4',
          tags: ['resource', 'visualization']
        }]);
      }
    }
  }, []);

  const handleUninstall = async (plugin: Plugin) => {
    if (!window.confirm(`Are you sure you want to uninstall ${plugin.name}?`)) return;

    setUninstallingPlugin(plugin.name);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update installed plugins
      const installedPlugins = JSON.parse(localStorage.getItem('installedPlugins') || '[]');
      const newInstalledPlugins = installedPlugins.filter((p: string) => p !== plugin.name);
      localStorage.setItem('installedPlugins', JSON.stringify(newInstalledPlugins));
      
      // Remove from plugins list
      setPlugins(prev => prev.filter(p => p.name !== plugin.name));
    } catch (error) {
      console.error('Failed to uninstall plugin:', error);
    } finally {
      setUninstallingPlugin(null);
    }
  };

  const handlePluginClick = (route: string) => {
    if (route) {
      window.location.href = route;
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ mb: 3 }}>
        Installed Plugins
      </Typography>
      
      <List sx={{ width: '100%', p: 0, mb: 2 }}>
        {plugins.map((plugin) => (
          <Zoom in={true} timeout={600} key={plugin.name}>
            <ListItem
              sx={{
                mb: 2,
                p: 2,
                bgcolor: 'rgba(30, 41, 59, 0.6)',
                borderRadius: 1,
                transition: 'all 0.3s ease',
                '&:hover': {
                  bgcolor: 'rgba(30, 41, 59, 0.8)',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
                },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
                  {plugin.icon}
                  <Box>
                    <Typography variant="subtitle1" sx={{ color: '#e2e8f0', fontWeight: 600 }}>
                      {plugin.name}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#94a3b8', fontSize: '0.875rem' }}>
                      {plugin.description}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                      {plugin.tags?.map((tag) => (
                        <Chip
                          key={tag}
                          label={tag}
                          size="small"
                          sx={{
                            bgcolor: 'rgba(59, 130, 246, 0.1)',
                            color: '#7dd3fc',
                            fontSize: '0.75rem',
                          }}
                        />
                      ))}
                    </Box>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Tooltip title="Uninstall">
                    <IconButton
                      onClick={() => handleUninstall(plugin)}
                      disabled={uninstallingPlugin === plugin.name}
                      sx={{
                        color: '#ef4444',
                        '&:hover': {
                          bgcolor: 'rgba(239, 68, 68, 0.1)',
                        },
                      }}
                    >
                      {uninstallingPlugin === plugin.name ? (
                        <CircularProgress size={20} sx={{ color: 'inherit' }} />
                      ) : (
                        <DeleteIcon />
                      )}
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Open Plugin">
                    <IconButton
                      onClick={() => handlePluginClick(plugin.route)}
                      sx={{
                        color: '#3b82f6',
                        '&:hover': {
                          bgcolor: 'rgba(59, 130, 246, 0.1)',
                        },
                      }}
                    >
                      <LinkIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
            </ListItem>
          </Zoom>
        ))}
      </List>
    </Box>
  );
};

export default InstalledApps;
