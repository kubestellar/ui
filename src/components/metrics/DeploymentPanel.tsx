import React from 'react';
import { Rocket, GitBranch, Clock, TrendingUp, Zap } from 'lucide-react';
import useTheme from '../../stores/themeStore';

export interface DeploymentStats {
  total: number;
  successful: number;
  failed: number;
  webhook: number;
  manual: number;
  avgDuration: string;
  lastDeployment: string;
}

interface DeploymentPanelProps {
  stats?: DeploymentStats;
  className?: string;
}

const DeploymentPanel: React.FC<DeploymentPanelProps> = ({ stats, className = '' }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const deploymentData = stats;

  if (!deploymentData) {
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
        <div className="flex h-64 items-center justify-center">
          <p className="text-gray-500 dark:text-gray-400">No deployment statistics available</p>
        </div>
      </div>
    );
  }

  const successRate = Math.round((deploymentData.successful / deploymentData.total) * 100);

  // Calculate percentages for pie chart
  const webhookPercentage = Math.round((deploymentData.webhook / deploymentData.total) * 100);
  const manualPercentage = Math.round((deploymentData.manual / deploymentData.total) * 100);

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
            ${isDark ? 'bg-blue-900/20 text-blue-400' : 'bg-blue-100 text-blue-600'}
          `}
          >
            <Rocket size={18} />
          </div>
          <h3
            className={`
            text-lg font-semibold
            ${isDark ? 'text-gray-100' : 'text-gray-900'}
          `}
          >
            Deployment Analytics
          </h3>
        </div>
        <div
          className={`
          rounded-full px-3 py-1 text-sm font-medium
          ${isDark ? 'bg-blue-900/20 text-blue-400' : 'bg-blue-100 text-blue-700'}
        `}
        >
          {successRate}% Success Rate
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Stats Grid */}
        <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          <div
            className={`
            rounded-lg border p-3
            ${isDark ? 'bg-gray-750 border-gray-600' : 'border-gray-200 bg-gray-50'}
          `}
          >
            <div className="mb-2 flex items-center space-x-2">
              <TrendingUp className={`h-4 w-4 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
              <span className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Total
              </span>
            </div>
            <div className={`text-2xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
              {deploymentData.total}
            </div>
          </div>

          <div
            className={`
            rounded-lg border p-3
            ${isDark ? 'bg-gray-750 border-gray-600' : 'border-gray-200 bg-gray-50'}
          `}
          >
            <div className="mb-2 flex items-center space-x-2">
              <Zap className={`h-4 w-4 ${isDark ? 'text-green-400' : 'text-green-600'}`} />
              <span className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Successful
              </span>
            </div>
            <div className={`text-2xl font-bold ${isDark ? 'text-green-400' : 'text-green-600'}`}>
              {deploymentData.successful}
            </div>
          </div>

          <div
            className={`
            rounded-lg border p-3
            ${isDark ? 'bg-gray-750 border-gray-600' : 'border-gray-200 bg-gray-50'}
          `}
          >
            <div className="mb-2 flex items-center space-x-2">
              <Clock className={`h-4 w-4 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
              <span className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Avg Duration
              </span>
            </div>
            <div className={`text-2xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
              {deploymentData.avgDuration}
            </div>
          </div>

          <div
            className={`
            rounded-lg border p-3
            ${isDark ? 'bg-gray-750 border-gray-600' : 'border-gray-200 bg-gray-50'}
          `}
          >
            <div className="mb-2 flex items-center space-x-2">
              <GitBranch className={`h-4 w-4 ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`} />
              <span className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Failed
              </span>
            </div>
            <div className={`text-2xl font-bold ${isDark ? 'text-red-400' : 'text-red-600'}`}>
              {deploymentData.failed}
            </div>
          </div>
        </div>

        {/* Deployment Type Distribution */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Bar Chart Representation */}
          <div>
            <h4
              className={`mb-3 text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}
            >
              Deployment Methods
            </h4>
            <div className="space-y-3">
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    Webhook Triggers
                  </span>
                  <span
                    className={`text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}
                  >
                    {deploymentData.webhook} ({webhookPercentage}%)
                  </span>
                </div>
                <div className={`h-2 rounded-full ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500"
                    style={{ width: `${webhookPercentage}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between">
                  <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    Manual Deploys
                  </span>
                  <span
                    className={`text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}
                  >
                    {deploymentData.manual} ({manualPercentage}%)
                  </span>
                </div>
                <div className={`h-2 rounded-full ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-500"
                    style={{ width: `${manualPercentage}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Pie Chart Representation */}
          <div>
            <h4
              className={`mb-3 text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}
            >
              Success vs Failure Rate
            </h4>
            <div className="flex items-center justify-center">
              <div className="relative h-24 w-24">
                {/* Success circle */}
                <svg className="h-24 w-24 -rotate-90 transform" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke={isDark ? '#374151' : '#E5E7EB'}
                    strokeWidth="8"
                    fill="none"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="#10B981"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={`${successRate * 2.51} 251`}
                    strokeLinecap="round"
                    className="transition-all duration-700"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span
                    className={`text-sm font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}
                  >
                    {successRate}%
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-3 space-y-1">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Success</span>
                </div>
                <span className={`font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                  {deploymentData.successful}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2">
                  <div className="h-2 w-2 rounded-full bg-red-500" />
                  <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Failed</span>
                </div>
                <span className={`font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                  {deploymentData.failed}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div
          className={`
          mt-6 border-t pt-4
          ${isDark ? 'border-gray-700' : 'border-gray-200'}
        `}
        >
          <div className="flex items-center justify-between">
            <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Last deployment:
            </span>
            <span className={`text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
              {deploymentData.lastDeployment}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeploymentPanel;
