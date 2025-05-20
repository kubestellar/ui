import { useState } from 'react';
import { Network, Share2, AlertCircle, Check, ChevronDown } from 'lucide-react';
import { BindingPolicyInfo, ManagedCluster, Workload } from '../../types/bindingPolicy';
import useTheme from '../../stores/themeStore';

interface PolicyVisualizationProps {
  policy: BindingPolicyInfo;
  matchedClusters: ManagedCluster[];
  matchedWorkloads: Workload[];
  previewMode?: boolean;
}

const PolicyVisualization = ({
  policy,
  matchedClusters,
  matchedWorkloads,
  previewMode = false,
}: PolicyVisualizationProps) => {
  const [showDetails, setShowDetails] = useState(false);
  const theme = useTheme(state => state.theme);
  const isDarkTheme = theme === 'dark';

  // Calculate statistics
  const clusterCount = matchedClusters.length;
  const workloadCount = matchedWorkloads.length;
  const totalClusters = matchedClusters.length || 1;
  const matchRate = Math.round((clusterCount / totalClusters) * 100);

  return (
    <div
      className={`w-full rounded-lg p-6 shadow-lg ${isDarkTheme ? 'bg-slate-800 text-white' : 'bg-white'}`}
    >
      {/* Header Section */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Network className={`h-6 w-6 ${isDarkTheme ? 'text-blue-400' : 'text-blue-600'}`} />
          <h2 className={`text-xl font-semibold ${isDarkTheme ? 'text-white' : 'text-gray-800'}`}>
            {previewMode ? 'Policy Preview' : 'Policy Distribution'}
          </h2>
        </div>
        {previewMode && (
          <div className="flex items-center rounded-full bg-yellow-100 px-3 py-1 text-sm text-yellow-800">
            <AlertCircle className="mr-1 h-4 w-4" />
            Preview Mode
          </div>
        )}
      </div>

      {/* Main Visualization Section */}
      <div className="relative mb-8">
        <div className="flex items-start justify-between space-x-4">
          {/* Workload Section */}
          <div
            className={`w-1/3 rounded-lg border p-4 ${
              isDarkTheme ? 'border-blue-500 bg-slate-700' : 'border-blue-200 bg-blue-50'
            }`}
          >
            <h3
              className={`text-sm font-medium ${isDarkTheme ? 'text-blue-300' : 'text-blue-800'} mb-2`}
            >
              Workload Source
            </h3>
            <div className={`rounded p-3 shadow-sm ${isDarkTheme ? 'bg-slate-600' : 'bg-white'}`}>
              <code className={`text-sm ${isDarkTheme ? 'text-blue-300' : 'text-blue-900'}`}>
                {policy.workload}
              </code>
            </div>
            <div className="mt-2 text-sm text-blue-600">
              {workloadCount} matching workload{workloadCount !== 1 ? 's' : ''}
            </div>
          </div>

          {/* Distribution Arrow */}
          <div className="flex flex-shrink-0 flex-col items-center justify-center pt-8">
            <Share2 className={`h-6 w-6 ${isDarkTheme ? 'text-gray-400' : 'text-gray-500'}`} />
            <div className={`text-sm ${isDarkTheme ? 'text-gray-300' : 'text-gray-500'} mt-2`}>
              {matchRate}% Match
            </div>
          </div>

          {/* Clusters Section */}
          <div
            className={`w-2/3 rounded-lg border p-4 ${
              isDarkTheme ? 'border-purple-500 bg-slate-700' : 'border-purple-200 bg-purple-50'
            }`}
          >
            <h3
              className={`text-sm font-medium ${isDarkTheme ? 'text-purple-300' : 'text-purple-800'} mb-2`}
            >
              Target Clusters ({clusterCount})
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {matchedClusters.slice(0, 6).map(cluster => (
                <div
                  key={cluster.name}
                  className={`flex items-center space-x-2 rounded p-2 shadow-sm ${
                    isDarkTheme ? 'bg-slate-600' : 'bg-white'
                  }`}
                >
                  <Check className="h-4 w-4 text-green-500" />
                  <span
                    className={`truncate text-sm ${isDarkTheme ? 'text-gray-200' : 'text-gray-700'}`}
                  >
                    {cluster.name}
                  </span>
                </div>
              ))}
              {clusterCount > 6 && (
                <div className="flex items-center justify-center rounded bg-purple-100 p-2 text-sm text-purple-700">
                  +{clusterCount - 6} more
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Insights Section */}
      <div className={`mt-6 border-t pt-4 ${isDarkTheme ? 'border-gray-600' : 'border-gray-100'}`}>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className={`flex items-center space-x-2 ${
            isDarkTheme ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          <ChevronDown
            className={`h-5 w-5 transform transition-transform ${showDetails ? 'rotate-180' : ''}`}
          />
          <span className="text-sm font-medium">Policy Insights</span>
        </button>

        {showDetails && (
          <div className="mt-4 grid grid-cols-3 gap-4">
            <div className="rounded bg-gray-50 p-3">
              <div className="text-sm font-medium text-gray-600">Status</div>
              <div className="mt-1 text-sm">
                {policy.status === 'Active' ? (
                  <span className="flex items-center text-green-600">
                    <Check className="mr-1 h-4 w-4" /> Active
                  </span>
                ) : (
                  <span className="text-gray-600">{policy.status}</span>
                )}
              </div>
            </div>
            <div className="rounded bg-gray-50 p-3">
              <div className="text-sm font-medium text-gray-600">Last Modified</div>
              <div className="mt-1 text-sm text-gray-800">
                {policy.lastModifiedDate
                  ? new Date(policy.lastModifiedDate).toLocaleDateString()
                  : 'Not modified'}
              </div>
            </div>
            <div className="rounded bg-gray-50 p-3">
              <div className="text-sm font-medium text-gray-600">Match Rate</div>
              <div className="mt-1 text-sm text-gray-800">{matchRate}% of available clusters</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PolicyVisualization;
