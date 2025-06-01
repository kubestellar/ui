import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Download,
  Star,
  Calendar,
  Search,
  Filter,
  ExternalLink,
  AlertCircle,
  Github,
} from 'lucide-react';
import { useAvailablePlugins, useLoadPlugin, useValidatePlugin } from '../../hooks/usePlugins';
import LoadingFallback from '../LoadingFallback';
import type { AvailablePlugin } from '../../types/plugin';

const PluginStore: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'stars' | 'updated'>('stars');
  const [customSource, setCustomSource] = useState('');
  const [showCustomForm, setShowCustomForm] = useState(false);

  const { data: availablePlugins, isLoading, error } = useAvailablePlugins();
  const loadPlugin = useLoadPlugin();
  const validatePlugin = useValidatePlugin();

  const filteredPlugins =
    availablePlugins
      ?.filter(
        plugin =>
          plugin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          plugin.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          plugin.author.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => {
        switch (sortBy) {
          case 'name':
            return a.name.localeCompare(b.name);
          case 'stars':
            return b.stars - a.stars;
          case 'updated':
            return new Date(b.last_updated).getTime() - new Date(a.last_updated).getTime();
          default:
            return 0;
        }
      }) || [];

  const handleInstallPlugin = async (plugin: AvailablePlugin) => {
    try {
      await loadPlugin.mutateAsync({
        source: plugin.repository,
        version: plugin.latest_version,
      });
    } catch (error) {
      console.error('Failed to install plugin:', error);
    }
  };

  const handleInstallCustom = async () => {
    if (!customSource.trim()) return;

    try {
      await loadPlugin.mutateAsync({
        source: customSource.trim(),
      });
      setCustomSource('');
      setShowCustomForm(false);
    } catch (error) {
      console.error('Failed to install custom plugin:', error);
    }
  };

  const handleValidateCustom = async () => {
    if (!customSource.trim()) return;

    try {
      await validatePlugin.mutateAsync(customSource.trim());
    } catch (error) {
      console.error('Failed to validate plugin:', error);
    }
  };

  if (isLoading) {
    return <LoadingFallback message="Loading plugin store..." size="medium" />;
  }

  if (error) {
    return (
      <div className="alert alert-error">
        <AlertCircle className="h-6 w-6" />
        <span>Failed to load plugin store: {error.message}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col justify-between gap-4 sm:flex-row"
      >
        <div className="flex flex-1 flex-col gap-4 sm:flex-row">
          {/* Search */}
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

          {/* Sort */}
          <div className="form-control">
            <div className="input-group">
              <span className="bg-base-200">
                <Filter className="h-4 w-4" />
              </span>
              <select
                className="select select-bordered"
                value={sortBy}
                onChange={e => setSortBy(e.target.value as 'stars' | 'updated' | 'name')}
              >
                <option value="stars">Most Popular</option>
                <option value="updated">Recently Updated</option>
                <option value="name">Name</option>
              </select>
            </div>
          </div>
        </div>

        {/* Custom Install Button */}
        <button className="btn btn-primary" onClick={() => setShowCustomForm(!showCustomForm)}>
          <Github className="h-4 w-4" />
          Install from URL
        </button>
      </motion.div>

      {/* Custom Installation Form */}
      {showCustomForm && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="card border border-base-300 bg-base-100 shadow-lg"
        >
          <div className="card-body">
            <h3 className="card-title">Install Plugin from URL</h3>
            <p className="mb-4 text-sm text-base-content/70">
              Install a plugin from a GitHub repository URL or local file path
            </p>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Plugin Source</span>
              </label>
              <input
                type="text"
                placeholder="https://github.com/user/plugin-repo or /path/to/plugin.so"
                className="input input-bordered"
                value={customSource}
                onChange={e => setCustomSource(e.target.value)}
              />
            </div>

            <div className="card-actions mt-4 justify-end">
              <button className="btn btn-ghost" onClick={() => setShowCustomForm(false)}>
                Cancel
              </button>
              <button
                className="btn btn-outline"
                onClick={handleValidateCustom}
                disabled={!customSource.trim() || validatePlugin.isPending}
              >
                {validatePlugin.isPending ? (
                  <span className="loading loading-spinner loading-sm"></span>
                ) : (
                  'Validate'
                )}
              </button>
              <button
                className="btn btn-primary"
                onClick={handleInstallCustom}
                disabled={!customSource.trim() || loadPlugin.isPending}
              >
                {loadPlugin.isPending ? (
                  <span className="loading loading-spinner loading-sm"></span>
                ) : (
                  'Install'
                )}
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Plugin Grid */}
      {filteredPlugins.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-12 text-center">
          <div className="text-lg text-base-content/50">
            {searchTerm ? 'No plugins match your search' : 'No plugins available'}
          </div>
          <p className="mt-2 text-base-content/30">
            Try adjusting your search terms or check back later
          </p>
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
              key={plugin.repository}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -2 }}
              className="card border border-base-300 bg-base-100 shadow-lg transition-all duration-200 hover:shadow-xl"
            >
              <div className="card-body p-6">
                {/* Header */}
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="card-title text-lg font-semibold text-base-content">
                      {plugin.name}
                    </h3>
                    <p className="mt-1 text-sm text-base-content/70">by {plugin.author}</p>
                  </div>
                  <div className="flex items-center gap-1 text-warning">
                    <Star className="h-4 w-4 fill-current" />
                    <span className="text-sm font-medium">{plugin.stars}</span>
                  </div>
                </div>

                {/* Description */}
                <p className="mb-4 line-clamp-3 text-sm text-base-content/80">
                  {plugin.description}
                </p>

                {/* Metadata */}
                <div className="mb-4 space-y-2">
                  <div className="flex items-center gap-2 text-xs text-base-content/60">
                    <Calendar className="h-3 w-3" />
                    <span>Updated {new Date(plugin.last_updated).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-base-content/60">
                    <span className="badge badge-outline badge-xs">v{plugin.latest_version}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="card-actions items-center justify-between">
                  <a
                    href={plugin.repository}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-ghost btn-sm"
                  >
                    <ExternalLink className="h-3 w-3" />
                    View Source
                  </a>

                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => handleInstallPlugin(plugin)}
                    disabled={loadPlugin.isPending}
                  >
                    {loadPlugin.isPending ? (
                      <span className="loading loading-spinner loading-sm"></span>
                    ) : (
                      <>
                        <Download className="h-3 w-3" />
                        Install
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
};

export default PluginStore;
