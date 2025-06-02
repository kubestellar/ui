// Plugin List Component - Updated for proper export
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, Search, Filter, CheckCircle, XCircle, Trash2, Eye } from 'lucide-react';
import {
  usePlugins,
  useEnablePlugin,
  useDisablePlugin,
  useReloadPlugin,
  useUnloadPlugin,
} from '../../hooks/usePlugins';
import LoadingFallback from '../LoadingFallback';
import type { Plugin } from '../../types/plugin';

const PluginList: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedPlugin, setSelectedPlugin] = useState<Plugin | null>(null);

  const { data: pluginData, isLoading, error } = usePlugins();
  const enablePlugin = useEnablePlugin();
  const disablePlugin = useDisablePlugin();
  const reloadPlugin = useReloadPlugin();
  const unloadPlugin = useUnloadPlugin();

  // Convert plugins object to array
  const pluginsArray = pluginData?.plugins ? Object.values(pluginData.plugins) : [];

  const filteredPlugins =
    pluginsArray.filter(plugin => {
      const matchesSearch =
        plugin.metadata.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        plugin.metadata.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || plugin.status.status === statusFilter;
      return matchesSearch && matchesStatus;
    }) || [];

  const handlePluginAction = async (plugin: Plugin, action: string) => {
    try {
      switch (action) {
        case 'enable':
          await enablePlugin.mutateAsync(plugin.metadata.id);
          break;
        case 'disable':
          await disablePlugin.mutateAsync(plugin.metadata.id);
          break;
        case 'reload':
          await reloadPlugin.mutateAsync(plugin.metadata.id);
          break;
        case 'unload':
          if (confirm(`Are you sure you want to unload "${plugin.metadata.name}"?`)) {
            await unloadPlugin.mutateAsync(plugin.metadata.id);
          }
          break;
      }
    } catch (error) {
      console.error(`Failed to ${action} plugin:`, error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'loaded':
      case 'enabled':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-error" />;
      default:
        return <XCircle className="h-4 w-4 text-base-content/50" />;
    }
  };

  if (isLoading) {
    return <LoadingFallback message="Loading plugins..." size="medium" />;
  }

  if (error) {
    return (
      <div className="alert alert-error">
        <AlertCircle className="h-6 w-6" />
        <span>Failed to load plugins: {error.message}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Filter Controls */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 sm:flex-row"
      >
        <div className="form-control flex-1">
          <div className="input-group">
            <span className="bg-base-200">
              <Search className="h-4 w-4" />
            </span>
            <input
              type="text"
              placeholder="Search plugins..."
              className="input input-bordered flex-1"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="form-control">
          <div className="input-group">
            <span className="bg-base-200">
              <Filter className="h-4 w-4" />
            </span>
            <select
              className="select select-bordered"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="enabled">Enabled</option>
              <option value="disabled">Disabled</option>
              <option value="loaded">Loaded</option>
              <option value="failed">Failed</option>
              <option value="loading">Loading</option>
            </select>
          </div>
        </div>
      </motion.div>

      {/* Plugin Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="overflow-x-auto"
      >
        <table className="table table-zebra w-full">
          <thead>
            <tr>
              <th className="w-8"></th>
              <th>Name</th>
              <th>Enabled</th>
              <th className="text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredPlugins.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-12 text-center">
                  <div className="text-lg text-base-content/50">
                    {searchTerm || statusFilter !== 'all'
                      ? 'No plugins match your filters'
                      : 'No plugins installed'}
                  </div>
                  {!searchTerm && statusFilter === 'all' && (
                    <p className="mt-2 text-base-content/30">
                      Visit the Plugin Store to install plugins
                    </p>
                  )}
                </td>
              </tr>
            ) : (
              filteredPlugins.map((plugin, index) => (
                <motion.tr
                  key={plugin.metadata.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="hover:bg-base-200/50"
                >
                  {/* Status Icon */}
                  <td>{getStatusIcon(plugin.status.status)}</td>

                  {/* Plugin Name and Details */}
                  <td>
                    <div className="flex flex-col">
                      <button
                        className="hover:text-primary-focus text-left font-medium text-primary hover:underline"
                        onClick={() => setSelectedPlugin(plugin)}
                      >
                        {plugin.metadata.name} {plugin.metadata.version}
                      </button>
                      <div className="mt-1 text-sm text-base-content/70">
                        {plugin.metadata.description}
                      </div>
                      <div className="mt-1 text-xs text-base-content/50">
                        {plugin.status.error_message && (
                          <div className="flex items-center gap-1 text-error">
                            <AlertCircle className="h-3 w-3" />
                            {plugin.status.error_message}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Enabled Status */}
                  <td>
                    <div className="form-control">
                      <label className="label cursor-pointer justify-start gap-2">
                        <input
                          type="checkbox"
                          className="toggle toggle-primary toggle-sm"
                          checked={plugin.status.status === 'enabled'}
                          onChange={() =>
                            handlePluginAction(
                              plugin,
                              plugin.status.status === 'enabled' ? 'disable' : 'enable'
                            )
                          }
                          disabled={
                            enablePlugin.isPending ||
                            disablePlugin.isPending ||
                            plugin.status.status === 'failed'
                          }
                        />
                      </label>
                    </div>
                  </td>

                  {/* Actions */}
                  <td>
                    <div className="flex justify-center gap-2">
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => setSelectedPlugin(plugin)}
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        className="btn btn-error btn-sm"
                        onClick={() => handlePluginAction(plugin, 'unload')}
                        disabled={unloadPlugin.isPending}
                        title="Delete Plugin"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </motion.div>

      {/* Plugin Details Modal */}
      {selectedPlugin && (
        <div className="modal modal-open">
          <div className="modal-box max-w-4xl">
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold">{selectedPlugin.metadata.name}</h3>
                <p className="text-base-content/70">
                  v{selectedPlugin.metadata.version} by {selectedPlugin.metadata.author}
                </p>
              </div>
              <button
                className="btn btn-circle btn-ghost btn-sm"
                onClick={() => setSelectedPlugin(null)}
              >
                ✕
              </button>
            </div>

            {/* Plugin Description */}
            <div className="mb-6">
              <h4 className="mb-2 font-semibold">Description</h4>
              <p className="text-base-content/80">{selectedPlugin.metadata.description}</p>
            </div>

            {/* Plugin Status and Health */}
            <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <h4 className="mb-2 font-semibold">Status</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">Status:</span>
                    <div
                      className={`badge badge-sm ${
                        selectedPlugin.status.status === 'enabled'
                          ? 'badge-success'
                          : selectedPlugin.status.status === 'failed'
                            ? 'badge-error'
                            : 'badge-neutral'
                      }`}
                    >
                      {selectedPlugin.status.status}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">Health:</span>
                    <div
                      className={`badge badge-sm ${
                        selectedPlugin.status.health === 'healthy'
                          ? 'badge-success'
                          : selectedPlugin.status.health === 'unhealthy'
                            ? 'badge-error'
                            : 'badge-neutral'
                      }`}
                    >
                      {selectedPlugin.status.health}
                    </div>
                  </div>
                  {selectedPlugin.status.error_message && (
                    <div className="text-sm text-error">
                      <strong>Error:</strong> {selectedPlugin.status.error_message}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h4 className="mb-2 font-semibold">Statistics</h4>
                <div className="space-y-2 text-sm">
                  <div>Requests: {selectedPlugin.status.request_count}</div>
                  <div>Errors: {selectedPlugin.status.error_count}</div>
                  <div>Uptime: {Math.floor(selectedPlugin.status.uptime / 60)}m</div>
                  <div>
                    Last Updated: {new Date(selectedPlugin.status.last_updated).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>

            {/* Endpoints */}
            {selectedPlugin.metadata.endpoints.length > 0 && (
              <div className="mb-6">
                <h4 className="mb-2 font-semibold">Endpoints</h4>
                <div className="space-y-1">
                  {selectedPlugin.metadata.endpoints.map((endpoint, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <div
                        className={`badge badge-sm ${
                          endpoint.method === 'GET'
                            ? 'badge-info'
                            : endpoint.method === 'POST'
                              ? 'badge-success'
                              : endpoint.method === 'PUT'
                                ? 'badge-warning'
                                : endpoint.method === 'DELETE'
                                  ? 'badge-error'
                                  : 'badge-neutral'
                        }`}
                      >
                        {endpoint.method}
                      </div>
                      <span className="font-mono">{endpoint.path}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Dependencies and Permissions */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {selectedPlugin.metadata.dependencies.length > 0 && (
                <div>
                  <h4 className="mb-2 font-semibold">Dependencies</h4>
                  <div className="flex flex-wrap gap-1">
                    {selectedPlugin.metadata.dependencies.map((dep, index) => (
                      <div key={index} className="badge badge-outline badge-sm">
                        {dep}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedPlugin.metadata.permissions.length > 0 && (
                <div>
                  <h4 className="mb-2 font-semibold">Permissions</h4>
                  <div className="flex flex-wrap gap-1">
                    {selectedPlugin.metadata.permissions.map((permission, index) => (
                      <div key={index} className="badge badge-outline badge-sm">
                        {permission}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="modal-action">
              <button className="btn btn-primary" onClick={() => setSelectedPlugin(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Both named and default export for compatibility
export { PluginList };
export default PluginList;
