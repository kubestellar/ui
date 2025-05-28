import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  IconButton,
  Tooltip,
  Slide,
  Grow,
  Fade,
  // useTheme
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';

const SecretsManager: React.FC = () => {
  // const theme = useTheme();
  const [showSecrets, setShowSecrets] = useState(false);

  const secrets = [
    {
      name: 'test-secret',
      namespace: 'default',
      type: 'Opaque',
      data: { username: 'admin', password: 'password123' }
    },
    {
      name: 'mongo-secret',
      namespace: 'prod',
      type: 'Opaque',
      data: { username: 'admin', password: 'securePass!45' }
    },
  ];

  const maskValue = (value: string) => '*'.repeat(value.length);

  return (
    <Box sx={{ p: 4, backgroundColor: '#0e0e12', minHeight: '100vh', color: '#f0f0f0' }}>
      <Fade in timeout={700}>
        <Typography
          variant="h4"
          gutterBottom
          sx={{
            fontWeight: 'bold',
            color: '#2196f3',
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}
        >
          🔐 Secrets Manager
        </Typography>
      </Fade>

      <Tooltip title={showSecrets ? 'Hide secrets' : 'Reveal secrets'}>
        <IconButton
          onClick={() => setShowSecrets(!showSecrets)}
          sx={{
            color: '#f0f0f0',
            mb: 2,
            border: '1px solid #444',
            '&:hover': {
              backgroundColor: '#1a1a1d'
            }
          }}
        >
          {showSecrets ? <VisibilityOffIcon /> : <VisibilityIcon />}
        </IconButton>
      </Tooltip>

      <Grow in timeout={800}>
        <TableContainer
          component={Paper}
          sx={{
            backgroundColor: '#1c1c1f',
            boxShadow: 6,
            borderRadius: 3,
            transition: 'transform 0.4s ease',
            '&:hover': {
              transform: 'scale(1.01)'
            }
          }}
        >
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#2a2a2d' }}>
                <TableCell sx={{ color: '#cfd8dc' }}><strong>Name</strong></TableCell>
                <TableCell sx={{ color: '#cfd8dc' }}><strong>Namespace</strong></TableCell>
                <TableCell sx={{ color: '#cfd8dc' }}><strong>Type</strong></TableCell>
                <TableCell sx={{ color: '#cfd8dc' }}><strong>Data</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {secrets.map((secret, index) => (
                <Slide in direction="up" timeout={500 + index * 150} key={secret.name}>
                  <TableRow
                    sx={{
                      transition: 'background 0.3s',
                      '&:hover': {
                        backgroundColor: '#2c2c31'
                      }
                    }}
                  >
                    <TableCell sx={{ color: '#eee' }}>{secret.name}</TableCell>
                    <TableCell sx={{ color: '#eee' }}>{secret.namespace}</TableCell>
                    <TableCell sx={{ color: '#eee' }}>{secret.type}</TableCell>
                    <TableCell sx={{ color: '#eee' }}>
                      {Object.entries(secret.data).map(([key, value]) => (
                        <Typography key={key} variant="body2">
                          <strong>{key}:</strong> {showSecrets ? value : maskValue(value)}
                        </Typography>
                      ))}
                    </TableCell>
                  </TableRow>
                </Slide>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Grow>
    </Box>
  );
};

export default SecretsManager;
