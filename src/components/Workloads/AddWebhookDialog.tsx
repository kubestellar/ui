import { Box, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material';
import { getWebhookDialogPaperProps } from '../../utils/dialogUtils';
import useTheme from '../../stores/themeStore';
import { toast } from 'react-hot-toast';
import CancelButton from '../common/CancelButton';
import { useTranslation } from 'react-i18next';

interface Props {
  webhookDialogOpen: boolean;
  newWebhook: { webhookUrl: string; personalAccessToken: string };
  setNewWebhook: (webhook: { webhookUrl: string; personalAccessToken: string }) => void;
  handleAddWebhook: () => void;
  handleCloseWebhookDialog: () => void;
}

export const AddWebhookDialog = ({ webhookDialogOpen, handleCloseWebhookDialog }: Props) => {
  const theme = useTheme(state => state.theme);
  const { t } = useTranslation();

  // Function to handle copying the command to clipboard
  const handleCopy = (command: string) => {
    navigator.clipboard.writeText(command);
    toast.success(t('addWebhookDialog.copiedToClipboard'));
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
          backgroundColor: theme === 'dark' ? '#1F2937' : '#fff',
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
          {t('addWebhookDialog.setupWebhook')}
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
              {t('addWebhookDialog.localDevSmee')}
            </Typography>
            <Box>
              {/* Step 1 */}
              <Box
                sx={{
                  backgroundColor: theme === 'dark' ? '#00000033' : '#00000003',
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
                    {t('addWebhookDialog.installSmee')}
                  </Typography>
                </Box>
              </Box>
              {/* Step 2 */}
              <Box
                sx={{
                  backgroundColor: theme === 'dark' ? '#00000033' : '#00000003',
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
                    {t('addWebhookDialog.goToSmee')}
                  </Typography>
                </Box>
              </Box>
              {/* Step 3 */}
              <Box
                sx={{
                  backgroundColor: theme === 'dark' ? '#00000033' : '#00000003',
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
                    {t('addWebhookDialog.copySmeeUrl')}
                  </Typography>
                </Box>
              </Box>
              {/* Step 4 */}
              <Box
                sx={{
                  backgroundColor: theme === 'dark' ? '#00000033' : '#00000003',
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
                      {t('addWebhookDialog.runSmeeClient')}
                    </Typography>
                    <Box
                      sx={{
                        backgroundColor: theme === 'dark' ? '#00000033' : '#00000003',
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
                        {t('addWebhookDialog.smeeCommand', { baseUrl: process.env.VITE_BASE_URL })}
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
                            t('addWebhookDialog.smeeCommandCopy', {
                              baseUrl: process.env.VITE_BASE_URL,
                            })
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
                  backgroundColor: theme === 'dark' ? '#00000033' : '#00000003',
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
                    {t('addWebhookDialog.configureWebhookSmee')}
                  </Typography>
                </Box>
              </Box>
              {/* Step 6 */}
              <Box
                sx={{
                  backgroundColor: theme === 'dark' ? '#00000033' : '#00000003',
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
                    {t('addWebhookDialog.startGoBackend')}
                  </Typography>
                </Box>
              </Box>
              {/* Step 7 */}
              <Box
                sx={{
                  backgroundColor: theme === 'dark' ? '#00000033' : '#00000003',
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
                    {t('addWebhookDialog.testWebhook')}
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
              {t('addWebhookDialog.vmIp4000')}
            </Typography>
            <Box>
              {/* Step 1 */}
              <Box
                sx={{
                  backgroundColor: theme === 'dark' ? '#00000033' : '#00000003',
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
                    {t('addWebhookDialog.ensureGoBackend4000')}
                  </Typography>
                </Box>
              </Box>
              {/* Step 2 */}
              <Box
                sx={{
                  backgroundColor: theme === 'dark' ? '#00000033' : '#00000003',
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
                    {t('addWebhookDialog.openPort4000')}
                  </Typography>
                </Box>
              </Box>
              {/* Step 3 */}
              <Box
                sx={{
                  backgroundColor: theme === 'dark' ? '#00000033' : '#00000003',
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
                    {t('addWebhookDialog.findPublicIp')}
                  </Typography>
                </Box>
              </Box>
              {/* Step 4 */}
              <Box
                sx={{
                  backgroundColor: theme === 'dark' ? '#00000033' : '#00000003',
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
                      {t('addWebhookDialog.configureWebhookVm')}
                    </Typography>
                    <Box
                      sx={{
                        backgroundColor: theme === 'dark' ? '#0000004D' : '#00000003',
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
                        {t('addWebhookDialog.vmWebhookUrl')}
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
                        onClick={() => handleCopy(t('addWebhookDialog.vmWebhookUrlCopy'))}
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
                  backgroundColor: theme === 'dark' ? '#00000033' : '#00000003',
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
                    {t('addWebhookDialog.testWebhookOtherMachine')}
                  </Typography>
                </Box>
              </Box>
              {/* Step 6 */}
              <Box
                sx={{
                  backgroundColor: theme === 'dark' ? '#00000033' : '#00000003',
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
                    {t('addWebhookDialog.keepGoServerRunning')}
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
        <CancelButton onClick={handleCloseWebhookDialog}>{t('common.cancel')}</CancelButton>
      </DialogActions>
    </Dialog>
  );
};
