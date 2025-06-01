import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Play,
  Pause,
  RotateCcw,
  Trash2,
  AlertCircle,
  CheckCircle,
  Clock,
  Info,
  Shield,
} from 'lucide-react';
import type { Plugin } from '../../types/plugin';

interface PluginCardProps {
  plugin: Plugin;
  onAction: (action: string) => void;
  isLoading?: boolean;
}

const PluginCard: React.FC<PluginCardProps> = ({ plugin, onAction, isLoading = false }) => {
  const [showDetails, setShowDetails] = useState(false);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'loaded':
      case 'enabled':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-error" />;
      case 'loading':
        return <Clock className="h-4 w-4 animate-spin text-warning" />;
      default:
        return <AlertCircle className="h-4 w-4 text-base-content/50" />;
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'loaded':
      case 'enabled':
        return 'badge-success';
      case 'failed':
        return 'badge-error';
      case 'loading':
        return 'badge-warning';
      case 'disabled':
        return 'badge-neutral';
      default:
        return 'badge-ghost';
    }
  };

  const getHealthBadgeClass = (health: string) => {
    switch (health) {
      case 'healthy':
        return 'badge-success';
      case 'unhealthy':
        return 'badge-error';
      default:
        return 'badge-neutral';
    }
  };

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="card border border-base-300 bg-base-100 shadow-lg transition-all duration-200 hover:shadow-xl"
    >
      <div className="card-body p-6">
        {/* Header */}
        <div className="mb-4 flex items-start justify-between">
          <div className="flex-1">
            <h3 className="card-title text-lg font-semibold text-base-content">
              {plugin.metadata.name}
            </h3>
            <p className="mt-1 text-sm text-base-content/70">
              v{plugin.metadata.version} by {plugin.metadata.author}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {getStatusIcon(plugin.status.status)}
            <div className={`badge badge-sm ${getStatusBadgeClass(plugin.status.status)}`}>
              {plugin.status.status}
            </div>
          </div>
        </div>

        {/* Description */}
        <p className="mb-4 line-clamp-2 text-sm text-base-content/80">
          {plugin.metadata.description}
        </p>

        {/* Quick Stats */}
        <div className="mb-4 grid grid-cols-2 gap-4">
          <div className="stat rounded-lg bg-base-200 p-2">
            <div className="stat-title text-xs">Health</div>
            <div className={`badge badge-xs ${getHealthBadgeClass(plugin.status.health)}`}>
              {plugin.status.health}
            </div>
          </div>
          <div className="stat rounded-lg bg-base-200 p-2">
            <div className="stat-title text-xs">Uptime</div>
            <div className="stat-value text-xs">{formatUptime(plugin.status.uptime)}</div>
          </div>
        </div>

        {/* Endpoints */}
        {plugin.metadata.endpoints.length > 0 && (
          <div className="mb-4">
            <div className="mb-2 text-xs font-medium text-base-content/70">
              Endpoints ({plugin.metadata.endpoints.length})
            </div>
            <div className="flex flex-wrap gap-1">
              {plugin.metadata.endpoints.slice(0, 3).map((endpoint, index) => (
                <div key={index} className="badge badge-outline badge-xs">
                  {endpoint.method} {endpoint.path}
                </div>
              ))}
              {plugin.metadata.endpoints.length > 3 && (
                <div className="badge badge-outline badge-xs">
                  +{plugin.metadata.endpoints.length - 3} more
                </div>
              )}
            </div>
          </div>
        )}

        {/* Security & Permissions */}
        <div className="mb-4">
          <div className="mb-2 flex items-center gap-2">
            <Shield className="h-3 w-3" />
            <span className="text-xs font-medium text-base-content/70">Security</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {plugin.metadata.security.sandboxed && (
              <div className="badge badge-success badge-xs">Sandboxed</div>
            )}
            {plugin.metadata.security.network_access && (
              <div className="badge badge-warning badge-xs">Network</div>
            )}
            {plugin.metadata.security.filesystem_access && (
              <div className="badge badge-error badge-xs">Filesystem</div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="card-actions items-center justify-between">
          <div className="flex gap-2">
            {plugin.status.status === 'enabled' ? (
              <button
                className="btn btn-warning btn-sm"
                onClick={() => onAction('disable')}
                disabled={isLoading}
              >
                <Pause className="h-3 w-3" />
                Disable
              </button>
            ) : (
              <button
                className="btn btn-success btn-sm"
                onClick={() => onAction('enable')}
                disabled={isLoading}
              >
                <Play className="h-3 w-3" />
                Enable
              </button>
            )}

            <button
              className="btn btn-ghost btn-sm"
              onClick={() => onAction('reload')}
              disabled={isLoading}
            >
              <RotateCcw className="h-3 w-3" />
            </button>
          </div>

          <div className="flex gap-2">
            <button className="btn btn-ghost btn-sm" onClick={() => setShowDetails(!showDetails)}>
              <Info className="h-3 w-3" />
            </button>

            <button
              className="btn btn-outline btn-error btn-sm"
              onClick={() => onAction('unload')}
              disabled={isLoading}
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Detailed Information (Collapsible) */}
        {showDetails && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 border-t border-base-300 pt-4"
          >
            <div className="space-y-3">
              {/* Performance Stats */}
              <div>
                <div className="mb-2 text-xs font-medium text-base-content/70">Performance</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>Requests: {plugin.status.request_count}</div>
                  <div>Errors: {plugin.status.error_count}</div>
                </div>
              </div>

              {/* Dependencies */}
              {plugin.metadata.dependencies.length > 0 && (
                <div>
                  <div className="mb-2 text-xs font-medium text-base-content/70">Dependencies</div>
                  <div className="flex flex-wrap gap-1">
                    {plugin.metadata.dependencies.map((dep, index) => (
                      <div key={index} className="badge badge-outline badge-xs">
                        {dep}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Permissions */}
              {plugin.metadata.permissions.length > 0 && (
                <div>
                  <div className="mb-2 text-xs font-medium text-base-content/70">Permissions</div>
                  <div className="flex flex-wrap gap-1">
                    {plugin.metadata.permissions.map((permission, index) => (
                      <div key={index} className="badge badge-outline badge-xs">
                        {permission}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Source */}
              <div>
                <div className="mb-2 text-xs font-medium text-base-content/70">Source</div>
                <div className="break-all text-xs text-base-content/60">{plugin.source}</div>
              </div>

              {/* Last Updated */}
              <div>
                <div className="mb-2 text-xs font-medium text-base-content/70">Last Updated</div>
                <div className="text-xs text-base-content/60">
                  {new Date(plugin.status.last_updated).toLocaleString()}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

export default PluginCard;
