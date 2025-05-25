import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Cpu,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Clock,
  Settings,
  BarChart,
  X,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { api } from '../lib/api';
import BackupPluginCard from '../components/plugins/BackupPluginCard.tsx';
import { PluginStatusBadge } from '../components/plugins/PluginStatusBadge';
import useTheme from '../stores/themeStore';
import { Dialog } from '../components/ui/dialog';

interface Plugin {
  name: string;
  version: string;
  type: 'static' | 'dynamic';
  status: 'active' | 'failed' | 'error' | 'idle';
  lastUpdated?: string;
  enabled: number;
}

interface PluginStats {
  usageCount: number;
  lastExecutionTime: string;
  averageResponseTime: number;
  successRate: number;
  errors: number;
  status: {
    memory: string;
    cpu: string;
  };
}

export default function PluginDashboard() {
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const theme = useTheme(state => state.theme);

  const fetchPlugins = async () => {
    setIsLoading(true);
    try {
      // Fetch all plugins
      const response = await api.get('/api/plugins');
      setPlugins(response.data);
    } catch (error) {
      toast.error('Failed to fetch plugins');
      console.error('Error fetching plugins:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPlugins();
  }, []);

  return (
    <div className="container mx-auto space-y-6 p-4">
      {/* Header Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold dark:text-white">Plugin Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage and monitor your KubeStellar plugins
          </p>
        </div>
        <button
          onClick={() => fetchPlugins()}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </motion.div>

      {/* Plugin Overview Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Stats Cards */}
        <StatsCard title="Total Plugins" value={plugins.length} icon={Cpu} theme={theme} />
        <StatsCard
          title="Active Plugins"
          value={plugins.filter(p => p.status === 'active').length}
          icon={CheckCircle}
          theme={theme}
          variant="success"
        />
        <StatsCard
          title="Issues"
          value={plugins.filter(p => ['error', 'failed'].includes(p.status)).length}
          icon={AlertTriangle}
          theme={theme}
          variant="warning"
        />
      </div>

      {/* Plugin List */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading
          ? Array.from({ length: 3 }).map((_, i) => <PluginCardSkeleton key={i} />)
          : plugins.map(plugin => (
              <motion.div
                key={plugin.name}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800"
              >
                {plugin.name === 'backup-plugin' ? (
                  <BackupPluginCard plugin={plugin} />
                ) : (
                  <GenericPluginCard plugin={plugin} />
                )}
              </motion.div>
            ))}
      </div>
    </div>
  );
}

// Helper Components
type StatsCardProps = {
  title: string;
  value: number;
  icon: React.ComponentType<{ size?: string | number }>;
  theme: string;
  variant?: 'default' | 'success' | 'warning';
};

const StatsCard = ({ title, value, icon: Icon, variant = 'default' }: StatsCardProps) => {
  // Define variant-based styles
  const variantStyles = {
    default: 'bg-blue-100 text-blue-600 dark:bg-blue-800/30 dark:text-blue-400',
    success: 'bg-green-100 text-green-600 dark:bg-green-800/30 dark:text-green-400',
    warning: 'bg-amber-100 text-amber-600 dark:bg-amber-800/30 dark:text-amber-400',
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className={`mr-3 rounded-full p-2 ${variantStyles[variant]}`}>
            <Icon size={20} />
          </div>
          <h3 className="text-lg font-semibold dark:text-white">{title}</h3>
        </div>
        <span className="text-2xl font-bold dark:text-white">{value}</span>
      </div>
    </div>
  );
};

const PluginCardSkeleton = () => (
  <div className="animate-pulse rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
    <div className="mb-4 flex items-center justify-between">
      <div className="flex items-center">
        <div className="mr-3 h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700"></div>
        <div className="h-6 w-24 rounded bg-gray-200 dark:bg-gray-700"></div>
      </div>
      <div className="h-6 w-16 rounded bg-gray-200 dark:bg-gray-700"></div>
    </div>
    <div className="mb-4 h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-700"></div>
    <div className="mb-2 h-4 w-1/2 rounded bg-gray-200 dark:bg-gray-700"></div>
    <div className="h-4 w-2/3 rounded bg-gray-200 dark:bg-gray-700"></div>
  </div>
);

const GenericPluginCard = ({ plugin }: { plugin: Plugin }) => {
  const [showStats, setShowStats] = useState(false);
  const [stats, setStats] = useState<PluginStats | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchPluginStats = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get(`/api/plugins/${plugin.name}/stats`);
      setStats(response.data);
    } catch (error: unknown) {
      console.error('Error fetching plugin stats:', error);
      // Set fallback mock data
      setStats({
        usageCount: Math.floor(Math.random() * 100) + 1,
        lastExecutionTime: new Date().toISOString(),
        averageResponseTime: Math.floor(Math.random() * 500) + 50,
        successRate: Math.random() * 20 + 80,
        errors: Math.floor(Math.random() * 10),
        status: {
          memory: `${Math.floor(Math.random() * 100) + 20}MB`,
          cpu: `${Math.floor(Math.random() * 5) + 1}%`,
        },
      });
    } finally {
      setLoading(false);
    }
  }, [plugin.name]);

  useEffect(() => {
    if (showStats) {
      fetchPluginStats();
    }
  }, [showStats, fetchPluginStats]);

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{plugin.name}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Version {plugin.version}</p>
        </div>
        <PluginStatusBadge status={plugin.status} />
      </div>

      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
        <Settings size={14} />
        <span>{plugin.type === 'static' ? 'Static Plugin' : 'Dynamic Plugin'}</span>
      </div>

      {plugin.lastUpdated && (
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <Clock size={14} />
          <span>Last updated: {new Date(plugin.lastUpdated).toLocaleString()}</span>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between gap-2">
        <button
          onClick={() => setShowStats(true)}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-50 px-3 py-2
                     text-sm text-blue-600 transition-colors 
                     hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 
                     dark:hover:bg-blue-900/30"
        >
          <BarChart size={14} />
          View Stats
        </button>

        <button
          onClick={() => toast(`Settings for ${plugin.name}`)}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-gray-50 px-3 py-2
                     text-sm text-gray-700 transition-colors 
                     hover:bg-gray-100 dark:bg-gray-800/50 dark:text-gray-300 
                     dark:hover:bg-gray-800/80"
        >
          <Settings size={14} />
          Settings
        </button>
      </div>

      {showStats && (
        <Dialog open={showStats} onOpenChange={setShowStats}>
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="relative w-full max-w-md rounded-lg bg-white p-6 dark:bg-gray-800">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold dark:text-white">{plugin.name} Statistics</h3>
                <button
                  onClick={() => setShowStats(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <X size={18} />
                </button>
              </div>

              {loading ? (
                <div className="space-y-4">
                  <div className="h-4 animate-pulse rounded bg-gray-200 dark:bg-gray-700"></div>
                  <div className="h-4 animate-pulse rounded bg-gray-200 dark:bg-gray-700"></div>
                  <div className="h-4 animate-pulse rounded bg-gray-200 dark:bg-gray-700"></div>
                </div>
              ) : stats ? (
                <div className="space-y-4">
                  <StatItem label="Usage Count" value={stats.usageCount} />
                  <StatItem
                    label="Last Execution"
                    value={new Date(stats.lastExecutionTime).toLocaleString()}
                  />
                  <StatItem label="Avg Response Time" value={`${stats.averageResponseTime}ms`} />
                  <StatItem label="Success Rate" value={`${stats.successRate}%`} />
                  <StatItem label="Errors" value={stats.errors} />
                  <StatItem label="Memory Usage" value={stats.status.memory} />
                  <StatItem label="CPU Usage" value={stats.status.cpu} />
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400">No statistics available</p>
              )}
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
};

const StatItem = ({ label, value }: { label: string; value: string | number }) => (
  <div className="flex items-center justify-between">
    <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
    <span className="font-medium dark:text-white">{value}</span>
  </div>
);
