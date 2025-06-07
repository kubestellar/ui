import React, { useState } from 'react';
import { TrendingUp, Calendar, BarChart3, LineChart, Settings } from 'lucide-react';
import useTheme from '../../stores/themeStore';

export interface TrendData {
  metric: string;
  value: number;
  change: number;
  period: string;
}

interface TrendPanelProps {
  trends?: TrendData[];
  className?: string;
  height?: string;
}

const TrendPanel: React.FC<TrendPanelProps> = ({
  trends = [],
  className = '',
  height = 'h-96',
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [selectedMetric, setSelectedMetric] = useState('CPU Usage');
  const [timeRange, setTimeRange] = useState('24h');

  // Default dummy data
  const defaultTrends: TrendData[] = [
    { metric: 'CPU Usage', value: 67.5, change: -3.2, period: '24h' },
    { metric: 'Memory Usage', value: 78.9, change: 5.1, period: '24h' },
    { metric: 'Network I/O', value: 234.7, change: 12.3, period: '24h' },
    { metric: 'Disk Usage', value: 45.2, change: -1.8, period: '24h' },
  ];

  const trendData = trends.length > 0 ? trends : defaultTrends;

  // Mock chart data points for visualization
  const generateMockDataPoints = () => {
    const points = [];
    for (let i = 0; i < 24; i++) {
      points.push({
        time: `${i}:00`,
        value: Math.random() * 100 + 20,
      });
    }
    return points;
  };

  const chartData = generateMockDataPoints();

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
      ${height}
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
            ${isDark ? 'bg-indigo-900/20 text-indigo-400' : 'bg-indigo-100 text-indigo-600'}
          `}
          >
            <TrendingUp size={18} />
          </div>
          <h3
            className={`
            text-lg font-semibold
            ${isDark ? 'text-gray-100' : 'text-gray-900'}
          `}
          >
            Historical Trends
          </h3>
        </div>
        <div className="flex items-center space-x-2">
          {/* Metric Selector */}
          <select
            value={selectedMetric}
            onChange={e => setSelectedMetric(e.target.value)}
            className={`
              rounded border px-3 py-1 text-sm
              ${
                isDark
                  ? 'border-gray-600 bg-gray-700 text-gray-200'
                  : 'border-gray-300 bg-white text-gray-700'
              }
            `}
          >
            {trendData.map(trend => (
              <option key={trend.metric} value={trend.metric}>
                {trend.metric}
              </option>
            ))}
          </select>

          {/* Time Range Selector */}
          <select
            value={timeRange}
            onChange={e => setTimeRange(e.target.value)}
            className={`
              rounded border px-3 py-1 text-sm
              ${
                isDark
                  ? 'border-gray-600 bg-gray-700 text-gray-200'
                  : 'border-gray-300 bg-white text-gray-700'
              }
            `}
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>

          <button
            className={`
            rounded-lg p-2 transition-colors
            ${
              isDark
                ? 'text-gray-400 hover:bg-gray-700 hover:text-gray-300'
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
            }
          `}
          >
            <Settings size={16} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex h-full flex-col p-4">
        {/* Metrics Summary */}
        <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          {trendData.map((trend, index) => (
            <div
              key={index}
              className={`
                cursor-pointer rounded-lg border p-3 transition-all duration-200 hover:scale-105
                ${
                  selectedMetric === trend.metric
                    ? isDark
                      ? 'border-indigo-600 bg-indigo-900/20'
                      : 'border-indigo-300 bg-indigo-50'
                    : isDark
                      ? 'bg-gray-750 border-gray-600 hover:border-gray-500'
                      : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                }
              `}
              onClick={() => setSelectedMetric(trend.metric)}
            >
              <div className="mb-2 flex items-center justify-between">
                <span
                  className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}
                >
                  {trend.metric}
                </span>
                <span
                  className={`
                  text-xs font-medium
                  ${
                    trend.change >= 0
                      ? isDark
                        ? 'text-green-400'
                        : 'text-green-600'
                      : isDark
                        ? 'text-red-400'
                        : 'text-red-600'
                  }
                `}
                >
                  {trend.change >= 0 ? '+' : ''}
                  {trend.change}%
                </span>
              </div>
              <div className={`text-lg font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                {trend.value}
                <span
                  className={`ml-1 text-sm font-normal ${isDark ? 'text-gray-400' : 'text-gray-600'}`}
                >
                  {trend.metric.includes('Usage') ? '%' : 'MB/s'}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Chart Placeholder */}
        <div className="relative flex-1">
          <div
            className={`
            flex h-full items-center justify-center
            ${isDark ? 'bg-gray-750' : 'bg-gray-50'}
            rounded-lg border-2 border-dashed
            ${isDark ? 'border-gray-600' : 'border-gray-300'}
            min-h-[250px]
          `}
          >
            <div className="text-center">
              <div className="mb-4 flex items-center justify-center space-x-4">
                <LineChart size={32} className={`${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                <BarChart3 size={32} className={`${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
              </div>
              <p
                className={`
                mb-2 text-lg font-medium
                ${isDark ? 'text-gray-300' : 'text-gray-700'}
              `}
              >
                {selectedMetric} Trend Chart
              </p>
              <p
                className={`
                text-sm
                ${isDark ? 'text-gray-500' : 'text-gray-500'}
              `}
              >
                Interactive time-series visualization for {selectedMetric.toLowerCase()} over{' '}
                {timeRange}
              </p>

              {/* Mock trend line */}
              <div className="mx-auto mt-6" style={{ width: '300px', height: '100px' }}>
                <svg width="300" height="100" className="overflow-visible">
                  <defs>
                    <linearGradient id="trendGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" style={{ stopColor: '#3B82F6', stopOpacity: 0.3 }} />
                      <stop offset="100%" style={{ stopColor: '#3B82F6', stopOpacity: 0 }} />
                    </linearGradient>
                  </defs>

                  {/* Generate path from mock data */}
                  <path
                    d={`M 0,${100 - chartData[0].value} ${chartData
                      .map(
                        (point, index) =>
                          `L ${(index * 300) / (chartData.length - 1)},${100 - point.value}`
                      )
                      .join(' ')}`}
                    stroke="#3B82F6"
                    strokeWidth="2"
                    fill="none"
                    className="animate-pulse"
                  />

                  {/* Fill area under curve */}
                  <path
                    d={`M 0,${100 - chartData[0].value} ${chartData
                      .map(
                        (point, index) =>
                          `L ${(index * 300) / (chartData.length - 1)},${100 - point.value}`
                      )
                      .join(' ')} L 300,100 L 0,100 Z`}
                    fill="url(#trendGradient)"
                    className="animate-pulse"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Chart Controls Overlay */}
          <div className="absolute right-4 top-4 flex items-center space-x-2">
            <button
              className={`
              rounded-lg p-2 transition-colors
              ${
                isDark
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }
              border ${isDark ? 'border-gray-600' : 'border-gray-200'}
            `}
            >
              <Calendar size={14} />
            </button>
            <button
              className={`
              rounded-lg p-2 transition-colors
              ${
                isDark
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }
              border ${isDark ? 'border-gray-600' : 'border-gray-200'}
            `}
            >
              <BarChart3 size={14} />
            </button>
          </div>
        </div>

        {/* Footer Info */}
        <div
          className={`
          mt-4 flex items-center justify-between border-t pt-3
          ${isDark ? 'border-gray-700' : 'border-gray-200'}
        `}
        >
          <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
            Real-time data • Auto-refresh every 30s
          </span>
          <div className="flex items-center space-x-2">
            <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
            <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Live</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrendPanel;
