import { useState, useEffect } from 'react';
import {
  Box,
  MenuItem,
  Typography,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Menu,
} from '@mui/material';
import { useTranslation } from 'react-i18next'; // Add translation hook import
import { toast } from 'react-hot-toast';
import useTheme from '../stores/themeStore';
import { api } from '../lib/api';
import FilterListIcon from '@mui/icons-material/FilterList';
import AddIcon from '@mui/icons-material/Add';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import CheckIcon from '@mui/icons-material/Check';
import { useContextCreationWebSocket } from '../hooks/useWebSocket';
import CancelButton from './common/CancelButton';

interface ContextDropdownProps {
  onContextFilter: (context: string) => void;
  resourceCounts?: Record<string, number>; // Map of context to resource count
  totalResourceCount?: number; // Total resources across all contexts
}

const ContextDropdown = ({
  onContextFilter,
  resourceCounts = {},
  totalResourceCount = 0,
}: ContextDropdownProps) => {
  const { t } = useTranslation(); // Initialize translation hook
  const [contexts, setContexts] = useState<string[]>([]);
  const [selectedContext, setSelectedContext] = useState<string>('all'); // Default to show all contexts
  const { theme } = useTheme();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [contextName, setContextName] = useState('');
  const [contextVersion, setContextVersion] = useState('0.27.0');
  const [isCreating, setIsCreating] = useState(false);
  const [creationError, setCreationError] = useState('');
  const [creationSuccess, setCreationSuccess] = useState('');
  const [messages, setMessages] = useState<string[]>([]);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  useEffect(() => {
    api
      .get('/wds/get/context')
      .then(response => {
        const contextList = response.data['other-wds-context'] || [];
        const uniqueContexts = [...new Set([...contextList])];
        uniqueContexts.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
        setContexts(uniqueContexts);
      })
      .catch(error => console.error(t('errors.fetchingContexts'), error));
  }, [t]);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleMenuItemClick = (context: string) => {
    if (context === '__create__') {
      handleOpenCreateDialog();
      handleClose();
      return;
    }

    setSelectedContext(context);
    if (onContextFilter) onContextFilter(context);

    if (context === 'all') {
      toast.success(t('contexts.showingAllContexts'), {
        position: 'top-center',
      });
    } else {
      toast.success(t('contexts.filteringByContext', { context: context }), {
        position: 'top-center',
      });
    }
    handleClose();
  };

  // Get count for a specific context
  const getContextCount = (context: string) => {
    if (context === 'all') return totalResourceCount;
    return resourceCounts[context] || 0;
  };

  const handleOpenCreateDialog = () => {
    setContextName('');
    setContextVersion('0.27.0');
    setCreationError('');
    setCreationSuccess('');
    setCreateDialogOpen(true);
  };

  const handleCloseCreateDialog = () => {
    setCreateDialogOpen(false);
  };

  const handleSocketError = (error: Error) => {
    setCreationError(error.message);
  };

  const handleSocketMessage = (event: MessageEvent) => {
    setMessages([...messages, event.data]);
    // eslint-disable-next-line no-control-regex
    const cleanData = event.data.replace(/\x1b\[[0-9;]*m/g, '').trim();
    if (cleanData.includes('Context') && cleanData.includes('set successfully:')) {
      contextCreationWs.disconnect();
      handleCloseCreateDialog();
      setCreationSuccess(t('contexts.createdSuccessfully'));
      window.location.reload();
    }
  };

  const handleSocketClose = (event: CloseEvent) => {
    console.log(t('contexts.websocketClosed'), event.code, event.reason);
    if (messages.join('').includes('Error') || messages.join('').includes('Failed')) {
      setCreationError(messages.join('\n'));
    } else if (messages.length > 0) {
      setCreationSuccess(t('contexts.createdSuccessfully'));
    } else {
      setCreationError(t('errors.websocketClosedUnexpectedly'));
    }
  };

  const contextCreationWs = useContextCreationWebSocket(
    contextName,
    contextVersion,
    handleSocketMessage,
    handleSocketError,
    handleSocketClose
  );

  const handleCreateContext = async () => {
    if (!contextName) {
      setCreationError(t('errors.contextNameRequired'));
      return;
    }

    if (!contextVersion) {
      setCreationError(t('errors.versionRequired'));
      return;
    }

    setIsCreating(true);
    setCreationError('');
    setCreationSuccess('');

    try {
      contextCreationWs.connect();

      // Use a promise to handle WebSocket connection
      const connectWebSocket = () => {
        return new Promise<{ success: boolean; messages: string[] }>((resolve, reject) => {
          const messages: string[] = [];

          // Set a timeout in case the socket doesn't close
          setTimeout(() => {
            if (contextCreationWs.isConnected) {
              const msgText = messages.join('');
              // Check if we've received enough indicators of progress to consider it a success
              if (
                msgText.includes('Switching to kind-kubeflex context') ||
                (msgText.includes('Context') && messages.length > 2)
              ) {
                // If we've made good progress, close the socket and consider it a success
                contextCreationWs.disconnect();
                resolve({
                  success: true,
                  messages,
                });
              } else {
                // Otherwise, this is taking too long or something went wrong
                contextCreationWs.disconnect();
                reject(new Error(t('errors.operationTimeout')));
              }
            }
          }, 15000); // 15 second timeout
        });
      };

      const result = await connectWebSocket();

      if (result.success) {
        setCreationSuccess(t('contexts.contextCreatedSuccess', { contextName }));
        setTimeout(() => {
          handleCloseCreateDialog();
          // Refresh contexts or update UI as needed
          window.location.reload(); // Simple refresh for now
        }, 2000);
      } else {
        setCreationError(t('errors.failedToCreateContext'));
      }
    } catch (error) {
      console.error(t('errors.creatingContext'), error);
      // Extract more helpful error message if possible
      const errorMessage = error instanceof Error ? error.message : t('errors.unknownError');

      if (errorMessage.includes('timed out')) {
        setCreationError(t('errors.connectionTimeout'));
      } else if (errorMessage.includes('WebSocket connection failed')) {
        setCreationError(t('errors.websocketConnectionFailed'));
      } else {
        setCreationError(errorMessage);
      }
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="body2" sx={{ color: theme === 'dark' ? '#FFFFFF' : '#121212' }}>
          {t('contexts.filterByContext')}:
        </Typography>

        <Box sx={{ position: 'relative', minWidth: 200 }}>
          <Button
            id="context-filter-button"
            aria-controls={open ? 'context-filter-menu' : undefined}
            aria-haspopup="true"
            aria-expanded={open ? 'true' : undefined}
            onClick={handleClick}
            variant="outlined"
            sx={{
              width: '100%',
              height: '40px',
              justifyContent: 'space-between',
              textTransform: 'none',
              borderColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.23)' : 'rgba(0, 0, 0, 0.23)',
              color: theme === 'dark' ? '#FFFFFF' : '#121212',
              '&:hover': {
                borderColor: theme === 'dark' ? '#FFFFFF' : 'rgba(0, 0, 0, 0.87)',
                backgroundColor: 'transparent',
              },
            }}
            startIcon={
              <FilterListIcon
                fontSize="small"
                sx={{
                  color: theme === 'dark' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.54)',
                }}
              />
            }
            endIcon={<KeyboardArrowDownIcon />}
          >
            <Typography
              component="span"
              sx={{
                flexGrow: 1,
                textAlign: 'left',
                mr: 1,
                fontSize: '0.9rem',
                fontWeight: 400,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                overflow: 'hidden',
              }}
            >
              {selectedContext === 'all' ? (
                t('contexts.allContexts')
              ) : (
                <Chip
                  label={selectedContext}
                  size="small"
                  sx={{
                    backgroundColor:
                      theme === 'dark' ? 'rgba(144, 202, 249, 0.08)' : 'rgba(25, 118, 210, 0.08)',
                    color: theme === 'dark' ? '#90CAF9' : '#1976d2',
                    fontWeight: 500,
                    height: '24px',
                    cursor: 'pointer',
                  }}
                  component="span" // Ensure Chip doesn't render as div inside span (button)
                  clickable={false}
                />
              )}
            </Typography>
          </Button>

          <Menu
            id="context-filter-menu"
            anchorEl={anchorEl}
            open={open}
            onClose={handleClose}
            MenuListProps={{
              'aria-labelledby': 'context-filter-button',
              role: 'menu',
            }}
            PaperProps={{
              sx: {
                maxHeight: 300,
                width: 200, // Match button width min
                marginTop: 1,
                backgroundColor: theme === 'dark' ? '#333333' : '#FFFFFF',
                '& .MuiMenuItem-root': {
                  color: theme === 'dark' ? '#FFFFFF' : 'inherit',
                  fontSize: '0.9rem',
                  padding: '8px 16px',
                  '&:hover': {
                    backgroundColor:
                      theme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
                  },
                  '&.Mui-selected': {
                    backgroundColor:
                      theme === 'dark' ? 'rgba(144, 202, 249, 0.16)' : 'rgba(25, 118, 210, 0.08)',
                    '&:hover': {
                      backgroundColor:
                        theme === 'dark' ? 'rgba(144, 202, 249, 0.24)' : 'rgba(25, 118, 210, 0.12)',
                    },
                  },
                },
              },
            }}
          >
            <MenuItem
              onClick={() => handleMenuItemClick('all')}
              selected={selectedContext === 'all'}
              sx={{
                fontWeight: selectedContext === 'all' ? 500 : 400,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {selectedContext === 'all' && <CheckIcon fontSize="small" sx={{ fontSize: 16 }} />}
                <span>{t('contexts.allContexts')}</span>
              </Box>
              <Chip
                label={totalResourceCount.toString()}
                size="small"
                sx={{
                  height: '20px',
                  fontSize: '0.75rem',
                  backgroundColor:
                    theme === 'dark' ? 'rgba(144, 202, 249, 0.16)' : 'rgba(25, 118, 210, 0.08)',
                  color: theme === 'dark' ? '#90CAF9' : '#1976d2',
                }}
              />
            </MenuItem>

            {contexts.map(context => (
              <MenuItem
                key={context}
                onClick={() => handleMenuItemClick(context)}
                selected={selectedContext === context}
                sx={{
                  fontWeight: selectedContext === context ? 500 : 400,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {selectedContext === context && (
                    <CheckIcon fontSize="small" sx={{ fontSize: 16 }} />
                  )}
                  <span>{context}</span>
                </Box>
                <Chip
                  label={getContextCount(context).toString()}
                  size="small"
                  sx={{
                    height: '20px',
                    fontSize: '0.75rem',
                    backgroundColor:
                      getContextCount(context) > 0
                        ? theme === 'dark'
                          ? 'rgba(144, 202, 249, 0.16)'
                          : 'rgba(25, 118, 210, 0.08)'
                        : theme === 'dark'
                          ? 'rgba(244, 67, 54, 0.16)'
                          : 'rgba(244, 67, 54, 0.08)',
                    color:
                      getContextCount(context) > 0
                        ? theme === 'dark'
                          ? '#90CAF9'
                          : '#1976d2'
                        : theme === 'dark'
                          ? '#f44336'
                          : '#d32f2f',
                  }}
                />
              </MenuItem>
            ))}

            <MenuItem
              onClick={() => handleMenuItemClick('__create__')}
              sx={{
                borderTop: `1px solid ${theme === 'dark' ? '#333' : '#e0e0e0'}`,
                mt: 1,
                pt: 1,
                color: theme === 'dark' ? '#90caf9' : '#1976d2',
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              }}
            >
              <AddIcon fontSize="small" />
              <span>{t('contexts.createContext')}</span>
            </MenuItem>
          </Menu>
        </Box>
      </Box>

      {/* Create Context Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={handleCloseCreateDialog}
        maxWidth="sm"
        PaperProps={{
          sx: {
            backgroundColor: theme === 'dark' ? '#1a1a1a' : '#fff',
            color: theme === 'dark' ? '#fff' : '#333',
            minWidth: '400px',
            borderRadius: '10px',
          },
        }}
      >
        <DialogTitle sx={{ borderBottom: `1px solid ${theme === 'dark' ? '#333' : '#e0e0e0'}` }}>
          {t('contexts.createNewContext')}
        </DialogTitle>
        <DialogContent sx={{ mt: 1, pb: 1 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4, mb: 2, mt: 2 }}>
            <TextField
              label={t('contexts.contextName')}
              fullWidth
              value={contextName}
              onChange={e => setContextName(e.target.value)}
              error={!!creationError && !contextName}
              helperText={!contextName && creationError ? t('errors.contextNameRequired') : ''}
              size="small"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '8px',
                  backgroundColor:
                    theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(25, 118, 210, 0.05)',
                  '& fieldset': {
                    borderColor: theme === 'dark' ? '#444' : '#e0e0e0',
                  },
                  '&:hover fieldset': {
                    borderColor: theme === 'dark' ? '#90caf9' : '#1976d2',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: theme === 'dark' ? '#90caf9' : '#1976d2',
                  },
                },
                '& .MuiInputLabel-root': {
                  color: theme === 'dark' ? '#90caf9' : '#1976d2',
                },
                '& .MuiInputBase-input': {
                  color: theme === 'dark' ? '#fff' : '#333',
                },
              }}
            />
            <TextField
              label={t('contexts.kubestellarVersion')}
              fullWidth
              value={contextVersion}
              onChange={e => setContextVersion(e.target.value)}
              error={!!creationError && !contextVersion}
              helperText={!contextVersion && creationError ? t('errors.versionRequired') : ''}
              size="small"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '8px',
                  backgroundColor:
                    theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(25, 118, 210, 0.05)',
                  '& fieldset': {
                    borderColor: theme === 'dark' ? '#444' : '#e0e0e0',
                  },
                  '&:hover fieldset': {
                    borderColor: theme === 'dark' ? '#90caf9' : '#1976d2',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: theme === 'dark' ? '#90caf9' : '#1976d2',
                  },
                },
                '& .MuiInputLabel-root': {
                  color: theme === 'dark' ? '#90caf9' : '#1976d2',
                },
                '& .MuiInputBase-input': {
                  color: theme === 'dark' ? '#fff' : '#333',
                },
              }}
            />
          </Box>

          {creationError && (
            <Box
              sx={{
                bgcolor: theme === 'dark' ? 'rgba(255, 87, 34, 0.1)' : 'rgba(255, 87, 34, 0.05)',
                color: theme === 'dark' ? '#ff9800' : '#d84315',
                p: 1.5,
                borderRadius: 1,
                mt: 1,
                mb: 2,
              }}
            >
              <Typography variant="body2">{creationError}</Typography>
            </Box>
          )}

          {creationSuccess && (
            <Box
              sx={{
                bgcolor: theme === 'dark' ? 'rgba(76, 175, 80, 0.1)' : 'rgba(76, 175, 80, 0.08)',
                color: theme === 'dark' ? '#81c784' : '#2e7d32',
                p: 1.5,
                borderRadius: 1,
                mt: 1,
                mb: 2,
              }}
            >
              <Typography variant="body2">{creationSuccess}</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 1, display: 'flex', justifyContent: 'space-between' }}>
          <CancelButton onClick={handleCloseCreateDialog}>{t('common.cancel')}</CancelButton>
          <Button
            onClick={handleCreateContext}
            disabled={isCreating}
            variant="contained"
            startIcon={isCreating ? <CircularProgress size={16} color="inherit" /> : null}
            sx={{
              backgroundColor: theme === 'dark' ? '#1976d2' : '#1976d2',
              color: '#fff',
              minWidth: '140px',
              '&:hover': {
                backgroundColor: theme === 'dark' ? '#1565c0' : '#1565c0',
              },
              '&:disabled': {
                backgroundColor:
                  theme === 'dark' ? 'rgba(25, 118, 210, 0.5)' : 'rgba(25, 118, 210, 0.5)',
                color: 'rgba(255, 255, 255, 0.7)',
              },
            }}
          >
            {isCreating ? t('contexts.creating') : t('contexts.createContext')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ContextDropdown;
