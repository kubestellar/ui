import {
  useSystemMetrics,
  useDeploymentsMetrics,
  useHealthMetrics,
  useRedisMetrics,
  useKubernetesMetrics,
  usePodHealthMetrics,
  usePrometheusMetric,
} from '../hooks/queries/useMetricsQueries';
import { useBPQueries } from '../hooks/queries/useBPQueries';
import { motion } from 'framer-motion';
import { Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Tooltip as ReactTooltip } from 'react-tooltip';
import {
  CheckCircle,
  AlertTriangle,
  Server,
  Database,
  BarChart3,
  Activity,
  TrendingUp,
} from 'lucide-react';

const useHistogramMetric = (baseName: string) => {
  const bucket = usePrometheusMetric(`${baseName}_bucket`);
  const sum = usePrometheusMetric(`${baseName}_sum`);
  const count = usePrometheusMetric(`${baseName}_count`);
  if (bucket.data || sum.data || count.data) {
    return {
      bucket: bucket.data,
      sum: sum.data,
      count: count.data,
      isLoading: bucket.isLoading || sum.isLoading || count.isLoading,
      isError: bucket.isError && sum.isError && count.isError,
    };
  }
  return { bucket: undefined, sum: undefined, count: undefined, isLoading: false, isError: true };
};

const useCounterMetric = (name: string) => {
  const { data, isLoading } = usePrometheusMetric(name);
  if (data && !data.error) return { data, isLoading, isError: false };
  return { data: undefined, isLoading, isError: true };
};

// Helper to map technical labels to user-friendly names
const friendlyOp = (op: string) => {
  switch (op) {
    case 'cache_refresh':
      return 'Cache Refresh';
    case 'cache_hit':
      return 'Get (Cache Hit)';
    case 'cache_miss':
      return 'Get (Cache Miss)';
    case 'get':
      return 'Get';
    case 'create':
      return 'Create';
    case 'delete':
      return 'Delete';
    case 'update':
      return 'Update';
    // Add more as needed
    default:
      return op.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }
};
const friendlyStatus = (status: string) => {
  switch (status) {
    case 'success':
      return 'Success';
    case 'failed':
      return 'Failed';
    default:
      return status.charAt(0).toUpperCase() + status.slice(1);
  }
};

const formatUptime = (uptime: string | undefined) => {
  if (!uptime) return '-';
  const regex = /(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)(?:\.\d+)?s)?/;
  const match = uptime.match(regex);
  if (!match) return uptime;
  const [, h, m, s] = match;
  const parts = [];
  if (h && parseInt(h) > 0) parts.push(`${h}h`);
  if (m && parseInt(m) > 0) parts.push(`${m}m`);
  if (s && parseInt(s) > 0) parts.push(`${s}s`);
  if (parts.length === 0) return '0s';
  return parts.join(' ');
};

// Helper for fallback display with tooltip
const Fallback = ({
  value,
  fallback = '0',
  isFallback = false,
  children,
}: {
  value: unknown;
  fallback?: unknown;
  isFallback?: boolean;
  children?: React.ReactNode;
}) => {
  if (!isFallback) return <>{children ?? (value as React.ReactNode)}</>;
  return (
    <span
      data-tooltip-id="fallback-tooltip"
      data-tooltip-content="This is fallback data. API is not working."
    >
      {children ?? (fallback as React.ReactNode)}
      <ReactTooltip id="fallback-tooltip" place="top" />
    </span>
  );
};

// Define a type for operation counter data
interface OperationCounterRow {
  labels: { operation: string; status: string };
  value: number;
}

