import React from 'react';
import {
  Box,
  Typography,
  // Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Chip,
  useTheme,
  styled,
  alpha,
  ThemeProvider,
  createTheme,
  CssBaseline,
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircleOutlined,
  WarningAmberOutlined,
  StorageOutlined,
  TrendingUpOutlined,
  AccessTimeOutlined,
  MemoryOutlined,
} from '@mui/icons-material';

interface PodStatus {
  summary: string;
  status: 'healthy' | 'warning';
  metrics: {
    cpu: string;
    memory: string;
    lastRestart: string;
    uptime: string;
  };
}

const podSummaries: Record<string, PodStatus> = {
  'ngnix-pod': {
    summary: 'The pod is running smoothly with no critical errors. Resource usage is within acceptable limits. Last restart was 2 days ago due to a routine update. No memory leaks detected. CPU usage is steady at 20% during peak hours.',
    status: 'healthy',
    metrics: {
      cpu: '20%',
      memory: '45%',
      lastRestart: '2 days ago',
      uptime: '99.8%'
    }
  },
  'haproxy-pod': {
    summary: 'Pod is experiencing occasional memory spikes during high load. CPU usage is consistently high at 85% during peak hours. Last restart was 1 hour ago due to OOM kill. Memory usage is at 90% capacity. Consider scaling up resources or optimizing the application.',
    status: 'warning',
    metrics: {
      cpu: '85%',
      memory: '90%',
      lastRestart: '1 hour ago',
      uptime: '95.2%'
    }
  },
};

// Create a consistent dark theme
const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    background: {
      default: '#0a0e1a',
      paper: '#1a1f2e',
    },
    primary: {
      main: '#3b82f6',
      light: '#60a5fa',
      dark: '#1d4ed8',
    },
    success: {
      main: '#10b981',
      light: '#34d399',
      dark: '#059669',
    },
    warning: {
      main: '#f59e0b',
      light: '#fbbf24',
      dark: '#d97706',
    },
    text: {
      primary: '#f8fafc',
      secondary: '#94a3b8',
    },
    divider: '#334155',
  },
  shape: {
    borderRadius: 12,
  },
  shadows: [
    'none',
    '0 1px 3px 0 rgba(0, 0, 0, 0.3), 0 1px 2px 0 rgba(0, 0, 0, 0.2)',
    '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)',
    '0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.2)',
    '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    '0 30px 60px -15px rgba(0, 0, 0, 0.6)',
    '0 35px 70px -18px rgba(0, 0, 0, 0.7)',
    '0 40px 80px -20px rgba(0, 0, 0, 0.8)',
    '0 45px 90px -22px rgba(0, 0, 0, 0.9)',
    '0 50px 100px -25px rgba(0, 0, 0, 1)',
    '0 55px 110px -28px rgba(0, 0, 0, 1)',
    '0 60px 120px -30px rgba(0, 0, 0, 1)',
    '0 65px 130px -32px rgba(0, 0, 0, 1)',
    '0 70px 140px -35px rgba(0, 0, 0, 1)',
    '0 75px 150px -38px rgba(0, 0, 0, 1)',
    '0 80px 160px -40px rgba(0, 0, 0, 1)',
    '0 85px 170px -42px rgba(0, 0, 0, 1)',
    '0 90px 180px -45px rgba(0, 0, 0, 1)',
    '0 95px 190px -48px rgba(0, 0, 0, 1)',
    '0 100px 200px -50px rgba(0, 0, 0, 1)',
    '0 105px 210px -52px rgba(0, 0, 0, 1)',
    '0 110px 220px -55px rgba(0, 0, 0, 1)',
    '0 115px 230px -58px rgba(0, 0, 0, 1)',
    '0 120px 240px -60px rgba(0, 0, 0, 1)',
  ],
});

const StyledContainer = styled(Box)(({ theme }) => ({
  background: `linear-gradient(135deg, ${theme.palette.background.default} 0%, #0f172a 100%)`,
  minHeight: '100vh',
  padding: theme.spacing(3),
}));

const PodCard = styled(motion.div)(({ theme }) => ({
  background: `linear-gradient(145deg, ${theme.palette.background.paper} 0%, ${alpha(theme.palette.background.paper, 0.8)} 100%)`,
  borderRadius: theme.shape.borderRadius,
  border: `1px solid ${alpha(theme.palette.divider, 0.3)}`,
  backdropFilter: 'blur(10px)',
  overflow: 'hidden',
}));

