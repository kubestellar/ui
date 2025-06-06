import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  Chip,
  IconButton,
  Fade,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import useTheme from '../../stores/themeStore';
import { useTranslation } from 'react-i18next';

interface PolicyNameDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (policyName: string) => void;
  defaultName?: string;
  workloadDisplay?: string;
  clusterDisplay?: string;
  loading?: boolean;
}

const PolicyNameDialog: React.FC<PolicyNameDialogProps> = ({
  open,
  onClose,
  onConfirm,
  defaultName = '',
  workloadDisplay = '',
  clusterDisplay = '',
  loading = false,
}) => {
  const theme = useTheme(state => state.theme);
  const isDarkTheme = theme === 'dark';
  const { t } = useTranslation();

  const [policyName, setPolicyName] = useState(defaultName);
  const [isEditing, setIsEditing] = useState(false);

  // Track whether dialog has been opened
  const [hasOpened, setHasOpened] = useState(false);

  useEffect(() => {
    if (open && !hasOpened) {
      // Only set the policy name when the dialog first opens
      setPolicyName(defaultName);
      setIsEditing(false);
      setHasOpened(true);
    } else if (!open) {
      // Reset the state when dialog closes
      setHasOpened(false);
    }
  }, [open, defaultName, hasOpened]);

  const handleConfirm = () => {
    if (policyName.trim()) {
      onConfirm(policyName.trim());
    }
  };

  const handleGenerateNew = () => {
    // Generate a new random policy name
    const timestamp = new Date().getTime().toString().slice(-6);
    const randomSuffix = Math.floor(Math.random() * 100)
      .toString()
      .padStart(2, '0');
    const newName = `policy-${timestamp}-${randomSuffix}`;
    setPolicyName(newName);
    setIsEditing(true);
  };

  const isValidName = (name: string): boolean => {
    // Kubernetes naming convention: lowercase alphanumeric characters, hyphens, and dots
    const k8sNameRegex = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/;
    return k8sNameRegex.test(name) && name.length <= 253;
  };

  const isNameValid = isValidName(policyName);

  return (
    <Dialog
      open={open}
      onClose={!loading ? onClose : undefined}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: isDarkTheme ? 'rgba(17, 25, 40, 0.95)' : 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          border: isDarkTheme
            ? '1px solid rgba(255, 255, 255, 0.15)'
            : '1px solid rgba(0, 0, 0, 0.08)',
          borderRadius: '16px',
          boxShadow: isDarkTheme
            ? '0 24px 48px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05)'
            : '0 24px 48px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(255, 255, 255, 0.8)',
          overflow: 'hidden',
        },
      }}
    >
      <DialogTitle
        sx={{
          bgcolor: isDarkTheme ? 'rgba(17, 25, 40, 0.8)' : 'rgba(255, 255, 255, 0.8)',
          borderBottom: `1px solid ${isDarkTheme ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)'}`,
          p: 3,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: '12px',
              bgcolor: isDarkTheme ? 'rgba(37, 99, 235, 0.2)' : 'rgba(37, 99, 235, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: isDarkTheme
                ? '1px solid rgba(37, 99, 235, 0.3)'
                : '1px solid rgba(37, 99, 235, 0.2)',
            }}
          >
            <EditIcon
              sx={{
                color: isDarkTheme ? '#60a5fa' : '#2563eb',
                fontSize: 20,
              }}
            />
          </Box>
          <Typography
            variant="h6"
            sx={{
              color: isDarkTheme ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.9)',
              fontWeight: 600,
            }}
          >
            {t('bindingPolicy.policyNameDialog.title')}
          </Typography>
        </Box>

        {/* Connection Display */}
        {workloadDisplay && clusterDisplay && (
          <Fade in timeout={300}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                p: 2,
                borderRadius: '12px',
                bgcolor: isDarkTheme ? 'rgba(34, 197, 94, 0.08)' : 'rgba(34, 197, 94, 0.05)',
                border: isDarkTheme
                  ? '1px solid rgba(34, 197, 94, 0.2)'
                  : '1px solid rgba(34, 197, 94, 0.15)',
              }}
            >
              <Chip
                size="small"
                label={workloadDisplay}
                sx={{
                  bgcolor: isDarkTheme ? 'rgba(34, 197, 94, 0.15)' : 'rgba(34, 197, 94, 0.1)',
                  color: isDarkTheme ? '#4ade80' : '#16a34a',
                  borderColor: isDarkTheme ? 'rgba(34, 197, 94, 0.3)' : 'rgba(34, 197, 94, 0.2)',
                  fontWeight: 500,
                  fontSize: '0.75rem',
                }}
              />
              <ArrowForwardIcon
                sx={{
                  color: isDarkTheme ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.4)',
                  fontSize: 16,
                }}
              />
              <Chip
                size="small"
                label={clusterDisplay}
                sx={{
                  bgcolor: isDarkTheme ? 'rgba(37, 99, 235, 0.15)' : 'rgba(37, 99, 235, 0.1)',
                  color: isDarkTheme ? '#60a5fa' : '#2563eb',
                  borderColor: isDarkTheme ? 'rgba(37, 99, 235, 0.3)' : 'rgba(37, 99, 235, 0.2)',
                  fontWeight: 500,
                  fontSize: '0.75rem',
                }}
              />
            </Box>
          </Fade>
        )}
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Typography
              variant="body2"
              sx={{
                color: isDarkTheme ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.7)',
                fontWeight: 500,
              }}
            >
              {t('bindingPolicy.policyNameDialog.policyName')}
            </Typography>
            <IconButton
              size="small"
              onClick={handleGenerateNew}
              sx={{
                color: isDarkTheme ? '#fbbf24' : '#d97706',
                '&:hover': {
                  bgcolor: isDarkTheme ? 'rgba(251, 191, 36, 0.1)' : 'rgba(217, 119, 6, 0.1)',
                },
              }}
              title={t('bindingPolicy.policyNameDialog.generateNew')}
            >
              <AutoAwesomeIcon fontSize="small" />
            </IconButton>
          </Box>

          <TextField
            fullWidth
            value={policyName}
            onChange={e => {
              setPolicyName(e.target.value);
              setIsEditing(true);
            }}
            placeholder={t('bindingPolicy.policyNameDialog.placeholder')}
            error={isEditing && !isNameValid}
            helperText={
              isEditing && !isNameValid
                ? t('bindingPolicy.policyNameDialog.invalid')
                : t('bindingPolicy.policyNameDialog.helper')
            }
            sx={{
              '& .MuiInputBase-root': {
                bgcolor: isDarkTheme ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
                borderRadius: '12px',
                fontSize: '1rem',
                fontWeight: 500,
                transition: 'all 0.2s ease',
                '&:hover': {
                  bgcolor: isDarkTheme ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
                },
                '&.Mui-focused': {
                  bgcolor: isDarkTheme ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
                },
              },
              '& .MuiInputBase-input': {
                color: isDarkTheme ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.9)',
                py: 1.5,
                px: 2,
              },
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: isDarkTheme ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.15)',
                borderWidth: '1px',
              },
              '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: isDarkTheme ? 'rgba(37, 99, 235, 0.5)' : 'rgba(37, 99, 235, 0.5)',
              },
              '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderColor: isDarkTheme ? '#60a5fa' : '#2563eb',
                borderWidth: '2px',
              },
              '& .MuiOutlinedInput-root.Mui-error .MuiOutlinedInput-notchedOutline': {
                borderColor: isDarkTheme ? '#f87171' : '#dc2626',
              },
              '& .MuiFormHelperText-root': {
                color:
                  isEditing && !isNameValid
                    ? isDarkTheme
                      ? '#f87171'
                      : '#dc2626'
                    : isDarkTheme
                      ? 'rgba(255, 255, 255, 0.6)'
                      : 'rgba(0, 0, 0, 0.6)',
                fontSize: '0.75rem',
                mt: 1,
                mx: 0,
              },
            }}
          />

          <Box
            sx={{
              p: 2,
              borderRadius: '12px',
              bgcolor: isDarkTheme ? 'rgba(59, 130, 246, 0.05)' : 'rgba(59, 130, 246, 0.03)',
              border: isDarkTheme
                ? '1px solid rgba(59, 130, 246, 0.15)'
                : '1px solid rgba(59, 130, 246, 0.1)',
            }}
          >
            <Typography
              variant="caption"
              sx={{
                color: isDarkTheme ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)',
                display: 'block',
                mb: 0.5,
                fontWeight: 500,
              }}
            >
              {t('bindingPolicy.policyNameDialog.namingTipsTitle')}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: isDarkTheme ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.5)',
                lineHeight: 1.4,
              }}
            >
              {t('bindingPolicy.policyNameDialog.namingTips')}
            </Typography>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions
        sx={{
          p: 3,
          bgcolor: isDarkTheme ? 'rgba(17, 25, 40, 0.5)' : 'rgba(255, 255, 255, 0.5)',
          borderTop: `1px solid ${isDarkTheme ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)'}`,
          gap: 1.5,
        }}
      >
        <Button
          onClick={onClose}
          disabled={loading}
          sx={{
            px: 3,
            py: 1,
            borderRadius: '10px',
            textTransform: 'none',
            fontWeight: 500,
            color: isDarkTheme ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.7)',
            '&:hover': {
              bgcolor: isDarkTheme ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
            },
          }}
        >
          {t('common.cancel')}
        </Button>
        <Button
          variant="contained"
          onClick={handleConfirm}
          disabled={!policyName.trim() || !isNameValid || loading}
          sx={{
            px: 4,
            py: 1,
            borderRadius: '10px',
            textTransform: 'none',
            fontWeight: 600,
            bgcolor: isDarkTheme ? '#2563eb' : '#2563eb',
            color: '#ffffff',
            boxShadow: isDarkTheme
              ? '0 4px 12px rgba(37, 99, 235, 0.3)'
              : '0 4px 12px rgba(37, 99, 235, 0.2)',
            '&:hover': {
              bgcolor: isDarkTheme ? '#1d4ed8' : '#1d4ed8',
              transform: 'translateY(-1px)',
              boxShadow: isDarkTheme
                ? '0 6px 16px rgba(37, 99, 235, 0.4)'
                : '0 6px 16px rgba(37, 99, 235, 0.3)',
            },
            '&:disabled': {
              bgcolor: isDarkTheme ? 'rgba(37, 99, 235, 0.3)' : 'rgba(37, 99, 235, 0.3)',
              color: 'rgba(255, 255, 255, 0.5)',
              transform: 'none',
              boxShadow: 'none',
            },
            transition: 'all 0.2s ease',
          }}
        >
          {loading ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box
                component="span"
                sx={{
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  border: '2px solid currentColor',
                  borderRightColor: 'transparent',
                  animation: 'spin 1s linear infinite',
                  '@keyframes spin': {
                    '0%': { transform: 'rotate(0deg)' },
                    '100%': { transform: 'rotate(360deg)' },
                  },
                }}
              />
              {t('bindingPolicy.policyNameDialog.creating')}
            </Box>
          ) : (
            t('bindingPolicy.policyNameDialog.createPolicy')
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PolicyNameDialog;
