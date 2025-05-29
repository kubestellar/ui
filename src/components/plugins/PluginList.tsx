/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import { MoreVertical, Play, Trash2, Info, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import useTheme from '../../stores/themeStore';

interface Plugin {
  ID: string;
  Name: string;
  Version: string;
  Description: string;
  Author: string;
  Endpoints: Array<{
    Path: string;
    Method: string;
    Handler: string;
  }>;
  Dependencies: string[];
  Permissions: string[];
  status?: 'loaded' | 'error' | 'loading';
}

interface PluginListProps {
  plugins: Record<string, Plugin>;
  loading: boolean;
  onUnload: (pluginId: string) => void;
  onViewDetails: (plugin: Plugin) => void;
  onCheckHealth: (pluginId: string) => void;
}

const PluginList: React.FC<PluginListProps> = ({
  plugins,
  loading,
  onUnload,
  onViewDetails,
  onCheckHealth,
}) => {
  const { theme } = useTheme();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedPlugin, setSelectedPlugin] = useState<Plugin | null>(null);
  const [unloadDialogOpen, setUnloadDialogOpen] = useState(false);
  const [pluginToUnload, setPluginToUnload] = useState<string | null>(null);

  const isDark = theme === 'dark';

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, plugin: Plugin) => {
    setAnchorEl(event.currentTarget);
    setSelectedPlugin(plugin);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedPlugin(null);
  };

  const handleUnloadClick = () => {
    if (selectedPlugin) {
      setPluginToUnload(selectedPlugin.ID);
      setUnloadDialogOpen(true);
    }
    handleMenuClose();
  };

  const handleUnloadConfirm = () => {
    if (pluginToUnload) {
      onUnload(pluginToUnload);
      setUnloadDialogOpen(false);
      setPluginToUnload(null);
    }
  };

  const getStatusIcon = (plugin: Plugin) => {
    switch (plugin.status) {
      case 'loaded':
        return <CheckCircle size={16} className="text-green-500" />;
      case 'error':
        return <AlertCircle size={16} className="text-red-500" />;
      case 'loading':
        return <Clock size={16} className="text-yellow-500" />;
      default:
        return <CheckCircle size={16} className="text-green-500" />;
    }
  };

  const getStatusColor = (plugin: Plugin) => {
    switch (plugin.status) {
      case 'loaded':
        return 'success';
      case 'error':
        return 'error';
      case 'loading':
        return 'warning';
      default:
        return 'success';
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  const pluginList = Object.values(plugins);

  if (pluginList.length === 0) {
    return (
      <Box
        sx={{
          textAlign: 'center',
          py: 8,
          backgroundColor: isDark ? '#1e293b' : '#f8fafc',
          borderRadius: 2,
          border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
        }}
      >
        <Typography variant="h6" color="textSecondary" gutterBottom>
          No Plugins Loaded
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Load your first plugin to get started
        </Typography>
      </Box>
    );
  }

  return (
    <>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {pluginList.map(plugin => (
          <Card
            key={plugin.ID}
            sx={{
              backgroundColor: isDark ? '#1e293b' : '#ffffff',
              border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
              transition: 'all 0.2s ease-in-out',
              '&:hover': {
                boxShadow: isDark
                  ? '0 4px 6px -1px rgba(0, 0, 0, 0.3)'
                  : '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                transform: 'translateY(-1px)',
              },
            }}
          >
            <CardContent>
              <Box
                sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}
              >
                <Box sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    {getStatusIcon(plugin)}
                    <Typography variant="h6" component="h3">
                      {plugin.Name}
                    </Typography>
                    <Chip
                      label={plugin.Version}
                      size="small"
                      variant="outlined"
                      sx={{
                        backgroundColor: isDark ? '#374151' : '#f3f4f6',
                        borderColor: isDark ? '#4b5563' : '#d1d5db',
                      }}
                    />
                    <Chip
                      label={plugin.status || 'loaded'}
                      size="small"
                      color={getStatusColor(plugin) as any}
                      variant="filled"
                    />
                  </Box>

                  <Typography variant="body2" color="textSecondary" sx={{ mb: 2, lineHeight: 1.5 }}>
                    {plugin.Description}
                  </Typography>

                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                    <Typography variant="caption" color="textSecondary">
                      Endpoints:
                    </Typography>
                    {plugin.Endpoints.map((endpoint, index) => (
                      <Chip
                        key={index}
                        label={`${endpoint.Method} ${endpoint.Path}`}
                        size="small"
                        variant="outlined"
                        sx={{
                          fontSize: '0.7rem',
                          height: '20px',
                          backgroundColor: isDark ? '#1f2937' : '#f9fafb',
                        }}
                      />
                    ))}
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography variant="caption" color="textSecondary">
                      Author: {plugin.Author}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      Dependencies: {plugin.Dependencies.length}
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                  <Tooltip title="Check Health">
                    <IconButton
                      size="small"
                      onClick={() => onCheckHealth(plugin.ID)}
                      sx={{ color: isDark ? '#9ca3af' : '#6b7280' }}
                    >
                      <Play size={16} />
                    </IconButton>
                  </Tooltip>

                  <Tooltip title="View Details">
                    <IconButton
                      size="small"
                      onClick={() => onViewDetails(plugin)}
                      sx={{ color: isDark ? '#9ca3af' : '#6b7280' }}
                    >
                      <Info size={16} />
                    </IconButton>
                  </Tooltip>

                  <IconButton
                    size="small"
                    onClick={e => handleMenuOpen(e, plugin)}
                    sx={{ color: isDark ? '#9ca3af' : '#6b7280' }}
                  >
                    <MoreVertical size={16} />
                  </IconButton>
                </Box>
              </Box>
            </CardContent>
          </Card>
        ))}
      </Box>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          sx: {
            backgroundColor: isDark ? '#1f2937' : '#ffffff',
            border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
          },
        }}
      >
        <MenuItem
          onClick={() => {
            onViewDetails(selectedPlugin!);
            handleMenuClose();
          }}
        >
          <Info size={16} style={{ marginRight: 8 }} />
          View Details
        </MenuItem>
        <MenuItem
          onClick={() => {
            onCheckHealth(selectedPlugin!.ID);
            handleMenuClose();
          }}
        >
          <Play size={16} style={{ marginRight: 8 }} />
          Check Health
        </MenuItem>
        <MenuItem onClick={handleUnloadClick} sx={{ color: 'error.main' }}>
          <Trash2 size={16} style={{ marginRight: 8 }} />
          Unload Plugin
        </MenuItem>
      </Menu>

      <Dialog
        open={unloadDialogOpen}
        onClose={() => setUnloadDialogOpen(false)}
        PaperProps={{
          sx: {
            backgroundColor: isDark ? '#1f2937' : '#ffffff',
            border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
          },
        }}
      >
        <DialogTitle>Unload Plugin</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to unload this plugin? This action will remove all plugin routes
            and functionality.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUnloadDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleUnloadConfirm} color="error" variant="contained">
            Unload
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default PluginList;
