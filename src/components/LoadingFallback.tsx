import { useState, useEffect } from 'react';
import { CircularProgress, Typography, Box, Alert } from '@mui/material';

interface Props {
  message?: string;
  timeout?: number;
  size? :string;
}

const LoadingFallback = ({ message = 'Loading...', timeout = 10000 }: Props) => {
  const [showTimeout, setShowTimeout] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowTimeout(true);
    }, timeout);

    return () => clearTimeout(timer);
  }, [timeout]);

  if (showTimeout) {
    return (
      <Alert severity="warning" sx={{ m: 2 }}>
        Loading is taking longer than expected. There might be an issue with the connection.
      </Alert>
    );
  }

  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      minHeight="200px"
      gap={2}
    >
      <CircularProgress />
      <Typography>{message}</Typography>
    </Box>
  );
};

export default LoadingFallback; 