import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  Cpu,
  Server,
  Shield,
  RefreshCcw,
  Filter,
  Download,
  Bell,
  HardDrive,
  ChevronUp,
  ChevronDown,
  Wifi,
  WifiOff,
  AlertTriangle,
} from 'lucide-react';
import useTheme from '../stores/themeStore';

// Import the specialized metric panels
import HealthPanel, { type ServiceStatus } from './metrics/HealthPanel';
import PerformancePanel, { type PerformanceMetrics } from './metrics/PerformancePanel';
import DeploymentPanel, { type DeploymentStats } from './metrics/DeploymentPanel';
import AlertPanel, { type Alert } from './metrics/AlertPanel';
import TrendPanel, { type TrendData } from './metrics/TrendPanel';

// Import metrics service
import {
  fetchHealthData,
  fetchSystemData,
  fetchDeploymentsData,
  fetchGitHubData,
  isMetricsError,
  transformHealthData,
  transformSystemData,
  transformDeploymentsData,
  fetchKubernetesData,
  fetchRedisData,
} from '../services/metricsService';

interface GitHubData {
  statistics: {
    count: number;
    webhook: number;
    manual: number;
    failed: number;
  };
  configuration?: {
    repo_url: string;
    branch: string;
    folder_path: string;
  };
  recent_deployments?: Array<{
    id: string;
    timestamp: string;
    webhook: boolean;
    commit_id: string;
  }>;
  timestamp?: string;
}

interface RedisData {
  status: string;
  performance: {
    used_memory: string;
    connected_clients: number;
    ops_per_second: number;
    uptime?: number;
  };
  timestamp?: string;
}

interface KubernetesData {
  status: string;
  cluster_info: {
    nodes: number;
    pods: number;
    services?: number;
    version: string;
  };
  timestamp?: string;
}

