import React from 'react';
import { Cpu, MemoryStick, Zap, Activity, HardDrive } from 'lucide-react';
import useTheme from '../../stores/themeStore';

export interface PerformanceMetrics {
  memory: {
    used: string;
    total: string;
    percentage: number;
  };
  cpu: {
    usage: number;
    cores: number;
  };
  goroutines: {
    active: number;
    peak: number;
  };
  gc: {
    collections: number;
    pauseTime: string;
  };
  heap: {
    size: string;
    objects: number;
  };
}

interface PerformancePanelProps {
  metrics?: PerformanceMetrics;
  className?: string;
}

const PerformancePanel: React.FC<PerformancePanelProps> = ({ metrics, className = '' }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Default dummy data
  const defaultMetrics: PerformanceMetrics = {
    memory: {
      used: '342 MB',
      total: '512 MB',
      percentage: 67,
    },
    cpu: {
      usage: 23.5,
      cores: 4,
    },
    goroutines: {
      active: 156,
      peak: 203,
    },
    gc: {
      collections: 1247,
      pauseTime: '1.2ms',
    },
    heap: {
      size: '289 MB',
      objects: 425893,
    },
  };

  const performanceData = metrics || defaultMetrics;

  const getUsageColor = (percentage: number) => {
    if (percentage < 50) return isDark ? 'text-green-400' : 'text-green-600';
    if (percentage < 80) return isDark ? 'text-yellow-400' : 'text-yellow-600';
    return isDark ? 'text-red-400' : 'text-red-600';
  };

  const getUsageBgColor = (percentage: number) => {
    if (percentage < 50) return 'from-green-500 to-green-600';
    if (percentage < 80) return 'from-yellow-500 to-yellow-600';
    return 'from-red-500 to-red-600';
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
            ${isDark ? 'bg-purple-900/20 text-purple-400' : 'bg-purple-100 text-purple-600'}
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
            Go Runtime Performance
          </h3>
        </div>
        <div
          className={`
          rounded-full px-3 py-1 text-sm font-medium
          ${isDark ? 'bg-green-900/20 text-green-400' : 'bg-green-100 text-green-700'}
        `}
        >
          Healthy
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Main Metrics Grid */}
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Memory Usage */}
          <div
            className={`
            rounded-lg border p-4
            ${isDark ? 'bg-gray-750 border-gray-600' : 'border-gray-200 bg-gray-50'}
          `}
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <MemoryStick className={`h-5 w-5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                <span className={`font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                  Memory
                </span>
              </div>
              <span
                className={`text-sm font-medium ${getUsageColor(performanceData.memory.percentage)}`}
              >
                {performanceData.memory.percentage}%
              </span>
            </div>

            <div className="space-y-2">
              <div className={`h-2 rounded-full ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
                <div
                  className={`h-full bg-gradient-to-r ${getUsageBgColor(performanceData.memory.percentage)} rounded-full transition-all duration-500`}
                  style={{ width: `${performanceData.memory.percentage}%` }}
                />
              </div>
              <div className="flex justify-between text-sm">
                <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>
                  {performanceData.memory.used}
                </span>
                <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>
                  / {performanceData.memory.total}
                </span>
              </div>
            </div>
          </div>

          {/* CPU Usage */}
          <div
            className={`
            rounded-lg border p-4
            ${isDark ? 'bg-gray-750 border-gray-600' : 'border-gray-200 bg-gray-50'}
          `}
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Cpu className={`h-5 w-5 ${isDark ? 'text-green-400' : 'text-green-600'}`} />
                <span className={`font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                  CPU Usage
                </span>
              </div>
              <span className={`text-sm font-medium ${getUsageColor(performanceData.cpu.usage)}`}>
                {performanceData.cpu.usage}%
              </span>
            </div>

            <div className="space-y-2">
              <div className={`h-2 rounded-full ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
                <div
                  className={`h-full bg-gradient-to-r ${getUsageBgColor(performanceData.cpu.usage)} rounded-full transition-all duration-500`}
                  style={{ width: `${performanceData.cpu.usage}%` }}
                />
              </div>
              <div className="text-sm">
                <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>
                  {performanceData.cpu.cores} cores available
                </span>
              </div>
            </div>
          </div>

          {/* Goroutines */}
          <div
            className={`
            rounded-lg border p-4
            ${isDark ? 'bg-gray-750 border-gray-600' : 'border-gray-200 bg-gray-50'}
          `}
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Zap className={`h-5 w-5 ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`} />
                <span className={`font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                  Goroutines
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <div className={`text-2xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                {performanceData.goroutines.active.toLocaleString()}
              </div>
              <div className="text-sm">
                <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>
                  Peak: {performanceData.goroutines.peak.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Metrics */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Garbage Collector */}
          <div
            className={`
            rounded-lg border p-4
            ${isDark ? 'bg-gray-750 border-gray-600' : 'border-gray-200 bg-gray-50'}
          `}
          >
            <h4
              className={`mb-3 flex items-center space-x-2 font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}
            >
              <Activity className={`h-4 w-4 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
              <span>Garbage Collector</span>
            </h4>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Collections
                </span>
                <span
                  className={`text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}
                >
                  {performanceData.gc.collections.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Avg Pause Time
                </span>
                <span
                  className={`text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}
                >
                  {performanceData.gc.pauseTime}
                </span>
              </div>
            </div>
          </div>

          {/* Heap Statistics */}
          <div
            className={`
            rounded-lg border p-4
            ${isDark ? 'bg-gray-750 border-gray-600' : 'border-gray-200 bg-gray-50'}
          `}
          >
            <h4
              className={`mb-3 flex items-center space-x-2 font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}
            >
              <HardDrive className={`h-4 w-4 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} />
              <span>Heap Statistics</span>
            </h4>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Heap Size
                </span>
                <span
                  className={`text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}
                >
                  {performanceData.heap.size}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Objects
                </span>
                <span
                  className={`text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}
                >
                  {performanceData.heap.objects.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Performance Indicators */}
        <div
          className={`
          mt-6 flex items-center justify-between border-t pt-4
          ${isDark ? 'border-gray-700' : 'border-gray-200'}
        `}
        >
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
              <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Runtime healthy
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="h-2 w-2 rounded-full bg-blue-500" />
              <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                GC optimized
              </span>
            </div>
          </div>
          <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
            Updated 30 seconds ago
          </span>
        </div>
      </div>
    </div>
  );
};

export default PerformancePanel;
