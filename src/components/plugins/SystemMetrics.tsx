import React from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  Clock,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Server,
  Database,
  Cpu,
} from 'lucide-react';
import { useSystemMetrics, useHealthSummary, useCacheInfo } from '../../hooks/usePlugins';
import LoadingFallback from '../LoadingFallback';

const SystemMetrics: React.FC = () => {
  const { data: metrics, isLoading: metricsLoading } = useSystemMetrics();
  const { data: healthSummary, isLoading: healthLoading } = useHealthSummary();
  const { data: cacheInfo, isLoading: cacheLoading } = useCacheInfo();

  if (metricsLoading || healthLoading || cacheLoading) {
    return <LoadingFallback message="Loading system metrics..." size="medium" />;
  }

  const healthyPlugins = healthSummary?.plugins.filter(p => p.health === 'healthy').length || 0;
  const unhealthyPlugins = healthSummary?.plugins.filter(p => p.health === 'unhealthy').length || 0;
  const totalPlugins = healthSummary?.plugins.length || 0;

  const healthPercentage = totalPlugins > 0 ? (healthyPlugins / totalPlugins) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4"
      >
        <div className="stat rounded-lg border border-base-300 bg-base-100 shadow-lg">
          <div className="stat-figure text-primary">
            <Server className="h-8 w-8" />
          </div>
          <div className="stat-title">Total Plugins</div>
          <div className="stat-value text-primary">{metrics?.total_plugins || 0}</div>
          <div className="stat-desc">
            {metrics?.active_plugins || 0} active, {metrics?.failed_plugins || 0} failed
          </div>
        </div>

        <div className="stat rounded-lg border border-base-300 bg-base-100 shadow-lg">
          <div className="stat-figure text-success">
            <Activity className="h-8 w-8" />
          </div>
          <div className="stat-title">System Health</div>
          <div className="stat-value text-success">{healthPercentage.toFixed(0)}%</div>
          <div className="stat-desc">
            {healthyPlugins} healthy, {unhealthyPlugins} unhealthy
          </div>
        </div>

        <div className="stat rounded-lg border border-base-300 bg-base-100 shadow-lg">
          <div className="stat-figure text-info">
            <TrendingUp className="h-8 w-8" />
          </div>
          <div className="stat-title">Total Requests</div>
          <div className="stat-value text-info">
            {metrics?.total_requests?.toLocaleString() || 0}
          </div>
          <div className="stat-desc">{metrics?.avg_response_time || 0}ms avg response</div>
        </div>

        <div className="stat rounded-lg border border-base-300 bg-base-100 shadow-lg">
          <div className="stat-figure text-warning">
            <Clock className="h-8 w-8" />
          </div>
          <div className="stat-title">System Uptime</div>
          <div className="stat-value text-warning">{metrics?.uptime || '0h'}</div>
          <div className="stat-desc">Memory: {metrics?.memory_usage || '0MB'}</div>
        </div>
      </motion.div>

      {/* Health Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card border border-base-300 bg-base-100 shadow-lg"
      >
        <div className="card-body">
          <h2 className="card-title flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Plugin Health Status
          </h2>

          {healthSummary?.plugins.length === 0 ? (
            <div className="py-8 text-center text-base-content/50">No plugins to monitor</div>
          ) : (
            <div className="space-y-4">
              {/* Health Progress */}
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="mb-1 flex justify-between text-sm">
                    <span>Overall Health</span>
                    <span>{healthPercentage.toFixed(1)}%</span>
                  </div>
                  <progress
                    className="progress progress-success w-full"
                    value={healthPercentage}
                    max="100"
                  ></progress>
                </div>
              </div>

              {/* Plugin Health List */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {healthSummary?.plugins.map(plugin => (
                  <div
                    key={plugin.id}
                    className="flex items-center justify-between rounded-lg bg-base-200 p-3"
                  >
                    <div className="flex items-center gap-2">
                      {plugin.health === 'healthy' ? (
                        <CheckCircle className="h-4 w-4 text-success" />
                      ) : plugin.health === 'unhealthy' ? (
                        <AlertTriangle className="h-4 w-4 text-error" />
                      ) : (
                        <Clock className="h-4 w-4 text-warning" />
                      )}
                      <span className="text-sm font-medium">{plugin.id}</span>
                    </div>
                    <div
                      className={`badge badge-xs ${
                        plugin.health === 'healthy'
                          ? 'badge-success'
                          : plugin.health === 'unhealthy'
                            ? 'badge-error'
                            : 'badge-warning'
                      }`}
                    >
                      {plugin.health}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Cache Information */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="card border border-base-300 bg-base-100 shadow-lg"
      >
        <div className="card-body">
          <h2 className="card-title flex items-center gap-2">
            <Database className="h-5 w-5" />
            Cache Performance
          </h2>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="stat rounded-lg bg-base-200 p-4">
              <div className="stat-title text-xs">Cache Size</div>
              <div className="stat-value text-lg">{cacheInfo?.total_size || '0B'}</div>
            </div>

            <div className="stat rounded-lg bg-base-200 p-4">
              <div className="stat-title text-xs">Entries</div>
              <div className="stat-value text-lg">{cacheInfo?.num_entries || 0}</div>
            </div>

            <div className="stat rounded-lg bg-base-200 p-4">
              <div className="stat-title text-xs">Hit Rate</div>
              <div className="stat-value text-lg">
                {((cacheInfo?.hit_rate || 0) * 100).toFixed(1)}%
              </div>
            </div>

            <div className="stat rounded-lg bg-base-200 p-4">
              <div className="stat-title text-xs">Last Cleanup</div>
              <div className="stat-value text-sm">
                {cacheInfo?.last_cleanup
                  ? new Date(cacheInfo.last_cleanup).toLocaleDateString()
                  : 'Never'}
              </div>
            </div>
          </div>

          {/* Cache Hit Rate Progress */}
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-sm">
              <span>Cache Hit Rate</span>
              <span>{((cacheInfo?.hit_rate || 0) * 100).toFixed(1)}%</span>
            </div>
            <progress
              className={`progress w-full ${
                (cacheInfo?.hit_rate || 0) > 0.8
                  ? 'progress-success'
                  : (cacheInfo?.hit_rate || 0) > 0.5
                    ? 'progress-warning'
                    : 'progress-error'
              }`}
              value={(cacheInfo?.hit_rate || 0) * 100}
              max="100"
            ></progress>
          </div>
        </div>
      </motion.div>

      {/* Performance Metrics */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="card border border-base-300 bg-base-100 shadow-lg"
      >
        <div className="card-body">
          <h2 className="card-title flex items-center gap-2">
            <Cpu className="h-5 w-5" />
            Performance Metrics
          </h2>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {/* Request Volume */}
            <div className="space-y-2">
              <h3 className="font-medium text-base-content/80">Request Volume</h3>
              <div className="stat rounded-lg bg-base-200 p-4">
                <div className="stat-title text-xs">Total Requests</div>
                <div className="stat-value text-2xl text-primary">
                  {metrics?.total_requests?.toLocaleString() || 0}
                </div>
              </div>
            </div>

            {/* Response Time */}
            <div className="space-y-2">
              <h3 className="font-medium text-base-content/80">Response Time</h3>
              <div className="stat rounded-lg bg-base-200 p-4">
                <div className="stat-title text-xs">Average</div>
                <div className="stat-value text-2xl text-info">
                  {metrics?.avg_response_time || 0}ms
                </div>
              </div>
            </div>

            {/* Memory Usage */}
            <div className="space-y-2">
              <h3 className="font-medium text-base-content/80">Memory Usage</h3>
              <div className="stat rounded-lg bg-base-200 p-4">
                <div className="stat-title text-xs">Current</div>
                <div className="stat-value text-2xl text-warning">
                  {metrics?.memory_usage || '0MB'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default SystemMetrics;
