import React from 'react';
import { Box, Button, SxProps, Theme } from '@mui/material';
import { Colors } from './ImportClusters';

interface KubeconfigImportTabProps {
  theme: string;
  colors: Colors;
  commonInputSx: SxProps<Theme>;
  enhancedTabContentStyles: SxProps<Theme>;
  primaryButtonStyles: SxProps<Theme>;
  secondaryButtonStyles: SxProps<Theme>;
  selectedFile: File | null;
  setSelectedFile: (file: File | null) => void;
  handleFileUpload: () => void;
  handleCancel: () => void;
}

const KubeconfigImportTab: React.FC<KubeconfigImportTabProps> = ({
  theme,
  colors,
  enhancedTabContentStyles,
  primaryButtonStyles,
  secondaryButtonStyles,
  selectedFile,
  setSelectedFile,
  handleFileUpload,
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
          height: 'auto',
          maxHeight: 'calc(100% - 8px)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
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
              📁
            </span>
          </Box>
          <Box>
            <Box sx={{ fontWeight: 600, fontSize: '1rem', color: textColor }}>
              Upload Kubeconfig File
            </Box>
            <Box sx={{ color: colors.textSecondary, fontSize: '0.875rem', mt: 0.5 }}>
              Import your cluster by uploading a kubeconfig file
            </Box>
          </Box>
        </Box>

        <Box
          sx={{
            border: 1,
            borderStyle: 'dashed',
            borderColor: 'divider',
            borderRadius: { xs: 1.5, sm: 2 },
            p: { xs: 2, sm: 3 },
            textAlign: 'center',
            transition: 'all 0.3s ease',
            backgroundColor: theme === 'dark' ? 'rgba(0, 0, 0, 0.2)' : 'rgba(0, 0, 0, 0.01)',
            '&:hover': {
              borderColor: 'primary.main',
              backgroundColor:
                theme === 'dark' ? 'rgba(47, 134, 255, 0.05)' : 'rgba(47, 134, 255, 0.02)',
            },
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 1,
            mb: 2,
            minHeight: { xs: '200px', sm: '220px' },
            maxHeight: { xs: '250px', sm: '300px', md: '350px' },
          }}
        >
          <Box
            sx={{
              mb: 3,
              p: 2,
              borderRadius: '50%',
              backgroundColor:
                theme === 'dark' ? 'rgba(47, 134, 255, 0.1)' : 'rgba(47, 134, 255, 0.05)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span role="img" aria-label="upload" style={{ fontSize: '1.75rem' }}>
              📤
            </span>
          </Box>
          <Box sx={{ mb: 2, fontWeight: 500, fontSize: '1rem' }}>
            Drag and drop your kubeconfig file here
          </Box>
          <Box sx={{ color: colors.textSecondary, mb: 2, fontSize: '0.85rem' }}>- or -</Box>
          <Button component="label" variant="contained" sx={primaryButtonStyles}>
            Browse Files
            <input
              type="file"
              hidden
              accept=".kube/config, .yaml, .yml"
              onClick={e => (e.currentTarget.value = '')}
              onChange={e => {
                const file = e.target.files?.[0] || null;
                setSelectedFile(file);
              }}
            />
          </Button>
          {selectedFile && (
            <Box
              sx={{
                mt: 3,
                p: 2,
                borderRadius: 2,
                backgroundColor:
                  theme === 'dark' ? 'rgba(47, 134, 255, 0.1)' : 'rgba(47, 134, 255, 0.05)',
                border: `1px solid ${theme === 'dark' ? 'rgba(47, 134, 255, 0.3)' : 'rgba(47, 134, 255, 0.2)'}`,
                display: 'flex',
                alignItems: 'flex-start',
                gap: 1.5,
                animation: 'fadeIn 0.3s ease',
                '@keyframes fadeIn': {
                  '0%': { opacity: 0, transform: 'translateY(10px)' },
                  '100%': { opacity: 1, transform: 'translateY(0)' },
                },
              }}
            >
              <span role="img" aria-label="file" style={{ fontSize: '1.25rem' }}>
                📄
              </span>
              <Box>
                <Box sx={{ fontWeight: 600 }}>{selectedFile.name}</Box>
                <Box sx={{ fontSize: '0.75rem', color: colors.textSecondary }}>
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </Box>
              </Box>
            </Box>
          )}
        </Box>

        <Box
          sx={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 2,
            mt: 'auto',
            pt: 1,
            position: 'relative',
            zIndex: 2,
          }}
        >
          <Button onClick={handleCancel} variant="outlined" sx={secondaryButtonStyles}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleFileUpload}
            disabled={!selectedFile}
            sx={primaryButtonStyles}
          >
            Import Cluster
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default KubeconfigImportTab;
