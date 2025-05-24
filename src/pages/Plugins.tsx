import { useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  Divider,
  CircularProgress,
} from '@mui/material';
import { toast } from 'react-hot-toast';
import { usePluginQueries, Plugin } from '../hooks/usePluginQueries';
import PluginDetailsPanel from '../components/PluginDetailsPanel';
import useTheme from '../stores/themeStore';

const Plugins = () => {
  const { usePlugins } = usePluginQueries();
  const { data: plugins, isLoading, error } = usePlugins();
  const [selectedPlugin, setSelectedPlugin] = useState<Plugin | null>(null);
  const theme = useTheme(state => state.theme);
  const isDark = theme === 'dark';

  const handleViewDetails = (plugin: Plugin) => {
    setSelectedPlugin(plugin);
    toast(`Viewing ${plugin.name} details`, {
      icon: '🔌',
      style: {
        background: isDark ? 'rgba(30, 41, 59, 0.9)' : 'rgba(255, 255, 255, 0.9)',
        color: isDark ? '#fff' : '#334155',
      },
    });
  };

  const handleCloseDetails = () => {
    setSelectedPlugin(null);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'success';
      case 'inactive':
        return 'error';
      default:
        return 'warning';
    }
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="80vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 4 }}>
        <Typography variant="h6" color="error">
          Error loading plugins: {error instanceof Error ? error.message : 'Unknown error'}
        </Typography>
      </Box>
    );
  }

  if (!plugins || plugins.length === 0) {
    return (
      <Box sx={{ p: 4 }}>
        <Typography variant="h6">No plugins available</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" sx={{ mb: 4 }}>
        KubeStellar Plugins
      </Typography>
      <Typography variant="body1" sx={{ mb: 4 }}>
        Manage and monitor all available plugins for your KubeStellar instance.
      </Typography>

      <Grid container spacing={3}>
        {plugins.map(plugin => (
          <Grid item xs={12} sm={6} md={4} key={plugin.name}>
            <Card
              elevation={3}
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                transition: 'transform 0.2s, box-shadow 0.2s',
                backgroundColor: isDark ? 'rgba(15, 23, 42, 0.8)' : '#ffffff',
                border: isDark
                  ? '1px solid rgba(255, 255, 255, 0.1)'
                  : '1px solid rgba(0, 0, 0, 0.05)',
                backdropFilter: 'blur(10px)',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: isDark
                    ? '0 6px 20px rgba(0, 0, 0, 0.3), 0 0 15px rgba(255, 255, 255, 0.05)'
                    : '0 6px 20px rgba(0, 0, 0, 0.1)',
                },
              }}
            >
              <CardContent sx={{ flexGrow: 1 }}>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mb: 2,
                  }}
                >
                  <Typography variant="h6" component="div">
                    {plugin.name}
                  </Typography>
                  <Chip
                    label={plugin.status}
                    color={getStatusColor(plugin.status) as 'success' | 'error' | 'warning'}
                    size="small"
                  />
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {plugin.description}
                </Typography>
                <Divider sx={{ my: 1.5 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    Version: {plugin.version}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Type: {plugin.type}
                  </Typography>
                </Box>
              </CardContent>
              <CardActions>
                <Button
                  size="small"
                  onClick={() => handleViewDetails(plugin)}
                  sx={{ fontWeight: 'medium' }}
                >
                  View Details
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {selectedPlugin && (
        <PluginDetailsPanel plugin={selectedPlugin} onClose={handleCloseDetails} />
      )}
    </Box>
  );
};

export default Plugins;
