import React, { useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  Paper,
  Alert,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  Card,
  CardContent,
} from '@mui/material';
import { Upload, FileText, Github, CheckCircle } from 'lucide-react';
import useTheme from '../../stores/themeStore';

interface PluginUploaderProps {
  onUploadLocal: (pluginPath: string, manifestPath: string) => void;
  onInstallFromGitHub: (repoUrl: string) => void;
  loading: boolean;
}

const PluginUploader: React.FC<PluginUploaderProps> = ({
  onUploadLocal,
  onInstallFromGitHub,
  loading,
}) => {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<'local' | 'github'>('github');
  const [pluginFile, setPluginFile] = useState<File | null>(null);
  const [manifestFile, setManifestFile] = useState<File | null>(null);
  const [repoUrl, setRepoUrl] = useState('');
  const [dragOver, setDragOver] = useState(false);

  const isDark = theme === 'dark';

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    const soFile = files.find(f => f.name.endsWith('.so'));
    const yamlFile = files.find(f => f.name.endsWith('.yaml') || f.name.endsWith('.yml'));

    if (soFile) setPluginFile(soFile);
    if (yamlFile) setManifestFile(yamlFile);
  }, []);

  const handleFileChange =
    (type: 'plugin' | 'manifest') => (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        if (type === 'plugin') setPluginFile(file);
        else setManifestFile(file);
      }
    };

  const handleLocalUpload = () => {
    if (pluginFile && manifestFile) {
      // In a real implementation, you would upload the files to your server first
      // For demo purposes, we'll use placeholder paths
      const pluginPath = `/tmp/uploads/${pluginFile.name}`;
      const manifestPath = `/tmp/uploads/${manifestFile.name}`;
      onUploadLocal(pluginPath, manifestPath);
    }
  };

  const handleGitHubInstall = () => {
    if (repoUrl) {
      onInstallFromGitHub(repoUrl);
    }
  };

  const isValidGitHubUrl = (url: string) => {
    return url.includes('github.com/') && url.length > 0;
  };

  return (
    <Box>
      {/* Tab Selection */}
      <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
        <Button
          variant={activeTab === 'github' ? 'contained' : 'outlined'}
          onClick={() => setActiveTab('github')}
          startIcon={<Github size={16} />}
          sx={{
            borderColor: isDark ? '#374151' : '#d1d5db',
            color: activeTab === 'github' ? '#ffffff' : isDark ? '#e5e7eb' : '#374151',
          }}
        >
          From GitHub
        </Button>
        <Button
          variant={activeTab === 'local' ? 'contained' : 'outlined'}
          onClick={() => setActiveTab('local')}
          startIcon={<Upload size={16} />}
          sx={{
            borderColor: isDark ? '#374151' : '#d1d5db',
            color: activeTab === 'local' ? '#ffffff' : isDark ? '#e5e7eb' : '#374151',
          }}
        >
          Local Files
        </Button>
      </Box>

      {/* GitHub Installation */}
      {activeTab === 'github' && (
        <Card
          sx={{
            backgroundColor: isDark ? '#1e293b' : '#ffffff',
            border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
          }}
        >
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Github size={20} />
              <Typography variant="h6">Install from GitHub Repository</Typography>
            </Box>

            <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
              Enter the GitHub repository URL to install the plugin directly from the latest
              release.
            </Typography>

            <TextField
              fullWidth
              label="GitHub Repository URL"
              placeholder="https://github.com/username/plugin-repository"
              value={repoUrl}
              onChange={e => setRepoUrl(e.target.value)}
              error={repoUrl.length > 0 && !isValidGitHubUrl(repoUrl)}
              helperText={
                repoUrl.length > 0 && !isValidGitHubUrl(repoUrl)
                  ? 'Please enter a valid GitHub repository URL'
                  : 'The plugin will be installed from the latest release'
              }
              sx={{
                mb: 3,
                '& .MuiOutlinedInput-root': {
                  backgroundColor: isDark ? '#1f2937' : '#ffffff',
                  '& fieldset': {
                    borderColor: isDark ? '#374151' : '#d1d5db',
                  },
                },
              }}
            />

            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body2">
                Make sure the repository has a valid plugin.yaml manifest and compiled .so files in
                its releases.
              </Typography>
            </Alert>

            <Button
              variant="contained"
              fullWidth
              onClick={handleGitHubInstall}
              disabled={!isValidGitHubUrl(repoUrl) || loading}
              startIcon={loading ? <CircularProgress size={16} /> : <Github size={16} />}
            >
              {loading ? 'Installing...' : 'Install Plugin'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Local File Upload */}
      {activeTab === 'local' && (
        <Card
          sx={{
            backgroundColor: isDark ? '#1e293b' : '#ffffff',
            border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
          }}
        >
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Upload size={20} />
              <Typography variant="h6">Upload Local Plugin Files</Typography>
            </Box>

            <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
              Upload both the compiled plugin (.so file) and the manifest (.yaml file) to install a
              local plugin.
            </Typography>

            {/* Upload Steps */}
            <Stepper
              activeStep={pluginFile && manifestFile ? 2 : pluginFile || manifestFile ? 1 : 0}
              sx={{ mb: 3 }}
            >
              <Step>
                <StepLabel>Upload Plugin Binary</StepLabel>
              </Step>
              <Step>
                <StepLabel>Upload Manifest</StepLabel>
              </Step>
              <Step>
                <StepLabel>Install</StepLabel>
              </Step>
            </Stepper>

            {/* Drop Zone */}
            <Paper
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              sx={{
                p: 4,
                mb: 3,
                textAlign: 'center',
                border: `2px dashed ${
                  dragOver ? (isDark ? '#3b82f6' : '#2563eb') : isDark ? '#374151' : '#d1d5db'
                }`,
                backgroundColor: dragOver
                  ? isDark
                    ? '#1e3a8a20'
                    : '#3b82f620'
                  : isDark
                    ? '#111827'
                    : '#f9fafb',
                cursor: 'pointer',
                transition: 'all 0.2s ease-in-out',
              }}
            >
              <Upload
                size={48}
                style={{
                  color: isDark ? '#6b7280' : '#9ca3af',
                  marginBottom: '16px',
                }}
              />
              <Typography variant="h6" gutterBottom>
                Drag & Drop Files Here
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Or click the buttons below to select files
              </Typography>
            </Paper>

            {/* File Selection Buttons */}
            <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
              <Button
                variant="outlined"
                component="label"
                startIcon={pluginFile ? <CheckCircle size={16} /> : <FileText size={16} />}
                sx={{
                  flex: 1,
                  borderColor: pluginFile ? '#10b981' : isDark ? '#374151' : '#d1d5db',
                  color: pluginFile ? '#10b981' : isDark ? '#e5e7eb' : '#374151',
                }}
              >
                {pluginFile ? pluginFile.name : 'Select Plugin (.so)'}
                <input type="file" hidden accept=".so" onChange={handleFileChange('plugin')} />
              </Button>

              <Button
                variant="outlined"
                component="label"
                startIcon={manifestFile ? <CheckCircle size={16} /> : <FileText size={16} />}
                sx={{
                  flex: 1,
                  borderColor: manifestFile ? '#10b981' : isDark ? '#374151' : '#d1d5db',
                  color: manifestFile ? '#10b981' : isDark ? '#e5e7eb' : '#374151',
                }}
              >
                {manifestFile ? manifestFile.name : 'Select Manifest (.yaml)'}
                <input
                  type="file"
                  hidden
                  accept=".yaml,.yml"
                  onChange={handleFileChange('manifest')}
                />
              </Button>
            </Box>

            {/* File Status */}
            {(pluginFile || manifestFile) && (
              <Box sx={{ mb: 3 }}>
                {pluginFile && (
                  <Alert severity="success" sx={{ mb: 1 }}>
                    Plugin binary: {pluginFile.name} ({(pluginFile.size / 1024 / 1024).toFixed(2)}{' '}
                    MB)
                  </Alert>
                )}
                {manifestFile && (
                  <Alert severity="success" sx={{ mb: 1 }}>
                    Manifest: {manifestFile.name}
                  </Alert>
                )}
                {(!pluginFile || !manifestFile) && (
                  <Alert severity="warning">
                    {!pluginFile && !manifestFile
                      ? 'Please upload both plugin binary and manifest files'
                      : !pluginFile
                        ? 'Please upload the plugin binary (.so file)'
                        : 'Please upload the manifest (.yaml file)'}
                  </Alert>
                )}
              </Box>
            )}

            <Button
              variant="contained"
              fullWidth
              onClick={handleLocalUpload}
              disabled={!pluginFile || !manifestFile || loading}
              startIcon={loading ? <CircularProgress size={16} /> : <Upload size={16} />}
            >
              {loading ? 'Installing...' : 'Install Plugin'}
            </Button>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default PluginUploader;
