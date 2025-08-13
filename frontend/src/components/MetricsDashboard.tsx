import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { motion, Variants, AnimatePresence } from 'framer-motion';
import {
  Activity,
  BarChart3,
  Database,
  RefreshCcw,
  Server,
  TrendingUp,
  Zap,
  AlertTriangle,
  CheckCircle,
  Info,
  Eye,
  EyeOff,
  Clock,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import {
  useMetricsQueries,
  processMetricValue,
  aggregateMetricsByLabel,
  calculateCacheHitRatio,
} from '../hooks/queries/useMetricsQueries';

// Enhanced animations matching KubeStellar theme
const pageAnimationVariant: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.6, staggerChildren: 0.1 } },
  exit: { opacity: 0, transition: { duration: 0.4 } },
};

const itemAnimationVariant: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.3 } },
};

// Custom Select component matching the design system
const CustomSelect = ({
  options,
  value,
  onChange,
  disabled = false,
}: {
  options: { value: number; label: string }[];
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}) => {
  const [open, setOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Focus management when opening/closing
  useEffect(() => {
    if (open && menuRefs.current[0]) {
      setFocusedIndex(0);
      setTimeout(() => menuRefs.current[0]?.focus(), 0);
    } else if (!open) {
      setFocusedIndex(-1);
      buttonRef.current?.focus();
    }
  }, [open]);

  // Keyboard navigation on trigger button
  const handleButtonKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setOpen(true);
    }
  };

  // Keyboard navigation in menu
  const handleMenuKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex(i => {
        const next = i + 1 < options.length ? i + 1 : 0;
        menuRefs.current[next]?.focus();
        return next;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex(i => {
        const prev = i - 1 >= 0 ? i - 1 : options.length - 1;
        menuRefs.current[prev]?.focus();
        return prev;
      });
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
      buttonRef.current?.focus();
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (focusedIndex >= 0) {
        setOpen(false);
        onChange(options[focusedIndex].value);
      }
    } else if (e.key === 'Tab') {
      setOpen(false);
    }
  };

  const selected = options.find(opt => opt.value === value);

  return (
    <div ref={ref} className="relative">
      <button
        ref={buttonRef}
        type="button"
        className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${
          disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
        } border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700`}
        onClick={() => !disabled && setOpen(v => !v)}
        onKeyDown={handleButtonKeyDown}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span>{selected ? selected.label : value}</span>
        <svg
          className={`ml-2 h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="absolute z-20 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800"
            onKeyDown={handleMenuKeyDown}
            role="listbox"
          >
            <div className="py-1">
              {options.map((option, index) => (
                <button
                  key={option.value}
                  ref={el => (menuRefs.current[index] = el)}
                  role="option"
                  aria-selected={value === option.value}
                  tabIndex={focusedIndex === index ? 0 : -1}
                  className={`flex w-full items-center px-3 py-2 text-left text-sm transition-colors hover:bg-gray-100 focus:bg-gray-100 focus:outline-none dark:hover:bg-gray-700 dark:focus:bg-gray-700 ${
                    value === option.value
                      ? 'bg-gray-100 font-medium text-gray-900 dark:bg-gray-700 dark:text-gray-100'
                      : 'text-gray-700 dark:text-gray-300'
                  }`}
                  onClick={() => {
                    setOpen(false);
                    onChange(option.value);
                  }}
                  onFocus={() => setFocusedIndex(index)}
                  type="button"
                >
                  {option.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
// Metric card component with KubeStellar styling
const MetricCard = ({
  title,
  value,
  unit = '',
  icon: Icon,
  color,
  trend,
  isLoading = false,
  description,
  onClick,
}: {
  title: string;
  value: number | string;
  unit?: string;
  icon: React.ElementType;
  color: string;
  trend?: number;
  isLoading?: boolean;
  description?: string;
  onClick?: () => void;
}) => {
  const getGradient = () => {
    if (color.includes('blue')) {
      return 'bg-gradient-to-br from-blue-500/10 to-indigo-600/5 dark:from-blue-900/20 dark:to-indigo-900/10';
    } else if (color.includes('green')) {
      return 'bg-gradient-to-br from-emerald-500/10 to-green-600/5 dark:from-emerald-900/20 dark:to-green-900/10';
    } else if (color.includes('purple')) {
      return 'bg-gradient-to-br from-violet-500/10 to-purple-600/5 dark:from-violet-900/20 dark:to-purple-900/10';
    } else if (color.includes('amber')) {
      return 'bg-gradient-to-br from-amber-500/10 to-orange-600/5 dark:from-amber-900/20 dark:to-orange-900/10';
    } else {
      return 'bg-gradient-to-br from-gray-500/5 to-gray-600/5 dark:from-gray-800/20 dark:to-gray-900/10';
    }
  };

  const getIconGradient = () => {
    if (color.includes('blue')) {
      return 'bg-gradient-to-br from-blue-500 to-indigo-600 dark:from-blue-400 dark:to-indigo-500';
    } else if (color.includes('green')) {
      return 'bg-gradient-to-br from-emerald-500 to-green-600 dark:from-emerald-400 dark:to-green-500';
    } else if (color.includes('purple')) {
      return 'bg-gradient-to-br from-violet-500 to-purple-600 dark:from-violet-400 dark:to-purple-500';
    } else if (color.includes('amber')) {
      return 'bg-gradient-to-br from-amber-500 to-orange-600 dark:from-amber-400 dark:to-orange-500';
    } else {
      return 'bg-gradient-to-br from-gray-500 to-gray-600 dark:from-gray-400 dark:to-gray-500';
    }
  };

  return (
    <motion.div
      className={`relative overflow-hidden rounded-xl border border-gray-100 p-6 shadow-sm transition-all duration-300 dark:border-gray-700 ${getGradient()} ${
        onClick ? 'cursor-pointer' : 'cursor-default'
      }`}
      whileHover={{
        y: onClick ? -4 : -2,
        boxShadow: '0 12px 24px rgba(0, 0, 0, 0.12)',
        transition: { duration: 0.3, ease: [0.23, 1, 0.32, 1] },
      }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      variants={itemAnimationVariant}
      onClick={onClick}
    >
      {/* Decorative background elements */}
      <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-gradient-to-br from-white/5 to-white/10 dark:from-gray-700/10 dark:to-gray-700/20"></div>
      <div className="absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-gradient-to-tl from-white/5 to-white/0 dark:from-gray-700/5 dark:to-transparent"></div>

      <div className="relative z-10">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center">
            <div className={`rounded-xl p-2.5 ${getIconGradient()} mr-3 text-white shadow-lg`}>
              <Icon size={18} />
            </div>
            <div>
              <span className="text-sm font-medium text-gray-700 transition-colors dark:text-gray-300">
                {title}
              </span>
              {description && (
                <div className="group relative">
                  <Info size={12} className="ml-1 inline cursor-help opacity-60" />
                  <div className="pointer-events-none invisible absolute -left-4 -top-10 z-20 w-48 whitespace-normal rounded-md border border-gray-200 bg-white p-2 text-xs opacity-0 shadow-lg transition-all duration-200 group-hover:visible group-hover:opacity-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
                    {description}
                  </div>
                </div>
              )}
            </div>
          </div>
          {trend !== undefined && (
            <div
              className={`flex items-center text-sm ${
                trend > 0
                  ? 'text-green-600 dark:text-green-400'
                  : trend < 0
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              <TrendingUp size={14} className={`mr-1 ${trend < 0 ? 'rotate-180' : ''}`} />
              {Math.abs(trend).toFixed(1)}%
            </div>
          )}
        </div>

        <div className="flex items-end justify-between">
          <div>
            {isLoading ? (
              <div className="h-8 w-16 animate-pulse rounded bg-gray-200 dark:bg-gray-700"></div>
            ) : (
              <div className="flex items-baseline">
                <h3 className="text-3xl font-bold text-gray-900 transition-colors dark:text-gray-50">
                  {typeof value === 'number' ? value.toLocaleString() : value}
                </h3>
                {unit && (
                  <span className="ml-1 text-sm text-gray-500 dark:text-gray-400">{unit}</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// Chart component for visualizing metrics
const MetricsChart = ({
  title,
  data,
  color = 'blue',
}: {
  title: string;
  data: Array<{ label: string; value: number }>;
  color?: string;
}) => {
  const maxValue = Math.max(...data.map(d => d.value));

  return (
    <motion.div
      className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800"
      variants={itemAnimationVariant}
    >
      <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
      <div className="space-y-3">
        {data.map((item, index) => (
          <div key={item.label} className="flex items-center">
            <div className="w-20 text-sm text-gray-600 dark:text-gray-400">{item.label}</div>
            <div className="mx-3 flex-1">
              <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700">
                <motion.div
                  className={`h-full rounded-full bg-gradient-to-r ${
                    color === 'blue'
                      ? 'from-blue-500 to-indigo-600'
                      : color === 'green'
                        ? 'from-emerald-500 to-green-600'
                        : color === 'purple'
                          ? 'from-violet-500 to-purple-600'
                          : 'from-amber-500 to-orange-600'
                  }`}
                  initial={{ width: 0 }}
                  animate={{ width: `${(item.value / maxValue) * 100}%` }}
                  transition={{ duration: 1, delay: index * 0.1 }}
                />
              </div>
            </div>
            <div className="w-16 text-right text-sm font-medium text-gray-900 dark:text-gray-100">
              {item.value.toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

// Main MetricsDashboard component
const MetricsDashboard = () => {
  const { useCacheMetrics, useClusterMetrics, useRuntimeMetrics, useMetricsSummary } =
    useMetricsQueries();

  // State for dashboard controls
  const [autoRefresh, setAutoRefresh] = useState(() => {
    try {
      const saved = localStorage.getItem('metrics-auto-refresh');
      if (typeof saved === 'string') {
        const parsed = JSON.parse(saved);
        return typeof parsed === 'boolean' ? parsed : true;
      }
    } catch {
      // ignore
    }
    return true;
  });
  const [refreshInterval, setRefreshInterval] = useState(() => {
    const saved = localStorage.getItem('metrics-refresh-interval');
    const parsed = parseInt(saved ?? '', 10);
    return !isNaN(parsed) && parsed > 0 ? parsed : 30;
  });
  const [visibleSections] = useState({
    cache: true,
    cluster: true,
    runtime: true,
    charts: true,
  });

  // Fetch metrics data
  const {
    data: cacheMetrics,
    isLoading: cacheLoading,
    error: cacheError,
    refetch: refetchCache,
  } = useCacheMetrics({ enabled: visibleSections.cache });

  const {
    data: clusterMetrics,
    isLoading: clusterLoading,
    error: clusterError,
    refetch: refetchCluster,
  } = useClusterMetrics({ enabled: visibleSections.cluster });

  const {
    data: runtimeMetrics,
    isLoading: runtimeLoading,
    error: runtimeError,
    refetch: refetchRuntime,
  } = useRuntimeMetrics({ enabled: visibleSections.runtime });

  const { refetch: refetchSummary } = useMetricsSummary();

  // Processed metrics data
  const processedData = useMemo(() => {
    const cacheHitRatio = cacheMetrics
      ? calculateCacheHitRatio(cacheMetrics.hits, cacheMetrics.misses)
      : 0;

    const totalCacheOperations = cacheMetrics
      ? cacheMetrics.hits.reduce((sum, m) => sum + processMetricValue(m), 0) +
        cacheMetrics.misses.reduce((sum, m) => sum + processMetricValue(m), 0)
      : 0;

    const goroutineCount = runtimeMetrics?.goroutines[0]
      ? processMetricValue(runtimeMetrics.goroutines[0])
      : 0;

    const totalKubectlOps = clusterMetrics?.kubectlOperations
      ? clusterMetrics.kubectlOperations.reduce((sum, m) => sum + processMetricValue(m), 0)
      : 0;

    const avgOnboardingTime =
      Array.isArray(clusterMetrics?.onboardingDuration) &&
      clusterMetrics.onboardingDuration.length > 0
        ? clusterMetrics.onboardingDuration.reduce((sum, m) => sum + processMetricValue(m), 0) /
          clusterMetrics.onboardingDuration.length
        : 0;

    return {
      cacheHitRatio,
      totalCacheOperations,
      goroutineCount,
      totalKubectlOps,
      avgOnboardingTime,
    };
  }, [cacheMetrics, runtimeMetrics, clusterMetrics]);

  // Chart data
  const chartData = useMemo(() => {
    const cacheData = cacheMetrics
      ? [
          {
            label: 'Hits',
            value: cacheMetrics.hits.reduce((sum, m) => sum + processMetricValue(m), 0),
          },
          {
            label: 'Misses',
            value: cacheMetrics.misses.reduce((sum, m) => sum + processMetricValue(m), 0),
          },
        ]
      : [];

    const kubectlOpsData = clusterMetrics?.kubectlOperations
      ? Object.entries(aggregateMetricsByLabel(clusterMetrics.kubectlOperations, 'command')).map(
          ([label, value]) => ({ label, value })
        )
      : [];

    return { cacheData, kubectlOpsData };
  }, [cacheMetrics, clusterMetrics]);

  // Manual refresh function
  const handleRefresh = useCallback(async () => {
    try {
      await Promise.all([
        visibleSections.cache ? refetchCache() : Promise.resolve(),
        visibleSections.cluster ? refetchCluster() : Promise.resolve(),
        visibleSections.runtime ? refetchRuntime() : Promise.resolve(),
        refetchSummary(),
      ]);
      toast.success('Metrics refreshed successfully!');
    } catch (error) {
      toast.error('Failed to refresh metrics');
      console.error('Refresh error:', error);
    }
  }, [
    visibleSections.cache,
    visibleSections.cluster,
    visibleSections.runtime,
    refetchCache,
    refetchCluster,
    refetchRuntime,
    refetchSummary,
  ]);

  // Save auto-refresh preference to localStorage
  useEffect(() => {
    localStorage.setItem('metrics-auto-refresh', JSON.stringify(autoRefresh));
  }, [autoRefresh]);

  // Save refresh interval preference to localStorage
  useEffect(() => {
    localStorage.setItem('metrics-refresh-interval', refreshInterval.toString());
  }, [refreshInterval]);

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      handleRefresh();
    }, refreshInterval * 1000);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, handleRefresh]);

  // Error handling - show partial data if some metrics fail
  const hasErrors = cacheError || clusterError || runtimeError;
  const hasData =
    processedData.cacheHitRatio > 0 ||
    processedData.goroutineCount > 0 ||
    processedData.totalKubectlOps > 0;

  if (hasErrors && !hasData) {
    return (
      <div className="mx-auto w-full max-w-7xl p-4 md:p-6">
        <div className="rounded-xl border border-red-200 bg-white p-6 text-red-600 shadow-sm dark:border-red-900/30 dark:bg-gray-800 dark:text-red-400">
          <div className="mb-4 flex items-center">
            <AlertTriangle size={24} className="mr-3 text-red-500" />
            <h3 className="text-lg font-semibold">Error Loading Metrics</h3>
          </div>
          <p className="mb-6 text-gray-600 dark:text-gray-300">
            Failed to load metrics data from Prometheus. Please check your connection and try again.
          </p>
          <button
            className="flex items-center rounded-lg bg-red-600 px-4 py-2 text-white transition-colors hover:bg-red-700"
            onClick={handleRefresh}
          >
            <RefreshCcw size={16} className="mr-2" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="mx-auto w-full p-4 md:p-6"
      variants={pageAnimationVariant}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      {/* Dashboard Header */}
      <motion.div className="mb-8" variants={itemAnimationVariant}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="mb-2 text-3xl font-bold text-blue-600 dark:text-blue-400">
              Metrics Dashboard
            </h1>
            <p className="text-base text-gray-600 dark:text-gray-400">
              Monitor KubeStellar performance and system metrics from Prometheus
            </p>
          </div>

          {/* Dashboard Controls */}
          <div className="mt-4 flex items-center space-x-3 md:mt-0">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                  autoRefresh
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                }`}
              >
                {autoRefresh ? <Eye size={14} /> : <EyeOff size={14} />}
                Auto-refresh
              </button>

              <CustomSelect
                options={[
                  { value: 10, label: '10s' },
                  { value: 30, label: '30s' },
                  { value: 60, label: '1m' },
                  { value: 300, label: '5m' },
                ]}
                value={refreshInterval}
                onChange={setRefreshInterval}
                disabled={!autoRefresh}
              />
            </div>

            <button
              className="dark:hover:bg-gray-750 flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
              onClick={handleRefresh}
            >
              <RefreshCcw size={16} />
              Refresh
            </button>
          </div>
        </div>
      </motion.div>

      {/* Metrics Overview Cards */}
      <motion.div
        className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4"
        variants={itemAnimationVariant}
      >
        <MetricCard
          title="Cache Hit Ratio"
          value={processedData.cacheHitRatio.toFixed(1)}
          unit="%"
          icon={Database}
          color="bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
          isLoading={cacheLoading}
          description="Percentage of successful cache hits vs total cache operations"
        />

        <MetricCard
          title="Active Goroutines"
          value={processedData.goroutineCount}
          icon={Zap}
          color="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
          isLoading={runtimeLoading}
          description="Number of currently running Go goroutines"
        />

        <MetricCard
          title="Kubectl Operations"
          value={processedData.totalKubectlOps}
          icon={Server}
          color="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
          isLoading={clusterLoading}
          description="Total number of kubectl operations executed"
        />

        <MetricCard
          title="Avg Onboarding Time"
          value={processedData.avgOnboardingTime.toFixed(1)}
          unit="s"
          icon={Clock}
          color="bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400"
          isLoading={clusterLoading}
          description="Average time for cluster onboarding process"
        />
      </motion.div>

      {/* Detailed Metrics Sections */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Cache Metrics Chart */}
        {visibleSections.charts && chartData.cacheData.length > 0 && (
          <MetricsChart title="Cache Performance" data={chartData.cacheData} color="green" />
        )}

        {/* Kubectl Operations Chart */}
        {visibleSections.charts && chartData.kubectlOpsData.length > 0 && (
          <MetricsChart
            title="Kubectl Operations by Command"
            data={chartData.kubectlOpsData}
            color="amber"
          />
        )}
      </div>

      {/* System Status */}
      <motion.div
        className="mt-8 rounded-xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800"
        variants={itemAnimationVariant}
      >
        <div className="mb-4 flex items-center">
          <CheckCircle size={20} className="mr-2 text-green-500" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">System Status</h3>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-lg bg-green-50 p-4 dark:bg-green-900/20">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Cache Health</span>
              <CheckCircle size={16} className="text-green-500" />
            </div>
            <div className="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100">
              {processedData.cacheHitRatio > 80
                ? 'Excellent'
                : processedData.cacheHitRatio > 60
                  ? 'Good'
                  : 'Needs Attention'}
            </div>
          </div>

          <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Runtime Health</span>
              <Activity size={16} className="text-blue-500" />
            </div>
            <div className="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100">
              {processedData.goroutineCount < 1000 ? 'Optimal' : 'High Load'}
            </div>
          </div>

          <div className="rounded-lg bg-purple-50 p-4 dark:bg-purple-900/20">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Cluster Ops</span>
              <BarChart3 size={16} className="text-purple-500" />
            </div>
            <div className="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100">
              {processedData.totalKubectlOps > 0 ? 'Active' : 'Idle'}
            </div>
          </div>
        </div>

        <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
          Last updated: {new Date().toLocaleString()}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default MetricsDashboard;