const MetricCard = styled(Box)(({ theme }) => ({
  background: alpha(theme.palette.background.default, 0.4),
  borderRadius: theme.spacing(1.5),
  padding: theme.spacing(2),
  border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1.5),
}));

const StatusIndicator = styled(Box)<{ status: PodStatus['status'] }>(({ theme, status }) => ({
  width: 12,
  height: 12,
  borderRadius: '50%',
  backgroundColor: status === 'healthy' ? theme.palette.success.main : theme.palette.warning.main,
  boxShadow: `0 0 12px ${status === 'healthy' ? theme.palette.success.main : theme.palette.warning.main}40`,
  animation: 'pulse 2s infinite',
  '@keyframes pulse': {
    '0%': {
      boxShadow: `0 0 12px ${status === 'healthy' ? theme.palette.success.main : theme.palette.warning.main}40`,
    },
    '50%': {
      boxShadow: `0 0 20px ${status === 'healthy' ? theme.palette.success.main : theme.palette.warning.main}60`,
    },
    '100%': {
      boxShadow: `0 0 12px ${status === 'healthy' ? theme.palette.success.main : theme.palette.warning.main}40`,
    },
  },
}));

const LogSummarizer: React.FC = () => {
  const [selectedPod, setSelectedPod] = React.useState<string | null>(null);
  const theme = useTheme();

  const handlePodClick = (podName: string) => {
    setSelectedPod(podName);
  };

  const getStatusIcon = (status: PodStatus['status']) => {
    return status === 'healthy' ? (
      <CheckCircleOutlined sx={{ color: theme.palette.success.main }} />
    ) : (
      <WarningAmberOutlined sx={{ color: theme.palette.warning.main }} />
    );
  };

  const getMetricIcon = (type: string) => {
    const iconProps = { sx: { fontSize: 20, color: theme.palette.text.secondary } };
    switch (type) {
      case 'cpu': return <TrendingUpOutlined {...iconProps} />;
      case 'memory': return <MemoryOutlined {...iconProps} />;
      case 'uptime': return <AccessTimeOutlined {...iconProps} />;
      default: return <StorageOutlined {...iconProps} />;
    }
  };

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <StyledContainer>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography 
            variant="h3" 
            sx={{ 
              fontWeight: 700,
              background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.primary.light})`,
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              mb: 1
            }}
          >
            Pod Monitor
          </Typography>
          <Typography variant="h6" color="text.secondary">
            Real-time Kubernetes pod health and performance monitoring
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 3, flexWrap: { xs: 'wrap', lg: 'nowrap' } }}>
          {/* Pod List */}
          <PodCard
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            style={{ width: '100%', maxWidth: 400 }}
          >
            <Box sx={{ p: 3, borderBottom: `1px solid ${alpha(theme.palette.divider, 0.3)}` }}>
              <Typography variant="h6" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                <StorageOutlined sx={{ color: theme.palette.primary.main }} />
                Active Pods
              </Typography>
            </Box>
            
            <List sx={{ p: 0 }}>
              {Object.entries(podSummaries).map(([podName, pod], index) => (
                <ListItem key={podName} sx={{ p: 0 }}>
                  <ListItemButton
                    onClick={() => handlePodClick(podName)}
                    selected={selectedPod === podName}
                    sx={{
                      p: 3,
                      borderBottom: index < Object.entries(podSummaries).length - 1 ? `1px solid ${alpha(theme.palette.divider, 0.2)}` : 'none',
                      '&.Mui-selected': {
                        backgroundColor: alpha(theme.palette.primary.main, 0.1),
                        borderLeft: `4px solid ${theme.palette.primary.main}`,
                      },
                      '&:hover': {
                        backgroundColor: alpha(theme.palette.primary.main, 0.05),
                      },
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                          <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            {podName}
                          </Typography>
                          <StatusIndicator status={pod.status} />
                        </Box>
                      }
                      secondary={
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                          <Chip
                            icon={getStatusIcon(pod.status)}
                            label={pod.status === 'healthy' ? 'Healthy' : 'Warning'}
                            size="small"
                            color={pod.status === 'healthy' ? 'success' : 'warning'}
                            variant="outlined"
                          />
                          <Chip
                            label={`CPU: ${pod.metrics.cpu}`}
                            size="small"
                            variant="outlined"
                            sx={{ color: 'text.secondary' }}
                          />
                        </Box>
                      }
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </PodCard>

          {/* Details Panel */}
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <AnimatePresence mode="wait">
              {selectedPod ? (
                <motion.div
                  key={selectedPod}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.4 }}
                >
                  <PodCard style={{ width: '100%' }}>
                    {/* Header */}
                    <Box sx={{ 
                      p: 3, 
                      borderBottom: `1px solid ${alpha(theme.palette.divider, 0.3)}`,
                      background: alpha(podSummaries[selectedPod].status === 'healthy' 
                        ? theme.palette.success.main 
                        : theme.palette.warning.main, 0.1)
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        {getStatusIcon(podSummaries[selectedPod].status)}
                        <Typography variant="h5" sx={{ fontWeight: 600 }}>
                          {selectedPod}
                        </Typography>
                        <Chip
                          label={podSummaries[selectedPod].status === 'healthy' ? 'Healthy' : 'Needs Attention'}
                          color={podSummaries[selectedPod].status === 'healthy' ? 'success' : 'warning'}
                          sx={{ ml: 'auto' }}
                        />
                      </Box>
                    </Box>

                    <CardContent sx={{ p: 3 }}>
                      {/* Metrics Grid */}
                      <Box sx={{ mb: 3 }}>
                        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                          Performance Metrics
                        </Typography>
                        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2 }}>
                          <MetricCard>
                            {getMetricIcon('cpu')}
                            <Box>
                              <Typography variant="body2" color="text.secondary">CPU Usage</Typography>
                              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                {podSummaries[selectedPod].metrics.cpu}
                              </Typography>
                            </Box>
                          </MetricCard>
                          <MetricCard>
                            {getMetricIcon('memory')}
                            <Box>
                              <Typography variant="body2" color="text.secondary">Memory Usage</Typography>
                              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                {podSummaries[selectedPod].metrics.memory}
                              </Typography>
                            </Box>
                          </MetricCard>
                          <MetricCard>
                            {getMetricIcon('uptime')}
                            <Box>
                              <Typography variant="body2" color="text.secondary">Uptime</Typography>
                              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                {podSummaries[selectedPod].metrics.uptime}
                              </Typography>
                            </Box>
                          </MetricCard>
                          <MetricCard>
                            <AccessTimeOutlined sx={{ fontSize: 20, color: theme.palette.text.secondary }} />
                            <Box>
                              <Typography variant="body2" color="text.secondary">Last Restart</Typography>
                              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                {podSummaries[selectedPod].metrics.lastRestart}
                              </Typography>
                            </Box>
                          </MetricCard>
                        </Box>
                      </Box>

                      {/* Summary */}
                      <Box>
                        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                          Health Summary
                        </Typography>
                        <Box
                          sx={{
                            background: alpha(podSummaries[selectedPod].status === 'healthy' 
                              ? theme.palette.success.main 
                              : theme.palette.warning.main, 0.1),
                            border: `1px solid ${alpha(podSummaries[selectedPod].status === 'healthy' 
                              ? theme.palette.success.main 
                              : theme.palette.warning.main, 0.3)}`,
                            borderRadius: 2,
                            p: 3,
                          }}
                        >
                          <Typography variant="body1" sx={{ lineHeight: 1.6 }}>
                            {podSummaries[selectedPod].summary}
                          </Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </PodCard>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <PodCard style={{ width: '100%' }}>
                    <Box sx={{ 
                      height: 400, 
                      display: 'flex', 
                      flexDirection: 'column',
                      alignItems: 'center', 
                      justifyContent: 'center',
                      textAlign: 'center',
                      p: 3
                    }}>
                      <StorageOutlined sx={{ fontSize: 64, color: theme.palette.text.secondary, mb: 2 }} />
                      <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
                        Select a Pod
                      </Typography>
                      <Typography variant="body1" color="text.secondary">
                        Choose a pod from the sidebar to view detailed health metrics and logs
                      </Typography>
                    </Box>
                  </PodCard>
                </motion.div>
              )}
            </AnimatePresence>
          </Box>
        </Box>
      </StyledContainer>
    </ThemeProvider>
  );
};

export default LogSummarizer;