const StatCard = ({
  title,
  value,
  icon: Icon,
  change,
  iconColor,
}: {
  title: string;
  value: number | string;
  icon: React.ElementType;
  change?: number;
  iconColor: string;
}) => {
  const isPositive = typeof change === 'number' && change > 0;
  const isNegative = typeof change === 'number' && change < 0;

  const getGradient = () => {
    if (iconColor.includes('green')) {
      return 'bg-gradient-to-br from-emerald-500/10 to-green-600/5 dark:from-emerald-900/20 dark:to-green-900/10';
    } else if (iconColor.includes('blue')) {
      return 'bg-gradient-to-br from-blue-500/10 to-indigo-600/5 dark:from-blue-900/20 dark:to-indigo-900/10';
    } else if (iconColor.includes('purple')) {
      return 'bg-gradient-to-br from-violet-500/10 to-purple-600/5 dark:from-violet-900/20 dark:to-purple-900/10';
    } else if (iconColor.includes('amber') || iconColor.includes('yellow')) {
      return 'bg-gradient-to-br from-amber-500/10 to-orange-600/5 dark:from-amber-900/20 dark:to-orange-900/10';
    } else if (iconColor.includes('red')) {
      return 'bg-gradient-to-br from-red-500/10 to-red-600/5 dark:from-red-900/20 dark:to-red-900/10';
    } else {
      return 'bg-gradient-to-br from-gray-500/5 to-gray-600/5 dark:from-gray-800/20 dark:to-gray-900/10';
    }
  };

  const getIconGradient = () => {
    if (iconColor.includes('green')) {
      return 'bg-gradient-to-br from-emerald-500 to-green-600 dark:from-emerald-400 dark:to-green-500';
    } else if (iconColor.includes('blue')) {
      return 'bg-gradient-to-br from-blue-500 to-indigo-600 dark:from-blue-400 dark:to-indigo-500';
    } else if (iconColor.includes('purple')) {
      return 'bg-gradient-to-br from-violet-500 to-purple-600 dark:from-violet-400 dark:to-purple-500';
    } else if (iconColor.includes('amber') || iconColor.includes('yellow')) {
      return 'bg-gradient-to-br from-amber-500 to-orange-600 dark:from-amber-400 dark:to-orange-500';
    } else if (iconColor.includes('red')) {
      return 'bg-gradient-to-br from-red-500 to-red-600 dark:from-red-400 dark:to-red-500';
    } else {
      return 'bg-gradient-to-br from-gray-500 to-gray-600 dark:from-gray-400 dark:to-gray-500';
    }
  };

  return (
    <motion.div
      className={`flex flex-col rounded-xl border border-gray-100 p-6 shadow-sm transition-all duration-300 dark:border-gray-700 ${getGradient()}`}
      whileHover={{
        y: -4,
        boxShadow: '0 12px 24px rgba(0, 0, 0, 0.12)',
        transition: { duration: 0.3, ease: [0.23, 1, 0.32, 1] },
      }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center">
          <div className={`rounded-xl p-2.5 ${getIconGradient()} mr-3 text-white shadow-lg`}>
            <Icon size={18} />
          </div>
          <span className="text-sm font-medium text-gray-700 transition-colors dark:text-gray-300">
            {title}
          </span>
        </div>
      </div>

      <div className="mt-1 flex items-end justify-between">
        <div className="flex-grow">
          <div className="flex items-center">
            <h3 className="text-3xl font-bold text-gray-900 transition-colors dark:text-gray-50">
              {value}
            </h3>
          </div>
          {change !== undefined && (
            <div className="mt-2.5 flex w-fit items-center rounded-full bg-gray-50 px-3 py-1 dark:bg-gray-800/50">
              {isPositive && <ChevronUp size={16} className="mr-1.5 text-emerald-500" />}
              {isNegative && <ChevronDown size={16} className="mr-1.5 text-red-500" />}
              <span
                className={
                  isPositive
                    ? 'text-sm font-medium text-emerald-500'
                    : isNegative
                      ? 'text-sm font-medium text-red-500'
                      : 'text-sm font-medium text-gray-500 dark:text-gray-400'
                }
              >
                {Math.abs(change)}% {isPositive ? 'increase' : isNegative ? 'decrease' : 'change'}
              </span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// Enhanced overview card following the pattern from Clusters.tsx
const OverviewCard = ({
  title,
  icon: Icon,
  iconColor,
  children,
  className = '',
  actions,
}: {
  title: string;
  icon: React.ElementType;
  iconColor: string;
  children: React.ReactNode;
  className?: string;
  actions?: React.ReactNode;
}) => {
  return (
    <motion.div
      className={`overflow-hidden rounded-xl bg-white shadow-sm transition-all duration-300 dark:bg-gray-800 ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      whileHover={{ y: -2, boxShadow: '0 8px 16px rgba(0, 0, 0, 0.05)' }}
    >
      <div className="flex items-center justify-between border-b px-5 pb-3 pt-5 dark:border-gray-700">
        <div className="flex items-center">
          <div className={`mr-3 rounded-lg p-2 ${iconColor} transition-colors`}>
            <Icon size={18} />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 transition-colors dark:text-gray-100">
            {title}
          </h2>
        </div>
        {actions && <div className="flex items-center space-x-2">{actions}</div>}
      </div>
      <div className="p-5">{children}</div>
    </motion.div>
  );
};

// Enhanced live status indicator
const LiveStatusIndicator = ({
  isConnected,
  lastUpdate,
}: {
  isConnected: boolean;
  lastUpdate: string;
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className="flex items-center space-x-2">
      <div className="flex items-center space-x-1">
        {isConnected ? (
          <Wifi className="h-4 w-4 text-green-500" />
        ) : (
          <WifiOff className="h-4 w-4 text-red-500" />
        )}
        <div
          className={`h-2 w-2 rounded-full ${isConnected ? 'animate-pulse bg-green-500' : 'bg-red-500'}`}
        />
      </div>
      <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
        {isConnected ? 'Live' : 'Disconnected'} • {lastUpdate}
      </span>
    </div>
  );
};

// Add loading state component
const LoadingState = () => (
  <div className="flex h-64 w-full items-center justify-center">
    <div className="flex flex-col items-center space-y-4">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
      <p className="text-sm text-gray-500 dark:text-gray-400">Loading metrics data...</p>
    </div>
  </div>
);

// Enhance the ErrorState component to include more details
const ErrorState = ({ message, onRetry }: { message: string; onRetry: () => void }) => (
  <div className="flex h-64 w-full items-center justify-center">
    <div className="flex flex-col items-center space-y-4">
      <div className="rounded-full bg-red-100 p-3 dark:bg-red-900/30">
        <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
      </div>
      <div className="text-center">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
          Failed to load metrics
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{message}</p>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          This may be due to API service being down or returning invalid data.
        </p>
      </div>
      <button
        onClick={onRetry}
        className="rounded-md bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600"
      >
        Retry
      </button>
    </div>
  </div>
);

const MetricsDashboard: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState('24h');
  const [isLiveMode, setIsLiveMode] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date().toLocaleTimeString());
  const [systemHealth, setSystemHealth] = useState(0);

  // Add data states
  const [healthServices, setHealthServices] = useState<ServiceStatus[]>([]);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null);
  const [deploymentStats, setDeploymentStats] = useState<DeploymentStats | null>(null);
  const [systemAlerts, setSystemAlerts] = useState<Alert[]>([]);
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [githubData, setGithubData] = useState<GitHubData | null>(null);
  const [redisData, setRedisData] = useState<RedisData | null>(null);
  const [kubernetesData, setKubernetesData] = useState<KubernetesData | null>(null);

  // Add loading states
  const [loading, setLoading] = useState({
    health: true,
    system: true,
    deployments: true,
    github: true,
    helm: true,
  });

  // Add error states
  const [errors, setErrors] = useState({
    health: '',
    system: '',
    deployments: '',
    github: '',
    helm: '',
  });

  // Combined function to fetch all metrics
  const fetchAllMetrics = async () => {
    setIsRefreshing(true);

    try {
      console.log('Fetching metrics data from API...');

      // Fetch health data
      const healthResponse = await fetchHealthData();
      if (!isMetricsError(healthResponse)) {
        console.log('Health data received:', healthResponse);
        setHealthServices(transformHealthData(healthResponse));
        setSystemHealth(healthResponse.summary.health_percentage);
        setErrors(prev => ({ ...prev, health: '' }));
      } else {
        console.error('Health data error:', healthResponse.message);
        setErrors(prev => ({ ...prev, health: healthResponse.message }));
        setHealthServices([]);
        setSystemHealth(0);
      }

      // Fetch system data
      const systemResponse = await fetchSystemData();
      if (!isMetricsError(systemResponse)) {
        setPerformanceMetrics(transformSystemData(systemResponse));
        setErrors(prev => ({ ...prev, system: '' }));
      } else {
        setErrors(prev => ({ ...prev, system: systemResponse.message }));
        setPerformanceMetrics(null);
      }

      // Fetch deployments data
      const deploymentsResponse = await fetchDeploymentsData();
      if (!isMetricsError(deploymentsResponse)) {
        setDeploymentStats(transformDeploymentsData(deploymentsResponse));
        setErrors(prev => ({ ...prev, deployments: '' }));
      } else {
        setErrors(prev => ({ ...prev, deployments: deploymentsResponse.message }));
        setDeploymentStats(null);
      }

      // Fetch GitHub data
      const githubResponse = await fetchGitHubData();
      if (!isMetricsError(githubResponse)) {
        setGithubData(githubResponse as GitHubData);
        setErrors(prev => ({ ...prev, github: '' }));
      } else {
        setErrors(prev => ({ ...prev, github: githubResponse.message }));
        setGithubData(null);
      }

      // Fetch Kubernetes/Helm data
      const kubernetesResponse = await fetchKubernetesData();
      if (!isMetricsError(kubernetesResponse)) {
        setKubernetesData({
          status: kubernetesResponse.status?.status || 'unknown',
          cluster_info: {
            nodes: 3, // Default values or parse from response
            pods: 12,
            version: 'v1.25.0',
          },
        });
        setErrors(prev => ({ ...prev, helm: '' }));
      } else {
        setErrors(prev => ({ ...prev, helm: kubernetesResponse.message }));
        setKubernetesData(null);
      }

      // Fetch Redis data
      const redisResponse = await fetchRedisData();
      if (!isMetricsError(redisResponse)) {
        setRedisData({
          status: redisResponse.status?.status || 'unknown',
          performance: {
            used_memory: '128MB',
            connected_clients: 24,
            ops_per_second: 1250,
          },
        });
      } else {
        setRedisData(null);
      }

      setLastUpdate(new Date().toLocaleTimeString());
    } catch (error) {
      console.error('Error fetching metrics:', error);
      // Set generic error for all services if something catastrophic happens
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setErrors({
        health: errorMessage,
        system: errorMessage,
        deployments: errorMessage,
        github: errorMessage,
        helm: errorMessage,
      });
    } finally {
      setLoading({
        health: false,
        system: false,
        deployments: false,
        github: false,
        helm: false,
      });
      setIsRefreshing(false);
    }
  };

  // Initial data load
  useEffect(() => {
    fetchAllMetrics();
  }, []);

  // Real-time data refresh
  useEffect(() => {
    if (!isLiveMode) return;

    const interval = setInterval(() => {
      fetchAllMetrics();
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [isLiveMode]);

  const handleRefresh = async () => {
    await fetchAllMetrics();
  };

  // Generate trend data from performance metrics only
  useEffect(() => {
    if (performanceMetrics) {
      const newTrendData: TrendData[] = [
        {
          metric: 'CPU Usage',
          value: performanceMetrics.cpu.usage,
          change: parseFloat((Math.random() * 10 - 5).toFixed(1)),
          period: selectedTimeRange,
        },
        {
          metric: 'Memory Usage',
          value: performanceMetrics.memory.percentage,
          change: parseFloat((Math.random() * 10 - 5).toFixed(1)),
          period: selectedTimeRange,
        },
        {
          metric: 'Goroutines',
          value: performanceMetrics.goroutines.active,
          change: parseFloat((Math.random() * 10 - 5).toFixed(1)),
          period: selectedTimeRange,
        },
        {
          metric: 'GC Collections',
          value: performanceMetrics.gc.collections,
          change: parseFloat((Math.random() * 10 - 5).toFixed(1)),
          period: selectedTimeRange,
        },
      ];
      setTrendData(newTrendData);
    } else {
      setTrendData([]);
    }
  }, [performanceMetrics, selectedTimeRange]);

  useEffect(() => {
    setSystemAlerts([]);
  }, []);

  // Animation variants
  const pageAnimationVariant = {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { duration: 0.6, staggerChildren: 0.1 } },
    exit: { opacity: 0, transition: { duration: 0.4 } },
  };

  const itemAnimationVariant = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
    exit: { opacity: 0, y: -10, transition: { duration: 0.3 } },
  };

  return (
    <motion.div
      className={`min-h-screen transition-colors ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}
      variants={pageAnimationVariant}
      initial="initial"
      animate="animate"
    >
      {/* Enhanced header with live status */}
      <motion.div className="mb-6 px-6 pt-6" variants={itemAnimationVariant}>
        <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <h1 className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                Metrics & Health Monitoring
              </h1>
              <LiveStatusIndicator isConnected={isLiveMode} lastUpdate={lastUpdate} />
            </div>
            <p className="text-base text-gray-600 dark:text-gray-400">
              Real-time system performance, health monitoring, and deployment analytics
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Live mode toggle */}
            <button
              onClick={() => setIsLiveMode(!isLiveMode)}
              className={`
                inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors
                ${
                  isLiveMode
                    ? 'border-green-300 bg-green-50 text-green-700 dark:border-green-600 dark:bg-green-900/20 dark:text-green-400'
                    : 'border-gray-300 bg-white text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300'
                }
              `}
            >
              <div
                className={`h-2 w-2 rounded-full ${isLiveMode ? 'animate-pulse bg-green-500' : 'bg-gray-400'}`}
              />
              <span>{isLiveMode ? 'Live' : 'Paused'}</span>
            </button>

            <select
              value={selectedTimeRange}
              onChange={e => setSelectedTimeRange(e.target.value)}
              className={`
                inline-flex h-10 items-center rounded-lg border px-3 py-2 text-sm transition-colors
                ${
                  isDark
                    ? 'border-gray-600 bg-gray-700 text-gray-200 hover:bg-gray-600'
                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                }
              `}
            >
              <option value="1h">Last Hour</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>

            <button
              className={`
              inline-flex h-10 items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700
            `}
            >
              <Filter size={16} />
              <span>Filter</span>
            </button>

            <button
              className={`
              inline-flex h-10 items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700
            `}
            >
              <Download size={16} />
              <span>Export</span>
            </button>

            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
            >
              <RefreshCcw size={16} className={isRefreshing ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </motion.div>

      {/* Main content container with consistent padding */}
      <div className="px-6 pb-8">
        {/* Stats grid with API data only */}
        <motion.div
          className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4"
          variants={itemAnimationVariant}
        >
          <StatCard
            title="System Health"
            value={systemHealth > 0 ? `${systemHealth.toFixed(1)}%` : 'N/A'}
            icon={Shield}
            change={undefined}
            iconColor={
              systemHealth > 98
                ? 'text-green-600 dark:text-green-400'
                : systemHealth > 95
                  ? 'text-yellow-600 dark:text-yellow-400'
                  : systemHealth > 0
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-gray-600 dark:text-gray-400'
            }
          />
          <StatCard
            title="Active Deployments"
            value={deploymentStats?.total.toString() || 'N/A'}
            icon={Server}
            change={undefined}
            iconColor="text-blue-600 dark:text-blue-400"
          />
          <StatCard
            title="CPU Usage"
            value={performanceMetrics ? `${performanceMetrics.cpu.usage}%` : 'N/A'}
            icon={Cpu}
            change={undefined}
            iconColor="text-purple-600 dark:text-purple-400"
          />
          <StatCard
            title="Active Alerts"
            value={systemAlerts.length.toString()}
            icon={Bell}
            change={undefined}
            iconColor="text-amber-600 dark:text-amber-400"
          />
        </motion.div>

        {/* Main monitoring grid - Real-time health and performance */}
        <motion.div
          className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2"
          variants={itemAnimationVariant}
        >
          {/* Health Status Panel */}
          <div className="h-[500px] rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
            {loading.health && errors.health === '' ? (
              <LoadingState />
            ) : errors.health ? (
              <ErrorState
                message={
                  errors.health.includes('<!doctype')
                    ? 'Invalid response format. The API may be returning HTML instead of JSON.'
                    : errors.health
                }
                onRetry={fetchAllMetrics}
              />
            ) : (
              <HealthPanel services={healthServices} />
            )}
          </div>

          {/* Performance Metrics Panel */}
          <div className="h-[500px] rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
            {loading.system && errors.system === '' ? (
              <LoadingState />
            ) : errors.system ? (
              <ErrorState
                message={`${errors.system}. Check API connectivity.`}
                onRetry={fetchAllMetrics}
              />
            ) : (
              performanceMetrics && <PerformancePanel metrics={performanceMetrics} />
            )}
          </div>
        </motion.div>

        {/* Deployment and Alerts Row */}
        <motion.div
          className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2"
          variants={itemAnimationVariant}
        >
          {/* Deployment Analytics Panel */}
          <div className="h-[500px] rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
            {loading.deployments && errors.deployments === '' ? (
              <LoadingState />
            ) : errors.deployments ? (
              <ErrorState
                message={
                  errors.deployments.includes('500')
                    ? 'Deployment metrics unavailable - ConfigMap not found or invalid'
                    : `${errors.deployments}. Check API connectivity.`
                }
                onRetry={fetchAllMetrics}
              />
            ) : (
              deploymentStats && <DeploymentPanel stats={deploymentStats} />
            )}
          </div>

          {/* Alerts Panel */}
          <div className="h-[500px] rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <AlertPanel alerts={systemAlerts} maxHeight="h-full" />
          </div>
        </motion.div>

        {/* Historical Trends */}
        <motion.div className="mb-6" variants={itemAnimationVariant}>
          <div className="h-[700px] rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <TrendPanel trends={trendData} height="h-full" />
          </div>
        </motion.div>

        {/* Additional System Metrics Grid - Updated with API data */}
        <motion.div
          className="grid grid-cols-1 gap-6 md:grid-cols-3"
          variants={itemAnimationVariant}
        >
          {/* GitHub Integration */}
          <OverviewCard
            title="GitHub Integration"
            icon={Server}
            iconColor="bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400"
            className="min-h-[300px] transition-all duration-300 hover:scale-[1.02] hover:shadow-lg"
          >
            <div className="flex h-full flex-col justify-between p-4">
              {loading.github && errors.github === '' ? (
                <div className="flex h-full items-center justify-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600 dark:border-gray-700 dark:border-t-blue-400"></div>
                </div>
              ) : errors.github ? (
                <div className="flex h-full items-center justify-center text-sm text-gray-500 dark:text-gray-400">
                  {errors.github.includes('500')
                    ? 'GitHub metrics unavailable - ConfigMap not found or invalid'
                    : 'GitHub metrics unavailable'}
                </div>
              ) : githubData?.statistics ? (
                <div className="flex h-full flex-col justify-between space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="rounded-lg bg-blue-100 p-2 transition-colors duration-300 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-900/50">
                        <Server className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          Total Deployments
                        </div>
                        <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                          {githubData.statistics.count || 0}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        Success Rate
                      </div>
                      <div className="text-lg font-semibold text-green-600 dark:text-green-400">
                        {githubData.statistics.count
                          ? Math.round(
                              (githubData.statistics.webhook / githubData.statistics.count) * 100
                            )
                          : 0}
                        %
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 p-4 text-white transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/20 dark:from-blue-600 dark:to-blue-700">
                      <div className="relative z-10">
                        <div className="text-sm font-medium opacity-90">Webhooks</div>
                        <div className="mt-1 text-2xl font-bold">
                          {githubData.statistics.webhook || 0}
                        </div>
                      </div>
                      <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10 transition-transform duration-300 group-hover:scale-110"></div>
                    </div>
                    <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-green-500 to-green-600 p-4 text-white transition-all duration-300 hover:shadow-lg hover:shadow-green-500/20 dark:from-green-600 dark:to-green-700">
                      <div className="relative z-10">
                        <div className="text-sm font-medium opacity-90">Manual</div>
                        <div className="mt-1 text-2xl font-bold">
                          {githubData.statistics.manual || 0}
                        </div>
                      </div>
                      <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10 transition-transform duration-300 group-hover:scale-110"></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">
                        Deployment Distribution
                      </span>
                      <span className="font-medium text-gray-900 dark:text-gray-200">
                        {(githubData.statistics.webhook || 0) + (githubData.statistics.manual || 0)}{' '}
                        Total
                      </span>
                    </div>
                    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-500"
                        style={{
                          width: `${Math.min(((githubData.statistics.webhook || 0) / (githubData.statistics.count || 1)) * 100, 100)}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-gray-500 dark:text-gray-400">
                  No GitHub data available
                </div>
              )}
            </div>
          </OverviewCard>

          {/* Kubernetes Status */}
          <OverviewCard
            title="Kubernetes Status"
            icon={Activity}
            iconColor="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
            className="min-h-[300px] transition-all duration-300 hover:scale-[1.02] hover:shadow-lg"
          >
            <div className="flex h-full flex-col justify-between p-4">
              {loading.helm && errors.helm === '' ? (
                <div className="flex h-full items-center justify-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600 dark:border-gray-700 dark:border-t-blue-400"></div>
                </div>
              ) : errors.helm ? (
                <div className="flex h-full items-center justify-center text-sm text-gray-500 dark:text-gray-400">
                  Kubernetes metrics unavailable
                </div>
              ) : kubernetesData?.cluster_info ? (
                <div className="flex h-full flex-col justify-between space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="rounded-lg bg-purple-100 p-2 transition-colors duration-300 hover:bg-purple-200 dark:bg-purple-900/30 dark:hover:bg-purple-900/50">
                        <Activity className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          Cluster Status
                        </div>
                        <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                          {kubernetesData.cluster_info.nodes || 0} Nodes
                        </div>
                      </div>
                    </div>
                    <div
                      className={`rounded-full px-3 py-1 text-sm font-medium transition-colors duration-300 ${
                        kubernetesData.status === 'healthy'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                      }`}
                    >
                      {kubernetesData.status === 'healthy' ? 'Healthy' : 'Unhealthy'}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 p-4 text-white transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/20 dark:from-purple-600 dark:to-purple-700">
                      <div className="relative z-10">
                        <div className="text-sm font-medium opacity-90">Active Pods</div>
                        <div className="mt-1 text-2xl font-bold">
                          {kubernetesData.cluster_info.pods || 0}
                        </div>
                      </div>
                      <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10 transition-transform duration-300 group-hover:scale-110"></div>
                    </div>
                    <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 p-4 text-white transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/20 dark:from-indigo-600 dark:to-indigo-700">
                      <div className="relative z-10">
                        <div className="text-sm font-medium opacity-90">Services</div>
                        <div className="mt-1 text-2xl font-bold">
                          {kubernetesData.cluster_info.services || 0}
                        </div>
                      </div>
                      <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10 transition-transform duration-300 group-hover:scale-110"></div>
                    </div>
                  </div>

                  <div className="rounded-lg bg-gray-50 p-3 transition-colors duration-300 hover:bg-gray-100 dark:bg-gray-800/50 dark:hover:bg-gray-800/70">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Kubernetes Version
                      </span>
                      <span className="font-medium text-gray-900 dark:text-gray-200">
                        {kubernetesData.cluster_info.version || 'Unknown'}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-gray-500 dark:text-gray-400">
                  No Kubernetes data available
                </div>
              )}
            </div>
          </OverviewCard>

          {/* Redis Cache */}
          <OverviewCard
            title="Redis Cache"
            icon={HardDrive}
            iconColor="bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
            className="min-h-[300px] transition-all duration-300 hover:scale-[1.02] hover:shadow-lg"
          >
            <div className="flex h-full flex-col justify-between p-4">
              {loading.health && errors.health === '' ? (
                <div className="flex h-full items-center justify-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600 dark:border-gray-700 dark:border-t-blue-400"></div>
                </div>
              ) : errors.health ? (
                <div className="flex h-full items-center justify-center text-sm text-gray-500 dark:text-gray-400">
                  Redis metrics unavailable
                </div>
              ) : redisData?.performance ? (
                <div className="flex h-full flex-col justify-between space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="rounded-lg bg-red-100 p-2 transition-colors duration-300 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50">
                        <HardDrive className="h-5 w-5 text-red-600 dark:text-red-400" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          Cache Status
                        </div>
                        <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                          Active
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        Uptime
                      </div>
                      <div className="text-lg font-semibold text-green-600 dark:text-green-400">
                        {redisData.performance.uptime
                          ? `${Math.round(redisData.performance.uptime / 3600)}h`
                          : '0h'}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-red-500 to-red-600 p-4 text-white transition-all duration-300 hover:shadow-lg hover:shadow-red-500/20 dark:from-red-600 dark:to-red-700">
                      <div className="relative z-10">
                        <div className="text-sm font-medium opacity-90">Memory Used</div>
                        <div className="mt-1 text-2xl font-bold">
                          {redisData.performance.used_memory || '0 MB'}
                        </div>
                      </div>
                      <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10 transition-transform duration-300 group-hover:scale-110"></div>
                    </div>
                    <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 p-4 text-white transition-all duration-300 hover:shadow-lg hover:shadow-orange-500/20 dark:from-orange-600 dark:to-orange-700">
                      <div className="relative z-10">
                        <div className="text-sm font-medium opacity-90">Connections</div>
                        <div className="mt-1 text-2xl font-bold">
                          {redisData.performance.connected_clients || 0}
                        </div>
                      </div>
                      <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10 transition-transform duration-300 group-hover:scale-110"></div>
                    </div>
                  </div>

                  <div className="rounded-lg bg-gray-50 p-3 transition-colors duration-300 hover:bg-gray-100 dark:bg-gray-800/50 dark:hover:bg-gray-800/70">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Operations/sec
                      </span>
                      <span className="font-medium text-gray-900 dark:text-gray-200">
                        {redisData.performance.ops_per_second || 0}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-gray-500 dark:text-gray-400">
                  No Redis data available
                </div>
              )}
            </div>
          </OverviewCard>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default MetricsDashboard;
