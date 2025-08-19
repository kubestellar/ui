import React, { useState, DragEvent } from 'react';
import { Box, Button, SxProps, Theme, Typography } from '@mui/material';
import { Colors } from './ImportClusters';
import CancelButton from '../../common/CancelButton';
import { useTranslation } from 'react-i18next';
import jsYaml from 'js-yaml';

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
  setSnackbar: (snackbar: {
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'warning' | 'info';
  }) => void;
}

// Strongly-typed shape for the parts of kubeconfig we read in the UI
interface KubeCluster {
  name: string;
  cluster?: { server?: string };
}
interface KubeUser {
  name: string;
  user?: { token?: string; username?: string };
}
interface KubeContext {
  name: string;
  context?: { cluster?: string; user?: string };
}

interface ParsedKubeconfig {
  clusters?: KubeCluster[];
  users?: KubeUser[];
  contexts?: KubeContext[];
  [key: string]: unknown;
}

const KubeconfigImportTab: React.FC<KubeconfigImportTabProps> = ({
  theme,
  colors,
  enhancedTabContentStyles,
  primaryButtonStyles,
  // secondaryButtonStyles,
  selectedFile,
  setSelectedFile,
  handleFileUpload,
  handleCancel,
  setSnackbar,
}) => {
  const { t } = useTranslation();
  const textColor = theme === 'dark' ? colors.white : colors.text;
  const [isDragOver, setIsDragOver] = useState(false);
  const [parsedKubeconfig, setParsedKubeconfig] = useState<ParsedKubeconfig | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  const handleFileSelect = (file: File | null) => {
    if (!file) {
      setSelectedFile(null);
      setParsedKubeconfig(null);
      setParseError(null);
      return;
    }

    const allowedExtensions = ['yaml', 'yml', 'kubeconfig'];
    const fileNameParts = file.name.split('.');
    const extension = fileNameParts.length > 1 ? fileNameParts.pop()?.toLowerCase() : '';

    if (
      file.name.toLowerCase() === 'config' ||
      (extension && allowedExtensions.includes(extension))
    ) {
      setSelectedFile(file);
      setParseError(null); // Clear previous errors

      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) => {
        try {
          const content = e.target?.result as string;
          // jsYaml.load returns unknown-ish data; cast it to our typed shape
          const parsed = jsYaml.load(content) as ParsedKubeconfig;
          setParsedKubeconfig(parsed);
          setSnackbar({
            open: true,
            message: `File ${file.name} uploaded and parsed successfully`,
            severity: 'success',
          });
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          console.error('Error parsing kubeconfig:', message);
          setParsedKubeconfig(null);
          setParseError(`Failed to parse kubeconfig file: ${message}`);
          setSnackbar({
            open: true,
            message: `Failed to parse ${file.name}: ${message}`,
            severity: 'error',
          });
        }
      };
      reader.onerror = () => {
        const errorMessage = `Failed to read file: ${reader.error?.message ?? 'Unknown error'}`;
        console.error(errorMessage);
        setParsedKubeconfig(null);
        setParseError(errorMessage);
        setSnackbar({
          open: true,
          message: errorMessage,
          severity: 'error',
        });
      };
      reader.readAsText(file);
    } else {
      setSelectedFile(null);
      setParsedKubeconfig(null);
      setParseError(null);
      setSnackbar({
        open: true,
        message: 'Invalid file type. Please upload a .yaml, .yml, or kubeconfig file.',
        severity: 'error',
      });
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

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
              {t('kubeconfigImport.title')}
            </Box>
            <Box sx={{ color: colors.textSecondary, fontSize: '0.875rem', mt: 0.5 }}>
              {t('kubeconfigImport.description')}
            </Box>
          </Box>
        </Box>

        {parseError && (
          <Box sx={{ color: colors.error, mb: 2, fontSize: '0.875rem' }}>{parseError}</Box>
        )}

        {!selectedFile && (
          <Box
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            sx={{
              border: 1,
              borderStyle: 'dashed',
              borderColor: isDragOver ? 'primary.main' : 'divider',
              borderRadius: { xs: 1.5, sm: 2 },
              p: { xs: 2, sm: 3 },
              textAlign: 'center',
              transition: 'all 0.3s ease',
              backgroundColor: isDragOver
                ? theme === 'dark'
                  ? 'rgba(47, 134, 255, 0.05)'
                  : 'rgba(47, 134, 255, 0.02)'
                : theme === 'dark'
                  ? 'rgba(0, 0, 0, 0.2)'
                  : 'rgba(0, 0, 0, 0.01)',
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
              {t('kubeconfigImport.dragAndDrop')}
            </Box>
            <Box sx={{ color: colors.textSecondary, mb: 2, fontSize: '0.85rem' }}>
              {t('kubeconfigImport.or')}
            </Box>
            <Button component="label" variant="contained" sx={primaryButtonStyles}>
              {t('kubeconfigImport.browseFiles')}
              <input
                type="file"
                hidden
                accept=".kube/config, .yaml, .yml"
                onClick={e => (e.currentTarget.value = '')}
                onChange={e => {
                  const file = e.target.files?.[0] || null;
                  handleFileSelect(file);
                }}
              />
            </Button>
          </Box>
        )}

        {parsedKubeconfig && (
          <Box
            sx={{
              p: { xs: 1.5, sm: 2, md: 2.5 },
              borderRadius: { xs: 1.5, sm: 2 },
              backgroundColor: theme === 'dark' ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.8)',
              border: `1px solid ${theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
              boxShadow:
                theme === 'dark'
                  ? '0 4px 12px rgba(0, 0, 0, 0.3)'
                  : '0 4px 12px rgba(0, 0, 0, 0.05)',
              mt: 2,
              width: '100%',
              maxWidth: '100%',
              maxHeight: '300px', // Limit height for scrollability
              overflowY: 'auto', // Enable scrolling
            }}
          >
            {selectedFile && (
              <Box
                sx={{
                  mb: 2,
                  p: 2,
                  borderRadius: 2,
                  backgroundColor:
                    theme === 'dark' ? 'rgba(47, 134, 255, 0.1)' : 'rgba(47, 134, 255, 0.05)',
                  border: `1px solid ${theme === 'dark' ? 'rgba(47, 134, 255, 0.3)' : 'rgba(47, 134, 255, 0.2)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  animation: 'fadeIn 0.3s ease',
                  '@keyframes fadeIn': {
                    '0%': { opacity: 0, transform: 'translateY(10px)' },
                    '100%': { opacity: 1, transform: 'translateY(0)' },
                  },
                  width: '100%',
                  justifyContent: 'space-between',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
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
                <Button
                  size="small"
                  onClick={() => handleFileSelect(null)} // Use handleFileSelect to clear
                  sx={{
                    color: colors.error,
                    minWidth: 'auto',
                    p: 0.5,
                    borderRadius: '50%',
                    '&:hover': { backgroundColor: 'rgba(255, 107, 107, 0.1)' },
                  }}
                >
                  <span role="img" aria-label="remove">
                    ❌
                  </span>
                </Button>
              </Box>
            )}

            <Typography variant="h6" sx={{ color: textColor, mb: 1.5, fontWeight: 600 }}>
              {t('kubeconfigImport.parsedInfoTitle')}
            </Typography>

            {parsedKubeconfig.clusters && parsedKubeconfig.clusters.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography
                  variant="subtitle1"
                  sx={{ color: colors.primary, fontWeight: 500, mb: 1 }}
                >
                  {t('kubeconfigImport.clusters')}
                </Typography>
                {parsedKubeconfig.clusters.map((cluster: KubeCluster, index: number) => (
                  <Box
                    key={index}
                    sx={{ mb: 1, ml: 1, borderLeft: `2px solid ${colors.border}`, pl: 1 }}
                  >
                    <Typography sx={{ color: textColor, fontSize: '0.9rem' }}>
                      <Box component="span" sx={{ fontWeight: 600 }}>
                        {t('kubeconfigImport.name')}:
                      </Box>{' '}
                      {cluster.name}
                    </Typography>
                    <Typography sx={{ color: colors.textSecondary, fontSize: '0.85rem' }}>
                      <Box component="span" sx={{ fontWeight: 600 }}>
                        {t('kubeconfigImport.server')}:
                      </Box>{' '}
                      {cluster.cluster?.server}
                    </Typography>
                  </Box>
                ))}
              </Box>
            )}

            {parsedKubeconfig.users && parsedKubeconfig.users.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography
                  variant="subtitle1"
                  sx={{ color: colors.primary, fontWeight: 500, mb: 1 }}
                >
                  {t('kubeconfigImport.users')}
                </Typography>
                {parsedKubeconfig.users.map((user: KubeUser, index: number) => (
                  <Box
                    key={index}
                    sx={{ mb: 1, ml: 1, borderLeft: `2px solid ${colors.border}`, pl: 1 }}
                  >
                    <Typography sx={{ color: textColor, fontSize: '0.9rem' }}>
                      <Box component="span" sx={{ fontWeight: 600 }}>
                        {t('kubeconfigImport.name')}:
                      </Box>{' '}
                      {user.name}
                    </Typography>
                    {user.user?.token && (
                      <Typography sx={{ color: colors.textSecondary, fontSize: '0.85rem' }}>
                        <Box component="span" sx={{ fontWeight: 600 }}>
                          {t('kubeconfigImport.token')}:
                        </Box>{' '}
                        {user.user.token.substring(0, 10)}...
                      </Typography>
                    )}
                    {user.user?.username && (
                      <Typography sx={{ color: colors.textSecondary, fontSize: '0.85rem' }}>
                        <Box component="span" sx={{ fontWeight: 600 }}>
                          {t('kubeconfigImport.username')}:
                        </Box>{' '}
                        {user.user.username}
                      </Typography>
                    )}
                  </Box>
                ))}
              </Box>
            )}

            {parsedKubeconfig.contexts && parsedKubeconfig.contexts.length > 0 && (
              <Box>
                <Typography
                  variant="subtitle1"
                  sx={{ color: colors.primary, fontWeight: 500, mb: 1 }}
                >
                  {t('kubeconfigImport.contexts')}
                </Typography>
                {parsedKubeconfig.contexts.map((context: KubeContext, index: number) => (
                  <Box
                    key={index}
                    sx={{ mb: 1, ml: 1, borderLeft: `2px solid ${colors.border}`, pl: 1 }}
                  >
                    <Typography sx={{ color: textColor, fontSize: '0.9rem' }}>
                      <Box component="span" sx={{ fontWeight: 600 }}>
                        {t('kubeconfigImport.name')}:
                      </Box>{' '}
                      {context.name}
                    </Typography>
                    <Typography sx={{ color: colors.textSecondary, fontSize: '0.85rem' }}>
                      <Box component="span" sx={{ fontWeight: 600 }}>
                        {t('kubeconfigImport.cluster')}:
                      </Box>{' '}
                      {context.context?.cluster}
                    </Typography>
                    <Typography sx={{ color: colors.textSecondary, fontSize: '0.85rem' }}>
                      <Box component="span" sx={{ fontWeight: 600 }}>
                        {t('kubeconfigImport.user')}:
                      </Box>{' '}
                      {context.context?.user}
                    </Typography>
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        )}

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
          <CancelButton onClick={handleCancel} />
          <Button
            variant="contained"
            onClick={handleFileUpload}
            disabled={!selectedFile || !parsedKubeconfig}
            sx={primaryButtonStyles}
          >
            {t('kubeconfigImport.importCluster')}
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default KubeconfigImportTab;
