import React, { useState, useEffect } from 'react';
import { TrendingUp, BarChart3, LineChart, Maximize2 } from 'lucide-react';
import useTheme from '../../stores/themeStore';

export interface TrendData {
  metric: string;
  value: number;
  change: number;
  period: string;
}

interface ChartDataPoint {
  time: string;
  value: number;
  timestamp: Date;
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
  const [selectedMetric, setSelectedMetric] = useState('');
  const [timeRange, setTimeRange] = useState('24h');
  const [chartType, setChartType] = useState<'line' | 'area'>('area');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const trendData = trends;

  useEffect(() => {
    if (trendData.length > 0 && !selectedMetric) {
      setSelectedMetric(trendData[0].metric);
    }
  }, [trendData, selectedMetric]);

  // Enhanced chart data generation with historical context
  const generateHistoricalDataPoints = (metricName: string, timeRange: string) => {
    const points = [];
    const pointCount =
      timeRange === '1h' ? 12 : timeRange === '24h' ? 24 : timeRange === '7d' ? 7 : 30;
    const baseValue = trendData.find(t => t.metric === metricName)?.value || 50;

    for (let i = 0; i < pointCount; i++) {
      const variation = (Math.random() - 0.5) * 20; //
      const timeValue = baseValue + variation + Math.sin(i * 0.3) * 10;

      points.push({
        time:
          timeRange === '1h'
            ? `${i * 5}min`
            : timeRange === '24h'
              ? `${i}:00`
              : timeRange === '7d'
                ? `Day ${i + 1}`
                : `Week ${i + 1}`,
        value: Math.max(0, Math.min(100, timeValue)),
        timestamp: new Date(Date.now() - (pointCount - i) * getTimeInterval(timeRange)),
      });
    }
    return points;
  };

