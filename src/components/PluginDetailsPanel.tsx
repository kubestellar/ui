import { useState } from 'react';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Divider,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Button,
} from '@mui/material';
import { toast } from 'react-hot-toast';
import { X, RefreshCw } from 'lucide-react';
import { Plugin } from '../hooks/usePluginQueries';
import useTheme from '../stores/themeStore';

interface PluginDetailsPanelProps {
  plugin: Plugin;
  onClose: () => void;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

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
}

const PluginDetailsPanel = ({ plugin, onClose }: PluginDetailsPanelProps) => {
  const [tabValue, setTabValue] = useState(0);
  const theme = useTheme(state => state.theme);
  const isDark = theme === 'dark';

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
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

  // Special handling for the backup plugin
  const isBackupPlugin = plugin.name === 'backup-plugin';

  return (
    <Drawer
      anchor="right"
      open={true}
      onClose={onClose}
      sx={{
        '& .MuiDrawer-paper': {
          width: { xs: '100%', sm: 600 },
          boxSizing: 'border-box',
          backgroundColor: isDark ? 'rgb(15, 23, 42)' : '#ffffff',
          color: isDark ? '#f8fafc' : '#334155',
          borderLeft: isDark
            ? '1px solid rgba(255, 255, 255, 0.1)'
            : '1px solid rgba(0, 0, 0, 0.1)',
        },
      }}
    >
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">Plugin Details</Typography>
        <IconButton onClick={onClose} aria-label="close">
          <X size={20} />
        </IconButton>
      </Box>
      <Divider />

      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h5">{plugin.name}</Typography>
          <Chip
            label={plugin.status}
            color={getStatusColor(plugin.status) as 'success' | 'error' | 'warning'}
          />
        </Box>
        <Typography variant="body1" sx={{ mb: 2 }}>
          {plugin.description}
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <Chip
            label={`Version: ${plugin.version}`}
            variant="outlined"
            sx={{
              color: isDark ? 'rgba(255, 255, 255, 0.7)' : 'inherit',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.2)' : 'inherit',
            }}
          />
          <Chip
            label={`Type: ${plugin.type}`}
            variant="outlined"
            sx={{
              color: isDark ? 'rgba(255, 255, 255, 0.7)' : 'inherit',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.2)' : 'inherit',
            }}
          />
        </Box>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'divider' }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          aria-label="plugin details tabs"
          sx={{
            '& .MuiTabs-indicator': {
              backgroundColor: isDark ? '#3b82f6' : '#1976d2',
            },
            '& .MuiTab-root': {
              color: isDark ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)',
              '&.Mui-selected': {
                color: isDark ? '#3b82f6' : '#1976d2',
              },
              '&:hover': {
                color: isDark ? '#60a5fa' : '#115293',
              },
            },
          }}
        >
          <Tab label="API Endpoints" />
          {isBackupPlugin && <Tab label="Backup Operations" />}
        </Tabs>
      </Box>

      <TabPanel value={tabValue} index={0}>
        <TableContainer
          component={Paper}
          variant="outlined"
          sx={{
            background: isDark ? 'rgba(15, 23, 42, 0.8)' : undefined,
            '& .MuiTableCell-head': {
              fontWeight: 'bold',
              backgroundColor: isDark ? 'rgba(51, 65, 85, 0.5)' : undefined,
              color: isDark ? '#f8fafc' : undefined,
            },
            '& .MuiTableCell-body': {
              color: isDark ? '#f1f5f9' : undefined,
              borderColor: isDark ? 'rgba(148, 163, 184, 0.2)' : undefined,
            },
            '& .MuiTableRow-root:hover': {
              backgroundColor: isDark ? 'rgba(51, 65, 85, 0.3)' : undefined,
            },
          }}
        >
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Method</TableCell>
                <TableCell>Path</TableCell>
                <TableCell>Description</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {plugin.routes.map((route, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Chip
                      label={route.method}
                      size="small"
                      color={
                        route.method === 'GET'
                          ? 'primary'
                          : route.method === 'POST'
                            ? 'success'
                            : route.method === 'DELETE'
                              ? 'error'
                              : 'default'
                      }
                      sx={{ fontWeight: 'bold' }}
                    />
                  </TableCell>
                  <TableCell>{route.path}</TableCell>
                  <TableCell>{route.description || 'No description available'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      {isBackupPlugin && (
        <TabPanel value={tabValue} index={1}>
          <Typography variant="h6" sx={{ mb: 3 }}>
            Backup Management
          </Typography>

          <Box sx={{ mb: 4 }}>
            <Typography variant="subtitle1" sx={{ mb: 2 }}>
              Create Backup
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              Create a snapshot of your KubeStellar database. This will backup all your
              configuration and settings.
            </Typography>
            <Button
              variant="contained"
              startIcon={<RefreshCw size={18} />}
              onClick={() => {
                toast.loading('Taking database snapshot...', {
                  id: 'backup-toast',
                  style: {
                    background: isDark ? 'rgba(30, 64, 175, 0.9)' : '#3b82f6',
                    color: '#ffffff',
                  },
                });

                fetch('/api/plugins/backup-plugin/snapshot')
                  .then(response => {
                    if (response.ok) {
                      toast.success('Backup snapshot created successfully', {
                        id: 'backup-toast',
                        style: {
                          background: isDark ? 'rgba(4, 120, 87, 0.9)' : '#10b981',
                          color: '#ffffff',
                        },
                      });
                    } else {
                      throw new Error('Failed to create backup');
                    }
                  })
                  .catch(error => {
                    console.error('Backup error:', error);
                    toast.error('Failed to create backup snapshot', {
                      id: 'backup-toast',
                      style: {
                        background: isDark ? 'rgba(153, 27, 27, 0.9)' : '#dc2626',
                        color: '#ffffff',
                      },
                    });
                  });
              }}
            >
              Take Snapshot
            </Button>
          </Box>

          <Divider sx={{ my: 3 }} />

          <Box>
            <Typography variant="subtitle1" sx={{ mb: 2 }}>
              Backup History
            </Typography>
            <Typography variant="body2">
              Feature coming soon: View and restore from previous backups.
            </Typography>
          </Box>
        </TabPanel>
      )}
    </Drawer>
  );
};

export default PluginDetailsPanel;
