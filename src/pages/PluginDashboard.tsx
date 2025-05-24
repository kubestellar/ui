import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Database, Play, Settings, Download } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { api } from '../lib/api';
import useTheme from '../stores/themeStore';
import PluginCard from '../components/plugins/PluginCard';
import StatusBadge from '../components/plugins/StatusBadge';

interface BackupStatus {
  status: 'running' | 'completed' | 'failed' | 'idle';
  error: string | null;
  lastBackup?: string;
  message?: string;
}

interface Plugin {
  id: string;
  name: string;
  version: string;
  description: string;
  icon: React.ElementType;
  enabled: boolean;
  actions: PluginAction[];
}

interface PluginAction {
  id: string;
  label: string;
  icon: React.ElementType;
  variant: 'primary' | 'secondary' | 'danger';
  onClick: () => void;
}

const PluginDashboard = () => {
  const [backupStatus, setBackupStatus] = useState<BackupStatus>({
    status: 'idle',
    error: null,
  });
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const theme = useTheme(state => state.theme);
  const isDark = theme === 'dark';

  // Fetch backup status
  const fetchBackupStatus = async () => {
    try {
      const response = await api.get('/plugins/backup-plugin/status');
      setBackupStatus(response.data);
    } catch (error) {
      console.error('Failed to fetch backup status:', error);
      // Set default status if API doesn't exist yet
      setBackupStatus({
        status: 'idle',
        error: null,
      });
    }
  };

  // Create backup
  const createBackup = async () => {
    setIsCreatingBackup(true);
    try {
      await api.get('/plugins/backup-plugin/snapshot');
      toast.success('Backup initiated successfully!');

      // Update status to running
      setBackupStatus(prev => ({
        ...prev,
        status: 'running',
        error: null,
      }));

      // Poll for status updates
      const pollInterval = setInterval(async () => {
        try {
          await fetchBackupStatus();
          const currentStatus = await api.get('/plugins/backup-plugin/status');
          if (currentStatus.data.status !== 'running') {
            clearInterval(pollInterval);
          }
        } catch (pollError) {
          console.error('Error polling backup status:', pollError);
          clearInterval(pollInterval);
        }
      }, 2000);

      // Clear interval after 2 minutes to avoid infinite polling
      setTimeout(() => clearInterval(pollInterval), 120000);
    } catch (createError: unknown) {
      const errorMessage =
        createError instanceof Error ? createError.message : 'Failed to create backup';

      toast.error(errorMessage);
      setBackupStatus(prev => ({
        ...prev,
        status: 'failed',
        error: errorMessage,
      }));
    } finally {
      setIsCreatingBackup(false);
    }
  };

  // Refresh dashboard
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchBackupStatus();
      toast.success('Dashboard refreshed successfully!');
    } catch (refreshError) {
      console.error('Error refreshing dashboard:', refreshError);
      toast.error('Failed to refresh dashboard');
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  // Initialize
  useEffect(() => {
    fetchBackupStatus();
  }, []);

  // Define available plugins
  const plugins: Plugin[] = [
    {
      id: 'backup-plugin',
      name: 'Backup Plugin',
      version: '0.0.1',
      description: 'Create and manage cluster backups with PostgreSQL integration',
      icon: Database,
      enabled: true,
      actions: [
        {
          id: 'create-backup',
          label: 'Create Backup',
          icon: Play,
          variant: 'primary',
          onClick: createBackup,
        },
        {
          id: 'view-status',
          label: 'View Status',
          icon: Settings,
          variant: 'secondary',
          onClick: fetchBackupStatus,
        },
      ],
    },
  ];

  const colors = {
    primary: '#2f86ff',
    primaryLight: '#9ad6f9',
    primaryDark: '#1c4a7e',
    secondary: '#ffb347',
    white: '#ffffff',
    background: isDark ? '#0f172a' : '#ffffff',
    paper: isDark ? '#1e293b' : '#f8fafc',
    text: isDark ? '#f1f5f9' : '#1e293b',
    textSecondary: isDark ? '#94a3b8' : '#64748b',
    border: isDark ? '#334155' : '#e2e8f0',
    success: '#67c073',
    warning: '#ffb347',
    error: '#ff6b6b',
    disabled: isDark ? '#334155' : '#cbd5e1',
  };

  return (
    <div
      className="min-h-screen p-6"
      style={{ backgroundColor: colors.background, color: colors.text }}
    >
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="mb-2 text-3xl font-bold" style={{ color: colors.primary }}>
                Plugin Dashboard
              </h1>
              <p style={{ color: colors.textSecondary }}>Manage and monitor KubeStellar plugins</p>
            </div>
            <div className="mt-4 flex items-center space-x-3 md:mt-0">
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="flex items-center gap-2 rounded-lg border px-4 py-2 transition-colors"
                style={{
                  borderColor: colors.border,
                  backgroundColor: colors.paper,
                  color: colors.text,
                }}
              >
                <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
                <span>Refresh</span>
              </button>
            </div>
          </div>
        </motion.div>

        {/* Backup Status Overview */}
        <motion.div
          className="mb-8 rounded-xl border p-6 shadow-sm"
          style={{
            backgroundColor: colors.paper,
            borderColor: colors.border,
          }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="mb-2 text-xl font-semibold" style={{ color: colors.text }}>
                Backup System Status
              </h2>
              <div className="flex items-center gap-4">
                <StatusBadge status={backupStatus.status} isDark={isDark} colors={colors} />
                {backupStatus.lastBackup && (
                  <span className="text-sm" style={{ color: colors.textSecondary }}>
                    Last backup: {new Date(backupStatus.lastBackup).toLocaleString()}
                  </span>
                )}
              </div>
              {backupStatus.error && (
                <div
                  className="mt-2 rounded-lg border-l-4 p-3"
                  style={{
                    backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : '#fef2f2',
                    borderColor: colors.error,
                  }}
                >
                  <p className="text-sm" style={{ color: colors.error }}>
                    {backupStatus.error}
                  </p>
                </div>
              )}
            </div>
            <div className="text-right">
              <button
                onClick={createBackup}
                disabled={isCreatingBackup || backupStatus.status === 'running'}
                className="flex items-center gap-2 rounded-lg px-6 py-3 font-medium text-white transition-colors"
                style={{
                  backgroundColor: colors.primary,
                  opacity: isCreatingBackup || backupStatus.status === 'running' ? 0.6 : 1,
                }}
              >
                {isCreatingBackup || backupStatus.status === 'running' ? (
                  <RefreshCw size={16} className="animate-spin" />
                ) : (
                  <Download size={16} />
                )}
                <span>
                  {isCreatingBackup
                    ? 'Creating...'
                    : backupStatus.status === 'running'
                      ? 'Backup Running...'
                      : 'Create Backup'}
                </span>
              </button>
            </div>
          </div>
        </motion.div>

        {/* Plugin Grid */}
        <motion.div
          className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <AnimatePresence>
            {plugins.map((plugin, index) => (
              <motion.div
                key={plugin.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <PluginCard
                  plugin={plugin}
                  isDark={isDark}
                  colors={colors}
                  isLoading={plugin.id === 'backup-plugin' && isCreatingBackup}
                  status={plugin.id === 'backup-plugin' ? backupStatus : undefined}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>

        {/* Empty State for Future Plugins */}
        <motion.div
          className="mt-8 rounded-xl border-2 border-dashed p-8 text-center"
          style={{
            borderColor: colors.border,
            backgroundColor: isDark ? 'rgba(0, 0, 0, 0.1)' : 'rgba(0, 0, 0, 0.02)',
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <Settings size={48} className="mx-auto mb-4" style={{ color: colors.textSecondary }} />
          <h3 className="mb-2 text-lg font-medium" style={{ color: colors.text }}>
            More Plugins Coming Soon
          </h3>
          <p style={{ color: colors.textSecondary }}>
            Additional plugins will be available in future releases
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default PluginDashboard;
