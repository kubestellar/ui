/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Chip,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Alert,
} from '@mui/material';
import { X, Shield, Package, Code, Server, Clock, CheckCircle, AlertCircle } from 'lucide-react';
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
  Compatibility?: {
    kubestellar: string;
    go: string;
  };
  status?: 'loaded' | 'error' | 'loading';
  loadedAt?: string;
  routes?: string[];
}

interface PluginDetailsProps {
  open: boolean;
  plugin: Plugin | null;
  onClose: () => void;
  onUnload?: (pluginId: string) => void;
  onCheckHealth?: (pluginId: string) => void;
}

const PluginDetails: React.FC<PluginDetailsProps> = ({
  open,
  plugin,
  onClose,
  onUnload,
  onCheckHealth,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  if (!plugin) return null;

  const getStatusColor = () => {
    switch (plugin.status) {
      case 'loaded':
        return 'success';
      case 'error':
        return 'error';
      case 'loading':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getStatusIcon = () => {
    switch (plugin.status) {
      case 'loaded':
        return <CheckCircle size={16} />;
      case 'error':
        return <AlertCircle size={16} />;
      case 'loading':
        return <Clock size={16} />;
      default:
        return <CheckCircle size={16} />;
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: isDark ? '#1f2937' : '#ffffff',
          border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
          maxHeight: '90vh',
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h5" component="h2">
            {plugin.Name}
          </Typography>
          <Chip label={plugin.Version} variant="outlined" size="small" />
          <Chip
            label={plugin.status || 'loaded'}
            color={getStatusColor() as any}
            icon={getStatusIcon()}
            size="small"
          />
        </Box>
        <IconButton onClick={onClose} size="small">
          <X size={20} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        {/* Basic Information */}
        <Box sx={{ mb: 4 }}>
          <Typography
            variant="h6"
            gutterBottom
            sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
          >
            <Package size={18} />
            Plugin Information
          </Typography>

          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
            <Box>
              <Typography variant="subtitle2" color="textSecondary">
                ID
              </Typography>
              <Typography variant="body2" sx={{ fontFamily: 'monospace', mt: 0.5 }}>
                {plugin.ID}
              </Typography>
            </Box>
            <Box>
              <Typography variant="subtitle2" color="textSecondary">
                Author
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.5 }}>
                {plugin.Author}
              </Typography>
            </Box>
          </Box>

          <Typography variant="subtitle2" color="textSecondary">
            Description
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.5, lineHeight: 1.6 }}>
            {plugin.Description}
          </Typography>

          {plugin.loadedAt && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" color="textSecondary">
                Loaded At
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.5 }}>
                {new Date(plugin.loadedAt).toLocaleString()}
              </Typography>
            </Box>
          )}
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* Endpoints */}
        <Box sx={{ mb: 4 }}>
          <Typography
            variant="h6"
            gutterBottom
            sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
          >
            <Server size={18} />
            API Endpoints ({plugin.Endpoints.length})
          </Typography>

          <TableContainer
            component={Paper}
            sx={{
              backgroundColor: isDark ? '#111827' : '#f9fafb',
              border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
            }}
          >
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Method</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Path</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Handler</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Full URL</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {plugin.Endpoints.map((endpoint, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Chip
                        label={endpoint.Method}
                        size="small"
                        color={
                          endpoint.Method === 'GET'
                            ? 'primary'
                            : endpoint.Method === 'POST'
                              ? 'success'
                              : endpoint.Method === 'DELETE'
                                ? 'error'
                                : 'default'
                        }
                        sx={{ minWidth: 60 }}
                      />
                    </TableCell>
                    <TableCell sx={{ fontFamily: 'monospace' }}>{endpoint.Path}</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
                      {endpoint.Handler}
                    </TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
                      /api/plugins/{plugin.ID}
                      {endpoint.Path}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* Dependencies & Permissions */}
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, mb: 4 }}>
          <Box>
            <Typography
              variant="h6"
              gutterBottom
              sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
            >
              <Code size={18} />
              Dependencies ({plugin.Dependencies.length})
            </Typography>
            {plugin.Dependencies.length > 0 ? (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {plugin.Dependencies.map((dep, index) => (
                  <Chip
                    key={index}
                    label={dep}
                    size="small"
                    variant="outlined"
                    sx={{
                      backgroundColor: isDark ? '#1f2937' : '#f3f4f6',
                      borderColor: isDark ? '#4b5563' : '#d1d5db',
                    }}
                  />
                ))}
              </Box>
            ) : (
              <Typography variant="body2" color="textSecondary">
                No external dependencies
              </Typography>
            )}
          </Box>

          <Box>
            <Typography
              variant="h6"
              gutterBottom
              sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
            >
              <Shield size={18} />
              Permissions ({plugin.Permissions.length})
            </Typography>
            {plugin.Permissions.length > 0 ? (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {plugin.Permissions.map((perm, index) => (
                  <Chip key={index} label={perm} size="small" color="warning" variant="outlined" />
                ))}
              </Box>
            ) : (
              <Typography variant="body2" color="textSecondary">
                No special permissions required
              </Typography>
            )}
          </Box>
        </Box>

        {/* Compatibility */}
        {plugin.Compatibility && (
          <>
            <Divider sx={{ my: 3 }} />
            <Box>
              <Typography variant="h6" gutterBottom>
                Compatibility Requirements
              </Typography>
              <Alert severity="info" sx={{ backgroundColor: isDark ? '#1e3a8a20' : '#dbeafe' }}>
                <Typography variant="body2">
                  <strong>KubeStellar:</strong> {plugin.Compatibility.kubestellar}
                  <br />
                  <strong>Go:</strong> {plugin.Compatibility.go}
                </Typography>
              </Alert>
            </Box>
          </>
        )}

        {/* Active Routes */}
        {plugin.routes && plugin.routes.length > 0 && (
          <>
            <Divider sx={{ my: 3 }} />
            <Box>
              <Typography variant="h6" gutterBottom>
                Active Routes
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {plugin.routes.map((route, index) => (
                  <Typography
                    key={index}
                    variant="body2"
                    sx={{
                      fontFamily: 'monospace',
                      backgroundColor: isDark ? '#111827' : '#f3f4f6',
                      padding: '4px 8px',
                      borderRadius: 1,
                    }}
                  >
                    {route}
                  </Typography>
                ))}
              </Box>
            </Box>
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ borderTop: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`, p: 3 }}>
        <Box sx={{ display: 'flex', gap: 1, width: '100%' }}>
          {onCheckHealth && (
            <Button
              variant="outlined"
              onClick={() => onCheckHealth(plugin.ID)}
              startIcon={<CheckCircle size={16} />}
            >
              Check Health
            </Button>
          )}

          <Box sx={{ flexGrow: 1 }} />

          {onUnload && (
            <Button
              variant="outlined"
              color="error"
              onClick={() => onUnload(plugin.ID)}
              startIcon={<X size={16} />}
            >
              Unload Plugin
            </Button>
          )}

          <Button onClick={onClose} variant="contained">
            Close
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default PluginDetails;
