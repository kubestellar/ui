import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Chip,
  Tooltip,
  IconButton,
  Switch,
  List,
  ListItem,
  CircularProgress,
  Fade,
  Zoom,
  Dialog,
  DialogActions,
  Button,
  useTheme,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Power as PowerIcon,
  PowerOff as PowerOffIcon,
  ContentCopy as ContentCopyIcon,
} from '@mui/icons-material';

const InstalledApps: React.FC = () => {
  const [pluginEnabled, setPluginEnabled] = useState<boolean>(false);
  const [toggleDisabled, setToggleDisabled] = useState<boolean>(true);
  const [processing, setProcessing] = useState<boolean>(false);
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [dialogLoading, setDialogLoading] = useState<boolean>(false);
  const [kubeContexts, setKubeContexts] = useState<string[]>([]);
  const theme = useTheme();

  useEffect(() => {
    // Simulate initial plugin status check
    setTimeout(() => {
      setToggleDisabled(false);
      setPluginEnabled(true);
    }, 1500);
  }, []);

  const handleToggle = () => {
    setProcessing(true);
    setTimeout(() => {
      setPluginEnabled(!pluginEnabled);
      setProcessing(false);
    }, 800);
  };

  const handleRemove = () => {
    if (!window.confirm(`Are you sure you want to remove hardcoded-plugin?`)) return;
    alert('This is a hardcoded plugin and cannot actually be removed.');
  };

  const handlePluginClick = () => {
    if (pluginEnabled) {
      setDialogOpen(true);
      setDialogLoading(true);
      
      // Simulate API call
      setTimeout(() => {
        setKubeContexts([
          'CURRENT   NAME                    CLUSTER                 AUTHINFO                NAMESPACE',
          '          cluster1                kind-cluster1           kind-cluster1           ',
          '          cluster2                kind-cluster2           kind-cluster2           ',
          '          dadu-context            dadu-cluster            dadu                    dadu-namespace',
          '*         its1                    its1-cluster            its1-admin              ',
          '          kind-cluster3           kind-cluster3           kind-cluster3           ',
          '          kind-kubeflex           kind-kubeflex           kind-kubeflex           ',
          '          kind-kubestellar        kind-kubestellar        kind-kubestellar        ',
          '          kind-mcp-test-cluster   kind-mcp-test-cluster   kind-mcp-test-cluster   ',
          '          kind-test-cluster       kind-test-cluster       kind-test-cluster       ',
          '          minikube                minikube                minikube                default',
          '          wds1                    wds1-cluster            wds1-admin              default'
        ]);
        setDialogLoading(false);
      }, 1200);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text.split(/\s+/)[1]);
  };

  return (
    <Fade in={true} timeout={800}>
      <Box
        sx={{
          width: '100%',
          maxWidth: 1000,
          mx: 'auto',
          mt: 2,
          px: { xs: 2, sm: 3, md: 4 },
          bgcolor: 'rgba(15, 23, 42, 0.95)',
          borderRadius: 3,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          border: '1px solid rgba(59, 130, 246, 0.2)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <Box sx={{ mb: 3, pt: 3 }}>
          <Typography
            variant="h4"
            component="h2"
            sx={{
              mb: 1,
              color: '#e2e8f0',
              fontWeight: 700,
              fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2rem' },
              background: 'linear-gradient(135deg, #3b82f6, #06b6d4)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Installed Plugins
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: '#94a3b8',
              fontSize: { xs: '0.875rem', sm: '1rem' },
              mb: 2,
            }}
          >
            Manage your installed plugins and their configurations
          </Typography>
        </Box>

        <List sx={{ width: '100%', p: 0, mb: 2 }}>
          <Zoom in={true} timeout={600}>
            <ListItem
              onClick={handlePluginClick}
              sx={{
                cursor: pluginEnabled ? 'pointer' : 'default',
                transition: '0.2s all',
                flexDirection: { xs: 'column', sm: 'row' },
                alignItems: { xs: 'stretch', sm: 'center' },
                gap: { xs: 2, sm: 3 },
                py: 3,
                px: 3,
                mb: 2,
                bgcolor: 'rgba(30, 41, 59, 0.6)',
                borderRadius: 2,
                border: '1px solid rgba(59, 130, 246, 0.1)',
                backdropFilter: 'blur(10px)',
                position: 'relative',
                overflow: 'hidden',
                '&:hover': {
                  transform: pluginEnabled ? 'translateX(8px)' : 'none',
                  boxShadow: pluginEnabled ? '0 4px 16px rgba(59, 130, 246, 0.2)' : 'none'
                },
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: '4px',
                  bgcolor: pluginEnabled ? '#22c55e' : '#64748b',
                },
              }}
            >
              <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                  <Typography
                    variant="h6"
                    sx={{
                      fontSize: { xs: '1.1rem', sm: '1.25rem' },
                      fontWeight: 600,
                      color: '#e2e8f0',
                    }}
                  >
                    Context-fetcher
                  </Typography>
                  <Chip label="v1.0.0" size="small" />
                  <Chip
                    icon={pluginEnabled ? <PowerIcon /> : <PowerOffIcon />}
                    label={pluginEnabled ? 'Active' : 'Inactive'}
                    size="small"
                  />
                </Box>
                <Typography variant="body2" sx={{ color: '#94a3b8', fontSize: '0.9rem' }}>
                  Get all the context
                </Typography>
              </Box>

              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  flexShrink: 0,
                  justifyContent: { xs: 'space-between', sm: 'flex-end' },
                  width: { xs: '100%', sm: 'auto' },
                }}
              >
                <Tooltip title={pluginEnabled ? 'Disable plugin' : 'Enable plugin'}>
                  <Switch
                    checked={pluginEnabled}
                    onChange={handleToggle}
                    disabled={toggleDisabled || processing}
                  />
                </Tooltip>

                <Tooltip title="Remove plugin">
                  <IconButton
                    onClick={handleRemove}
                    disabled={processing}
                    size="small"
                    sx={{ p: 1.5 }}
                  >
                    {processing ? (
                      <CircularProgress size={18} />
                    ) : (
                      <DeleteIcon sx={{ fontSize: 18, color: '#f87171' }} />
                    )}
                  </IconButton>
                </Tooltip>
              </Box>
            </ListItem>
          </Zoom>
        </List>

        {/* Kubernetes Context Dialog */}
        <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md">
          <Box sx={{
            bgcolor: '#0f172a',
            color: '#e2e8f0',
            p: 3,
            borderRadius: 2,
            minWidth: '600px',
            fontFamily: 'monospace',
            position: 'relative',
          }}>
            <Typography variant="h6" sx={{ 
              mb: 2, 
              display: 'flex', 
              alignItems: 'center',
              color: '#3b82f6',
              fontFamily: theme.typography.fontFamily,
            }}>
              <PowerIcon sx={{ color: '#22c55e', mr: 1.5, fontSize: 28 }} />
              Cluster Context Explorer
            </Typography>
            
            {dialogLoading ? (
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center',
                minHeight: 200,
                bgcolor: 'rgba(30, 41, 59, 0.5)',
                borderRadius: 2
              }}>
                <CircularProgress size={40} sx={{ color: '#3b82f6' }} />
                <Typography variant="body2" sx={{ ml: 2, color: '#94a3b8' }}>
                  Querying cluster contexts...
                </Typography>
              </Box>
            ) : (
              <Box sx={{ 
                bgcolor: '#1e293b',
                borderRadius: 2,
                p: 2,
                position: 'relative',
                '&::before': {
                  content: '" "',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  border: '1px solid rgba(59, 130, 246, 0.1)',
                  borderRadius: 2,
                  pointerEvents: 'none',
                }
              }}>
                {kubeContexts.map((line, index) => (
                  <Box 
                    key={index}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      py: 0.5,
                      borderBottom: index === 0 ? '1px solid rgba(59, 130, 246, 0.2)' : 'none',
                      bgcolor: line.startsWith('*') ? 'rgba(34, 197, 94, 0.1)' : 'transparent',
                    }}
                  >
                    <Typography variant="body2" sx={{ 
                      flexGrow: 1, 
                      fontSize: '0.85rem',
                      color: line.startsWith('*') ? '#22c55e' : '#e2e8f0',
                    }}>
                      {line}
                    </Typography>
                    {index !== 0 && (
                      <Tooltip title="Copy context name">
                        <IconButton
                          size="small"
                          onClick={() => copyToClipboard(line)}
                          sx={{ ml: 1, color: '#94a3b8', '&:hover': { color: '#3b82f6' } }}
                        >
                          <ContentCopyIcon fontSize="inherit" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                ))}
              </Box>
            )}

            <DialogActions sx={{ mt: 3, justifyContent: 'flex-end' }}>
              <Button 
                onClick={() => setDialogOpen(false)}
                variant="outlined"
                sx={{
                  color: '#94a3b8',
                  borderColor: 'rgba(59, 130, 246, 0.4)',
                  '&:hover': {
                    borderColor: '#3b82f6',
                    bgcolor: 'rgba(59, 130, 246, 0.1)'
                  }
                }}
              >
                Close Explorer
              </Button>
            </DialogActions>
          </Box>
        </Dialog>
      </Box>
    </Fade>
  );
};

export default InstalledApps;
