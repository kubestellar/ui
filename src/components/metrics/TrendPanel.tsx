import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { TrendingUp, BarChart3, PieChart, Maximize2 } from 'lucide-react';
import useTheme from '../../stores/themeStore';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  ChartOptions,
  ChartData,
} from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

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

type ChartType = 'bar' | 'pie';
type TimeRange = '1h' | '24h' | '7d' | '30d';

interface TrendPanelProps {
  trends?: TrendData[];
  className?: string;
  height?: string;
  onMetricSelect?: (metric: string) => void;
  isLoading?: boolean;
}

const TrendPanel: React.FC<TrendPanelProps> = ({
  trends = [],
  className = '',
  height = 'h-96',
  onMetricSelect,
  isLoading = false,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Initialize selected metric with the first trend if available
  const [selectedMetric, setSelectedMetric] = useState<string>(trends[0]?.metric || '');
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Update selected metric when trends data changes, but only if no metric is currently selected
  useEffect(() => {
    if (trends.length > 0 && !selectedMetric) {
      setSelectedMetric(trends[0].metric);
    }
  }, [trends, selectedMetric]);

  // Generate historical data points
  const generateHistoricalDataPoints = useCallback(
    (metricName: string, timeRange: TimeRange): ChartDataPoint[] => {
      const pointCount = {
        '1h': 12,
        '24h': 24,
        '7d': 7,
        '30d': 30,
      }[timeRange];

      // Only generate data for the selected metric
      const selectedTrend = trends.find(t => t.metric === metricName);
      if (!selectedTrend) return [];

      const baseValue = selectedTrend.value;
      const points: ChartDataPoint[] = [];

      for (let i = 0; i < pointCount; i++) {
        const variation = (Math.random() - 0.5) * 20;
        const timeValue = baseValue + variation + Math.sin(i * 0.3) * 10;

        const timeLabel = {
          '1h': `${i * 5}min`,
          '24h': `${i}:00`,
          '7d': `Day ${i + 1}`,
          '30d': `Week ${i + 1}`,
        }[timeRange];

        const timeInterval = {
          '1h': 5 * 60 * 1000,
          '24h': 60 * 60 * 1000,
          '7d': 24 * 60 * 60 * 1000,
          '30d': 7 * 24 * 60 * 60 * 1000,
        }[timeRange];

        points.push({
          time: timeLabel,
          value: Math.max(0, Math.min(100, timeValue)),
          timestamp: new Date(Date.now() - (pointCount - i) * timeInterval),
        });
      }

      return points;
    },
    [trends]
  );

  // Memoized chart data
  const chartData = useMemo<ChartDataPoint[]>(() => {
    if (!selectedMetric || trends.length === 0) return [];
    return generateHistoricalDataPoints(selectedMetric, timeRange);
  }, [selectedMetric, timeRange, trends, generateHistoricalDataPoints]);

  // Chart configuration
  const chartOptions = useMemo<ChartOptions<'bar'> | ChartOptions<'pie'>>(() => {
    const baseOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top' as const,
          labels: {
            color: isDark ? '#E5E7EB' : '#374151',
          },
        },
        title: {
          display: false,
        },
      },
      layout: {
        padding: {
          top: 10,
          right: 10,
          bottom: 10,
          left: 10,
        },
      },
    };

    if (chartType === 'bar') {
      return {
        ...baseOptions,
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: isDark ? '#374151' : '#E5E7EB',
            },
            ticks: {
              color: isDark ? '#9CA3AF' : '#6B7280',
            },
          },
          x: {
            grid: {
              color: isDark ? '#374151' : '#E5E7EB',
            },
            ticks: {
              color: isDark ? '#9CA3AF' : '#6B7280',
            },
          },
        },
      } as ChartOptions<'bar'>;
    }

    return baseOptions as ChartOptions<'pie'>;
  }, [isDark, chartType]);

  // Chart data preparation
  const barChartData = useMemo<ChartData<'bar'>>(
    () => ({
      labels: chartData.map(point => point.time),
      datasets: [
        {
          label: selectedMetric,
          data: chartData.map(point => point.value),
          backgroundColor: 'rgba(59, 130, 246, 0.5)',
          borderColor: 'rgb(59, 130, 246)',
          borderWidth: 1,
        },
      ],
    }),
    [chartData, selectedMetric]
  );

  const pieChartData = useMemo<ChartData<'pie'>>(
    () => ({
      labels: chartData.map(point => point.time),
      datasets: [
        {
          data: chartData.map(point => point.value),
          backgroundColor: [
            'rgba(59, 130, 246, 0.5)',
            'rgba(16, 185, 129, 0.5)',
            'rgba(245, 158, 11, 0.5)',
            'rgba(239, 68, 68, 0.5)',
            'rgba(139, 92, 246, 0.5)',
          ],
          borderColor: [
            'rgb(59, 130, 246)',
            'rgb(16, 185, 129)',
            'rgb(245, 158, 11)',
            'rgb(239, 68, 68)',
            'rgb(139, 92, 246)',
          ],
          borderWidth: 1,
        },
      ],
    }),
    [chartData]
  );

  // Event handlers
  const handleMetricSelect = useCallback(
    (metric: string) => {
      setSelectedMetric(metric);
      // Only call onMetricSelect if it's provided
      if (onMetricSelect) {
        onMetricSelect(metric);
      }
    },
    [onMetricSelect]
  );

  const handleTimeRangeChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    setTimeRange(event.target.value as TimeRange);
  }, []);

  const handleChartTypeChange = useCallback((type: ChartType) => {
    setChartType(type);
  }, []);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev);
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <div
        className={`
          rounded-xl border shadow-sm transition-all duration-300
          ${isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}
          ${className}
          ${height}
        `}
      >
        <div className="flex h-full items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>
            <p className={`mt-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Loading trend data...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  if (trends.length === 0) {
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
        role="region"
        aria-label="Trend data panel"
      >
        <div className="flex h-full items-center justify-center">
          <div className="text-center">
            <TrendingUp
              size={48}
              className={`mx-auto mb-4 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}
            />
            <h3 className={`text-lg font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              No trend data available
            </h3>
            <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
              Trend data will appear when metrics are collected
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <section
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
      role="region"
      aria-label="Historical trends panel"
    >
      {/* Header */}
      <header
        className={`
          flex items-center justify-between border-b px-5 pb-3 pt-5
          ${isDark ? 'border-gray-700' : 'border-gray-200'}
        `}
      >
        <div className="flex items-center space-x-3">
          <div
            className={`
              rounded-lg p-2
              ${isDark ? 'bg-indigo-900/20 text-indigo-400' : 'bg-indigo-100 text-indigo-600'}
            `}
            aria-hidden="true"
          >
            <TrendingUp size={18} />
          </div>
          <div>
            <h2
              className={`
                text-lg font-semibold
                ${isDark ? 'text-gray-100' : 'text-gray-900'}
              `}
            >
              Historical Trends
            </h2>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              {selectedMetric} over {timeRange}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* Chart Type Toggle */}
          <div
            className="flex overflow-hidden rounded-lg border border-gray-200 dark:border-gray-600"
            role="group"
            aria-label="Chart type selection"
          >
            <button
              onClick={() => handleChartTypeChange('bar')}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors
                ${
                  chartType === 'bar'
                    ? 'bg-blue-600 text-white'
                    : isDark
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                }
              `}
              aria-pressed={chartType === 'bar'}
              aria-label="Bar chart"
              type="button"
            >
              <BarChart3 size={14} />
              <span>Bar</span>
            </button>
            <button
              onClick={() => handleChartTypeChange('pie')}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors
                ${
                  chartType === 'pie'
                    ? 'bg-blue-600 text-white'
                    : isDark
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                }
              `}
              aria-pressed={chartType === 'pie'}
              aria-label="Pie chart"
              type="button"
            >
              <PieChart size={14} />
              <span>Pie</span>
            </button>
          </div>

          {/* Metric Selector */}
          <select
            value={selectedMetric}
            onChange={e => handleMetricSelect(e.target.value)}
            className={`
              rounded-lg border px-3 py-1.5 text-sm transition-colors
              ${
                isDark
                  ? 'border-gray-600 bg-gray-700 text-gray-200 hover:bg-gray-600'
                  : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
              }
            `}
            aria-label="Select metric"
          >
            {trends.map(trend => (
              <option key={trend.metric} value={trend.metric}>
                {trend.metric}
              </option>
            ))}
          </select>

          {/* Time Range Selector */}
          <select
            value={timeRange}
            onChange={handleTimeRangeChange}
            className={`
              rounded-lg border px-3 py-1.5 text-sm transition-colors
              ${
                isDark
                  ? 'border-gray-600 bg-gray-700 text-gray-200 hover:bg-gray-600'
                  : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
              }
            `}
            aria-label="Select time range"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>

          <button
            onClick={toggleFullscreen}
            className={`
              flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition-colors
              ${
                isDark
                  ? 'border-gray-600 bg-gray-700 text-gray-200 hover:bg-gray-600'
                  : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
              }
            `}
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            type="button"
          >
            <Maximize2 size={14} />
            <span>{isFullscreen ? 'Exit' : 'Fullscreen'}</span>
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="flex h-full flex-col">
        {/* Metrics Summary */}
        <div className="flex-shrink-0 p-5 pb-3">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {trends.map(trend => {
              const isSelected = selectedMetric === trend.metric;
              const currentValue = isSelected
                ? chartData[chartData.length - 1]?.value || trend.value
                : trend.value;

              return (
                <button
                  key={trend.metric}
                  className={`
                    cursor-pointer rounded-lg border p-3 text-left transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500
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
                  onClick={() => handleMetricSelect(trend.metric)}
                  aria-pressed={isSelected}
                  type="button"
                >
                  <div className="mb-2">
                    <span
                      className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}
                    >
                      {trend.metric}
                    </span>
                  </div>
                  <div
                    className={`text-lg font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}
                  >
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
                </button>
              );
            })}
          </div>
        </div>

        {/* Chart Visualization */}
        <div className="min-h-0 flex-1 px-5 pb-4">
          <div
            className={`
              w-full overflow-hidden rounded-lg border
              ${isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}
            `}
            style={{
              height: 'calc(100% - 20px)',
              minHeight: '180px',
            }}
          >
            <div className="h-full w-full p-2">
              <div
                style={{
                  height: 'calc(100% - 8px)',
                  width: '100%',
                  position: 'relative',
                  overflow: 'hidden',
                }}
                role="img"
                aria-label={`${chartType} chart showing ${selectedMetric} over ${timeRange}`}
              >
                {chartType === 'bar' ? (
                  <Bar options={chartOptions as ChartOptions<'bar'>} data={barChartData} />
                ) : (
                  <Pie options={chartOptions as ChartOptions<'pie'>} data={pieChartData} />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer
          className={`
            mx-5 mb-4 flex flex-shrink-0 items-center justify-between border-t pt-3
            ${isDark ? 'border-gray-700' : 'border-gray-200'}
          `}
        >
          <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
            Real-time data • Auto-refresh every 30s
          </span>
          <div className="flex items-center space-x-2">
            <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" aria-hidden="true" />
            <span
              className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}
              aria-label="Live data indicator"
            >
              Live
            </span>
          </div>
        </footer>
      </div>
    </section>
  );
};

export default TrendPanel;
