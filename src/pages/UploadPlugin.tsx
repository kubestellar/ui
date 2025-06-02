import React, { useState } from 'react';
import { api } from '../lib/api';
// import { useNavigate } from 'react-router-dom';
import {
  Box,
  TextField,
  Button,
  Typography,
  CircularProgress,
  Snackbar,
  Alert,
  Fade
} from '@mui/material';

const UploadPlugin = () => {
  const [repoUrl, setRepoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error'
  });
  // const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoUrl) {
      setSnackbar({
        open: true,
        message: 'Please enter a GitHub repository URL',
        severity: 'error'
      });
      return;
    }

    setLoading(true);
    try {
      // First clone the repository
      const cloneResponse = await api.post('api/plugins/clone', {
        repoURL: repoUrl
      });

      if (!cloneResponse.data.success) {
        throw new Error(cloneResponse.data.message);
      }

      // After successful clone, fetch the manifest
      const manifestResponse = await api.get('api/plugin/getManifest');
      
      setSnackbar({
        open: true,
        message: 'Repository cloned and manifest loaded successfully!',
        severity: 'success'
      });
      
      // Log the manifest data (you can handle it as needed)
      console.log('Plugin manifest:', manifestResponse.data);
      
      // Reset form after successful submission
      setRepoUrl('');
    } catch (error) {
      setSnackbar({
        open: true,
        message: error instanceof Error ? error.message : 'An error occurred',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: 600,
        mx: 'auto',
        mt: 6,
        px: 2,
        color: '#f0f0f0'
      }}
    >
      <Fade in timeout={700}>
        <Box component="form" onSubmit={handleSubmit}>
          <Typography variant="h4" gutterBottom>
            Add Plugin from GitHub
          </Typography>
          <Typography variant="body1" paragraph>
            Enter the GitHub repository URL of the plugin you want to add
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="https://github.com/username/repository"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              disabled={loading}
              sx={{
                '& .MuiOutlinedInput-root': {
                  '& fieldset': {
                    borderColor: 'rgba(255, 255, 255, 0.23)',
                  },
                  '&:hover fieldset': {
                    borderColor: 'rgba(255, 255, 255, 0.5)',
                  },
                },
                '& .MuiInputBase-input': {
                  color: '#f0f0f0',
                }
              }}
            />
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={loading || !repoUrl}
              sx={{ minWidth: 120 }}
            >
              {loading ? <CircularProgress size={24} /> : 'Clone & Install'}
            </Button>
          </Box>
        </Box>
      </Fade>
              
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default UploadPlugin;