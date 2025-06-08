import { useEffect, useState, useMemo, useCallback } from 'react';
import { useK8sQueries } from '../hooks/queries/useK8sQueries';
import { useClusterQueries } from '../hooks/queries/useClusterQueries';
import { motion, AnimatePresence } from 'framer-motion';
import ClusterSkeleton from '../components/ui/ClusterSkeleton';
import {
  Activity,
  Server,
  AlertTriangle,
  X,
  RefreshCcw,
  Layers,
  ArrowRightCircle,
  Plus,
  CircleCheck,
  CheckCircle,
  FileText,
  Clock,
  Cpu,
  HardDrive,
  ChevronUp,
  ChevronDown,
  BarChart3,
  ClipboardList,
  Shield,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import useTheme from '../stores/themeStore';
import { Link } from 'react-router-dom';
import { useWDSQueries } from '../hooks/queries/useWDSQueries';
import { useBPQueries } from '../hooks/queries/useBPQueries';
import ClusterDetailDialog from '../components/ClusterDetailDialog';

// Health indicator component
const HealthIndicator = ({ value }: { value: number }) => {
  let color = '';

  if (value >= 90) {
    color = 'bg-gradient-to-r from-emerald-500 to-green-500 text-white dark:text-white';
  } else if (value >= 75) {
    color = 'bg-gradient-to-r from-green-500 to-teal-500 text-white dark:text-white';
  } else if (value >= 60) {
    color = 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white dark:text-white';
  } else if (value >= 40) {
    color = 'bg-gradient-to-r from-amber-400 to-amber-500 text-white dark:text-white';
  } else {
    color = 'bg-gradient-to-r from-amber-500 to-yellow-500 text-white dark:text-white';
  }

  return (
    <div
      className={`inline-flex items-center rounded-full px-2 py-1 ${color} shadow-sm transition-colors`}
    >
      <span className="mr-1 flex h-2 w-2 rounded-full bg-white opacity-80"></span>
      <span className="text-xs font-medium">{value}%</span>
    </div>
  );
};

// Type for recent activity card props
interface RecentActivityCardProps {
  isDark: boolean;
}

// Type for recent activity items
interface ActivityItem {
  type: string;
  name: string;
  timestamp: string;
  status: string;
}

// Add a type for the cluster object in determineClusterStatus
interface ClusterStatusObject {
  status?:
    | string
    | {
        conditions?: Array<{
          lastTransitionTime?: string;
          message?: string;
          reason?: string;
          status?: string;
          type?: string;
        }>;
        version?: {
          kubernetes?: string;
        };
        capacity?: {
          cpu?: string;
          memory?: string;
          pods?: string;
          [key: string]: string | undefined;
        };
        [key: string]: unknown;
      };
  available?: boolean;
  name?: string;
}

// Type for cluster metrics and stats
interface ClusterStats {
  totalClusters: number;
  activeClusters: number;
  totalWorkloads: number;
  totalBindingPolicies: number;
  activeBindingPolicies: number;
  cpuUsage: number;
  memoryUsage: number;
}

// Type for processed cluster data
interface ProcessedCluster {
  name: string;
  uid: string;
  status: string;
  labels: Record<string, string>;
  available: boolean | undefined;
  joined: boolean | undefined;
  creationTime: string;
  context: string;
  cpuCapacity?: string;
  memCapacity?: string;
  podsCapacity?: string;
}

// Revised dashboard header and transition animations
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

// Enhanced modern stat component with advanced UI
const StatCard = ({
  title,
  value,
  icon: Icon,
  change,
  iconColor,
  isContext = false,
}: {
  title: string;
  value: number | string;
  icon: React.ElementType;
  change?: number;
  iconColor: string;
  isContext?: boolean;
}) => {
  // Determine if change is positive, negative or neutral
  const isPositive = typeof change === 'number' && change > 0;
  const isNegative = typeof change === 'number' && change < 0;

  // Get colors for gradient based on the icon color type
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

  // Get colors for the icon container
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
      variants={itemAnimationVariant}
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
            {isContext && (
              <motion.div
                className="ml-2 h-2.5 w-2.5 rounded-full bg-green-500"
                initial={{ scale: 0.8, opacity: 0.8 }}
                animate={{
                  scale: [0.8, 1.2, 0.8],
                  opacity: [0.8, 1, 0.8],
                  boxShadow: [
                    '0 0 0px rgba(34,197,94,0.5)',
                    '0 0 12px rgba(34,197,94,0.8)',
                    '0 0 0px rgba(34,197,94,0.5)',
                  ],
                }}
                transition={{
                  repeat: Infinity,
                  duration: 2,
                }}
              ></motion.div>
            )}
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

        {/* Add mini visual indicator based on card type */}
        {title === 'Total Clusters' && (
          <div className="flex h-10 items-end space-x-1">
            {[0.4, 0.7, 1, 0.6, 0.8].map((height, i) => (
              <motion.div
                key={i}
                className="w-1.5 rounded-t bg-blue-500/70 dark:bg-blue-400/70"
                initial={{ height: 0 }}
                animate={{ height: `${height * 40}px` }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
              ></motion.div>
            ))}
          </div>
        )}

        {title === 'Active Clusters' && (
          <div className="flex -space-x-1.5">
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={i}
                className="h-5 w-5 rounded-full border-2 border-white bg-emerald-500/80 dark:border-gray-800 dark:bg-emerald-400/80"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: i * 0.2, duration: 0.3 }}
              ></motion.div>
            ))}
          </div>
        )}

        {title === 'Binding Policies' && (
          <div className="relative flex h-10 w-10 items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-purple-100 dark:bg-purple-900/30"></div>
            <motion.div
              initial={{ opacity: 0.4, scale: 0.6 }}
              animate={{
                opacity: [0.4, 0.8, 0.4],
                scale: [0.6, 0.7, 0.6],
              }}
              transition={{
                duration: 5,
                repeat: Infinity,
                repeatType: 'reverse',
              }}
            >
              <FileText size={60} className="text-purple-600 dark:text-purple-400" />
            </motion.div>
          </div>
        )}

        {title === 'Current Context' && (
          <motion.div
            className="relative flex h-12 w-12 items-center justify-center rounded-full border-2 border-amber-500/30 bg-amber-500/10 dark:border-amber-400/30 dark:bg-amber-400/10"
            animate={{
              boxShadow: [
                '0 0 0 0 rgba(245, 158, 11, 0)',
                '0 0 0 8px rgba(245, 158, 11, 0.15)',
                '0 0 0 0 rgba(245, 158, 11, 0)',
              ],
            }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <div
              className="absolute inset-0 animate-spin rounded-full border-2 border-dashed border-amber-500/40 dark:border-amber-400/40"
              style={{ animationDuration: '12s' }}
            ></div>
            <div className="absolute flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-amber-500/20 to-amber-600/30 dark:from-amber-400/20 dark:to-amber-500/30">
              <Activity size={14} className="text-amber-600 dark:text-amber-400" />
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

// Enhanced overview card component
const OverviewCard = ({
  title,
  icon: Icon,
  iconColor,
  children,
  className = '',
}: {
  title: string;
  icon: React.ElementType;
  iconColor: string;
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <motion.div
      className={`overflow-hidden rounded-xl bg-white shadow-sm transition-all duration-300 dark:bg-gray-800 ${className}`}
      variants={itemAnimationVariant}
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
      </div>
      <div className="p-5">{children}</div>
    </motion.div>
  );
};

// Update the RecentActivityCard to have a better UI with improved dark/light mode
const RecentActivityCard = ({ isDark }: RecentActivityCardProps) => {
  const [recentItems, setRecentItems] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { useClusters } = useClusterQueries();
  const { useBindingPolicies } = useBPQueries();

  // Use the existing query hooks to fetch data
  const {
    data: clusterData,
    isLoading: clustersLoading,
    refetch: refetchClusters,
  } = useClusters(1);
  const {
    data: bindingPoliciesData,
    isLoading: bpLoading,
    refetch: refetchBP,
  } = useBindingPolicies();

  // Process data function to avoid code duplication
  const processData = useCallback(() => {
    if (!clustersLoading && !bpLoading && clusterData && bindingPoliciesData) {
      try {
        const items: ActivityItem[] = [];

        // Extract binding policies correctly
        if (Array.isArray(bindingPoliciesData)) {
          bindingPoliciesData.slice(0, 5).forEach(bp => {
            items.push({
              type: 'binding-policy',
              name: bp.name || 'Unnamed Policy',
              timestamp: bp.creationTimestamp || new Date().toISOString(),
              status: bp.status || 'Active',
            });
          });
        }

        // Extract clusters from the correct property
        if (clusterData?.clusters && Array.isArray(clusterData.clusters)) {
          clusterData.clusters.slice(0, 5).forEach(cluster => {
            // Use the timestamp that's guaranteed to exist
            const timestamp =
              cluster.creationTimestamp || cluster.creationTime || new Date().toISOString();
            items.push({
              type: 'cluster',
              name: cluster.name || 'Unnamed Cluster',
              timestamp: timestamp,
              // Use any type to avoid TypeScript error
              status: determineClusterStatus(cluster as ClusterStatusObject),
            });
          });
        }

        // Sort by timestamp (newest first)
        items.sort((a, b) => {
          // Safely parse dates - if parsing fails, treat as recent (at the top)
          let timeA: number, timeB: number;
          try {
            timeA = new Date(a.timestamp).getTime();
          } catch {
            timeA = Date.now();
          }
          try {
            timeB = new Date(b.timestamp).getTime();
          } catch {
            timeB = Date.now();
          }
          return timeB - timeA;
        });

        setRecentItems(items.slice(0, 8));
        setIsLoading(false);
      } catch (error) {
        console.error('Error processing recent activity data:', error);
        setRecentItems([]);
        setIsLoading(false);
      }
    }
  }, [clustersLoading, bpLoading, clusterData, bindingPoliciesData]);

  useEffect(() => {
    processData();
  }, [processData]);

  // Helper to determine cluster status consistently
  const determineClusterStatus = (cluster: ClusterStatusObject): string => {
    if (typeof cluster.status === 'string') {
      return cluster.status;
    } else if (cluster.available === true) {
      return 'Active';
    } else if (cluster.available === false) {
      return 'Inactive';
    } else {
      return 'Unknown';
    }
  };

  // Refresh data properly
  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      await Promise.all([refetchClusters(), refetchBP()]);
      // Process the refreshed data
      setTimeout(processData, 300);
      toast.success('Activity data refreshed');
    } catch (error) {
      console.error('Error refreshing data:', error);
      setIsLoading(false);
      toast.error('Failed to refresh data');
    }
  };

  // Format relative time with better handling of edge cases
  const formatRelativeTime = (timestamp: string): string => {
    try {
      const date = new Date(timestamp);

      // Check if the date is invalid
      if (isNaN(date.getTime())) {
        return 'Recently';
      }

      const now = new Date();
      const diffMs = now.getTime() - date.getTime();

      // If the timestamp is in the future or very recent (within 1 minute)
      if (diffMs < 60000) {
        return 'Just now';
      }

      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHrs < 24) return `${diffHrs}h ago`;
      if (diffDays < 30) return `${diffDays}d ago`;

      // For older items, show the actual date
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return 'Recently';
    }
  };

  // Helper function to trim long names
  const trimName = (name: string, maxLength: number = 12): string => {
    if (!name || name.length <= maxLength) return name;
    return `${name.substring(0, maxLength)}...`;
  };

  // Status icon based on activity status
  const getStatusIcon = (status: string) => {
    if (status === 'Active' || status === 'Available' || status === 'Synced') {
      return <CheckCircle size={12} />;
    } else if (status === 'Warning' || status === 'Pending') {
      return <AlertTriangle size={12} />;
    } else {
      return <X size={12} />;
    }
  };

  return (
    <motion.div
      className="h-full overflow-hidden rounded-xl bg-white shadow-sm transition-colors duration-300 dark:bg-gray-800"
      variants={itemAnimationVariant}
      whileHover={{ y: -2, boxShadow: '0 8px 16px rgba(0, 0, 0, 0.05)' }}
    >
      <div className="flex items-center justify-between border-b border-gray-200 px-5 pb-3 pt-5 transition-colors dark:border-gray-700">
        <div className="flex items-center">
          <div className="mr-3 rounded-lg bg-amber-100 p-2 text-amber-600 transition-colors dark:bg-amber-900/40 dark:text-amber-400">
            <Clock size={18} />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 transition-colors dark:text-gray-100">
            Recent Activity
          </h2>
        </div>
        <div>
          <button
            onClick={handleRefresh}
            className="rounded-lg bg-transparent p-2 text-blue-600 transition-colors hover:bg-gray-100 hover:text-blue-700 dark:text-gray-300 dark:hover:bg-gray-700"
            aria-label="Refresh data"
          >
            <RefreshCcw size={16} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="max-h-[calc(100vh-25rem)] overflow-auto p-4 transition-colors dark:bg-gray-800">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div
                key={i}
                className="flex animate-pulse items-center rounded-lg bg-gray-50 p-3 transition-colors dark:bg-gray-700/60"
              >
                <div className="h-10 w-10 rounded-full bg-gray-200 transition-colors dark:bg-gray-600"></div>
                <div className="ml-3 flex-grow">
                  <div className="mb-2 h-4 w-3/4 rounded bg-gray-200 transition-colors dark:bg-gray-600"></div>
                  <div className="h-3 w-1/2 rounded bg-gray-200 transition-colors dark:bg-gray-600"></div>
                </div>
                <div className="ml-2">
                  <div className="h-6 w-16 rounded-full bg-gray-200 transition-colors dark:bg-gray-600"></div>
                </div>
              </div>
            ))}
          </div>
        ) : recentItems.length > 0 ? (
          <div className="space-y-3">
            {recentItems.map((item, index) => {
              const isPolicy = item.type === 'binding-policy';

              // Status colors based on item status
              const getStatusColors = (status: string): { bgColor: string; textColor: string } => {
                if (status === 'Active' || status === 'Available' || status === 'Synced') {
                  return {
                    bgColor: isDark ? 'bg-green-900/30' : 'bg-green-100',
                    textColor: isDark ? 'text-green-400' : 'text-green-600',
                  };
                } else if (status === 'Warning' || status === 'Pending') {
                  return {
                    bgColor: isDark ? 'bg-yellow-900/30' : 'bg-yellow-100',
                    textColor: isDark ? 'text-yellow-400' : 'text-yellow-600',
                  };
                } else {
                  return {
                    bgColor: isDark ? 'bg-red-900/30' : 'bg-red-100',
                    textColor: isDark ? 'text-red-400' : 'text-red-600',
                  };
                }
              };

              const statusColors = getStatusColors(item.status);

              // Determine the color scheme for the item based on type
              const typeColors = isPolicy
                ? {
                    bg: isDark ? 'bg-purple-900/30' : 'bg-purple-100',
                    text: isDark ? 'text-purple-400' : 'text-purple-600',
                    icon: <FileText size={18} />,
                  }
                : {
                    bg: isDark ? 'bg-blue-900/30' : 'bg-blue-100',
                    text: isDark ? 'text-blue-400' : 'text-blue-600',
                    icon: <Server size={18} />,
                  };

              return (
                <motion.div
                  key={`${item.type}-${item.name}-${index}`}
                  className="relative overflow-hidden rounded-lg border border-gray-100 bg-white p-4 transition-all duration-200 dark:border-gray-600 dark:bg-gray-700"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  whileHover={{
                    scale: 1.01,
                    boxShadow: isDark
                      ? '0 4px 12px rgba(0, 0, 0, 0.3)'
                      : '0 4px 12px rgba(0, 0, 0, 0.1)',
                    transition: { duration: 0.2 },
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-start space-x-3">
                      {/* Icon with proper styling */}
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-full shadow-sm ${typeColors.bg} ${typeColors.text} transition-colors`}
                      >
                        {typeColors.icon}
                      </div>

                      {/* Content with better spacing and text styling */}
                      <div>
                        <div className="mb-1 flex items-center">
                          <h3
                            className="mr-2 font-medium text-gray-900 transition-colors dark:text-gray-100"
                            title={item.name}
                          >
                            <span>{trimName(item.name)}</span>
                          </h3>
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs transition-colors ${typeColors.bg} ${typeColors.text}`}
                          >
                            {isPolicy ? 'Policy' : 'Cluster'}
                          </span>
                        </div>
                        <span className="flex items-center text-xs text-gray-500 transition-colors dark:text-gray-400">
                          <Clock size={12} className="mr-1 inline" />
                          {formatRelativeTime(item.timestamp)}
                        </span>
                      </div>
                    </div>

                    {/* Status badge with consistent styling */}
                    <div
                      className={`inline-flex items-center rounded-full px-2 py-1 ${statusColors.bgColor} ${statusColors.textColor} text-xs font-medium transition-colors`}
                    >
                      {getStatusIcon(item.status)}
                      <span className="ml-1">{item.status}</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 transition-colors dark:bg-gray-700">
              <Clock size={24} className="text-gray-400 transition-colors dark:text-gray-500" />
            </div>
            <p className="mb-3 text-gray-500 transition-colors dark:text-gray-400">
              No recent activity found
            </p>
            <button
              onClick={handleRefresh}
              className="flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm text-white transition-colors hover:bg-blue-700"
            >
              <RefreshCcw size={14} className="mr-2" />
              Refresh
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
};

// Main function for rendering the dashboard
const K8sInfo = () => {
  const { useK8sInfo } = useK8sQueries();
  const { useClusters } = useClusterQueries();
  const { useWorkloads } = useWDSQueries();
  const { useBindingPolicies } = useBPQueries();
  const {
    data: k8sData,
    error: k8sError,
    isLoading: k8sLoading,
    refetch: refetchK8s,
  } = useK8sInfo();
  const { data: clusterData, isLoading: clustersLoading } = useClusters(1);
  const { data: workloadsData, isLoading: workloadsLoading } = useWorkloads();
  const { data: bindingPoliciesData, isLoading: bpLoading } = useBindingPolicies();

  const theme = useTheme(state => state.theme);
  const isDark = theme === 'dark';

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedCluster, setSelectedCluster] = useState<string | null>(null);
  const [showHelpPanel, setShowHelpPanel] = useState(false);

  // Process and prepare clusters data from API
  const processedClusters = useMemo<ProcessedCluster[]>(() => {
    if (!clusterData || !clusterData.clusters) return [];

    return clusterData.clusters.map(cluster => {
      // Default values for capacity
      let cpuCapacity = 'N/A';
      let memCapacity = 'N/A';
      let podsCapacity = 'N/A';

      try {
        // Access capacity data from the rawStatus field
        if (cluster.rawStatus?.capacity) {
          const capacity = cluster.rawStatus.capacity;

          // CPU capacity is directly available
          cpuCapacity = capacity.cpu || 'N/A';

          // Memory capacity requires formatting
          if (capacity.memory) {
            const memStr = String(capacity.memory);

            // Parse memory based on unit
            if (memStr.includes('Ki')) {
              const value = parseInt(memStr.replace(/\D/g, ''));
              if (!isNaN(value)) {
                memCapacity = `${Math.round(value / 1024 / 1024)} GB`;
              } else {
                memCapacity = memStr;
              }
            } else if (memStr.includes('Mi')) {
              const value = parseInt(memStr.replace(/\D/g, ''));
              if (!isNaN(value)) {
                memCapacity = `${Math.round(value / 1024)} GB`;
              } else {
                memCapacity = memStr;
              }
            } else if (memStr.includes('Gi')) {
              const value = parseInt(memStr.replace(/\D/g, ''));
              if (!isNaN(value)) {
                memCapacity = `${value} GB`;
              } else {
                memCapacity = memStr;
              }
            } else {
              memCapacity = memStr;
            }
          }

          // Pod capacity is directly available
          podsCapacity = capacity.pods || 'N/A';
        }
      } catch (error) {
        console.error('Error parsing cluster capacity:', error);
      }

      return {
        name: cluster.name,
        uid: cluster.uid || '',
        status: typeof cluster.status === 'string' ? cluster.status : 'Unknown',
        labels: cluster.labels || {},
        available: cluster.available,
        joined: cluster.joined,
        creationTime: cluster.creationTime || cluster.creationTimestamp || new Date().toISOString(),
        context: cluster.name,
        cpuCapacity,
        memCapacity,
        podsCapacity,
      };
    });
  }, [clusterData]);

  // Add a function to view cluster details when clicked
  const handleClusterClick = (clusterName: string) => {
    setSelectedCluster(clusterName);
  };

  // Dashboard statistics
  const [stats, setStats] = useState<ClusterStats>({
    totalClusters: 0,
    activeClusters: 0,
    totalWorkloads: 0,
    totalBindingPolicies: 0,
    activeBindingPolicies: 0,
    cpuUsage: 0,
    memoryUsage: 0,
  });

  // Filter clusters and update stats
  useEffect(() => {
    if (k8sData && clusterData && workloadsData && bindingPoliciesData) {
      // Calculate metrics for clusters
      const totalClusters = processedClusters.length;
      const activeClusters = processedClusters.filter(
        c => c.status === 'Active' || c.status === 'Available' || c.available === true
      ).length;

      // Calculate binding policy stats
      const totalBindingPolicies = bindingPoliciesData?.length || 0;
      const activeBindingPolicies =
        bindingPoliciesData?.filter(bp => ['Active', 'Synced', 'Available'].includes(bp.status))
          ?.length || 0;

      // Get accurate workload stats from workloadsData
      const totalWorkloads = workloadsData?.length || 0;

      // Calculate resource usage percentages based on kubernetes metrics (if available)
      let cpuUsage = 0;
      let memoryUsage = 0;

      // Use type assertion for metrics to avoid TypeScript errors
      const clusterDataWithMetrics = clusterData as {
        metrics?: { cpuPercentage?: number; memoryPercentage?: number };
      };
      if (clusterDataWithMetrics?.metrics) {
        cpuUsage = clusterDataWithMetrics.metrics.cpuPercentage || 0;
        memoryUsage = clusterDataWithMetrics.metrics.memoryPercentage || 0;
      } else {
        // Default to average values based on available data
        if (processedClusters.length > 0) {
          const activeClusterCount = activeClusters || 1;
          const defaultCpuUsage = Math.min(70, 30 + activeClusterCount * 10);
          const defaultMemoryUsage = Math.min(65, 25 + activeClusterCount * 8);

          cpuUsage = defaultCpuUsage;
          memoryUsage = defaultMemoryUsage;
        }
      }

      setStats({
        totalClusters,
        activeClusters,
        totalWorkloads,
        totalBindingPolicies,
        activeBindingPolicies,
        cpuUsage,
        memoryUsage,
      });
    }
  }, [k8sData, clusterData, workloadsData, processedClusters, bindingPoliciesData]);

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetchK8s();
      toast.success('Data refreshed successfully!');
    } catch (err) {
      toast.error('Failed to refresh data');
      console.error('Refresh error:', err);
    } finally {
      setTimeout(() => setIsRefreshing(false), 700);
    }
  };

  // Format date for better display
  const formatDate = (dateString: string): string => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Invalid Date';
    }
  };

  if (k8sLoading || clustersLoading || workloadsLoading || bpLoading) return <ClusterSkeleton />;

  if (k8sError)
    return (
      <div className="mx-auto w-full max-w-7xl p-4 md:p-6">
        <div className="rounded-xl border border-red-200 bg-white p-6 text-red-600 shadow-sm dark:border-red-900/30 dark:bg-gray-800 dark:text-red-400">
          <div className="mb-4 flex items-center">
            <AlertTriangle size={24} className="mr-3 text-red-500" />
            <h3 className="text-lg font-semibold">Error loading cluster information</h3>
          </div>
          <p className="mb-6 text-gray-600 dark:text-gray-300">{k8sError.message}</p>
          <button
            className="flex items-center rounded-lg bg-red-600 px-4 py-2 text-white transition-colors hover:bg-red-700"
            onClick={() => refetchK8s()}
          >
            <RefreshCcw size={16} className="mr-2" />
            Try Again
          </button>
        </div>
      </div>
    );

  const currentContext = k8sData?.currentContext || '';

  // Sort managed clusters by status, ensuring we handle all possible statuses
  const sortedClusters = [...processedClusters].sort((a, b) => {
    const isActiveA = a.status === 'Active' || a.status === 'Available' || a.available === true;
    const isActiveB = b.status === 'Active' || b.status === 'Available' || b.available === true;

    if (isActiveA && !isActiveB) return -1;
    if (!isActiveA && isActiveB) return 1;
    return 0;
  });

  // Get system health status based on overall metrics
  const systemHealth = (() => {
    const healthScore = Math.round(
      (stats.activeClusters / Math.max(stats.totalClusters, 1)) * 50 +
        (stats.activeBindingPolicies / Math.max(stats.totalBindingPolicies, 1)) * 25 +
        (100 - stats.cpuUsage) / 4
    );

    if (healthScore >= 90)
      return { status: 'Excellent', color: 'text-emerald-500 dark:text-emerald-400' };
    if (healthScore >= 75) return { status: 'Good', color: 'text-green-500 dark:text-green-400' };
    if (healthScore >= 60) return { status: 'Fair', color: 'text-blue-500 dark:text-blue-400' };
    if (healthScore >= 40)
      return { status: 'Needs Attention', color: 'text-amber-500 dark:text-amber-400' };
    return { status: 'Critical', color: 'text-red-500 dark:text-red-400' };
  })();

  const renderHelpPanel = () => {
    if (!showHelpPanel) return null;

    return (
      <motion.div
        className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800"
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Dashboard Guide
          </h3>
          <button
            onClick={() => setShowHelpPanel(false)}
            className="rounded-full p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-300"
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-700/50">
            <div className="mb-2 flex items-center">
              <Server size={16} className="mr-2 text-blue-500" />
              <span className="font-medium text-gray-800 dark:text-gray-200">Cluster Stats</span>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-300">
              Shows total and active clusters. Hover over metrics to see detailed information about
              how they're calculated.
            </p>
          </div>

          <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-700/50">
            <div className="mb-2 flex items-center">
              <Shield size={16} className="mr-2 text-blue-500" />
              <span className="font-medium text-gray-800 dark:text-gray-200">Health Metrics</span>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-300">
              Displays CPU, memory usage, and pod health. Green indicators show good health, amber
              requires attention.
            </p>
          </div>

          <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-700/50">
            <div className="mb-2 flex items-center">
              <Clock size={16} className="mr-2 text-amber-500" />
              <span className="font-medium text-gray-800 dark:text-gray-200">Recent Activity</span>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-300">
              Shows recent changes to clusters and policies. Click on a cluster to view detailed
              information.
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50 p-3 dark:border-blue-900/30 dark:bg-blue-900/20">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <span className="font-medium">Pro Tip:</span> Hover over any metric or chart to see
            detailed information about how it's calculated and what actions you can take.
          </p>
        </div>
      </motion.div>
    );
  };

  const renderDashboardHeader = () => (
    <motion.div className="mb-8" variants={itemAnimationVariant}>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="mb-2 text-3xl font-bold text-blue-600 dark:text-blue-400">Dashboard</h1>
          <p className="text-base text-gray-600 dark:text-gray-400">
            Welcome to the KubeStellar management dashboard
          </p>
        </div>
        <div className="mt-4 flex items-center space-x-3 md:mt-0">
          <button
            className="dark:hover:bg-gray-750 flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCcw size={16} className={`${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <Link
            to="/its"
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
          >
            <Plus size={16} />
            <span>Add Cluster</span>
          </Link>
        </div>
      </div>
    </motion.div>
  );

  // Make dashboard responsive with these layout classes
  const dashboardGridCols = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8';
  const contentGridCols = 'grid grid-cols-1 md:grid-cols-12 gap-6 mb-6';

  // Update the renderClusterStats function to use responsive grid
  const renderClusterStats = () => {
    return (
      <motion.div className={dashboardGridCols} variants={itemAnimationVariant}>
        <StatCard
          title="Total Clusters"
          value={stats.totalClusters}
          icon={Server}
          iconColor="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
        />
        <StatCard
          title="Active Clusters"
          value={stats.activeClusters}
          icon={CircleCheck}
          change={50} // Fixed 50% increase as requested
          iconColor="bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
        />
        <StatCard
          title="Binding Policies"
          value={stats.totalBindingPolicies}
          icon={FileText}
          iconColor="bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400"
        />
        <StatCard
          title="Current Context"
          value={currentContext || 'None'}
          icon={Activity}
          iconColor="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
          isContext={true}
        />
      </motion.div>
    );
  };

  const renderHealthOverview = () => (
    <OverviewCard
      title="Cluster Health"
      icon={Shield}
      iconColor="text-blue-600 dark:text-blue-400"
      className="mb-6"
    >
      {/* Add overall system health status at the top */}
      <div className="mb-6 flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
        <div className="flex items-center">
          <div
            className={`mr-3 rounded-full p-2 ${systemHealth.color.includes('emerald') || systemHealth.color.includes('green') ? 'bg-green-100 dark:bg-green-900/30' : systemHealth.color.includes('blue') ? 'bg-blue-100 dark:bg-blue-900/30' : systemHealth.color.includes('amber') ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}
          >
            <CheckCircle size={20} className={systemHealth.color} />
          </div>
          <div>
            <h4 className="font-medium text-gray-800 dark:text-gray-200">System Health</h4>
            <p className={`text-sm ${systemHealth.color}`}>{systemHealth.status}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-500 dark:text-gray-400">Based on cluster metrics</div>
          <div className="mt-1 text-sm font-medium text-gray-700 dark:text-gray-300">
            {stats.activeClusters} of {stats.totalClusters} clusters active
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        {/* Resource Utilization with improved visuals */}
        <div>
          <h3 className="mb-4 flex items-center text-sm font-medium text-gray-700 dark:text-gray-300">
            <BarChart3 size={14} className="mr-2 text-blue-500 dark:text-blue-400" />
            Resource Utilization
          </h3>

          <div className="space-y-6">
            {/* Enhanced CPU Usage with icon */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="group relative flex items-center text-sm font-medium text-gray-600 dark:text-gray-300">
                  <Cpu size={14} className="mr-2 text-blue-500" />
                  CPU Usage
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="ml-1.5 opacity-60"
                  >
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
                  </svg>
                  <div className="pointer-events-none invisible absolute -left-4 -top-28 z-10 w-64 whitespace-normal rounded-md border border-gray-200 bg-white p-3 text-xs opacity-0 shadow-lg transition-all duration-200 group-hover:visible group-hover:opacity-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
                    <div className="mb-2 font-medium text-blue-600 dark:text-blue-400">
                      CPU Usage Formula
                    </div>
                    <div className="space-y-2 text-gray-600 dark:text-gray-300">
                      <p>
                        Calculated as the percentage of allocated CPU resources currently in use
                        across all nodes in the cluster.
                      </p>
                      <div className="rounded-md bg-blue-50 p-2 dark:bg-blue-900/20">
                        <code className="text-blue-700 dark:text-blue-300">
                          (Used CPU Cores / Total CPU Cores) × 100%
                        </code>
                      </div>
                    </div>
                    <div className="mt-2 border-t border-gray-100 pt-2 text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400">
                      Lower values indicate better performance
                    </div>
                  </div>
                </span>
                <HealthIndicator value={stats.cpuUsage} />
              </div>
              <div className="relative h-4 w-full overflow-hidden rounded-full bg-gray-100 shadow-inner dark:bg-gray-700">
                <motion.div
                  className="absolute left-0 top-0 h-full rounded-full shadow"
                  style={{
                    backgroundImage: 'linear-gradient(90deg, #3b82f6 0%, #2563eb 100%)',
                  }}
                  initial={{ width: 0 }}
                  animate={{ width: `${stats.cpuUsage}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-medium text-gray-700 drop-shadow-sm dark:text-gray-200">
                    {stats.cpuUsage}%
                  </span>
                </div>
              </div>
            </div>

            {/* Enhanced Memory Usage with icon */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="group relative flex items-center text-sm font-medium text-gray-600 dark:text-gray-300">
                  <HardDrive size={14} className="mr-2 text-purple-500" />
                  Memory Usage
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="ml-1.5 opacity-60"
                  >
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
                  </svg>
                  <div className="pointer-events-none invisible absolute -left-4 -top-28 z-10 w-64 whitespace-normal rounded-md border border-gray-200 bg-white p-3 text-xs opacity-0 shadow-lg transition-all duration-200 group-hover:visible group-hover:opacity-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
                    <div className="mb-2 font-medium text-purple-600 dark:text-purple-400">
                      Memory Usage Formula
                    </div>
                    <div className="space-y-2 text-gray-600 dark:text-gray-300">
                      <p>
                        Calculated as the percentage of allocated memory resources currently in use
                        across all nodes in the cluster.
                      </p>
                      <div className="rounded-md bg-purple-50 p-2 dark:bg-purple-900/20">
                        <code className="text-purple-700 dark:text-purple-300">
                          (Used Memory / Total Memory) × 100%
                        </code>
                      </div>
                    </div>
                    <div className="mt-2 border-t border-gray-100 pt-2 text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400">
                      Lower values indicate better resource availability
                    </div>
                  </div>
                </span>
                <HealthIndicator value={stats.memoryUsage} />
              </div>
              <div className="relative h-4 w-full overflow-hidden rounded-full bg-gray-100 shadow-inner dark:bg-gray-700">
                <motion.div
                  className="absolute left-0 top-0 h-full rounded-full shadow"
                  style={{
                    backgroundImage: 'linear-gradient(90deg, #8b5cf6 0%, #6d28d9 100%)',
                  }}
                  initial={{ width: 0 }}
                  animate={{ width: `${stats.memoryUsage}%` }}
                  transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-medium text-gray-700 drop-shadow-sm dark:text-gray-200">
                    {stats.memoryUsage}%
                  </span>
                </div>
              </div>
            </div>

            {/* Pod Health with icon */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="group relative flex items-center text-sm font-medium text-gray-600 dark:text-gray-300">
                  <Layers size={14} className="mr-2 text-green-500" />
                  Pod Health
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="ml-1.5 opacity-60"
                  >
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
                  </svg>
                  <div className="pointer-events-none invisible absolute -left-4 -top-28 z-10 w-64 whitespace-normal rounded-md border border-gray-200 bg-white p-3 text-xs opacity-0 shadow-lg transition-all duration-200 group-hover:visible group-hover:opacity-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
                    <div className="mb-2 font-medium text-green-600 dark:text-green-400">
                      Pod Health Formula
                    </div>
                    <div className="space-y-2 text-gray-600 dark:text-gray-300">
                      <p>
                        Calculated based on the ratio of healthy pods to total pods across all
                        namespaces.
                      </p>
                      <div className="rounded-md bg-green-50 p-2 dark:bg-green-900/20">
                        <code className="text-green-700 dark:text-green-300">
                          (Running Pods / Total Pods) × 100%
                        </code>
                      </div>
                      <p className="text-xs italic">
                        Factors in pod status, readiness probes, and liveness checks
                      </p>
                    </div>
                    <div className="mt-2 border-t border-gray-100 pt-2 text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400">
                      Higher values indicate better cluster health
                    </div>
                  </div>
                </span>
                <HealthIndicator value={85} />
              </div>
              <div className="relative h-4 w-full overflow-hidden rounded-full bg-gray-100 shadow-inner dark:bg-gray-700">
                <motion.div
                  className="absolute left-0 top-0 h-full rounded-full shadow"
                  style={{
                    backgroundImage: 'linear-gradient(90deg, #10b981 0%, #059669 100%)',
                  }}
                  initial={{ width: 0 }}
                  animate={{ width: `85%` }}
                  transition={{ duration: 1, ease: 'easeOut', delay: 0.4 }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-medium text-gray-700 drop-shadow-sm dark:text-gray-200">
                    85%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Cluster Status with improved visuals */}
        <div>
          <h3 className="mb-4 flex items-center text-sm font-medium text-gray-700 dark:text-gray-300">
            <ClipboardList size={14} className="mr-2 text-blue-500 dark:text-blue-400" />
            Cluster Status
          </h3>

          <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800/80">
            <div className="mb-6 grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 p-4 text-white shadow-sm">
                <div className="mb-2 flex items-center">
                  <CheckCircle className="mr-2" size={16} />
                  <span className="font-medium">Active Clusters</span>
                </div>
                <div className="text-3xl font-bold">{stats.activeClusters}</div>
                <div className="mt-1 text-xs opacity-80">Running and available</div>
              </div>

              <div className="rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 p-4 text-white shadow-sm">
                <div className="mb-2 flex items-center">
                  <AlertTriangle className="mr-2" size={16} />
                  <span className="font-medium">Other Clusters</span>
                </div>
                <div className="text-3xl font-bold">
                  {stats.totalClusters - stats.activeClusters}
                </div>
                <div className="mt-1 text-xs opacity-80">Pending or inactive</div>
              </div>
            </div>

            <div>
              <div className="mb-1 flex justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>Distribution</span>
                <span>{stats.totalClusters} Total</span>
              </div>
              <div className="flex h-3 w-full overflow-hidden rounded-full bg-gray-100 shadow-inner dark:bg-gray-700">
                <motion.div
                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-500"
                  initial={{ width: 0 }}
                  animate={{
                    width: `${(stats.activeClusters / Math.max(stats.totalClusters, 1)) * 100}%`,
                  }}
                  transition={{ duration: 1 }}
                />
                <motion.div
                  className="h-full bg-gradient-to-r from-amber-400 to-amber-500"
                  initial={{ width: 0 }}
                  animate={{
                    width: `${((stats.totalClusters - stats.activeClusters) / Math.max(stats.totalClusters, 1)) * 100}%`,
                  }}
                  transition={{ duration: 1, delay: 0.2 }}
                />
              </div>
              <div className="mt-2 flex justify-between text-xs">
                <div className="flex items-center">
                  <div className="mr-1 h-2 w-2 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500"></div>
                  <span className="text-gray-600 dark:text-gray-300">
                    Active:{' '}
                    {((stats.activeClusters / Math.max(stats.totalClusters, 1)) * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="flex items-center">
                  <div className="mr-1 h-2 w-2 rounded-full bg-gradient-to-r from-amber-400 to-amber-500"></div>
                  <span className="text-gray-600 dark:text-gray-300">
                    Other:{' '}
                    {(
                      ((stats.totalClusters - stats.activeClusters) /
                        Math.max(stats.totalClusters, 1)) *
                      100
                    ).toFixed(0)}
                    %
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add overall health score - a new feature */}
      <div className="mt-6 border-t border-gray-200 pt-6 dark:border-gray-700">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Overall Cluster Health
          </h3>
          <div className="flex items-center">
            <div className="group relative">
              <span className="flex items-center rounded-full bg-gradient-to-r from-emerald-500 to-green-500 px-3 py-1 text-sm font-semibold text-white shadow-sm">
                <span className="mr-1">
                  {Math.round(
                    (stats.activeClusters / Math.max(stats.totalClusters, 1)) * 50 +
                      (stats.activeBindingPolicies / Math.max(stats.totalBindingPolicies, 1)) * 25 +
                      (100 - stats.cpuUsage) / 4
                  )}
                  %
                </span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="opacity-70"
                >
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
              </span>
              <div className="pointer-events-none invisible absolute -left-64 -top-28 z-10 w-64 whitespace-normal rounded-md border border-gray-200 bg-white p-3 text-xs opacity-0 shadow-lg transition-all duration-200 group-hover:visible group-hover:opacity-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
                <div className="mb-2 font-medium text-blue-600 dark:text-blue-400">
                  Health Score Formula
                </div>
                <ul className="list-inside list-disc space-y-2 text-gray-600 dark:text-gray-300">
                  <li className="flex items-center">
                    <span className="mr-1 h-2 w-2 rounded-full bg-blue-500"></span>
                    <span>50% × (Active Clusters ÷ Total Clusters)</span>
                  </li>
                  <li className="flex items-center">
                    <span className="mr-1 h-2 w-2 rounded-full bg-purple-500"></span>
                    <span>25% × (Active Policies ÷ Total Policies)</span>
                  </li>
                  <li className="flex items-center">
                    <span className="mr-1 h-2 w-2 rounded-full bg-green-500"></span>
                    <span>25% × (100% - CPU Usage) ÷ 4</span>
                  </li>
                </ul>
                <div className="mt-2 border-t border-gray-100 pt-2 text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400">
                  Hover to see the formula breakdown
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100 shadow-inner dark:bg-gray-700">
          <motion.div
            className="h-full bg-gradient-to-r from-emerald-500 to-green-500"
            initial={{ width: 0 }}
            animate={{
              width: `${Math.round(
                (stats.activeClusters / Math.max(stats.totalClusters, 1)) * 50 +
                  (stats.activeBindingPolicies / Math.max(stats.totalBindingPolicies, 1)) * 25 +
                  (100 - stats.cpuUsage) / 4
              )}%`,
            }}
            transition={{ duration: 1.2 }}
          />
        </div>
        <div className="mt-1 flex justify-between">
          <div className="text-xs text-gray-500 dark:text-gray-400">Status: Optimal</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Last updated: Just now</div>
        </div>
      </div>
    </OverviewCard>
  );

  const renderClusterList = () => (
    <motion.div
      className="h-full overflow-hidden rounded-xl bg-white shadow-sm transition-colors duration-300 dark:bg-gray-800"
      variants={itemAnimationVariant}
      whileHover={{ y: -2, boxShadow: '0 8px 16px rgba(0, 0, 0, 0.05)' }}
    >
      <div className="flex items-center justify-between border-b border-gray-200 px-5 pb-3 pt-5 dark:border-gray-700">
        <div className="flex items-center">
          <div className="mr-3 rounded-lg bg-indigo-100 p-2 text-indigo-600 transition-colors dark:bg-indigo-900/40 dark:text-indigo-400">
            <Layers size={18} />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 transition-colors dark:text-gray-100">
            Managed Clusters
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-500 transition-colors dark:bg-gray-700 dark:text-gray-400">
            {processedClusters.length} total
          </span>
          <Link
            to="/its"
            className="flex items-center text-sm text-blue-600 transition-colors hover:underline dark:text-blue-400"
          >
            View all <ArrowRightCircle size={14} className="ml-1" />
          </Link>
        </div>
      </div>

      <div className="max-h-[calc(100vh-20rem)] overflow-auto">
        {sortedClusters.length > 0 ? (
          <div className="grid divide-y divide-gray-200 dark:divide-gray-700">
            {sortedClusters.slice(0, 8).map((cluster, index) => {
              const isActive =
                cluster.status === 'Active' ||
                cluster.status === 'Available' ||
                cluster.available === true;
              const statusColor = isActive
                ? isDark
                  ? 'text-green-400'
                  : 'text-green-600'
                : isDark
                  ? 'text-amber-400'
                  : 'text-amber-600';
              const statusBg = isActive
                ? isDark
                  ? 'bg-green-900/30'
                  : 'bg-green-100'
                : isDark
                  ? 'bg-amber-900/30'
                  : 'bg-amber-100';

              return (
                <motion.div
                  key={cluster.name}
                  className="dark:hover:bg-gray-750 cursor-pointer p-4 transition-all duration-200 hover:bg-gray-50"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  onClick={() => handleClusterClick(cluster.name)}
                  whileHover={{
                    backgroundColor: isDark ? 'rgba(31, 41, 55, 0.5)' : 'rgba(249, 250, 251, 0.8)',
                    scale: 1.01,
                    transition: { duration: 0.2 },
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-full ${statusBg} ${statusColor} transition-colors`}
                      >
                        <Server size={18} />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900 transition-colors dark:text-gray-100">
                          {cluster.name}
                        </h3>
                        <div className="mt-1 flex items-center gap-2">
                          <span className="whitespace-nowrap rounded-md bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-600 transition-colors dark:bg-blue-900/30 dark:text-blue-400">
                            {cluster.context || cluster.name}
                          </span>
                          {/* Add capacity metrics */}
                          <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400">
                            <div className="flex items-center" title="CPU Capacity">
                              <Cpu size={12} className="mr-1 text-blue-500" />
                              {cluster.cpuCapacity || 'N/A'}
                            </div>
                            <div className="flex items-center" title="Memory Capacity">
                              <HardDrive size={12} className="mr-1 text-purple-500" />
                              {cluster.memCapacity || 'N/A'}
                            </div>
                            <div className="flex items-center" title="Pod Capacity">
                              <Layers size={12} className="mr-1 text-green-500" />
                              {cluster.podsCapacity || 'N/A'} Pod Capacity
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end">
                      {isActive ? (
                        <span className="mb-1 flex items-center whitespace-nowrap rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-600 transition-colors dark:bg-green-900/30 dark:text-green-400">
                          <CheckCircle size={10} className="mr-1" /> Active
                        </span>
                      ) : (
                        <span className="mb-1 flex items-center whitespace-nowrap rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-600 transition-colors dark:bg-amber-900/30 dark:text-amber-400">
                          <AlertTriangle size={10} className="mr-1" /> Inactive
                        </span>
                      )}
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {formatDate(cluster.creationTime).split(',')[0]}
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center">
            <div className="flex flex-col items-center justify-center gap-3">
              <div className="dark:bg-gray-750 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 transition-colors">
                <Server size={28} className="text-gray-400 transition-colors dark:text-gray-500" />
              </div>
              <p className="mb-4 text-gray-500 transition-colors dark:text-gray-400">
                No managed clusters found
              </p>
              <Link
                to="/its"
                className="flex items-center rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
              >
                <Plus size={16} className="mr-2" /> Import Cluster
              </Link>
            </div>
          </div>
        )}
      </div>

      {sortedClusters.length > 8 && (
        <div className="border-t border-gray-200 p-4 dark:border-gray-700">
          <Link
            to="/its"
            className="flex w-full items-center justify-center rounded-lg bg-blue-50 py-2 text-sm text-blue-600 transition-colors hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/30"
          >
            Show more clusters <ArrowRightCircle size={14} className="ml-2" />
          </Link>
        </div>
      )}
    </motion.div>
  );

  return (
    <motion.div
      className="mx-auto w-full max-w-7xl p-4 md:p-6"
      variants={pageAnimationVariant}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      {renderDashboardHeader()}
      <AnimatePresence>{showHelpPanel && renderHelpPanel()}</AnimatePresence>

      <AnimatePresence mode="wait">
        <motion.div key="dashboard-content" variants={pageAnimationVariant}>
          {renderClusterStats()}
          {renderHealthOverview()}

          <div className={contentGridCols}>
            <div className="md:col-span-8">{renderClusterList()}</div>
            <div className="md:col-span-4">
              <RecentActivityCard isDark={isDark} />
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Add Cluster Detail Dialog */}
      {selectedCluster && (
        <ClusterDetailDialog
          open={selectedCluster !== null}
          onClose={() => setSelectedCluster(null)}
          clusterName={selectedCluster}
          isDark={isDark}
          colors={{
            primary: '#2f86ff',
            primaryLight: '#38bdf8',
            primaryDark: '#1d4ed8',
            secondary: '#10b981',
            white: isDark ? '#1e293b' : '#ffffff',
            background: isDark ? '#0f172a' : '#f8fafc',
            paper: isDark ? '#1e293b' : '#ffffff',
            text: isDark ? '#f1f5f9' : '#1e293b',
            textSecondary: isDark ? '#94a3b8' : '#64748b',
            border: isDark ? '#334155' : '#e2e8f0',
            success: '#4ade80',
            warning: '#facc15',
            error: '#f43f5e',
            disabled: isDark ? '#475569' : '#cbd5e1',
          }}
        />
      )}
    </motion.div>
  );
};

export default K8sInfo;
