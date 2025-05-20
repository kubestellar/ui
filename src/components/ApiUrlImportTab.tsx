import React from 'react';
import { Box, Button, TextField, SxProps, Theme } from '@mui/material';
import { Colors } from './ImportClusters';

interface ApiUrlImportTabProps {
  theme: string;
  colors: Colors;
  commonInputSx: SxProps<Theme>;
  enhancedTabContentStyles: SxProps<Theme>;
  primaryButtonStyles: SxProps<Theme>;
  secondaryButtonStyles: SxProps<Theme>;
  formData: { clusterName: string; token: string; hubApiServer: string };
  setFormData: (data: { clusterName: string; token: string; hubApiServer: string }) => void;
  handleCancel: () => void;
}

const ApiUrlImportTab: React.FC<ApiUrlImportTabProps> = ({
  theme,
  colors,
  commonInputSx,
  enhancedTabContentStyles,
  primaryButtonStyles,
  secondaryButtonStyles,
  formData,
  setFormData,
  handleCancel,
}) => {
  const textColor = theme === 'dark' ? colors.white : colors.text;

  return (
    <Box
      sx={{
        ...enhancedTabContentStyles,
        border: 'none',
        boxShadow: 'none',
        bgcolor: 'transparent',
        p: 0,
      }}
    >
      <Box
        sx={{
          p: { xs: 1.5, sm: 2, md: 2.5 },
          borderRadius: { xs: 1.5, sm: 2 },
          backgroundColor: theme === 'dark' ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.8)',
          border: `1px solid ${theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
          boxShadow:
            theme === 'dark' ? '0 4px 12px rgba(0, 0, 0, 0.3)' : '0 4px 12px rgba(0, 0, 0, 0.05)',
          mb: 1.5,
          width: '100%',
          maxWidth: '100%',
          display: 'flex',
          flexDirection: 'column',
          height: 'calc(100% - 8px)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: theme === 'dark' ? 'rgba(47, 134, 255, 0.15)' : 'rgba(47, 134, 255, 0.1)',
              color: theme === 'dark' ? colors.primaryLight : colors.primary,
            }}
          >
            <span role="img" aria-label="info" style={{ fontSize: '1.25rem' }}>
              🔗
            </span>
          </Box>
          <Box>
            <Box sx={{ fontWeight: 600, fontSize: '1rem', color: textColor }}>
              Connect via API/URL
            </Box>
            <Box sx={{ color: colors.textSecondary, fontSize: '0.875rem', mt: 0.5 }}>
              Import your cluster by providing the API endpoint and authentication details
            </Box>
          </Box>
        </Box>

        <Box sx={{ mb: 3 }}>
          <TextField
            fullWidth
            label="API/URL Endpoint"
            placeholder="https://kubernetes.example.com:6443"
            value={formData.clusterName}
            onChange={e => setFormData({ ...formData, clusterName: e.target.value })}
            InputProps={{
              sx: {
                borderRadius: 1.5,
                backgroundColor:
                  theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
                color: theme === 'dark' ? '#ffffff' : 'inherit',
              },
              startAdornment: <Box sx={{ color: colors.textSecondary, mr: 1 }}>🔗</Box>,
            }}
            sx={{
              ...commonInputSx,
              '& .MuiOutlinedInput-root': {
                color: theme === 'dark' ? '#ffffff' : 'inherit',
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'primary.main',
                  borderWidth: '1px',
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'primary.main',
                  borderWidth: '2px',
                },
              },
              '& .MuiOutlinedInput-input': {
                color: theme === 'dark' ? '#ffffff' : 'inherit',
              },
              '& .MuiInputLabel-root': {
                color: theme === 'dark' ? 'rgba(255, 255, 255, 0.7)' : 'inherit',
              },
              '& .MuiInputLabel-root.Mui-focused': {
                color: theme === 'dark' ? colors.primaryLight : colors.primary,
              },
            }}
          />
          <TextField
            fullWidth
            label="Authentication Token (Optional)"
            placeholder="Enter authentication token if required"
            type="password"
            value={formData.token}
            onChange={e => setFormData({ ...formData, token: e.target.value })}
            InputProps={{
              sx: {
                borderRadius: 1.5,
                backgroundColor:
                  theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
                color: theme === 'dark' ? '#ffffff' : 'inherit',
              },
              startAdornment: <Box sx={{ color: colors.textSecondary, mr: 1 }}>🔒</Box>,
            }}
            sx={{
              ...commonInputSx,
              mb: 0,
              '& .MuiOutlinedInput-root': {
                color: theme === 'dark' ? '#ffffff' : 'inherit',
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'primary.main',
                  borderWidth: '1px',
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'primary.main',
                  borderWidth: '2px',
                },
              },
              '& .MuiOutlinedInput-input': {
                color: theme === 'dark' ? '#ffffff' : 'inherit',
              },
              '& .MuiInputLabel-root': {
                color: theme === 'dark' ? 'rgba(255, 255, 255, 0.7)' : 'inherit',
              },
              '& .MuiInputLabel-root.Mui-focused': {
                color: theme === 'dark' ? colors.primaryLight : colors.primary,
              },
            }}
          />
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 'auto' }}>
          <Button onClick={handleCancel} variant="outlined" sx={secondaryButtonStyles}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={!formData.clusterName.trim()}
            sx={primaryButtonStyles}
            // onClick={handleConnect} // Add a handler for connect if needed
          >
            Connect & Import
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default ApiUrlImportTab;
