import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  Filter,
  Search,
  Bell,
  Eye,
  EyeOff,
} from 'lucide-react';
import useTheme from '../../stores/themeStore';

export interface Alert {
  id: string;
  type: 'critical' | 'warning' | 'info' | 'success';
  title: string;
  message: string;
  timestamp: string;
  source: string;
  acknowledged: boolean;
}

interface AlertPanelProps {
  alerts?: Alert[];
  className?: string;
  maxHeight?: string;
}

const AlertPanel: React.FC<AlertPanelProps> = ({
  alerts = [],
  className = '',
  maxHeight = 'max-h-96',
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [filter, setFilter] = useState<'all' | 'critical' | 'warning' | 'info'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAcknowledged, setShowAcknowledged] = useState(true);

  const alertData = alerts;

  // Filter alerts based on type and search term
  const filteredAlerts = alertData.filter(alert => {
    const matchesFilter = filter === 'all' || alert.type === filter;
    const matchesSearch =
      searchTerm === '' ||
      alert.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alert.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alert.source.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAcknowledged = showAcknowledged || !alert.acknowledged;

    return matchesFilter && matchesSearch && matchesAcknowledged;
  });

  const acknowledgeAlert = (alertId: string) => {
    console.log('Acknowledge alert:', alertId);
  };

  const dismissAlert = (alertId: string) => {
    console.log('Dismiss alert:', alertId);
  };

  const getAlertIcon = (type: Alert['type']) => {
    switch (type) {
      case 'critical':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'info':
        return <AlertTriangle className="h-5 w-5 text-blue-500" />;
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getAlertStyle = (type: Alert['type'], acknowledged: boolean) => {
    const opacity = acknowledged ? 'opacity-75' : '';

    switch (type) {
      case 'critical':
        return `${isDark ? 'bg-red-900/20 border-red-700' : 'bg-red-50 border-red-200'} ${opacity}`;
      case 'warning':
        return `${isDark ? 'bg-yellow-900/20 border-yellow-700' : 'bg-yellow-50 border-yellow-200'} ${opacity}`;
      case 'info':
        return `${isDark ? 'bg-blue-900/20 border-blue-700' : 'bg-blue-50 border-blue-200'} ${opacity}`;
      case 'success':
        return `${isDark ? 'bg-green-900/20 border-green-700' : 'bg-green-50 border-green-200'} ${opacity}`;
      default:
        return `${isDark ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'} ${opacity}`;
    }
  };

  const getPriorityColor = (type: Alert['type']) => {
    switch (type) {
      case 'critical':
        return 'text-red-500';
      case 'warning':
        return 'text-yellow-500';
      case 'info':
        return 'text-blue-500';
      case 'success':
        return 'text-green-500';
      default:
        return 'text-gray-500';
    }
  };

  const getAlertCounts = () => {
    const counts = {
      total: alertData.length,
      critical: alertData.filter(a => a.type === 'critical' && !a.acknowledged).length,
      warning: alertData.filter(a => a.type === 'warning' && !a.acknowledged).length,
      unacknowledged: alertData.filter(a => !a.acknowledged).length,
      new: 0,
    };
    return counts;
  };

  const counts = getAlertCounts();

  return (
    <div
      className={`
      rounded-xl border shadow-sm transition-all duration-300
      ${
        isDark
          ? 'border-gray-700 bg-gray-800 hover:shadow-lg hover:shadow-gray-900/20'
          : 'border-gray-200 bg-white hover:shadow-lg hover:shadow-gray-200/50'
      }
      ${className}
    `}
    >
      {/* Enhanced Header */}
      <div
        className={`
        flex items-center justify-between border-b p-4
        ${isDark ? 'border-gray-700' : 'border-gray-200'}
      `}
      >
        <div className="flex items-center space-x-3">
          <div
            className={`
            rounded-lg p-2
            ${isDark ? 'bg-red-900/20 text-red-400' : 'bg-red-100 text-red-600'}
          `}
          >
            <Bell size={18} />
          </div>
          <div>
            <h3
              className={`
              text-lg font-semibold
              ${isDark ? 'text-gray-100' : 'text-gray-900'}
            `}
            >
              System Alerts
            </h3>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              {counts.unacknowledged} unacknowledged • {counts.total} total
            </p>
          </div>
        </div>

        {/* Enhanced Alert Summary */}
        <div className="flex items-center space-x-2">
          {counts.critical > 0 && (
            <div
              className={`
              rounded-full px-2 py-1 text-xs font-medium
              ${isDark ? 'bg-red-900/20 text-red-400' : 'bg-red-100 text-red-700'}
            `}
            >
              {counts.critical} Critical
            </div>
          )}
          {counts.warning > 0 && (
            <div
              className={`
              rounded-full px-2 py-1 text-xs font-medium
              ${isDark ? 'bg-yellow-900/20 text-yellow-400' : 'bg-yellow-100 text-yellow-700'}
            `}
            >
              {counts.warning} Warning
            </div>
          )}
        </div>
      </div>

      {/* Enhanced Controls */}
      <div
        className={`
        space-y-3 border-b p-4
        ${isDark ? 'border-gray-700' : 'border-gray-200'}
      `}
      >
        {/* Search */}
        <div className="relative">
          <Search
            className={`
            absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform
            ${isDark ? 'text-gray-500' : 'text-gray-400'}
          `}
          />
          <input
            type="text"
            placeholder="Search alerts..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className={`
              w-full rounded-lg border py-2 pl-10 pr-4 text-sm
              ${
                isDark
                  ? 'border-gray-600 bg-gray-700 text-gray-200 placeholder-gray-500'
                  : 'border-gray-300 bg-white text-gray-700 placeholder-gray-400'
              }
              focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500
            `}
          />
        </div>

        {/* Enhanced Filters */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Filter className={`h-4 w-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
            <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Filter:
            </span>
            {(['all', 'critical', 'warning', 'info'] as const).map(filterType => (
              <button
                key={filterType}
                onClick={() => setFilter(filterType)}
                className={`
                  rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors
                  ${
                    filter === filterType
                      ? isDark
                        ? 'bg-blue-600 text-white'
                        : 'bg-blue-600 text-white'
                      : isDark
                        ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }
                `}
              >
                {filterType}
              </button>
            ))}
          </div>

          {/* Show/Hide Acknowledged Toggle */}
          <button
            onClick={() => setShowAcknowledged(!showAcknowledged)}
            className={`
              flex items-center space-x-1 rounded-lg px-3 py-1 text-xs transition-colors
              ${
                showAcknowledged
                  ? isDark
                    ? 'bg-gray-700 text-gray-300'
                    : 'bg-gray-100 text-gray-600'
                  : isDark
                    ? 'bg-blue-600 text-white'
                    : 'bg-blue-600 text-white'
              }
            `}
          >
            {showAcknowledged ? <Eye size={12} /> : <EyeOff size={12} />}
            <span>{showAcknowledged ? 'Show All' : 'Hide Acked'}</span>
          </button>
        </div>
      </div>

      {/* Enhanced Alerts List */}
      <div className={`${maxHeight} overflow-y-auto`}>
        {filteredAlerts.length === 0 ? (
          <div className="p-8 text-center">
            <CheckCircle
              className={`
              mx-auto mb-3 h-12 w-12
              ${isDark ? 'text-gray-600' : 'text-gray-400'}
            `}
            />
            <p className={`text-lg font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              No alerts found
            </p>
            <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
              {searchTerm
                ? 'Try adjusting your search terms'
                : alertData.length === 0
                  ? 'No alerts available'
                  : 'All systems are running smoothly'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredAlerts.map(alert => (
              <div
                key={alert.id}
                className={`
                  group relative p-4 transition-all duration-200 hover:bg-opacity-80
                  ${getAlertStyle(alert.type, alert.acknowledged)}
                  ${alert.acknowledged ? 'opacity-60' : ''}
                `}
              >
                <div className="flex items-start space-x-3">
                  <div className="mt-0.5 flex-shrink-0">{getAlertIcon(alert.type)}</div>

                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center justify-between">
                      <h4
                        className={`
                        truncate text-sm font-medium
                        ${isDark ? 'text-gray-100' : 'text-gray-900'}
                        ${alert.acknowledged ? 'line-through' : ''}
                      `}
                      >
                        {alert.title}
                      </h4>
                      <div className="flex items-center space-x-1">
                        <span
                          className={`
                          rounded-full px-2 py-1 text-xs font-medium capitalize
                          ${getPriorityColor(alert.type)}
                          ${isDark ? 'bg-gray-700' : 'bg-gray-100'}
                        `}
                        >
                          {alert.type}
                        </span>
                      </div>
                    </div>

                    <p
                      className={`
                      mb-2 text-sm
                      ${isDark ? 'text-gray-300' : 'text-gray-700'}
                      ${alert.acknowledged ? 'line-through opacity-60' : ''}
                    `}
                    >
                      {alert.message}
                    </p>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 text-xs">
                        <Clock
                          className={`h-3 w-3 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}
                        />
                        <span className={isDark ? 'text-gray-500' : 'text-gray-500'}>
                          {alert.timestamp}
                        </span>
                        <span
                          className={`
                          rounded px-2 py-1 text-xs
                          ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}
                        `}
                        >
                          {alert.source}
                        </span>
                      </div>

                      {/* Alert Actions */}
                      <div className="flex items-center space-x-1 opacity-0 transition-opacity group-hover:opacity-100">
                        {!alert.acknowledged && (
                          <button
                            onClick={() => acknowledgeAlert(alert.id)}
                            className={`
                              rounded px-2 py-1 text-xs transition-colors
                              ${
                                isDark
                                  ? 'bg-green-800/50 text-green-300 hover:bg-green-700/50'
                                  : 'bg-green-100 text-green-600 hover:bg-green-200'
                              }
                            `}
                          >
                            Acknowledge
                          </button>
                        )}
                        <button
                          onClick={() => dismissAlert(alert.id)}
                          className={`
                            rounded px-2 py-1 text-xs transition-colors
                            ${
                              isDark
                                ? 'bg-red-800/50 text-red-300 hover:bg-red-700/50'
                                : 'bg-red-100 text-red-600 hover:bg-red-200'
                            }
                          `}
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>

                    {alert.acknowledged && (
                      <div className="mt-2">
                        <span
                          className={`
                          rounded px-2 py-1 text-xs
                          ${isDark ? 'bg-green-800/50 text-green-300' : 'bg-green-100 text-green-600'}
                        `}
                        >
                          ✓ Acknowledged
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Enhanced Footer */}
      <div
        className={`
        border-t p-4
        ${isDark ? 'border-gray-700' : 'border-gray-200'}
      `}
      >
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-4">
            <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>
              Last updated: {alertData.length > 0 ? '2 minutes ago' : 'No data'}
            </span>
            {alertData.length > 0 && (
              <div className="flex items-center space-x-1">
                <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
                <span className={isDark ? 'text-gray-500' : 'text-gray-500'}>
                  Monitoring active
                </span>
              </div>
            )}
          </div>
          <button
            className={`
            rounded-lg px-3 py-1 transition-colors
            ${
              isDark
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }
          `}
          >
            View All Alerts
          </button>
        </div>
      </div>
    </div>
  );
};

export default AlertPanel;
