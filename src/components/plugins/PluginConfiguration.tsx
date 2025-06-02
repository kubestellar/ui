import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Settings,
  Save,
  RotateCcw,
  Shield,
  HardDrive,
  AlertCircle,
  CheckCircle,
  Trash2,
} from 'lucide-react';
import { useConfiguration, useUpdateConfiguration, useClearCache } from '../../hooks/usePlugins';
import LoadingFallback from '../LoadingFallback';
import type { PluginConfiguration } from '../../types/plugin';

const PluginConfigurationComponent: React.FC = () => {
  const { data: config, isLoading } = useConfiguration();
  const updateConfiguration = useUpdateConfiguration();
  const clearCache = useClearCache();

  const [formData, setFormData] = useState<Partial<PluginConfiguration>>({});
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (config) {
      setFormData(config);
    }
  }, [config]);

  const handleInputChange = (
    field: keyof PluginConfiguration,
    value: string | number | boolean
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      await updateConfiguration.mutateAsync(formData);
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to update configuration:', error);
    }
  };

  const handleReset = () => {
    if (config) {
      setFormData(config);
      setHasChanges(false);
    }
  };

  const handleClearCache = async () => {
    if (
      confirm(
        'Are you sure you want to clear the plugin cache? This will remove all cached plugin builds.'
      )
    ) {
      try {
        await clearCache.mutateAsync();
      } catch (error) {
        console.error('Failed to clear cache:', error);
      }
    }
  };

  if (isLoading) {
    return <LoadingFallback message="Loading configuration..." size="medium" />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold text-base-content">
            <Settings className="h-6 w-6" />
            Plugin System Configuration
          </h2>
          <p className="mt-1 text-base-content/70">
            Configure plugin system behavior and performance settings
          </p>
        </div>

        <div className="flex gap-2">
          <button className="btn btn-ghost" onClick={handleReset} disabled={!hasChanges}>
            <RotateCcw className="h-4 w-4" />
            Reset
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={!hasChanges || updateConfiguration.isPending}
          >
            {updateConfiguration.isPending ? (
              <span className="loading loading-spinner loading-sm"></span>
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save Changes
          </button>
        </div>
      </motion.div>

      {/* Configuration Sections */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Cache Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card border border-base-300 bg-base-100 shadow-lg"
        >
          <div className="card-body">
            <h3 className="card-title flex items-center gap-2">
              <HardDrive className="h-5 w-5" />
              Cache Settings
            </h3>

            <div className="space-y-4">
              {/* Cache Enabled */}
              <div className="form-control">
                <label className="label cursor-pointer">
                  <span className="label-text">Enable Plugin Cache</span>
                  <input
                    type="checkbox"
                    className="toggle toggle-primary"
                    checked={formData.cache_enabled || false}
                    onChange={e => handleInputChange('cache_enabled', e.target.checked)}
                  />
                </label>
                <label className="label">
                  <span className="label-text-alt text-base-content/60">
                    Cache compiled plugins to improve loading performance
                  </span>
                </label>
              </div>

              {/* Cache Max Size */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Maximum Cache Size</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered"
                  placeholder="1GB"
                  value={formData.cache_max_size || ''}
                  onChange={e => handleInputChange('cache_max_size', e.target.value)}
                />
                <label className="label">
                  <span className="label-text-alt text-base-content/60">
                    Maximum disk space for plugin cache (e.g., 1GB, 500MB)
                  </span>
                </label>
              </div>

              {/* Clear Cache Button */}
              <div className="form-control">
                <button
                  className="btn btn-outline btn-error"
                  onClick={handleClearCache}
                  disabled={clearCache.isPending}
                >
                  {clearCache.isPending ? (
                    <span className="loading loading-spinner loading-sm"></span>
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  Clear Cache
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Security Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card border border-base-300 bg-base-100 shadow-lg"
        >
          <div className="card-body">
            <h3 className="card-title flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security Settings
            </h3>

            <div className="space-y-4">
              {/* Security Enabled */}
              <div className="form-control">
                <label className="label cursor-pointer">
                  <span className="label-text">Enable Security Validation</span>
                  <input
                    type="checkbox"
                    className="toggle toggle-primary"
                    checked={formData.security_enabled || false}
                    onChange={e => handleInputChange('security_enabled', e.target.checked)}
                  />
                </label>
                <label className="label">
                  <span className="label-text-alt text-base-content/60">
                    Validate plugin permissions and security configurations
                  </span>
                </label>
              </div>

              {/* Security Warning */}
              {!formData.security_enabled && (
                <div className="alert alert-warning">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">
                    Security validation is disabled. Plugins may have unrestricted access.
                  </span>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Status Indicator */}
      {hasChanges && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="alert alert-info"
        >
          <AlertCircle className="h-4 w-4" />
          <span>You have unsaved changes. Click "Save Changes" to apply them.</span>
        </motion.div>
      )}

      {/* Configuration Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="card border border-base-300 bg-base-100 shadow-lg"
      >
        <div className="card-body">
          <h3 className="card-title">Current Configuration Summary</h3>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="stat rounded-lg bg-base-200 p-4">
              <div className="stat-title text-xs">Cache</div>
              <div className="stat-value flex items-center gap-2 text-sm">
                {formData.cache_enabled ? (
                  <CheckCircle className="h-4 w-4 text-success" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-error" />
                )}
                {formData.cache_enabled ? 'Enabled' : 'Disabled'}
              </div>
            </div>

            <div className="stat rounded-lg bg-base-200 p-4">
              <div className="stat-title text-xs">Security</div>
              <div className="stat-value flex items-center gap-2 text-sm">
                {formData.security_enabled ? (
                  <CheckCircle className="h-4 w-4 text-success" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-warning" />
                )}
                {formData.security_enabled ? 'Enabled' : 'Disabled'}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default PluginConfigurationComponent;
