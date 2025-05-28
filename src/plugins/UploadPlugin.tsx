import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  useTheme,
  styled,
  Fade,
  Grow
} from '@mui/material';
import UploadIcon from '@mui/icons-material/Upload';
import { useNavigate } from 'react-router-dom';

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(4),
  backgroundColor: '#1c1c1f',
  borderRadius: '12px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: theme.spacing(3),
  boxShadow: '0 0 10px rgba(0,0,0,0.5)',
  transition: 'transform 0.3s ease',
  '&:hover': {
    transform: 'scale(1.01)',
    boxShadow: '0 0 16px rgba(0,0,0,0.7)'
  }
}));

const UploadPlugin: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const theme = useTheme();
  const navigate = useNavigate();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile && selectedFile.name.endsWith('.json')) {
      setFile(selectedFile);
    }
  };

  const handleActivate = async () => {
    if (!file) {
      alert('Please select a JSON file first');
      return;
    }

    try {
      const fileContent = await file.text();
      const manifest = JSON.parse(fileContent);

      const pluginName = manifest.name || manifest.metadata?.name;
      if (!pluginName) throw new Error('Invalid manifest: plugin name not found');

      navigate(`/plugins?activate=quota-visualiser`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'An unknown error occurred';
      alert('Failed to activate plugin: ' + message);
    }
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
        <Typography
          variant="h4"
          sx={{ mb: 3, color: '#2196f3', fontWeight: 'bold', textAlign: 'center' }}
        >
          Upload Plugin
        </Typography>
      </Fade>

      <Grow in timeout={1000}>
        <StyledPaper>
          <UploadIcon sx={{ fontSize: 40, color: '#42a5f5' }} />
          <Typography variant="h6" align="center" sx={{ color: '#ccc' }}>
            Upload Manifest JSON
          </Typography>

          <input
            accept=".json"
            id="upload-plugin"
            type="file"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
          <label htmlFor="upload-plugin">
            <Button
              variant="contained"
              component="span"
              sx={{
                backgroundColor: '#2196f3',
                color: '#fff',
                '&:hover': {
                  backgroundColor: '#1976d2'
                }
              }}
            >
              Choose JSON File
            </Button>
          </label>

          {file && (
            <Typography variant="body2" align="center" sx={{ color: '#aaa' }}>
              Selected: <i>{file.name}</i>
            </Typography>
          )}

          {file && (
            <Button
              variant="contained"
              onClick={handleActivate}
              sx={{
                backgroundColor: theme.palette.success.main,
                color: '#fff',
                '&:hover': {
                  backgroundColor: theme.palette.success.dark
                }
              }}
            >
              Activate Plugin
            </Button>
          )}
        </StyledPaper>
      </Grow>
    </Box>
  );
};

export default UploadPlugin;
