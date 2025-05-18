import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material';
import { getWebhookDialogPaperProps } from '../../utils/dialogUtils';
import useTheme from '../../stores/themeStore'; // Import useTheme for dark mode support
import { toast } from 'react-hot-toast';

interface Props {
  webhookDialogOpen: boolean;
  newWebhook: { webhookUrl: string; personalAccessToken: string };
  setNewWebhook: (webhook: { webhookUrl: string; personalAccessToken: string }) => void;
  handleAddWebhook: () => void;
  handleCloseWebhookDialog: () => void;
}

export const AddWebhookDialog = ({
  webhookDialogOpen,
  // newWebhook,
  // setNewWebhook,
  // handleAddWebhook,
  handleCloseWebhookDialog,
}: Props) => {
  const theme = useTheme(state => state.theme); // Get the current theme

  // Function to handle copying the command to clipboard
  const handleCopy = (command: string) => {
    navigator.clipboard.writeText(command);
    toast.success('copied to clipboard!');
  };

  return (
    // --- Add Webhook Dialog Section ---
    <Dialog
      open={webhookDialogOpen}
      onClose={handleCloseWebhookDialog}
      maxWidth="sm"
      fullWidth
      PaperProps={getWebhookDialogPaperProps()}
      sx={{
        '& .MuiDialog-paper': {
          backgroundColor: theme === 'dark' ? '#1F2937' : '#fff', // Dark mode background
          borderRadius: '8px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
        },
      }}
    >
      <DialogTitle
        sx={{
          padding: '16px 24px',
          borderBottom: `1px solid ${theme === 'dark' ? '#444444' : '#e0e0e0'}`,
        }}
      >
        <Typography
          variant="subtitle1"
          sx={{ fontWeight: 600, color: theme === 'dark' ? '#E0E0E0' : '#333', fontSize: '20px' }}
        >
          Setup Webhook
        </Typography>
      </DialogTitle>
      <DialogContent
        sx={{ padding: '24px', backgroundColor: theme === 'dark' ? '#00000033' : '#00000003' }}
      >
        <Box>
          {/* Section 1: Local Development Using Smee.io */}
          <Box
            sx={{
              border: `1px solid ${theme === 'dark' ? '#444444' : '#D3D3D3'}`,
              padding: '18px',
              mt: 4,
              backgroundColor: theme === 'dark' ? '#00000033' : '#00000003',
            }}
          >
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 600,
                fontSize: '16px',
                color: theme === 'dark' ? '#E0E0E0' : '#333',
                mb: 2,
              }}
            >
              Local Development Using Smee.io
            </Typography>
            <Box>
              {/* Step 1 */}
              <Box
                sx={{
                  backgroundColor: theme === 'dark' ? '#00000033' : '#00000003', // Dark mode background
                  border: `1px solid ${theme === 'dark' ? '#444444' : '#D3D3D3'}`,
                  borderRadius: '4px',
                  padding: '12px',
                  mb: 1,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                  <Box
                    sx={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      backgroundColor: '#2F86FF1A',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mr: 1,
                    }}
                  >
                    <Typography variant="caption" sx={{ color: '#2F86FF', fontWeight: 600 }}>
                      1
                    </Typography>
                  </Box>
                  <Typography
                    variant="body2"
                    sx={{ color: '#64748B', fontSize: '12px', marginTop: '4px' }}
                  >
                    Install Smee Client (<code>npm install -g smee-client</code>).
                  </Typography>
                </Box>
              </Box>
              {/* Step 2 */}
              <Box
                sx={{
                  backgroundColor: theme === 'dark' ? '#00000033' : '#00000003', // Dark mode background
                  border: `1px solid ${theme === 'dark' ? '#444444' : '#D3D3D3'}`,
                  borderRadius: '4px',
                  padding: '12px',
                  mb: 1,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                  <Box
                    sx={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      backgroundColor: '#2F86FF1A',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mr: 1,
                    }}
                  >
                    <Typography variant="caption" sx={{ color: '#2F86FF', fontWeight: 600 }}>
                      2
                    </Typography>
                  </Box>
                  <Typography
                    variant="body2"
                    sx={{ color: '#64748B', fontSize: '12px', marginTop: '4px' }}
                  >
                    Go to Smee.io and create a new channel.
                  </Typography>
                </Box>
              </Box>
              {/* Step 3 */}
              <Box
                sx={{
                  backgroundColor: theme === 'dark' ? '#00000033' : '#00000003', // Dark mode background
                  border: `1px solid ${theme === 'dark' ? '#444444' : '#D3D3D3'}`,
                  borderRadius: '4px',
                  padding: '12px',
                  mb: 1,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                  <Box
                    sx={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      backgroundColor: '#2F86FF1A',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mr: 1,
                    }}
                  >
                    <Typography variant="caption" sx={{ color: '#2F86FF', fontWeight: 600 }}>
                      3
                    </Typography>
                  </Box>
                  <Typography
                    variant="body2"
                    sx={{ color: '#64748B', fontSize: '12px', marginTop: '4px' }}
                  >
                    Copy the generated Smee.io URL.
                  </Typography>
                </Box>
              </Box>
              {/* Step 4 */}
              <Box
                sx={{
                  backgroundColor: theme === 'dark' ? '#00000033' : '#00000003', // Dark mode background
                  border: `1px solid ${theme === 'dark' ? '#444444' : '#D3D3D3'}`,
                  borderRadius: '4px',
                  padding: '12px',
                  mb: 1,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                  <Box
                    sx={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      backgroundColor: '#2F86FF1A',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mr: 1,
                    }}
                  >
                    <Typography variant="caption" sx={{ color: '#2F86FF', fontWeight: 600 }}>
                      4
                    </Typography>
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography
                      variant="body2"
                      sx={{ color: '#64748B', fontSize: '12px', mb: 1, marginTop: '4px' }}
                    >
                      Run Smee client to forward webhooks to your local Go backend:
                    </Typography>
                    <Box
                      sx={{
                        backgroundColor: theme === 'dark' ? '#00000033' : '#00000003', // Dark mode background
                        border: `1px solid ${theme === 'dark' ? '#444444' : '#D3D3D3'}`,
                        borderRadius: '4px',
                        padding: '13px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '10px',
                      }}
                    >
                      <Typography
                        sx={{
                          fontFamily: 'monospace',
                          color: theme === 'dark' ? '#D0D0D0' : '#333333', // Dark mode text color
                          wordBreak: 'break-all',
                          flex: 1,
                          fontSize: '12px',
                        }}
                      >
                        {`smee --url smee-url --target ${process.env.VITE_BASE_URL}/api/webhook`}
                      </Typography>
                      <Box
                        sx={{
                          width: '28px',
                          height: '28px',
                          backgroundColor: '#F2F6FF1A',
                          borderRadius: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                        }}
                        onClick={() =>
                          handleCopy(
                            `smee --url <smee-url> --target ${process.env.VITE_BASE_URL}/api/webhook`
                          )
                        }
                      >
                        <span role="img" aria-label="copy" style={{ fontSize: '0.8rem' }}>
                          📋
                        </span>
                      </Box>
                    </Box>
                  </Box>
                </Box>
              </Box>
              {/* Step 5 */}
              <Box
                sx={{
                  backgroundColor: theme === 'dark' ? '#00000033' : '#00000003', // Dark mode background
                  border: `1px solid ${theme === 'dark' ? '#444444' : '#D3D3D3'}`,
                  borderRadius: '4px',
                  padding: '12px',
                  mb: 1,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                  <Box
                    sx={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      backgroundColor: '#2F86FF1A',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mr: 1,
                    }}
                  >
                    <Typography variant="caption" sx={{ color: '#2F86FF', fontWeight: 600 }}>
                      5
                    </Typography>
                  </Box>
                  <Typography
                    variant="body2"
                    sx={{ color: '#64748B', fontSize: '12px', marginTop: '4px' }}
                  >
                    Configure the webhook in your external service using the Smee.io URL.
                  </Typography>
                </Box>
              </Box>
              {/* Step 6 */}
              <Box
                sx={{
                  backgroundColor: theme === 'dark' ? '#00000033' : '#00000003', // Dark mode background
                  border: `1px solid ${theme === 'dark' ? '#444444' : '#D3D3D3'}`,
                  borderRadius: '4px',
                  padding: '12px',
                  mb: 1,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                  <Box
                    sx={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      backgroundColor: '#2F86FF1A',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mr: 1,
                    }}
                  >
                    <Typography variant="caption" sx={{ color: '#2F86FF', fontWeight: 600 }}>
                      6
                    </Typography>
                  </Box>
                  <Typography
                    variant="body2"
                    sx={{ color: '#64748B', fontSize: '12px', marginTop: '4px' }}
                  >
                    Start your Go backend and ensure it listens at /api/webhook.
                  </Typography>
                </Box>
              </Box>
              {/* Step 7 */}
              <Box
                sx={{
                  backgroundColor: theme === 'dark' ? '#00000033' : '#00000003', // Dark mode background
                  border: `1px solid ${theme === 'dark' ? '#444444' : '#D3D3D3'}`,
                  borderRadius: '4px',
                  padding: '12px',
                  mb: 1,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                  <Box
                    sx={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      backgroundColor: '#2F86FF1A',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mr: 1,
                    }}
                  >
                    <Typography variant="caption" sx={{ color: '#2F86FF', fontWeight: 600 }}>
                      7
                    </Typography>
                  </Box>
                  <Typography
                    variant="body2"
                    sx={{ color: '#64748B', fontSize: '12px', marginTop: '4px' }}
                  >
                    Test the webhook.
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Box>
          {/* Section 2: Webhook on a Virtual Machine (VM) Using IP:4000 */}
          <Box
            sx={{
              border: `1px solid ${theme === 'dark' ? '#444444' : '#D3D3D3'}`,
              padding: '18px',
              mt: 4,
              backgroundColor: theme === 'dark' ? '#00000033' : '#00000003',
            }}
          >
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 600,
                fontSize: '16px',
                color: theme === 'dark' ? '#E0E0E0' : '#333',
                mb: 2,
              }}
            >
              Webhook on a Virtual Machine (VM) Using IP:4000
            </Typography>
            <Box>
              {/* Step 1 */}
              <Box
                sx={{
                  backgroundColor: theme === 'dark' ? '#00000033' : '#00000003', // Dark mode background
                  border: `1px solid ${theme === 'dark' ? '#444444' : '#D3D3D3'}`,
                  borderRadius: '4px',
                  padding: '12px',
                  mb: 1,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                  <Box
                    sx={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      backgroundColor: '#2F86FF1A',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mr: 1,
                    }}
                  >
                    <Typography variant="caption" sx={{ color: '#2F86FF', fontWeight: 600 }}>
                      1
                    </Typography>
                  </Box>
                  <Typography
                    variant="body2"
                    sx={{ color: '#64748B', fontSize: '12px', marginTop: '4px' }}
                  >
                    Ensure your Go backend is running on port 4000 and handling /api/webhook.
                  </Typography>
                </Box>
              </Box>
              {/* Step 2 */}
              <Box
                sx={{
                  backgroundColor: theme === 'dark' ? '#00000033' : '#00000003', // Dark mode background
                  border: `1px solid ${theme === 'dark' ? '#444444' : '#D3D3D3'}`,
                  borderRadius: '4px',
                  padding: '12px',
                  mb: 1,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                  <Box
                    sx={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      backgroundColor: '#2F86FF1A',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mr: 1,
                    }}
                  >
                    <Typography variant="caption" sx={{ color: '#2F86FF', fontWeight: 600 }}>
                      2
                    </Typography>
                  </Box>
                  <Typography
                    variant="body2"
                    sx={{ color: '#64748B', fontSize: '12px', marginTop: '4px' }}
                  >
                    Open port 4000 in your firewall/security group (UFW, AWS, GCP, or Azure).
                  </Typography>
                </Box>
              </Box>
              {/* Step 3 */}
              <Box
                sx={{
                  backgroundColor: theme === 'dark' ? '#00000033' : '#00000003', // Dark mode background
                  border: `1px solid ${theme === 'dark' ? '#444444' : '#D3D3D3'}`,
                  borderRadius: '4px',
                  padding: '12px',
                  mb: 1,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                  <Box
                    sx={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      backgroundColor: '#2F86FF1A',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mr: 1,
                    }}
                  >
                    <Typography variant="caption" sx={{ color: '#2F86FF', fontWeight: 600 }}>
                      3
                    </Typography>
                  </Box>
                  <Typography
                    variant="body2"
                    sx={{ color: '#64748B', fontSize: '12px', marginTop: '4px' }}
                  >
                    Find your public IP (<code>curl ifconfig.me</code>) and add.
                  </Typography>
                </Box>
              </Box>
              {/* Step 4 */}
              <Box
                sx={{
                  backgroundColor: theme === 'dark' ? '#00000033' : '#00000003', // Dark mode background
                  border: `1px solid ${theme === 'dark' ? '#444444' : '#D3D3D3'}`,
                  borderRadius: '4px',
                  padding: '12px',
                  mb: 1,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                  <Box
                    sx={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      backgroundColor: '#2F86FF1A',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mr: 1,
                    }}
                  >
                    <Typography variant="caption" sx={{ color: '#2F86FF', fontWeight: 600 }}>
                      4
                    </Typography>
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography
                      variant="body2"
                      sx={{ color: '#64748B', fontSize: '12px', mb: 1, marginTop: '4px' }}
                    >
                      Configure the webhook in your external service using:
                    </Typography>
                    <Box
                      sx={{
                        backgroundColor: theme === 'dark' ? '#0000004D' : '#00000003', // Dark mode background
                        border: `1px solid ${theme === 'dark' ? '#444444' : '#D3D3D3'}`,
                        borderRadius: '4px',
                        padding: '13px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '10px',
                      }}
                    >
                      <Typography
                        sx={{
                          fontFamily: 'monospace',
                          color: theme === 'dark' ? '#D0D0D0' : '#333333',
                          wordBreak: 'break-all',
                          flex: 1,
                          fontSize: '12px',
                        }}
                      >
                        http://your-public-ip:4000/api/webhook
                      </Typography>
                      <Box
                        sx={{
                          width: '28px',
                          height: '28px',
                          backgroundColor: '#F2F6FF1A',
                          borderRadius: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                        }}
                        onClick={() => handleCopy('http://<your-public-ip>:4000/api/webhook')}
                      >
                        <span role="img" aria-label="copy" style={{ fontSize: '0.8rem' }}>
                          📋
                        </span>
                      </Box>
                    </Box>
                  </Box>
                </Box>
              </Box>
              {/* Step 5 */}
              <Box
                sx={{
                  backgroundColor: theme === 'dark' ? '#00000033' : '#00000003', // Dark mode background
                  border: `1px solid ${theme === 'dark' ? '#444444' : '#D3D3D3'}`,
                  borderRadius: '4px',
                  padding: '12px',
                  mb: 1,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                  <Box
                    sx={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      backgroundColor: '#2F86FF1A',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mr: 1,
                    }}
                  >
                    <Typography variant="caption" sx={{ color: '#2F86FF', fontWeight: 600 }}>
                      5
                    </Typography>
                  </Box>
                  <Typography
                    variant="body2"
                    sx={{ color: '#64748B', fontSize: '12px', marginTop: '4px' }}
                  >
                    Test the webhook from another machine.
                  </Typography>
                </Box>
              </Box>
              {/* Step 6 */}
              <Box
                sx={{
                  backgroundColor: theme === 'dark' ? '#00000033' : '#00000003', // Dark mode background
                  border: `1px solid ${theme === 'dark' ? '#444444' : '#D3D3D3'}`,
                  borderRadius: '4px',
                  padding: '12px',
                  mb: 1,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                  <Box
                    sx={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      backgroundColor: '#2F86FF1A',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mr: 1,
                    }}
                  >
                    <Typography variant="caption" sx={{ color: '#2F86FF', fontWeight: 600 }}>
                      6
                    </Typography>
                  </Box>
                  <Typography
                    variant="body2"
                    sx={{ color: '#64748B', fontSize: '12px', marginTop: '4px' }}
                  >
                    Keep your Go server running in the background (<code>nohup</code> or{' '}
                    <code>systemd</code>).
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions
        sx={{
          padding: '16px 24px',
          borderTop: `1px solid ${theme === 'dark' ? '#444444' : '#e0e0e0'}`,
        }}
      >
        <Button
          onClick={handleCloseWebhookDialog}
          sx={{
            textTransform: 'none',
            fontWeight: 600,
            color: theme === 'dark' ? '#E0E0E0' : 'black',
            padding: '8px 16px',
            border: `1px solid ${theme === 'dark' ? '#444444' : '#D3D3D3'}`,
            borderRadius: '8px',
            backgroundColor: theme === 'dark' ? '#2A2A2A' : '#fff',
            '&:hover': {
              backgroundColor: theme === 'dark' ? '#383838' : '#f5f5f5',
            },
          }}
        >
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
};