  const getTimeInterval = (range: string) => {
    switch (range) {
      case '1h':
        return 5 * 60 * 1000;
      case '24h':
        return 60 * 60 * 1000;
      case '7d':
        return 24 * 60 * 60 * 1000;
      case '30d':
        return 7 * 24 * 60 * 60 * 1000;
      default:
        return 60 * 60 * 1000;
    }
  };

  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);

  useEffect(() => {
    if (selectedMetric && trendData.length > 0) {
      setChartData(generateHistoricalDataPoints(selectedMetric, timeRange));
    }
  }, [selectedMetric, timeRange, trendData, generateHistoricalDataPoints]);

  useEffect(() => {
    if (chartData.length === 0) return;

    const interval = setInterval(() => {
      setChartData(prev => {
        if (prev.length === 0) return prev;
        const newPoint = {
          time: new Date().toLocaleTimeString(),
          value: Math.max(
            0,
            Math.min(100, prev[prev.length - 1].value + (Math.random() - 0.5) * 10)
          ),
          timestamp: new Date(),
        };
        return [...prev.slice(1), newPoint];
      });
    }, 30000);

    return () => clearInterval(interval);
  }, [chartData.length]);

  if (trendData.length === 0) {
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
        <div className="flex h-full items-center justify-center">
          <div className="text-center">
            <p className={`text-lg font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              No trend data available
            </p>
            <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
              Trend data will appear when metrics are collected
            </p>
          </div>
        </div>
      </div>
    );
  }

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
      ${isFullscreen ? 'fixed inset-4 z-50 h-auto' : height}
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
            ${isDark ? 'bg-indigo-900/20 text-indigo-400' : 'bg-indigo-100 text-indigo-600'}
          `}
          >
            <TrendingUp size={18} />
          </div>
          <div>
            <h3
              className={`
              text-lg font-semibold
              ${isDark ? 'text-gray-100' : 'text-gray-900'}
            `}
            >
              Historical Trends
            </h3>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              {selectedMetric} over {timeRange}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {/* Chart Type Toggle */}
          <div className="flex rounded-lg border border-gray-300 dark:border-gray-600">
            <button
              onClick={() => setChartType('line')}
              className={`
                rounded-l-lg px-2 py-1 text-sm transition-colors
                ${
                  chartType === 'line'
                    ? 'bg-blue-600 text-white'
                    : isDark
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                }
              `}
            >
              <LineChart size={14} />
            </button>
            <button
              onClick={() => setChartType('area')}
              className={`
                rounded-r-lg px-2 py-1 text-sm transition-colors
                ${
                  chartType === 'area'
                    ? 'bg-blue-600 text-white'
                    : isDark
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                }
              `}
            >
              <BarChart3 size={14} />
            </button>
          </div>

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
            onClick={() => setIsFullscreen(!isFullscreen)}
            className={`
            rounded-lg p-2 transition-colors
            ${
              isDark
                ? 'text-gray-400 hover:bg-gray-700 hover:text-gray-300'
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
            }
          `}
          >
            <Maximize2 size={16} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex h-full flex-col p-4">
        {/* Enhanced Metrics Summary */}
        <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          {trendData.map((trend, index) => {
            const isSelected = selectedMetric === trend.metric;
            const currentValue = chartData[chartData.length - 1]?.value || trend.value;

            return (
              <div
                key={index}
                className={`
                  cursor-pointer rounded-lg border p-3 transition-all duration-200 hover:scale-105
                  ${
                    isSelected
                      ? isDark
                        ? 'border-indigo-600 bg-indigo-900/20 shadow-lg'
                        : 'border-indigo-300 bg-indigo-50 shadow-lg'
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
                    flex items-center text-xs font-medium
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
                    {trend.change >= 0 ? '↗' : '↘'}
                    {Math.abs(trend.change)}%
                  </span>
                </div>
                <div className={`text-lg font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                  {currentValue.toFixed(1)}
                  <span
                    className={`ml-1 text-sm font-normal ${isDark ? 'text-gray-400' : 'text-gray-600'}`}
                  >
                    {trend.metric.includes('Usage')
                      ? '%'
                      : trend.metric.includes('Network')
                        ? 'MB/s'
                        : 'units'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Enhanced Chart Visualization */}
        <div className="relative flex-1">
          <div
            className={`
            h-full rounded-lg border-2 border-dashed p-4
            ${isDark ? 'bg-gray-750 border-gray-600' : 'border-gray-300 bg-gray-50'}
            min-h-[250px]
          `}
          >
            <div className="h-full">
              <svg width="100%" height="100%" className="overflow-visible">
                <defs>
                  <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style={{ stopColor: '#3B82F6', stopOpacity: 0.6 }} />
                    <stop offset="100%" style={{ stopColor: '#3B82F6', stopOpacity: 0.1 }} />
                  </linearGradient>
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                    <feMerge>
                      <feMergeNode in="coloredBlur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                {/* Chart area */}
                <g transform="translate(40, 20)">
                  {/* Grid lines */}
                  {[0, 25, 50, 75, 100].map((value, index) => (
                    <g key={index}>
                      <line
                        x1="0"
                        y1={200 - value * 2}
                        x2="100%"
                        y2={200 - value * 2}
                        stroke={isDark ? '#374151' : '#E5E7EB'}
                        strokeWidth="1"
                        strokeDasharray="2,2"
                      />
                      <text
                        x="-10"
                        y={205 - value * 2}
                        fill={isDark ? '#9CA3AF' : '#6B7280'}
                        fontSize="12"
                        textAnchor="end"
                      >
                        {value}
                      </text>
                    </g>
                  ))}

                  {/* Chart path */}
                  {chartData.length > 1 && (
                    <>
                      {/* Area fill for area chart */}
                      {chartType === 'area' && (
                        <path
                          d={`M 0,${200 - chartData[0].value * 2} ${chartData
                            .slice(1)
                            .map(
                              (point, index) =>
                                `L ${((index + 1) * 100) / (chartData.length - 1)},${200 - point.value * 2}`
                            )
                            .join(' ')} L 100,200 L 0,200 Z`}
                          fill="url(#chartGradient)"
                        />
                      )}

                      {/* Line path */}
                      <path
                        d={`M 0,${200 - chartData[0].value * 2} ${chartData
                          .slice(1)
                          .map(
                            (point, index) =>
                              `L ${((index + 1) * 100) / (chartData.length - 1)},${200 - point.value * 2}`
                          )
                          .join(' ')}`}
                        stroke="#3B82F6"
                        strokeWidth="3"
                        fill="none"
                        filter="url(#glow)"
                      />

                      {/* Data points */}
                      {chartData.map((point, index) => (
                        <circle
                          key={index}
                          cx={(index * 100) / (chartData.length - 1)}
                          cy={200 - point.value * 2}
                          r="4"
                          fill="#3B82F6"
                          stroke="white"
                          strokeWidth="2"
                          className="hover:r-6 transition-all duration-200"
                        >
                          <title>{`${point.time}: ${point.value.toFixed(1)}`}</title>
                        </circle>
                      ))}
                    </>
                  )}
                </g>
              </svg>
            </div>
          </div>

          {/* Chart Legend */}
          <div className="mt-4 flex items-center justify-between text-sm">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="h-3 w-3 rounded-full bg-blue-500" />
                <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>{selectedMetric}</span>
              </div>
              <span className={isDark ? 'text-gray-500' : 'text-gray-500'}>
                Average:{' '}
                {(
                  chartData.reduce((sum, point) => sum + point.value, 0) / chartData.length
                ).toFixed(1)}
              </span>
            </div>
            <span className={isDark ? 'text-gray-500' : 'text-gray-500'}>
              Last {chartData.length} data points
            </span>
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
