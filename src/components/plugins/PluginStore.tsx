/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Grid,
  TextField,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
} from '@mui/material';
import { Search, Download, Star, Github, Package, Shield, Clock } from 'lucide-react';
import useTheme from '../../stores/themeStore';

interface AvailablePlugin {
  id: string;
  name: string;
  description: string;
  version: string;
  repoUrl: string;
  official: boolean;
  author?: string;
  stars?: number;
  downloads?: number;
  lastUpdated?: string;
  categories?: string[];
  compatibility?: {
    kubestellar: string;
    go: string;
  };
}

interface PluginStoreProps {
  availablePlugins: AvailablePlugin[];
  loading: boolean;
  onInstallFromGitHub: (repoUrl: string) => void;
  onRefresh: () => void;
}

const PluginStore: React.FC<PluginStoreProps> = ({
  availablePlugins,
  loading,
  onInstallFromGitHub,
  onRefresh,
}) => {
  const { theme } = useTheme();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [installDialogOpen, setInstallDialogOpen] = useState(false);
  const [selectedPlugin, setSelectedPlugin] = useState<AvailablePlugin | null>(null);

  const isDark = theme === 'dark';

  // Get all unique categories
  const categories = ['all', ...new Set(availablePlugins.flatMap(p => p.categories || []))];

  // Filter plugins based on search and category
  const filteredPlugins = availablePlugins.filter(plugin => {
    const matchesSearch =
      plugin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      plugin.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategory === 'all' ||
      (plugin.categories && plugin.categories.includes(selectedCategory));
    return matchesSearch && matchesCategory;
  });

  const handleInstallClick = (plugin: AvailablePlugin) => {
    setSelectedPlugin(plugin);
    setInstallDialogOpen(true);
  };

  const handleInstallConfirm = () => {
    if (selectedPlugin) {
      onInstallFromGitHub(selectedPlugin.repoUrl);
      setInstallDialogOpen(false);
      setSelectedPlugin(null);
    }
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      'cluster-management': 'primary',
      monitoring: 'secondary',
      security: 'error',
      networking: 'info',
      storage: 'warning',
      development: 'success',
    };
    return colors[category as keyof typeof colors] || 'default';
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <>
      <Box sx={{ mb: 3 }}>
        {/* Search and Filter Bar */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <TextField
            placeholder="Search plugins..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={20} />
                </InputAdornment>
              ),
            }}
            sx={{
              flex: 1,
              minWidth: '300px',
              '& .MuiOutlinedInput-root': {
                backgroundColor: isDark ? '#1f2937' : '#ffffff',
                '& fieldset': {
                  borderColor: isDark ? '#374151' : '#d1d5db',
                },
              },
            }}
          />

          <Button
            variant="outlined"
            onClick={onRefresh}
            startIcon={<Package size={16} />}
            sx={{
              borderColor: isDark ? '#374151' : '#d1d5db',
              color: isDark ? '#e5e7eb' : '#374151',
            }}
          >
            Refresh Registry
          </Button>
        </Box>

        {/* Category Filter */}
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {categories.map(category => (
            <Chip
              key={category}
              label={category.replace('-', ' ').toUpperCase()}
              clickable
              variant={selectedCategory === category ? 'filled' : 'outlined'}
              onClick={() => setSelectedCategory(category)}
              sx={{
                backgroundColor:
                  selectedCategory === category ? (isDark ? '#3b82f6' : '#2563eb') : 'transparent',
                color: selectedCategory === category ? '#ffffff' : isDark ? '#e5e7eb' : '#374151',
                borderColor: isDark ? '#374151' : '#d1d5db',
              }}
            />
          ))}
        </Box>
      </Box>

      {/* Plugin Grid */}
      {filteredPlugins.length === 0 ? (
        <Alert severity="info" sx={{ mt: 3 }}>
          No plugins found matching your criteria. Try adjusting your search or category filter.
        </Alert>
      ) : (
        <Grid container spacing={3}>
          {filteredPlugins.map(plugin => (
            <Grid item xs={12} md={6} lg={4} key={plugin.id}>
              <Card
                sx={{
                  height: '100%',
                  backgroundColor: isDark ? '#1e293b' : '#ffffff',
                  border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    boxShadow: isDark
                      ? '0 8px 25px -5px rgba(0, 0, 0, 0.3)'
                      : '0 8px 25px -5px rgba(0, 0, 0, 0.1)',
                    transform: 'translateY(-2px)',
                  },
                }}
              >
                <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  {/* Header */}
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      mb: 2,
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="h6" component="h3" noWrap>
                        {plugin.name}
                      </Typography>
                      {plugin.official && (
                        <Chip
                          label="Official"
                          size="small"
                          color="primary"
                          icon={<Shield size={12} />}
                        />
                      )}
                    </Box>
                    <Chip label={plugin.version} size="small" variant="outlined" />
                  </Box>

                  {/* Description */}
                  <Typography
                    variant="body2"
                    color="textSecondary"
                    sx={{ mb: 2, flexGrow: 1, lineHeight: 1.5 }}
                  >
                    {plugin.description}
                  </Typography>

                  {/* Categories */}
                  {plugin.categories && (
                    <Box sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {plugin.categories.map(category => (
                          <Chip
                            key={category}
                            label={category}
                            size="small"
                            variant="outlined"
                            color={getCategoryColor(category) as any}
                            sx={{ fontSize: '0.7rem', height: '20px' }}
                          />
                        ))}
                      </Box>
                    </Box>
                  )}

                  {/* Stats */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    {plugin.stars && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Star size={14} />
                        <Typography variant="caption">{plugin.stars}</Typography>
                      </Box>
                    )}
                    {plugin.downloads && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Download size={14} />
                        <Typography variant="caption">{plugin.downloads}</Typography>
                      </Box>
                    )}
                    {plugin.lastUpdated && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Clock size={14} />
                        <Typography variant="caption">{plugin.lastUpdated}</Typography>
                      </Box>
                    )}
                  </Box>

                  {/* Compatibility */}
                  {plugin.compatibility && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="caption" color="textSecondary">
                        Requires: KubeStellar {plugin.compatibility.kubestellar}, Go{' '}
                        {plugin.compatibility.go}
                      </Typography>
                    </Box>
                  )}

                  {/* Actions */}
                  <Box sx={{ display: 'flex', gap: 1, mt: 'auto' }}>
                    <Button
                      variant="contained"
                      fullWidth
                      onClick={() => handleInstallClick(plugin)}
                      startIcon={<Download size={16} />}
                    >
                      Install
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={() => window.open(plugin.repoUrl, '_blank')}
                      sx={{ minWidth: 'auto', px: 1 }}
                    >
                      <Github size={16} />
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Install Confirmation Dialog */}
      <Dialog
        open={installDialogOpen}
        onClose={() => setInstallDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: isDark ? '#1f2937' : '#ffffff',
            border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
          },
        }}
      >
        <DialogTitle>Install Plugin</DialogTitle>
        <DialogContent>
          {selectedPlugin && (
            <Box>
              <Typography variant="h6" gutterBottom>
                {selectedPlugin.name} v{selectedPlugin.version}
              </Typography>
              <Typography variant="body2" color="textSecondary" paragraph>
                {selectedPlugin.description}
              </Typography>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Github size={16} />
                <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                  {selectedPlugin.repoUrl}
                </Typography>
              </Box>

              {selectedPlugin.compatibility && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  This plugin requires KubeStellar {selectedPlugin.compatibility.kubestellar} and Go{' '}
                  {selectedPlugin.compatibility.go}
                </Alert>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInstallDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleInstallConfirm}
            variant="contained"
            startIcon={<Download size={16} />}
          >
            Install Plugin
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default PluginStore;