const MetricsDashboard = () => {
  const { data: system, isLoading: loadingSystem } = useSystemMetrics();
  const { data: deployments, isLoading: loadingDeployments } = useDeploymentsMetrics();
  const { data: health, isLoading: loadingHealth } = useHealthMetrics();
  const { data: redis } = useRedisMetrics();
  const { data: k8s } = useKubernetesMetrics();
  const { data: podHealth } = usePodHealthMetrics();
  const { useBindingPolicies } = useBPQueries();
  const { data: bindingPolicies, isLoading: bpLoading } = useBindingPolicies();

  // Histogram example: Binding Policy Reconciliation Duration
  const reconciliationHistogram = useHistogramMetric(
    'kubestellar_binding_policy_reconciliation_duration_seconds'
  );
  // Counter example: Binding Policy Operations Total
  const operationsCounter = useCounterMetric('kubestellar_binding_policy_operations_total');

  // List of available telemetry metrics
  const availableTelemetry = [];
  if (
    reconciliationHistogram.bucket ||
    reconciliationHistogram.sum ||
    reconciliationHistogram.count
  ) {
    availableTelemetry.push({
      label: 'Binding Policy Reconciliation Duration (Histogram)',
      type: 'histogram',
      data: reconciliationHistogram,
    });
  }
  if (operationsCounter.data) {
    availableTelemetry.push({
      label: 'Binding Policy Operations Total',
      type: 'counter',
      data: operationsCounter.data,
    });
  }

  // Memoize status for display
  let systemStatus = 'Unknown';
  if (system) {
    if (system.components && Object.values(system.components).some(c => c.status !== 'healthy')) {
      systemStatus = 'Degraded';
    } else {
      systemStatus = 'Healthy';
    }
  }

  if (loadingSystem && loadingDeployments && loadingHealth) {
    return <div className="p-8 text-center">Loading metrics...</div>;
  }

  // Error state
  if (!system && !deployments && !health) {
    return (
      <div className="mx-auto w-full max-w-2xl p-4">
        <div className="rounded-xl border border-red-200 bg-white p-6 text-red-600 shadow-sm dark:border-red-900/30 dark:bg-gray-800 dark:text-red-400">
          <div className="mb-4 flex items-center">
            <AlertTriangle size={24} className="mr-3 text-red-500" />
            <h3 className="text-lg font-semibold">Error Loading Metrics</h3>
          </div>
          <p className="mb-6 text-gray-600 dark:text-gray-300">
            Failed to load metrics data from backend. Please check your connection and try again.
          </p>
        </div>
      </div>
    );
  }

  // Fallback checks
  const isSystemFallback = !system;
  const isDeploymentsFallback = !deployments;
  const isHealthFallback = !health;
  const isRedisFallback = !redis;
  const isK8sFallback = !k8s;
  const isPodHealthFallback = !podHealth;
  const isBindingPoliciesFallback = !bindingPolicies || bindingPolicies.length === 0;

  return (
    <motion.div
      className="mx-auto w-full p-4 md:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold text-blue-600 dark:text-blue-400">
          Metrics Dashboard
        </h1>
        <p className="text-base text-gray-600 dark:text-gray-400">
          Monitor KubeStellar system and component metrics
        </p>
      </div>

      {/* System Overview */}
      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-100 bg-gradient-to-br from-blue-100 to-indigo-50 p-6 shadow-sm dark:border-gray-700 dark:from-blue-900/20 dark:to-indigo-900/10">
          <div className="mb-2 flex items-center">
            <Server className="mr-2 text-blue-500" /> System Status
          </div>
          <div className="text-2xl font-bold">
            <Fallback value={systemStatus} fallback="-" isFallback={isSystemFallback} />
          </div>
          <div className="mt-2 text-xs text-gray-500">Uptime: {formatUptime(system?.uptime)}</div>
        </div>
        <div className="rounded-xl border border-gray-100 bg-gradient-to-br from-green-100 to-emerald-50 p-6 shadow-sm dark:border-gray-700 dark:from-green-900/20 dark:to-emerald-900/10">
          <div className="mb-2 flex items-center">
            <Database className="mr-2 text-green-500" /> Redis
          </div>
          <div className="text-2xl font-bold">
            <Fallback
              value={redis?.status.status}
              fallback="Unknown"
              isFallback={isRedisFallback}
            />
          </div>
        </div>
        <div className="rounded-xl border border-gray-100 bg-gradient-to-br from-purple-100 to-violet-50 p-6 shadow-sm dark:border-gray-700 dark:from-purple-900/20 dark:to-violet-900/10">
          <div className="mb-2 flex items-center">
            <BarChart3 className="mr-2 text-purple-500" /> Deployments
          </div>
          <div className="text-2xl font-bold">
            <Fallback
              value={deployments?.stats.total}
              fallback="0"
              isFallback={isDeploymentsFallback}
            />
          </div>
        </div>
        {/* Placeholder card for layout balance */}
        <div className="flex items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gradient-to-br from-gray-50 to-gray-100 p-6 shadow-none dark:from-gray-900/10 dark:to-gray-800/10">
          <span className="text-sm text-gray-400">More metrics coming soon</span>
        </div>
      </div>

      {/* Telemetry Metrics Section */}
      <motion.div
        className="mb-8 rounded-xl border border-gray-200 bg-white p-6 shadow-lg dark:border-gray-700 dark:bg-gray-800"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, type: 'spring' }}
      >
        <h2 className="mb-6 flex items-center text-2xl font-bold text-blue-700 dark:text-blue-300">
          <BarChart3 className="mr-2 text-blue-500" />
          Telemetry Metrics
        </h2>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          {/* Histogram */}
          {reconciliationHistogram.sum && reconciliationHistogram.count && (
            <motion.div
              className="rounded-xl bg-gradient-to-br from-indigo-50 to-blue-100 p-5 shadow-md dark:from-indigo-900/20 dark:to-blue-900/10"
              initial={{ opacity: 0, x: -40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
            >
              <div className="mb-3 flex items-center">
                <TrendingUp className="mr-2 text-indigo-500" />
                <span className="text-lg font-semibold">
                  Binding Policy Reconciliation Duration
                </span>
              </div>
              {/* Table for Sum and Count per Policy */}
              <table className="min-w-full overflow-hidden rounded-lg border border-gray-200 text-xs shadow-sm dark:border-gray-700">
                <thead className="bg-indigo-100 dark:bg-indigo-900/30">
                  <tr>
                    <th className="px-3 py-2 text-left">Policy</th>
                    <th className="px-3 py-2 text-left">Seconds to Take Effect</th>
                  </tr>
                </thead>
                <tbody>
                  {bpLoading ? (
                    <tr>
                      <td colSpan={2} className="px-3 py-2 text-center">
                        Loading...
                      </td>
                    </tr>
                  ) : !isBindingPoliciesFallback ? (
                    bindingPolicies.map(bp => (
                      <tr key={bp.name} className="hover:bg-indigo-50 dark:hover:bg-indigo-900/10">
                        <td className="px-3 py-2 font-medium">
                          <Fallback value={bp.name} isFallback={false} />
                        </td>
                        <td className="px-3 py-2 font-mono text-indigo-700 dark:text-indigo-300">
                          <Fallback
                            value={reconciliationHistogram.count?.value}
                            fallback="0"
                            isFallback={!reconciliationHistogram.count?.value}
                          />
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="px-3 py-2 font-medium">
                        <Fallback value="All Policies" isFallback={true} />
                      </td>
                      <td className="px-3 py-2 font-mono text-indigo-700 dark:text-indigo-300">
                        <Fallback
                          value={reconciliationHistogram.count?.value}
                          fallback="0"
                          isFallback={true}
                        />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </motion.div>
          )}

          {/* Counter as Donut Chart */}
          {operationsCounter.data && Array.isArray(operationsCounter.data) && (
            <motion.div
              className="rounded-xl bg-gradient-to-br from-green-50 to-emerald-100 p-5 shadow-md dark:from-green-900/20 dark:to-emerald-900/10"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
            >
              <div className="mb-3 flex items-center">
                <BarChart3 className="mr-2 text-green-500" />
                <span className="text-lg font-semibold">Binding Policy Operations Total</span>
              </div>
              {/* PieChart for counter with improved text appearance */}
              <div className="mx-auto mb-4 flex h-40 w-full max-w-sm items-center justify-center md:max-w-md lg:max-w-lg">
                <ResponsiveContainer width="100%" minWidth={260} height="100%">
                  <PieChart margin={{ left: 0, right: 0, top: 0, bottom: 0 }}>
                    <Pie
                      data={operationsCounter.data.map((row: OperationCounterRow) => ({
                        name: `${friendlyOp(row.labels.operation)} (${friendlyStatus(row.labels.status)})`,
                        value: row.value,
                      }))}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={30}
                      outerRadius={60}
                      fill="#10b981"
                    >
                      {operationsCounter.data.map((_: OperationCounterRow, i: number) => (
                        <Cell key={i} fill={['#10b981', '#34d399', '#6ee7b7', '#a7f3d0'][i % 4]} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const d = payload[0].payload;
                          return (
                            <div className="max-w-xs break-words rounded bg-white p-2 text-xs shadow dark:bg-gray-900">
                              <div className="font-semibold" style={{ wordBreak: 'break-all' }}>
                                {d.name}
                              </div>
                              <div>
                                <b>Value:</b> {d.value}
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend
                      wrapperStyle={{
                        maxWidth: '100%',
                        minWidth: '120px',
                        whiteSpace: 'normal',
                        overflowX: 'auto',
                        fontSize: 13,
                        marginTop: 8,
                        display: 'block',
                        lineHeight: 1.5,
                      }}
                      formatter={(value: string) => (
                        <span
                          className="inline-block cursor-pointer align-bottom font-medium text-gray-700 dark:text-gray-200"
                          title={value}
                        >
                          {value}
                        </span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              {/* Table fallback for details */}
              <table className="mt-2 min-w-full overflow-hidden rounded-lg border border-gray-200 text-xs shadow-sm dark:border-gray-700">
                <thead className="bg-green-100 dark:bg-green-900/30">
                  <tr>
                    <th className="px-3 py-2 text-left">Operation</th>
                    <th className="px-3 py-2 text-left">Status</th>
                    <th className="px-3 py-2 text-left">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {operationsCounter.data.map((row: OperationCounterRow, i: number) => (
                    <tr key={i} className="hover:bg-green-50 dark:hover:bg-green-900/10">
                      <td className="px-3 py-2">{friendlyOp(row.labels.operation)}</td>
                      <td className="px-3 py-2">{friendlyStatus(row.labels.status)}</td>
                      <td className="px-3 py-2 font-mono text-green-700 dark:text-green-300">
                        {row.value}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </motion.div>
          )}

          {/* Active Goroutines */}
          <div className="flex flex-col items-center justify-center rounded-xl bg-gradient-to-br from-amber-50 to-orange-100 p-5 shadow-md dark:from-amber-900/20 dark:to-orange-900/10">
            <div className="mb-2 flex items-center">
              <Activity className="mr-2 text-amber-500" />
              <span className="text-lg font-semibold">Active Goroutines</span>
            </div>
            <div className="font-mono text-5xl text-amber-600 dark:text-amber-300">
              {system?.runtime.goroutines ?? '-'}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Detailed Sections */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Health Section */}
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-2 flex items-center">
            <CheckCircle className="mr-2 text-green-500" /> Health
          </div>
          <div className="mb-2 text-lg font-semibold">
            <Fallback value={health?.overall_status} fallback="-" isFallback={isHealthFallback} />
          </div>
          <div className="text-xs text-gray-500">
            Healthy components:{' '}
            <Fallback
              value={health?.summary.healthy_components}
              fallback="-"
              isFallback={!health?.summary.healthy_components}
            />{' '}
            /{' '}
            <Fallback
              value={health?.summary.total_components}
              fallback="-"
              isFallback={!health?.summary.total_components}
            />
          </div>
        </div>
        {/* Pod Health Section */}
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-2 flex items-center">
            <Activity className="mr-2 text-blue-500" /> Pod Health
          </div>
          <div className="mb-2 text-lg font-semibold">
            <Fallback
              value={podHealth ? `${podHealth.healthPercent}%` : '-'}
              isFallback={isPodHealthFallback}
            />
          </div>
          <div className="text-xs text-gray-500">
            Healthy pods:{' '}
            <Fallback
              value={podHealth?.healthyPods}
              fallback="-"
              isFallback={!podHealth?.healthyPods}
            />{' '}
            /{' '}
            <Fallback
              value={podHealth?.totalPods}
              fallback="-"
              isFallback={!podHealth?.totalPods}
            />
          </div>
        </div>
        {/* Kubernetes Section */}
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-2 flex items-center">
            <Server className="mr-2 text-blue-500" /> Kubernetes
          </div>
          <div className="mb-2 text-lg font-semibold">
            <Fallback value={k8s?.status.status} fallback="-" isFallback={isK8sFallback} />
          </div>
          <div className="text-xs text-gray-500">
            ConfigMaps:{' '}
            <Fallback
              value={
                k8s?.config_maps
                  ? Object.entries(k8s.config_maps)
                      .map(([k, v]) => `${k}: ${v}`)
                      .join(', ')
                  : '-'
              }
              isFallback={!k8s?.config_maps}
            />
          </div>
        </div>
      </div>

      <div className="mt-8 text-xs text-gray-500 dark:text-gray-400">
        Last updated:{' '}
        <Fallback
          value={system?.timestamp ? new Date(system.timestamp).toLocaleString() : '-'}
          isFallback={!system?.timestamp}
        />
      </div>
    </motion.div>
  );
};

export default MetricsDashboard;
