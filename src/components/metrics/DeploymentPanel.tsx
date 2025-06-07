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

const DeploymentPanel: React.FC<DeploymentPanelProps> = ({ 
  stats,
  className = ''
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Default dummy data
  const defaultStats: DeploymentStats = {
    total: 147,
    successful: 142,
    failed: 5,
    webhook: 89,
    manual: 58,
    avgDuration: '3m 42s',
    lastDeployment: '12 minutes ago'
  };

  const deploymentData = stats || defaultStats;
  const successRate = Math.round((deploymentData.successful / deploymentData.total) * 100);

  // Calculate percentages for pie chart
  const webhookPercentage = Math.round((deploymentData.webhook / deploymentData.total) * 100);
  const manualPercentage = Math.round((deploymentData.manual / deploymentData.total) * 100);

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
              ? 'bg-blue-900/20 text-blue-400' 
              : 'bg-blue-100 text-blue-600'
            }
          `}>
            <Rocket size={18} />
          </div>
          <h3 className={`
            font-semibold text-lg
            ${isDark ? 'text-gray-100' : 'text-gray-900'}
          `}>
            Deployment Analytics
          </h3>
        </div>
        <div className={`
          px-3 py-1 rounded-full text-sm font-medium
          ${isDark 
            ? 'bg-blue-900/20 text-blue-400' 
            : 'bg-blue-100 text-blue-700'
          }
        `}>
          {successRate}% Success Rate
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className={`
            p-3 rounded-lg border
            ${isDark ? 'bg-gray-750 border-gray-600' : 'bg-gray-50 border-gray-200'}
          `}>
            <div className="flex items-center space-x-2 mb-2">
              <TrendingUp className={`w-4 h-4 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
              <span className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Total
              </span>
            </div>
            <div className={`text-2xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
              {deploymentData.total}
            </div>
          </div>

          <div className={`
            p-3 rounded-lg border
            ${isDark ? 'bg-gray-750 border-gray-600' : 'bg-gray-50 border-gray-200'}
          `}>
            <div className="flex items-center space-x-2 mb-2">
              <Zap className={`w-4 h-4 ${isDark ? 'text-green-400' : 'text-green-600'}`} />
              <span className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Successful
              </span>
            </div>
            <div className={`text-2xl font-bold ${isDark ? 'text-green-400' : 'text-green-600'}`}>
              {deploymentData.successful}
            </div>
          </div>

          <div className={`
            p-3 rounded-lg border
            ${isDark ? 'bg-gray-750 border-gray-600' : 'bg-gray-50 border-gray-200'}
          `}>
            <div className="flex items-center space-x-2 mb-2">
              <Clock className={`w-4 h-4 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
              <span className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Avg Duration
              </span>
            </div>
            <div className={`text-2xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
              {deploymentData.avgDuration}
            </div>
          </div>

          <div className={`
            p-3 rounded-lg border
            ${isDark ? 'bg-gray-750 border-gray-600' : 'bg-gray-50 border-gray-200'}
          `}>
            <div className="flex items-center space-x-2 mb-2">
              <GitBranch className={`w-4 h-4 ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`} />
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Bar Chart Representation */}
          <div>
            <h4 className={`text-sm font-medium mb-3 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Deployment Methods
            </h4>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    Webhook Triggers
                  </span>
                  <span className={`text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                    {deploymentData.webhook} ({webhookPercentage}%)
                  </span>
                </div>
                <div className={`h-2 rounded-full ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
                  <div 
                    className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500"
                    style={{ width: `${webhookPercentage}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    Manual Deploys
                  </span>
                  <span className={`text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                    {deploymentData.manual} ({manualPercentage}%)
                  </span>
                </div>
                <div className={`h-2 rounded-full ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
                  <div 
                    className="h-full bg-gradient-to-r from-green-500 to-green-600 rounded-full transition-all duration-500"
                    style={{ width: `${manualPercentage}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Pie Chart Representation */}
          <div>
            <h4 className={`text-sm font-medium mb-3 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Success vs Failure Rate
            </h4>
            <div className="flex items-center justify-center">
              <div className="relative w-24 h-24">
                {/* Success circle */}
                <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
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
                  <span className={`text-sm font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                    {successRate}%
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-3 space-y-1">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Success</span>
                </div>
                <span className={`font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                  {deploymentData.successful}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full" />
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
        <div className={`
          mt-6 pt-4 border-t
          ${isDark ? 'border-gray-700' : 'border-gray-200'}
        `}>
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
