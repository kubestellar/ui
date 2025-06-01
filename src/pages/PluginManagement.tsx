/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useMemo } from 'react';
import {
  Paper,
  Box,
  Typography,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Grid,
  Card,
  CardContent,
  CardActions,
  Chip,
  CircularProgress,
  Alert,
  Snackbar,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Tooltip,
  Menu,
  MenuItem,
  IconButton,
} from '@mui/material';
import {
  GitHub as GitHubIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  CheckCircle,
  Error as ErrorIcon,
  Download as DownloadIcon,
  Extension as ExtensionIcon,
  ExpandMore as ExpandMoreIcon,
  MoreVert as MoreVertIcon,
  Info as InfoIcon,
  Api as ApiIcon,
  HealthAndSafety as HealthIcon,
  Warning as WarningIcon,
  Store as StoreIcon,
} from '@mui/icons-material';
import { usePluginQueries } from '../hooks/queries/usePluginQueries';
import useTheme from '../stores/themeStore';
import { toast } from 'react-hot-toast';
import {
  PluginService,
  PluginHealthResponse,
  EndpointConfig,
  PluginMetadata,
} from '../services/pluginService';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel = ({ children, value, index, ...other }: TabPanelProps) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`plugin-tabpanel-${index}`}
      aria-labelledby={`plugin-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
};

const PluginManagement: React.FC = () => {
  const theme = useTheme(state => state.theme);
  const {
    usePlugins,
    useAvailablePlugins,
    useInstallGitHubRepository,
    useLoadLocalPlugin,
    useUnloadPlugin,
  } = usePluginQueries();

  const [activeTab, setActiveTab] = useState(0);
  const [repoUrl, setRepoUrl] = useState('');
  const [pluginPath, setPluginPath] = useState(
    '/Users/ishaan743/Kubestellar/ui/backend/example_plugins/cluster-plugin/kubestellar-cluster-plugin.so'
  );
  const [manifestPath, setManifestPath] = useState(
    '/Users/ishaan743/Kubestellar/ui/backend/example_plugins/cluster-plugin/plugin.yaml'
  );
  const [showInstallDialog, setShowInstallDialog] = useState(false);
  const [showFileDialog, setShowFileDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [pluginStatuses, setPluginStatuses] = useState<Record<string, PluginHealthResponse>>({});
  const [pluginEndpoints, setPluginEndpoints] = useState<Record<string, EndpointConfig[]>>({});
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedPlugin, setSelectedPlugin] = useState<string | null>(null);
  const [isUninstalling, setIsUninstalling] = useState<string | null>(null);

  // Queries
  const { data: loadedPluginsData, isLoading, refetch: refetchPlugins } = usePlugins();
  const { data: availablePlugins } = useAvailablePlugins();

  const loadedPlugins = useMemo(() => {
    return loadedPluginsData?.plugins || [];
  }, [loadedPluginsData?.plugins]);

  // Mutations
  const installGitHubRepo = useInstallGitHubRepository();
  const loadLocalPlugin = useLoadLocalPlugin();
  const unloadPlugin = useUnloadPlugin();

  // Helper function to check if plugin is loaded
  const isPluginLoaded = (pluginId: string): boolean => {
    return loadedPluginsData?.pluginsMap[pluginId] != null;
  };

  // Fetch plugin statuses and endpoints
  useEffect(() => {
    const fetchPluginStatuses = async () => {
      try {
        const statuses = await PluginService.getAllPluginStatuses();
        setPluginStatuses(statuses);

        // Fetch endpoints for each plugin
        const endpoints: Record<string, EndpointConfig[]> = {};
        await Promise.all(
          loadedPlugins.map(async (plugin: PluginMetadata) => {
            endpoints[plugin.ID] = await PluginService.getPluginEndpoints(plugin.ID);
          })
        );
        setPluginEndpoints(endpoints);
      } catch (error) {
        console.error('Error fetching plugin statuses:', error);
      }
    };

    if (loadedPlugins.length > 0) {
      fetchPluginStatuses();
    }
  }, [loadedPlugins]);

  useEffect(() => {
    // Handle auto-install success - detect if user came from auto-install
    const urlParams = new URLSearchParams(window.location.search);
    const fromAutoInstall = urlParams.get('from-auto-install');

    if (fromAutoInstall === 'true') {
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);

      toast.success('🎉 Plugin installed successfully via one-click install!');
      setSuccessMessage('Plugin installed successfully via one-click install!');

      refetchPlugins();

      console.log('🎉 Auto-install completed, refreshing plugins list');
    }
  }, [refetchPlugins]);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  // Update installation handlers
  const handleInstallFromGitHub = async () => {
    if (!repoUrl.trim()) {
      toast.error('Please enter a repository URL');
      return;
    }

    try {
      await installGitHubRepo.mutateAsync({
        repoUrl: repoUrl.trim(),
        autoUpdate: true,
        updateInterval: 30,
      });
      setRepoUrl('');
      setShowInstallDialog(false);
      setSuccessMessage('Plugin installed successfully from repository!');
    } catch (error) {
      console.error('Failed to install plugin:', error);
    }
  };

  const handleInstallFromFile = async () => {
    if (!pluginPath.trim() || !manifestPath.trim()) {
      toast.error('Please enter both plugin and manifest paths');
      return;
    }

    try {
      await loadLocalPlugin.mutateAsync({
        pluginPath: pluginPath.trim(),
        manifestPath: manifestPath.trim(),
      });
      setPluginPath('');
      setManifestPath('');
      setShowFileDialog(false);
      setSuccessMessage('Plugin loaded successfully for testing!');
    } catch (error) {
      console.error('Failed to load plugin from file:', error);
    }
  };

  const handleUninstall = async (pluginId: string) => {
    if (
      !window.confirm(
        `Are you sure you want to uninstall "${pluginId}"?\n\nThis will stop the plugin and remove it from the system.`
      )
    ) {
      return;
    }

    setIsUninstalling(pluginId);
    try {
      await unloadPlugin.mutateAsync(pluginId);
      setSuccessMessage(`Plugin "${pluginId}" uninstalled successfully!`);
      toast.success(`Plugin "${pluginId}" uninstalled successfully!`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Failed to uninstall plugin:', error);
      toast.error(`Failed to uninstall plugin: ${errorMessage}`);
    } finally {
      setIsUninstalling(null);
    }
  };

  const handleTestEndpoint = async (pluginId: string, endpoint: EndpointConfig) => {
    try {
      const result = await PluginService.testPluginEndpoint(pluginId, endpoint);
      if (result.success) {
        toast.success(`Endpoint ${endpoint.Method} ${endpoint.Path} responded successfully`);
        console.log('Endpoint response:', result.data);
      } else {
        toast.error(`Endpoint failed: ${result.error}`);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`Failed to test endpoint: ${errorMessage}`);
    }
  };

  const handleCheckHealth = async (pluginId: string) => {
    try {
      const health = await PluginService.getPluginHealth(pluginId);
      setPluginStatuses(prev => ({ ...prev, [pluginId]: health }));

      if (health.status === 'healthy') {
        toast.success(`Plugin "${pluginId}" is healthy`);
      } else {
        toast.error(`Plugin "${pluginId}" is unhealthy: ${health.error}`);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`Failed to check health: ${errorMessage}`);
    }
  };

  const getStatusChip = (pluginId: string) => {
    const isLoaded = isPluginLoaded(pluginId);
    const health = pluginStatuses[pluginId];

    if (!isLoaded) {
      return <Chip icon={<ErrorIcon />} label="Not Loaded" color="default" size="small" />;
    }

    if (!health) {
      return <Chip icon={<WarningIcon />} label="Unknown" color="warning" size="small" />;
    }

    return (
      <Chip
        icon={health.status === 'healthy' ? <CheckCircle /> : <ErrorIcon />}
        label={health.status === 'healthy' ? 'Healthy' : 'Unhealthy'}
        color={health.status === 'healthy' ? 'success' : 'error'}
        size="small"
      />
    );
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, pluginId: string) => {
    setAnchorEl(event.currentTarget);
    setSelectedPlugin(pluginId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedPlugin(null);
  };

  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '50vh',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        <CircularProgress size={40} />
        <Typography variant="h6" sx={{ color: theme === 'dark' ? '#AEBEDF' : 'text.secondary' }}>
          Loading plugins...
        </Typography>
      </Box>
    );
  }

  // Add a new tab for GitHub repository management
  const isInstalling = installGitHubRepo.isPending || loadLocalPlugin.isPending;

  return (
    <Paper
      sx={{
        maxWidth: '100%',
        margin: 'auto',
        p: 3,
        backgroundColor: theme === 'dark' ? '#0F172A' : '#fff',
        boxShadow: theme === 'dark' ? '0px 4px 10px rgba(0, 0, 0, 0.6)' : undefined,
        color: theme === 'dark' ? '#E5E7EB' : 'inherit',
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Plugin Management
          </Typography>
          <Typography
            variant="body1"
            sx={{ color: theme === 'dark' ? '#AEBEDF' : 'text.secondary' }}
          >
            Install, manage, and configure dynamic plugins for KubeStellar
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => refetchPlugins()}
            sx={{
              color: theme === 'dark' ? '#E5E7EB' : undefined,
              borderColor: theme === 'dark' ? '#374151' : undefined,
            }}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<GitHubIcon />}
            onClick={() => setShowInstallDialog(true)}
          >
            Install from Repository
          </Button>
          <Button
            variant="outlined"
            startIcon={<ExtensionIcon />}
            onClick={() => setShowFileDialog(true)}
          >
            Load Local Plugin
          </Button>
        </Box>
      </Box>

      {/* Installation Progress */}
      {isInstalling && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CircularProgress size={16} />
            <Typography>
              {installGitHubRepo.isPending
                ? 'Installing from repository...'
                : 'Loading local plugin...'}
            </Typography>
          </Box>
        </Alert>
      )}

      {/* Updated Tabs with proper dark mode styling */}
      <Box sx={{ borderBottom: 1, borderColor: theme === 'dark' ? '#374151' : 'divider', mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          sx={{
            '& .MuiTab-root': {
              color: theme === 'dark' ? '#9CA3AF' : 'text.secondary',
              fontSize: '0.875rem',
              fontWeight: 500,
              textTransform: 'none',
              '&.Mui-selected': {
                color: theme === 'dark' ? '#3B82F6' : 'primary.main',
              },
              '&:hover': {
                color: theme === 'dark' ? '#E5E7EB' : 'text.primary',
              },
            },
            '& .MuiTabs-indicator': {
              backgroundColor: theme === 'dark' ? '#3B82F6' : 'primary.main',
              height: 3,
            },
            '& .MuiSvgIcon-root': {
              color: 'inherit',
            },
          }}
        >
          <Tab
            label={`Installed Plugins (${loadedPlugins?.length || 0})`}
            icon={<ExtensionIcon />}
            iconPosition="start"
            sx={{
              minHeight: 64,
              '& .MuiTab-iconWrapper': {
                marginBottom: '0 !important',
                marginRight: 1,
              },
            }}
          />
          <Tab
            label={`Plugin Store (${availablePlugins?.length || 0})`}
            icon={<StoreIcon />}
            iconPosition="start"
            sx={{
              minHeight: 64,
              '& .MuiTab-iconWrapper': {
                marginBottom: '0 !important',
                marginRight: 1,
              },
            }}
          />
        </Tabs>
      </Box>

      {/* Installed Plugins Tab */}
      <TabPanel value={activeTab} index={0}>
        {loadedPlugins.length === 0 ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              py: 8,
              textAlign: 'center',
            }}
          >
            <ExtensionIcon
              sx={{ fontSize: 64, color: theme === 'dark' ? '#6B7280' : 'text.secondary', mb: 2 }}
            />
            <Typography
              variant="h6"
              gutterBottom
              sx={{ color: theme === 'dark' ? '#E5E7EB' : 'text.primary' }}
            >
              No plugins installed yet
            </Typography>
            <Typography
              variant="body1"
              sx={{
                color: theme === 'dark' ? '#AEBEDF' : 'text.secondary',
                mb: 3,
              }}
            >
              Install plugins from repositories or load local plugins for testing.
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="contained"
                startIcon={<GitHubIcon />}
                onClick={() => setShowInstallDialog(true)}
              >
                Install from Repository
              </Button>
              <Button
                variant="outlined"
                startIcon={<ExtensionIcon />}
                onClick={() => setShowFileDialog(true)}
              >
                Load Local Plugin
              </Button>
            </Box>
          </Box>
        ) : (
          <Grid container spacing={3}>
            {loadedPlugins.map((plugin: PluginMetadata) => (
              <Grid item xs={12} md={6} lg={4} key={plugin.ID}>
                <Card
                  sx={{
                    backgroundColor: theme === 'dark' ? '#1E293B' : '#fff',
                    border: theme === 'dark' ? '1px solid #374151' : undefined,
                    color: theme === 'dark' ? '#E5E7EB' : 'inherit',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        mb: 2,
                      }}
                    >
                      <Typography
                        variant="h6"
                        component="h3"
                        sx={{
                          flexGrow: 1,
                          mr: 1,
                          color: theme === 'dark' ? '#E5E7EB' : 'text.primary',
                        }}
                      >
                        {plugin.Name}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {getStatusChip(plugin.ID)}
                        <IconButton
                          size="small"
                          onClick={e => handleMenuOpen(e, plugin.ID)}
                          sx={{ color: theme === 'dark' ? '#E5E7EB' : undefined }}
                        >
                          <MoreVertIcon />
                        </IconButton>
                      </Box>
                    </Box>

                    <Typography
                      variant="body2"
                      sx={{
                        mb: 2,
                        color: theme === 'dark' ? '#AEBEDF' : 'text.secondary',
                      }}
                    >
                      {plugin.Description}
                    </Typography>

                    <Box sx={{ mb: 1 }}>
                      <Typography
                        variant="caption"
                        sx={{
                          color: theme === 'dark' ? '#9CA3AF' : 'text.secondary',
                        }}
                      >
                        <strong>Version:</strong> {plugin.Version}
                      </Typography>
                    </Box>
                    <Box sx={{ mb: 1 }}>
                      <Typography
                        variant="caption"
                        sx={{
                          color: theme === 'dark' ? '#9CA3AF' : 'text.secondary',
                        }}
                      >
                        <strong>Author:</strong> {plugin.Author}
                      </Typography>
                    </Box>
                    <Box sx={{ mb: 2 }}>
                      <Typography
                        variant="caption"
                        sx={{
                          color: theme === 'dark' ? '#9CA3AF' : 'text.secondary',
                        }}
                      >
                        <strong>Endpoints:</strong> {plugin.Endpoints.length} routes
                      </Typography>
                    </Box>

                    {/* Plugin Endpoints Accordion */}
                    {plugin.Endpoints.length > 0 && (
                      <Accordion
                        sx={{
                          backgroundColor: 'transparent',
                          boxShadow: 'none',
                          color: theme === 'dark' ? '#E5E7EB' : 'inherit',
                        }}
                      >
                        <AccordionSummary
                          expandIcon={
                            <ExpandMoreIcon
                              sx={{ color: theme === 'dark' ? '#E5E7EB' : 'inherit' }}
                            />
                          }
                        >
                          <Typography
                            variant="body2"
                            sx={{ color: theme === 'dark' ? '#E5E7EB' : 'text.primary' }}
                          >
                            <ApiIcon sx={{ fontSize: 16, mr: 1, verticalAlign: 'middle' }} />
                            View Endpoints ({plugin.Endpoints.length})
                          </Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                          <List dense>
                            {plugin.Endpoints.map((endpoint, index) => (
                              <ListItem
                                key={index}
                                sx={{ color: theme === 'dark' ? '#E5E7EB' : 'inherit' }}
                                secondaryAction={
                                  <Button
                                    size="small"
                                    onClick={() => handleTestEndpoint(plugin.ID, endpoint)}
                                  >
                                    Test
                                  </Button>
                                }
                              >
                                <ListItemIcon>
                                  <Chip
                                    label={endpoint.Method}
                                    size="small"
                                    color={endpoint.Method === 'GET' ? 'primary' : 'secondary'}
                                  />
                                </ListItemIcon>
                                <ListItemText
                                  primary={endpoint.Path}
                                  secondary={endpoint.Handler}
                                  sx={{
                                    '& .MuiListItemText-primary': {
                                      color: theme === 'dark' ? '#E5E7EB' : 'text.primary',
                                    },
                                    '& .MuiListItemText-secondary': {
                                      color: theme === 'dark' ? '#9CA3AF' : 'text.secondary',
                                    },
                                  }}
                                />
                              </ListItem>
                            ))}
                          </List>
                        </AccordionDetails>
                      </Accordion>
                    )}
                  </CardContent>

                  <CardActions>
                    <Tooltip title="Check plugin health">
                      <Button
                        size="small"
                        startIcon={<HealthIcon />}
                        onClick={() => handleCheckHealth(plugin.ID)}
                      >
                        Health
                      </Button>
                    </Tooltip>
                    <Button
                      size="small"
                      color="error"
                      startIcon={
                        isUninstalling === plugin.ID ? (
                          <CircularProgress size={16} />
                        ) : (
                          <DeleteIcon />
                        )
                      }
                      onClick={() => handleUninstall(plugin.ID)}
                      disabled={isUninstalling === plugin.ID}
                    >
                      {isUninstalling === plugin.ID ? 'Uninstalling...' : 'Uninstall'}
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </TabPanel>

      {/* Plugin Store Tab */}
      <TabPanel value={activeTab} index={1}>
        {(availablePlugins?.length || 0) === 0 ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              py: 8,
              textAlign: 'center',
            }}
          >
            <StoreIcon
              sx={{
                fontSize: 64,
                color: theme === 'dark' ? '#6B7280' : 'text.secondary',
                mb: 2,
              }}
            />
            <Typography
              variant="h6"
              gutterBottom
              sx={{ color: theme === 'dark' ? '#E5E7EB' : 'text.primary' }}
            >
              No plugins available in the store
            </Typography>
            <Typography
              variant="body1"
              sx={{
                color: theme === 'dark' ? '#AEBEDF' : 'text.secondary',
                mb: 3,
              }}
            >
              Check back later for new plugins or install from custom repositories.
            </Typography>
            <Button
              variant="contained"
              startIcon={<GitHubIcon />}
              onClick={() => setShowInstallDialog(true)}
            >
              Install Custom Plugin
            </Button>
          </Box>
        ) : (
          <Grid container spacing={3}>
            {(availablePlugins || []).map((plugin: any) => (
              <Grid item xs={12} md={6} lg={4} key={plugin.id}>
                <Card
                  sx={{
                    backgroundColor: theme === 'dark' ? '#1E293B' : '#fff',
                    border: theme === 'dark' ? '1px solid #374151' : undefined,
                    color: theme === 'dark' ? '#E5E7EB' : 'inherit',
                  }}
                >
                  <CardContent>
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        mb: 2,
                      }}
                    >
                      <Typography
                        variant="h6"
                        component="h3"
                        sx={{ color: theme === 'dark' ? '#E5E7EB' : 'text.primary' }}
                      >
                        {plugin.name}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        {plugin.official && <Chip label="Official" color="primary" size="small" />}
                        {getStatusChip(plugin.id)}
                      </Box>
                    </Box>
                    <Typography
                      variant="body2"
                      sx={{
                        mb: 2,
                        color: theme === 'dark' ? '#AEBEDF' : 'text.secondary',
                      }}
                    >
                      {plugin.description}
                    </Typography>
                    <Box sx={{ mb: 1 }}>
                      <Typography
                        variant="caption"
                        sx={{ color: theme === 'dark' ? '#9CA3AF' : 'text.secondary' }}
                      >
                        Version: {plugin.version}
                      </Typography>
                    </Box>
                    <Box sx={{ mb: 1 }}>
                      <Typography
                        variant="caption"
                        color="primary"
                        component="a"
                        href={plugin.repoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{ textDecoration: 'none' }}
                      >
                        View on GitHub
                      </Typography>
                    </Box>
                  </CardContent>
                  <CardActions>
                    {isPluginLoaded(plugin.id) ? (
                      <Button size="small" disabled startIcon={<CheckCircle />}>
                        Installed
                      </Button>
                    ) : (
                      <Button
                        size="small"
                        variant="contained"
                        startIcon={<DownloadIcon />}
                        onClick={() => {
                          setRepoUrl(plugin.repoUrl);
                          setShowInstallDialog(true);
                        }}
                        disabled={isInstalling}
                      >
                        Install
                      </Button>
                    )}
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </TabPanel>

      {/* Plugin Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          sx: {
            backgroundColor: theme === 'dark' ? '#1E293B' : '#fff',
            border: theme === 'dark' ? '1px solid #374151' : undefined,
            color: theme === 'dark' ? '#E5E7EB' : 'inherit',
          },
        }}
      >
        <MenuItem
          onClick={() => {
            if (selectedPlugin) handleCheckHealth(selectedPlugin);
            handleMenuClose();
          }}
          sx={{
            color: theme === 'dark' ? '#E5E7EB' : 'text.primary',
            '&:hover': {
              backgroundColor: theme === 'dark' ? '#374151' : 'action.hover',
            },
          }}
        >
          <ListItemIcon>
            <HealthIcon
              fontSize="small"
              sx={{ color: theme === 'dark' ? '#E5E7EB' : 'text.primary' }}
            />
          </ListItemIcon>
          <ListItemText>Check Health</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (selectedPlugin) {
              const endpoints = pluginEndpoints[selectedPlugin] || [];
              const endpointsList = endpoints.map(ep => `${ep.Method} ${ep.Path}`).join('\n');
              alert(
                `Available endpoints for ${selectedPlugin}:\n\n${endpointsList || 'No endpoints found'}`
              );
            }
            handleMenuClose();
          }}
          sx={{
            color: theme === 'dark' ? '#E5E7EB' : 'text.primary',
            '&:hover': {
              backgroundColor: theme === 'dark' ? '#374151' : 'action.hover',
            },
          }}
        >
          <ListItemIcon>
            <ApiIcon
              fontSize="small"
              sx={{ color: theme === 'dark' ? '#E5E7EB' : 'text.primary' }}
            />
          </ListItemIcon>
          <ListItemText>View Endpoints</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (selectedPlugin) {
              const plugin = loadedPlugins.find((p: PluginMetadata) => p.ID === selectedPlugin);
              if (plugin) {
                const info = `Plugin: ${plugin.Name}\nID: ${plugin.ID}\nVersion: ${plugin.Version}\nAuthor: ${plugin.Author}\nDescription: ${plugin.Description}\nEndpoints: ${plugin.Endpoints.length}`;
                alert(info);
              }
            }
            handleMenuClose();
          }}
          sx={{
            color: theme === 'dark' ? '#E5E7EB' : 'text.primary',
            '&:hover': {
              backgroundColor: theme === 'dark' ? '#374151' : 'action.hover',
            },
          }}
        >
          <ListItemIcon>
            <InfoIcon
              fontSize="small"
              sx={{ color: theme === 'dark' ? '#E5E7EB' : 'text.primary' }}
            />
          </ListItemIcon>
          <ListItemText>Plugin Info</ListItemText>
        </MenuItem>
      </Menu>

      {/* Install from Repository Dialog */}
      <Dialog
        open={showInstallDialog}
        onClose={() => setShowInstallDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: theme === 'dark' ? '#1E293B' : '#fff',
            color: theme === 'dark' ? '#E5E7EB' : 'inherit',
          },
        }}
      >
        <DialogTitle sx={{ color: theme === 'dark' ? '#E5E7EB' : 'text.primary' }}>
          Install Plugin from Repository
        </DialogTitle>
        <DialogContent>
          <Typography
            variant="body2"
            sx={{
              mb: 2,
              color: theme === 'dark' ? '#AEBEDF' : 'text.secondary',
            }}
          >
            Enter the GitHub repository URL to install and build a plugin automatically
          </Typography>
          <TextField
            autoFocus
            margin="dense"
            label="Repository URL"
            type="url"
            fullWidth
            variant="outlined"
            value={repoUrl}
            onChange={e => setRepoUrl(e.target.value)}
            placeholder="https://github.com/username/plugin-repo"
            sx={{
              '& .MuiOutlinedInput-root': {
                color: theme === 'dark' ? '#E5E7EB' : undefined,
              },
              '& .MuiInputLabel-root': {
                color: theme === 'dark' ? '#AEBEDF' : undefined,
              },
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowInstallDialog(false)}>Cancel</Button>
          <Button
            onClick={handleInstallFromGitHub}
            variant="contained"
            disabled={isInstalling || !repoUrl.trim()}
          >
            {isInstalling ? <CircularProgress size={20} /> : 'Install'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Load Local Plugin Dialog */}
      <Dialog
        open={showFileDialog}
        onClose={() => setShowFileDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: theme === 'dark' ? '#1E293B' : '#fff',
            color: theme === 'dark' ? '#E5E7EB' : 'inherit',
          },
        }}
      >
        <DialogTitle>Load Local Plugin for Testing</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Load a pre-built plugin from local files for development and testing
          </Typography>
          <TextField
            margin="dense"
            label="Plugin File Path (.so)"
            type="text"
            fullWidth
            variant="outlined"
            value={pluginPath}
            onChange={e => setPluginPath(e.target.value)}
            placeholder="/path/to/plugin.so"
            sx={{
              mb: 2,
              '& .MuiOutlinedInput-root': {
                color: theme === 'dark' ? '#E5E7EB' : undefined,
              },
              '& .MuiInputLabel-root': {
                color: theme === 'dark' ? '#AEBEDF' : undefined,
              },
            }}
          />
          <TextField
            margin="dense"
            label="Manifest File Path (.yaml)"
            type="text"
            fullWidth
            variant="outlined"
            value={manifestPath}
            onChange={e => setManifestPath(e.target.value)}
            placeholder="/path/to/plugin.yaml"
            sx={{
              '& .MuiOutlinedInput-root': {
                color: theme === 'dark' ? '#E5E7EB' : undefined,
              },
              '& .MuiInputLabel-root': {
                color: theme === 'dark' ? '#AEBEDF' : undefined,
              },
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowFileDialog(false)}>Cancel</Button>
          <Button
            onClick={handleInstallFromFile}
            variant="contained"
            disabled={isInstalling || !pluginPath.trim() || !manifestPath.trim()}
          >
            {isInstalling ? <CircularProgress size={20} /> : 'Load Plugin'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success Message */}
      <Snackbar
        open={!!successMessage}
        autoHideDuration={6000}
        onClose={() => setSuccessMessage('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSuccessMessage('')}
          severity="success"
          sx={{
            width: '100%',
            backgroundColor: theme === 'dark' ? '#1E4620' : undefined,
            color: theme === 'dark' ? '#E5E7EB' : undefined,
          }}
        >
          {successMessage}
        </Alert>
      </Snackbar>
    </Paper>
  );
};

export default PluginManagement;
