import React, { useState } from 'react';
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
} from 'lucide-react';
import useTheme from '../stores/themeStore';

// Import the specialized metric panels
import HealthPanel, { type ServiceStatus } from './metrics/HealthPanel';
import PerformancePanel, { type PerformanceMetrics } from './metrics/PerformancePanel';
import DeploymentPanel, { type DeploymentStats } from './metrics/DeploymentPanel';
import AlertPanel, { type Alert } from './metrics/AlertPanel';
import TrendPanel, { type TrendData } from './metrics/TrendPanel';

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
    if (iconColor.includes('blue')) {
      return 'bg-gradient-to-br from-blue-500/10 to-indigo-600/5 dark:from-blue-900/20 dark:to-indigo-900/10';
    } else if (iconColor.includes('green')) {
      return 'bg-gradient-to-br from-emerald-500/10 to-green-600/5 dark:from-emerald-900/20 dark:to-green-900/10';
    } else if (iconColor.includes('purple')) {
      return 'bg-gradient-to-br from-violet-500/10 to-purple-600/5 dark:from-violet-900/20 dark:to-purple-900/10';
    } else if (iconColor.includes('amber')) {
      return 'bg-gradient-to-br from-amber-500/10 to-orange-600/5 dark:from-amber-900/20 dark:to-orange-900/10';
    } else {
      return 'bg-gradient-to-br from-gray-500/5 to-gray-600/5 dark:from-gray-800/20 dark:to-gray-900/10';
    }
  };

  const getIconGradient = () => {
    if (iconColor.includes('blue')) {
      return 'bg-gradient-to-br from-blue-500 to-indigo-600 dark:from-blue-400 dark:to-indigo-500';
    } else if (iconColor.includes('green')) {
      return 'bg-gradient-to-br from-emerald-500 to-green-600 dark:from-emerald-400 dark:to-green-500';
    } else if (iconColor.includes('purple')) {
      return 'bg-gradient-to-br from-violet-500 to-purple-600 dark:from-violet-400 dark:to-purple-500';
    } else if (iconColor.includes('amber')) {
      return 'bg-gradient-to-br from-amber-500 to-orange-600 dark:from-amber-400 dark:to-orange-500';
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

const MetricsDashboard: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState('24h');

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Simulate data refresh
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsRefreshing(false);
  };

  // Mock data for the specialized panels
  const healthServices: ServiceStatus[] = [
    {
      name: 'Redis Cache',
      status: 'healthy',
      uptime: '99.98%',
      responseTime: '2ms',
      lastChecked: '2 minutes ago',
    },
    {
      name: 'Kubernetes API',
      status: 'healthy',
      uptime: '99.95%',
      responseTime: '15ms',
      lastChecked: '1 minute ago',
    },
    {
      name: 'GitHub API',
      status: 'warning',
      uptime: '98.2%',
      responseTime: '125ms',
      lastChecked: '3 minutes ago',
    },
    {
      name: 'Database',
      status: 'healthy',
      uptime: '99.99%',
      responseTime: '8ms',
      lastChecked: '1 minute ago',
    },
  ];

  const performanceMetrics: PerformanceMetrics = {
    memory: {
      used: '342 MB',
      total: '512 MB',
      percentage: 67,
    },
    cpu: {
      usage: 23.5,
      cores: 4,
    },
    goroutines: {
      active: 156,
      peak: 203,
    },
    gc: {
      collections: 1247,
      pauseTime: '1.2ms',
    },
    heap: {
      size: '289 MB',
      objects: 425893,
    },
  };

  const deploymentStats: DeploymentStats = {
    total: 147,
    successful: 142,
    failed: 5,
    webhook: 89,
    manual: 58,
    avgDuration: '3m 42s',
    lastDeployment: '12 minutes ago',
  };

  const systemAlerts: Alert[] = [
    {
      id: '1',
      type: 'critical',
      title: 'High Memory Usage',
      message: 'Memory usage has exceeded 90% on cluster-prod-2. Immediate attention required.',
      timestamp: '2 minutes ago',
      source: 'cluster-prod-2',
      acknowledged: false,
    },
    {
      id: '2',
      type: 'warning',
      title: 'GitHub API Rate Limit',
      message: 'GitHub API rate limit approaching 80% of hourly quota.',
      timestamp: '15 minutes ago',
      source: 'github-api',
      acknowledged: false,
    },
    {
      id: '3',
      type: 'info',
      title: 'Deployment Completed',
      message: 'Successfully deployed version 2.1.0 to production cluster.',
      timestamp: '1 hour ago',
      source: 'deployment-system',
      acknowledged: true,
    },
  ];

  const trendData: TrendData[] = [
    { metric: 'CPU Usage', value: 67.5, change: -3.2, period: '24h' },
    { metric: 'Memory Usage', value: 78.9, change: 5.1, period: '24h' },
    { metric: 'Network I/O', value: 234.7, change: 12.3, period: '24h' },
    { metric: 'Disk Usage', value: 45.2, change: -1.8, period: '24h' },
  ];

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
      {/* Enhanced header following Clusters.tsx pattern */}
      <motion.div className="mb-8 px-6 pt-6" variants={itemAnimationVariant}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="mb-2 text-3xl font-bold text-blue-600 dark:text-blue-400">
              Metrics & Health Monitoring
            </h1>
            <p className="text-base text-gray-600 dark:text-gray-400">
              Real-time system performance, health monitoring, and deployment analytics
            </p>
          </div>
          <div className="mt-4 flex items-center space-x-3 md:mt-0">
            <select
              value={selectedTimeRange}
              onChange={e => setSelectedTimeRange(e.target.value)}
              className={`
                rounded-lg border px-3 py-2 text-sm transition-colors
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
              flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700
            `}
            >
              <Filter size={16} />
              <span>Filter</span>
            </button>

            <button
              className={`
              flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700
            `}
            >
              <Download size={16} />
              <span>Export</span>
            </button>

            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
            >
              <RefreshCcw size={16} className={isRefreshing ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </motion.div>

      <div className="px-6">
        {/* Stats grid following Clusters.tsx pattern */}
        <motion.div
          className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4"
          variants={itemAnimationVariant}
        >
          <StatCard
            title="System Health"
            value="98.5%"
            icon={Shield}
            change={2.1}
            iconColor="bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
          />
          <StatCard
            title="Active Deployments"
            value="24"
            icon={Server}
            change={8.3}
            iconColor="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
          />
          <StatCard
            title="CPU Usage"
            value="67%"
            icon={Cpu}
            change={-3.2}
            iconColor="bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400"
          />
          <StatCard
            title="Active Alerts"
            value="3"
            icon={Bell}
            change={-15.0}
            iconColor="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
          />
        </motion.div>

        {/* Main monitoring grid - Real-time health and performance */}
        <motion.div
          className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2"
          variants={itemAnimationVariant}
        >
          {/* Health Status Panel */}
          <HealthPanel services={healthServices} className="h-fit" />

          {/* Performance Metrics Panel */}
          <PerformancePanel metrics={performanceMetrics} className="h-fit" />
        </motion.div>

        {/* Deployment and Alerts Row */}
        <motion.div
          className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2"
          variants={itemAnimationVariant}
        >
          {/* Deployment Analytics Panel */}
          <DeploymentPanel stats={deploymentStats} className="h-fit" />

          {/* Alerts Panel */}
          <AlertPanel alerts={systemAlerts} className="h-fit" maxHeight="max-h-[500px]" />
        </motion.div>

        {/* Historical Trends - Full Width */}
        <motion.div variants={itemAnimationVariant}>
          <TrendPanel trends={trendData} className="mb-6" height="h-[600px]" />
        </motion.div>

        {/* Additional System Metrics Grid */}
        <motion.div
          className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-3"
          variants={itemAnimationVariant}
        >
          {/* GitHub API Metrics */}
          <OverviewCard
            title="GitHub Integration"
            icon={Server}
            iconColor="bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Rate Limit</span>
                <span className="text-sm font-medium text-gray-900 dark:text-gray-200">
                  3,247 / 5,000
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
                <div className="h-2 rounded-full bg-yellow-500" style={{ width: '65%' }}></div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Webhooks:</span>
                  <span className="block font-medium text-gray-900 dark:text-gray-200">
                    142 today
                  </span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Last Event:</span>
                  <span className="block font-medium text-gray-900 dark:text-gray-200">2m ago</span>
                </div>
              </div>
            </div>
          </OverviewCard>

          {/* Kubernetes Metrics */}
          <OverviewCard
            title="Kubernetes Status"
            icon={Activity}
            iconColor="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
          >
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">8</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Nodes</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">142</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Pods</div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Cluster Health</span>
                  <span className="font-medium text-green-600 dark:text-green-400">Healthy</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">API Response</span>
                  <span className="font-medium text-gray-900 dark:text-gray-200">15ms</span>
                </div>
              </div>
            </div>
          </OverviewCard>

          {/* Redis Metrics */}
          <OverviewCard
            title="Redis Cache"
            icon={HardDrive}
            iconColor="bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
          >
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">2.1</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">MB Used</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">99.9</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">% Uptime</div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Connections</span>
                  <span className="font-medium text-gray-900 dark:text-gray-200">12</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Hit Rate</span>
                  <span className="font-medium text-green-600 dark:text-green-400">98.2%</span>
                </div>
              </div>
            </div>
          </OverviewCard>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default MetricsDashboard;
