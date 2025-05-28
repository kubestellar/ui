import React from 'react';
import {
  Box,
  Typography,
  Grid,
  useTheme,
  styled,
  Paper,
} from '@mui/material';
import {
  Memory as MemoryIcon,
  Storage as StorageIcon,
  Speed as CpuIcon,
  NetworkCheck as NetworkIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';

const ResourceCard = styled(motion(Paper))(({ theme }) => ({
  backgroundColor: theme.palette.background.paper,
  borderRadius: theme.spacing(2),
  padding: theme.spacing(3),
  height: '100%',
  boxShadow: theme.shadows[3],
  transition: '0.3s ease-in-out',
  '&:hover': {
    boxShadow: theme.shadows[6],
    transform: 'scale(1.01)',
  },
}));

const ProgressBar = styled(Box)<{ percentage: number }>(({ theme, percentage }) => ({
  position: 'relative',
  height: 8,
  borderRadius: 4,
  backgroundColor: theme.palette.action.hover,
  overflow: 'hidden',
  '&::after': {
    content: '""',
    position: 'absolute',
    height: '100%',
    width: `${percentage}%`,
    backgroundColor: theme.palette.primary.main,
    transition: 'width 0.4s ease-in-out',
  },
}));

const QuotaVisualizer: React.FC = () => {
  const theme = useTheme();

  const resourceData = {
    memory: {
      total: '16GB',
      used: '3.5GB',
      percentage: 21.875,
    },
    storage: {
      total: '512GB',
      used: '255GB',
      percentage: 49.6,
    },
    cpu: {
      total: '32 Cores',
      used: '16 Cores',
      percentage: 50,
    },
    network: {
      total: '100Mbps',
      used: '50Mbps',
      percentage: 50,
    },
  };

  const renderResourceCard = (
    icon: React.ReactNode,
    title: string,
    used: string,
    total: string,
    percentage: number
  ) => (
    <ResourceCard>
      <Box display="flex" alignItems="center" gap={2} mb={2}>
        {icon}
        <Box>
          <Typography variant="subtitle1" fontWeight={600} color="text.primary">
            {title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {percentage}% Used
          </Typography>
        </Box>
      </Box>

      <ProgressBar percentage={percentage} />

      <Box mt={2} display="flex" justifyContent="space-between">
        <Typography variant="body2" color="text.secondary">
          Used: {used}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Total: {total}
        </Typography>
      </Box>
    </ResourceCard>
  );

  return (
    <Box px={4} py={3}>
      <Typography
        variant="h4"
        fontWeight={600}
        color="primary"
        gutterBottom
        sx={{ mb: 4 }}
      >
        Resource Quota Visualization
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          {renderResourceCard(
            <MemoryIcon sx={{ fontSize: 32, color: theme.palette.primary.main }} />,
            'Memory Usage',
            resourceData.memory.used,
            resourceData.memory.total,
            resourceData.memory.percentage
          )}
        </Grid>

        <Grid item xs={12} md={6}>
          {renderResourceCard(
            <StorageIcon sx={{ fontSize: 32, color: theme.palette.primary.main }} />,
            'Storage Usage',
            resourceData.storage.used,
            resourceData.storage.total,
            resourceData.storage.percentage
          )}
        </Grid>

        <Grid item xs={12} md={6}>
          {renderResourceCard(
            <CpuIcon sx={{ fontSize: 32, color: theme.palette.primary.main }} />,
            'CPU Usage',
            resourceData.cpu.used,
            resourceData.cpu.total,
            resourceData.cpu.percentage
          )}
        </Grid>

        <Grid item xs={12} md={6}>
          {renderResourceCard(
            <NetworkIcon sx={{ fontSize: 32, color: theme.palette.primary.main }} />,
            'Network Usage',
            resourceData.network.used,
            resourceData.network.total,
            resourceData.network.percentage
          )}
        </Grid>
      </Grid>
    </Box>
  );
};

export default QuotaVisualizer;
