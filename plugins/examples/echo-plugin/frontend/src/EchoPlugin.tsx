import React, { useState } from 'react';
import { Box, TextField, Button, Typography, CircularProgress } from '@mui/material';

interface EchoResponse {
  message: string;
  timestamp: string;
}

const EchoPlugin: React.FC = () => {
  const [message, setMessage] = useState('');
  const [response, setResponse] = useState<EchoResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const handleEcho = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/echo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message }),
      });

      const data = await response.json();
      setResponse(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Echo Plugin
      </Typography>

      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <TextField
          fullWidth
          label="Message"
          value={message}
          onChange={e => setMessage(e.target.value)}
        />
        <Button variant="contained" onClick={handleEcho} disabled={loading}>
          {loading ? <CircularProgress size={24} /> : 'Echo'}
        </Button>
      </Box>

      {response && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle1">Response:</Typography>
          <Typography variant="body1">
            <strong>Message:</strong> {response.message}
            <br />
            <strong>Timestamp:</strong> {response.timestamp}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default EchoPlugin;
