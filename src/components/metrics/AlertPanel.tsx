import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, XCircle, AlertCircle, Clock, Filter, Search } from 'lucide-react';
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
  maxHeight = 'max-h-96'
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [filter, setFilter] = useState<'all' | 'critical' | 'warning' | 'info'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Default dummy data
  const defaultAlerts: Alert[] = [
    {
      id: '1',
      type: 'critical',
      title: 'High Memory Usage',
      message: 'Memory usage has exceeded 90% on cluster-prod-2. Immediate attention required.',
      timestamp: '2 minutes ago',
      source: 'cluster-prod-2',
      acknowledged: false
    },
    {
      id: '2',
      type: 'warning',
      title: 'SSL Certificate Expiring',
      message: 'SSL certificate for api.example.com will expire in 7 days.',
      timestamp: '15 minutes ago',
      source: 'api.example.com',
      acknowledged: false
    },
    {
      id: '3',
      type: 'info',
      title: 'Deployment Completed',
      message: 'Successfully deployed version 2.1.0 to production cluster.',
      timestamp: '1 hour ago',
      source: 'deployment-system',
      acknowledged: true
    },
    {
      id: '4',
      type: 'warning',
      title: 'High CPU Usage',
      message: 'CPU usage on worker-node-3 has been above 85% for the last 10 minutes.',
      timestamp: '2 hours ago',
      source: 'worker-node-3',
      acknowledged: false
    },
    {
      id: '5',
      type: 'critical',
      title: 'Database Connection Timeout',
      message: 'Multiple connection timeouts detected on primary database server.',
      timestamp: '3 hours ago',
      source: 'database-primary',
      acknowledged: false
    },
    {
      id: '6',
      type: 'success',
      title: 'Backup Completed',
      message: 'Daily database backup completed successfully.',
      timestamp: '6 hours ago',
      source: 'backup-system',
      acknowledged: true
    }
  ];

  const alertData = alerts.length > 0 ? alerts : defaultAlerts;

  // Filter alerts based on type and search term
  const filteredAlerts = alertData.filter(alert => {
    const matchesFilter = filter === 'all' || alert.type === filter;
    const matchesSearch = searchTerm === '' || 
      alert.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alert.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alert.source.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesFilter && matchesSearch;
  });

  const getAlertIcon = (type: Alert['type']) => {
    switch (type) {
      case 'critical':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case 'info':
        return <AlertTriangle className="w-5 h-5 text-blue-500" />;
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-gray-500" />;
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
      unacknowledged: alertData.filter(a => !a.acknowledged).length
    };
    return counts;
  };

  const counts = getAlertCounts();

  return (
    <div className={`
      rounded-xl border shadow-sm transition-all duration-300
      ${isDark 
        ? 'bg-gray-800 border-gray-700 hover:shadow-lg hover:shadow-gray-900/20' 
        : 'bg-white border-gray-200 hover:shadow-lg hover:shadow-gray-200/50'
      }
      ${className}
    `}>
      {/* Header */}
      <div className={`
        flex items-center justify-between p-4 border-b
        ${isDark ? 'border-gray-700' : 'border-gray-200'}
      `}>
        <div className="flex items-center space-x-3">
          <div className={`
            p-2 rounded-lg
            ${isDark 
              ? 'bg-red-900/20 text-red-400' 
              : 'bg-red-100 text-red-600'
            }
          `}>
            <AlertTriangle size={18} />
          </div>
          <div>
            <h3 className={`
              font-semibold text-lg
              ${isDark ? 'text-gray-100' : 'text-gray-900'}
            `}>
              System Alerts
            </h3>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              {counts.unacknowledged} unacknowledged • {counts.total} total
            </p>
          </div>
        </div>
        
        {/* Alert Summary */}
        <div className="flex items-center space-x-2">
          {counts.critical > 0 && (
            <div className={`
              px-2 py-1 rounded-full text-xs font-medium
              ${isDark 
                ? 'bg-red-900/20 text-red-400' 
                : 'bg-red-100 text-red-700'
              }
            `}>
              {counts.critical} Critical
            </div>
          )}
          {counts.warning > 0 && (
            <div className={`
              px-2 py-1 rounded-full text-xs font-medium
              ${isDark 
                ? 'bg-yellow-900/20 text-yellow-400' 
                : 'bg-yellow-100 text-yellow-700'
              }
            `}>
              {counts.warning} Warning
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className={`
        p-4 border-b space-y-3
        ${isDark ? 'border-gray-700' : 'border-gray-200'}
      `}>
        {/* Search */}
        <div className="relative">
          <Search className={`
            absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4
            ${isDark ? 'text-gray-500' : 'text-gray-400'}
          `} />
          <input
            type="text"
            placeholder="Search alerts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`
              w-full pl-10 pr-4 py-2 rounded-lg border text-sm
              ${isDark 
                ? 'bg-gray-700 border-gray-600 text-gray-200 placeholder-gray-500' 
                : 'bg-white border-gray-300 text-gray-700 placeholder-gray-400'
              }
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
            `}
          />
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-2">
          <Filter className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
          <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            Filter:
          </span>
          {(['all', 'critical', 'warning', 'info'] as const).map((filterType) => (
            <button
              key={filterType}
              onClick={() => setFilter(filterType)}
              className={`
                px-3 py-1 rounded-full text-xs font-medium transition-colors capitalize
                ${filter === filterType
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
      </div>

      {/* Alerts List */}
      <div className={`${maxHeight} overflow-y-auto`}>
        {filteredAlerts.length === 0 ? (
          <div className="p-8 text-center">
            <CheckCircle className={`
              w-12 h-12 mx-auto mb-3
              ${isDark ? 'text-gray-600' : 'text-gray-400'}
            `} />
            <p className={`text-lg font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              No alerts found
            </p>
            <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
              {searchTerm ? 'Try adjusting your search terms' : 'All systems are running smoothly'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`
                  p-4 transition-all duration-200 hover:bg-opacity-80
                  ${getAlertStyle(alert.type, alert.acknowledged)}
                  ${alert.acknowledged ? 'opacity-60' : ''}
                `}
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {getAlertIcon(alert.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className={`
                        text-sm font-medium truncate
                        ${isDark ? 'text-gray-100' : 'text-gray-900'}
                        ${alert.acknowledged ? 'line-through' : ''}
                      `}>
                        {alert.title}
                      </h4>
                      <span className={`
                        text-xs font-medium px-2 py-1 rounded-full capitalize
                        ${getPriorityColor(alert.type)}
                        ${isDark ? 'bg-gray-700' : 'bg-gray-100'}
                      `}>
                        {alert.type}
                      </span>
                    </div>
                    
                    <p className={`
                      text-sm mb-2
                      ${isDark ? 'text-gray-300' : 'text-gray-700'}
                      ${alert.acknowledged ? 'line-through opacity-60' : ''}
                    `}>
                      {alert.message}
                    </p>
                    
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2">
                        <Clock className={`w-3 h-3 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                        <span className={isDark ? 'text-gray-500' : 'text-gray-500'}>
                          {alert.timestamp}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`
                          px-2 py-1 rounded text-xs
                          ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}
                        `}>
                          {alert.source}
                        </span>
                        {alert.acknowledged && (
                          <span className={`
                            px-2 py-1 rounded text-xs
                            ${isDark ? 'bg-green-800/50 text-green-300' : 'bg-green-100 text-green-600'}
                          `}>
                            Acknowledged
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className={`
        p-4 border-t
        ${isDark ? 'border-gray-700' : 'border-gray-200'}
      `}>
        <div className="flex items-center justify-between text-sm">
          <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>
            Last updated: 2 minutes ago
          </span>
          <button className={`
            px-3 py-1 rounded-lg transition-colors
            ${isDark 
              ? 'bg-blue-600 hover:bg-blue-700 text-white' 
              : 'bg-blue-600 hover:bg-blue-700 text-white'
            }
          `}>
            View All Alerts
          </button>
        </div>
      </div>
    </div>
  );
};

export default AlertPanel;
