import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, Search, Filter } from 'lucide-react';
import {
  usePlugins,
  useEnablePlugin,
  useDisablePlugin,
  useReloadPlugin,
  useUnloadPlugin,
} from '../../hooks/usePlugins';
import PluginCard from './PluginCard';
import LoadingFallback from '../LoadingFallback';
import type { Plugin } from '../../types/plugin';

const PluginList: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data: plugins, isLoading, error } = usePlugins();
  const enablePlugin = useEnablePlugin();
  const disablePlugin = useDisablePlugin();
  const reloadPlugin = useReloadPlugin();
  const unloadPlugin = useUnloadPlugin();

  const filteredPlugins =
    plugins?.filter(plugin => {
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

      {/* Plugin Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="stats stats-horizontal w-full bg-base-100 shadow"
      >
        <div className="stat">
          <div className="stat-title">Total Plugins</div>
          <div className="stat-value text-primary">{plugins?.length || 0}</div>
        </div>
        <div className="stat">
          <div className="stat-title">Active</div>
          <div className="stat-value text-success">
            {plugins?.filter(p => p.status.status === 'enabled').length || 0}
          </div>
        </div>
        <div className="stat">
          <div className="stat-title">Failed</div>
          <div className="stat-value text-error">
            {plugins?.filter(p => p.status.status === 'failed').length || 0}
          </div>
        </div>
      </motion.div>

      {/* Plugin Grid */}
      {filteredPlugins.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-12 text-center">
          <div className="text-lg text-base-content/50">
            {searchTerm || statusFilter !== 'all'
              ? 'No plugins match your filters'
              : 'No plugins installed'}
          </div>
          {!searchTerm && statusFilter === 'all' && (
            <p className="mt-2 text-base-content/30">Visit the Plugin Store to install plugins</p>
          )}
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
        >
          {filteredPlugins.map((plugin, index) => (
            <motion.div
              key={plugin.metadata.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <PluginCard
                plugin={plugin}
                onAction={action => handlePluginAction(plugin, action)}
                isLoading={
                  enablePlugin.isPending ||
                  disablePlugin.isPending ||
                  reloadPlugin.isPending ||
                  unloadPlugin.isPending
                }
              />
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
};

export default PluginList;
