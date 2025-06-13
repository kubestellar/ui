import React from 'react';
import { CheckCircle, XCircle, AlertCircle, Activity } from 'lucide-react';
import useTheme from '../../stores/themeStore';

export interface ServiceStatus {
  name: string;
  status: 'healthy' | 'unhealthy' | 'warning';
  details?: string;
  error?: string;
  lastChecked?: string;
}

interface HealthPanelProps {
  services?: ServiceStatus[];
  className?: string;
}

const HealthPanel: React.FC<HealthPanelProps> = ({ services = [], className = '' }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const serviceData = services;

  const getStatusIcon = (status: ServiceStatus['status']) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'unhealthy':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      default:
        return <Activity className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: ServiceStatus['status']) => {
    switch (status) {
      case 'healthy':
        return isDark ? 'bg-green-900/20 border-green-700' : 'bg-green-50 border-green-200';
      case 'unhealthy':
        return isDark ? 'bg-red-900/20 border-red-700' : 'bg-red-50 border-red-200';
      case 'warning':
        return isDark ? 'bg-yellow-900/20 border-yellow-700' : 'bg-yellow-50 border-yellow-200';
      default:
        return isDark ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200';
    }
  };

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
      {/* Header */}
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
            ${isDark ? 'bg-green-900/20 text-green-400' : 'bg-green-100 text-green-600'}
          `}
          >
            <Activity size={18} />
          </div>
          <h3
            className={`
            text-lg font-semibold
            ${isDark ? 'text-gray-100' : 'text-gray-900'}
          `}
          >
            Service Health
          </h3>
        </div>
        <div
          className={`
          rounded-full px-3 py-1 text-sm font-medium
          ${
            serviceData.some(s => s.status !== 'healthy')
              ? isDark
                ? 'bg-yellow-900/20 text-yellow-400'
                : 'bg-yellow-100 text-yellow-700'
              : isDark
                ? 'bg-green-900/20 text-green-400'
                : 'bg-green-100 text-green-700'
          }
        `}
        >
          {serviceData.some(s => s.status !== 'healthy')
            ? 'Some Issues Detected'
            : 'All Systems Operational'}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {serviceData.length === 0 ? (
          <div className="py-8 text-center text-gray-500 dark:text-gray-400">
            No service health data available
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {serviceData.map((service, index) => (
              <div
                key={index}
                className={`
                  rounded-lg border p-4 transition-all duration-200 hover:scale-105
                  ${getStatusColor(service.status)}
                `}
              >
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(service.status)}
                    <h4
                      className={`
                      font-medium
                      ${isDark ? 'text-gray-100' : 'text-gray-900'}
                    `}
                    >
                      {service.name}
                    </h4>
                  </div>
                  <span
                    className={`
                    rounded px-2 py-1 text-xs font-medium capitalize
                    ${
                      service.status === 'healthy'
                        ? isDark
                          ? 'bg-green-800/50 text-green-300'
                          : 'bg-green-200 text-green-800'
                        : service.status === 'warning'
                          ? isDark
                            ? 'bg-yellow-800/50 text-yellow-300'
                            : 'bg-yellow-200 text-yellow-800'
                          : isDark
                            ? 'bg-red-800/50 text-red-300'
                            : 'bg-red-200 text-red-800'
                    }
                  `}
                  >
                    {service.status}
                  </span>
                </div>

                <div className="space-y-2">
                  {service.details && (
                    <div className="flex items-center justify-between">
                      <span
                        className={`
                        text-sm
                        ${isDark ? 'text-gray-400' : 'text-gray-600'}
                      `}
                      >
                        Details
                      </span>
                      <span
                        className={`
                        max-w-32 truncate text-right text-sm font-medium
                        ${isDark ? 'text-gray-200' : 'text-gray-800'}
                      `}
                        title={service.details}
                      >
                        {service.details}
                      </span>
                    </div>
                  )}

                  {service.error && (
                    <div className="flex items-start justify-between">
                      <span
                        className={`
                        text-sm
                        ${isDark ? 'text-gray-400' : 'text-gray-600'}
                      `}
                      >
                        Error
                      </span>
                      <span
                        className={`
                        max-w-32 text-right text-sm font-medium text-red-600 dark:text-red-400
                      `}
                        title={service.error}
                      >
                        {service.error.length > 30
                          ? `${service.error.substring(0, 30)}...`
                          : service.error}
                      </span>
                    </div>
                  )}

                  <div className="border-t border-opacity-20 pt-2">
                    <span
                      className={`
                      text-xs
                      ${isDark ? 'text-gray-500' : 'text-gray-500'}
                    `}
                    >
                      Last checked: {service.lastChecked || 'Unknown'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HealthPanel;
