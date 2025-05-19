import { useState } from 'react';
import { Box, Typography, TextField, Button, IconButton, CircularProgress } from '@mui/material';
import { FiX } from 'react-icons/fi';

interface NewAppDialogProps {
  open: boolean;
  onClose: () => void;
  onDeploy: (githubUrl: string, path: string) => Promise<void>;
  loading: boolean;
}

const NewAppDialog = ({ open, onClose, onDeploy, loading }: NewAppDialogProps) => {
  const [formData, setFormData] = useState<{ githuburl: string; path: string }>({
    githuburl: '',
    path: '',
  });
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      setFormData({ githuburl: '', path: '' });
      onClose();
    }, 400); // Match transition duration
  };

  const handleDeployClick = () => {
    if (formData.githuburl && formData.path) {
      onDeploy(formData.githuburl, formData.path);
    }
  };

  return (
    <Box
      sx={{
        position: 'fixed',
        right: open ? 0 : '-80vw',
        top: 0,
        bottom: 0,
        width: '80vw',
        bgcolor: '#e5f6fd',
        boxShadow: '-2px 0 10px rgba(0,0,0,0.2)',
        transition: 'right 0.4s ease-in-out',
        zIndex: 1001,
        overflowY: 'auto',
        borderTopLeftRadius: '8px',
        borderBottomLeftRadius: '8px',
      }}
    >
      {isClosing ? (
        <Box sx={{ height: '100%', width: '100%' }} />
      ) : open ? (
        <Box sx={{ p: 6, height: '100%' }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={5}>
            <Typography variant="h4" fontWeight="bold" sx={{ color: '#000000', fontSize: '20px' }}>
              Create New App
            </Typography>
            <IconButton onClick={handleClose} sx={{ color: '#6d7f8b', fontSize: '20px' }}>
              <FiX />
            </IconButton>
          </Box>

          <Box
            component="form"
            sx={{
              bgcolor: '#ffffff',
              p: 4,
              borderRadius: 1,
              boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
            }}
          >
            <TextField
              fullWidth
              label="GitHub URL"
              variant="outlined"
              value={formData.githuburl}
              onChange={e => setFormData(prev => ({ ...prev, githuburl: e.target.value }))}
              sx={{
                mb: 3,
                '& .MuiOutlinedInput-root': {
                  '& fieldset': {
                    borderColor: '#00b4d8',
                  },
                  '&:hover fieldset': {
                    borderColor: '#0077b6',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#00b4d8',
                    borderWidth: 2,
                  },
                },
                '& .MuiInputLabel-root': {
                  color: '#666666',
                  '&.Mui-focused': {
                    color: '#00b4d8',
                  },
                },
                '& .MuiInputBase-input': {
                  color: '#333333',
                },
              }}
              InputProps={{
                sx: {
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    boxShadow: '0 0 8px rgba(0, 180, 216, 0.3)',
                  },
                },
              }}
            />

            <TextField
              fullWidth
              label="Path"
              variant="outlined"
              value={formData.path}
              onChange={e => setFormData(prev => ({ ...prev, path: e.target.value }))}
              sx={{
                mb: 4,
                '& .MuiOutlinedInput-root': {
                  '& fieldset': {
                    borderColor: '#00b4d8',
                  },
                  '&:hover fieldset': {
                    borderColor: '#0077b6',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#00b4d8',
                    borderWidth: 2,
                  },
                },
                '& .MuiInputLabel-root': {
                  color: '#666666',
                  '&.Mui-focused': {
                    color: '#00b4d8',
                  },
                },
                '& .MuiInputBase-input': {
                  color: '#333333',
                },
              }}
              InputProps={{
                sx: {
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    boxShadow: '0 0 8px rgba(0, 180, 216, 0.3)',
                  },
                },
              }}
            />

            <Box display="flex" justifyContent="flex-end" gap={2}>
              <Button
                onClick={handleClose}
                color="secondary"
                sx={{
                  color: '#666666',
                  '&:hover': {
                    bgcolor: '#f0f0f0',
                  },
                }}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handleDeployClick}
                disabled={loading || !formData.githuburl || !formData.path}
                sx={{
                  bgcolor: '#00b4d8',
                  '&:hover': {
                    bgcolor: '#0077b6',
                  },
                  '&:disabled': {
                    bgcolor: '#b0bec5',
                  },
                }}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : 'Deploy'}
              </Button>
            </Box>
          </Box>
        </Box>
      ) : null}
    </Box>
  );
};

export default NewAppDialog;
