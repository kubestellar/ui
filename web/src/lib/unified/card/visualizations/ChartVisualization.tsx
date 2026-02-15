/**
 * ChartVisualization - Renders data as various chart types
 *
 * Supports: line, bar, donut, gauge, sparkline, area
 * Uses Recharts library for rendering.
 */

import { useMemo } from 'react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { CardContentChart, CardChartSeries, CardAxisConfig } from '../../types'

export interface ChartVisualizationProps {
  /** Content configuration */
  content: CardContentChart
  /** Data to display */
  data: unknown[]
}

// Default color palette for series
const DEFAULT_COLORS = [
  '#3b82f6', // blue
  '#22c55e', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#06b6d4', // cyan
  '#f97316', // orange
  '#ec4899', // pink
]

/**
 * ChartVisualization - Renders charts from config
 */
export function ChartVisualization({ content, data }: ChartVisualizationProps) {
  const {
    chartType,
    series: rawSeries,
    xAxis,
    yAxis,
    showLegend = true,
    height = 200,
  } = content

  // Derive series from yAxis if not explicitly provided
  const series: CardChartSeries[] = rawSeries ?? (
    Array.isArray(yAxis)
      ? yAxis.map(field => ({ field }))
      : yAxis && typeof yAxis === 'string'
        ? [{ field: yAxis }]
        : []
  )

  // Render the appropriate chart type
  switch (chartType) {
    case 'line':
      return (
        <LineChartRenderer
          data={data}
          series={series}
          xAxis={xAxis}
          yAxis={yAxis}
          showLegend={showLegend}
          height={height}
        />
      )

    case 'area':
      return (
        <AreaChartRenderer
          data={data}
          series={series}
          xAxis={xAxis}
          yAxis={yAxis}
          showLegend={showLegend}
          height={height}
        />
      )

    case 'bar':
      return (
        <BarChartRenderer
          data={data}
          series={series}
          xAxis={xAxis}
          yAxis={yAxis}
          showLegend={showLegend}
          height={height}
        />
      )

    case 'donut':
      return (
        <DonutChartRenderer
          data={data}
          series={series}
          showLegend={showLegend}
          height={height}
        />
      )

    case 'gauge':
      return (
        <GaugeChartRenderer
          data={data}
          series={series}
          height={height}
        />
      )

    case 'sparkline':
      return (
        <SparklineRenderer
          data={data}
          series={series}
          height={height}
        />
      )

    default:
      return (
        <div className="flex items-center justify-center h-full text-gray-500 text-sm">
          Unknown chart type: {chartType}
        </div>
      )
  }
}

interface ChartRendererProps {
  data: unknown[]
  series: CardChartSeries[]
  xAxis?: CardAxisConfig | string
  yAxis?: CardAxisConfig | string | string[]
  showLegend?: boolean
  height: number
}

/**
 * Normalize axis config to full CardAxisConfig object
 */
function normalizeAxisConfig(axis?: CardAxisConfig | string | string[]): CardAxisConfig | undefined {
  if (!axis) return undefined
  if (typeof axis === 'string') {
    return { field: axis }
  }
  if (Array.isArray(axis)) {
    return { field: axis[0] }
  }
  return axis
}

/**
 * Line Chart Renderer
 */
function LineChartRenderer({
  data,
  series,
  xAxis: xAxisProp,
  yAxis: yAxisProp,
  showLegend,
  height,
}: ChartRendererProps) {
  const xAxis = normalizeAxisConfig(xAxisProp)
  const yAxis = normalizeAxisConfig(yAxisProp)
  const xField = xAxis?.field ?? 'time'

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <LineChart data={data as Record<string, unknown>[]}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis
            dataKey={xField}
            tick={{ fill: '#9ca3af', fontSize: 11 }}
            axisLine={{ stroke: '#4b5563' }}
            tickLine={{ stroke: '#4b5563' }}
          />
          <YAxis
            tick={{ fill: '#9ca3af', fontSize: 11 }}
            axisLine={{ stroke: '#4b5563' }}
            tickLine={{ stroke: '#4b5563' }}
            label={
              yAxis?.label
                ? { value: yAxis.label, angle: -90, position: 'insideLeft', fill: '#9ca3af' }
                : undefined
            }
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1f2937',
              border: '1px solid #374151',
              borderRadius: '0.375rem',
            }}
            labelStyle={{ color: '#e5e7eb' }}
            itemStyle={{ color: '#e5e7eb' }}
          />
          {showLegend && (
            <Legend
              wrapperStyle={{ paddingTop: 10 }}
              formatter={(value) => <span className="text-gray-300 text-xs">{value}</span>}
            />
          )}
          {series.map((s, i) => (
            <Line
              key={s.field}
              type="monotone"
              dataKey={s.field}
              name={s.label ?? s.field}
              stroke={s.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length]}
              strokeWidth={2}
              strokeDasharray={s.style === 'dashed' ? '5 5' : s.style === 'dotted' ? '2 2' : undefined}
              dot={false}
              activeDot={{ r: 4 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

/**
 * Area Chart Renderer
 */
function AreaChartRenderer({
  data,
  series,
  xAxis: xAxisProp,
  yAxis: yAxisProp,
  showLegend,
  height,
}: ChartRendererProps) {
  const xAxis = normalizeAxisConfig(xAxisProp)
  const yAxis = normalizeAxisConfig(yAxisProp)
  const xField = xAxis?.field ?? 'time'

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <AreaChart data={data as Record<string, unknown>[]}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis
            dataKey={xField}
            tick={{ fill: '#9ca3af', fontSize: 11 }}
            axisLine={{ stroke: '#4b5563' }}
            tickLine={{ stroke: '#4b5563' }}
          />
          <YAxis
            tick={{ fill: '#9ca3af', fontSize: 11 }}
            axisLine={{ stroke: '#4b5563' }}
            tickLine={{ stroke: '#4b5563' }}
            label={
              yAxis?.label
                ? { value: yAxis.label, angle: -90, position: 'insideLeft', fill: '#9ca3af' }
                : undefined
            }
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1f2937',
              border: '1px solid #374151',
              borderRadius: '0.375rem',
            }}
            labelStyle={{ color: '#e5e7eb' }}
            itemStyle={{ color: '#e5e7eb' }}
          />
          {showLegend && (
            <Legend
              wrapperStyle={{ paddingTop: 10 }}
              formatter={(value) => <span className="text-gray-300 text-xs">{value}</span>}
            />
          )}
          {series.map((s, i) => {
            const color = s.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length]
            return (
              <Area
                key={s.field}
                type="monotone"
                dataKey={s.field}
                name={s.label ?? s.field}
                stroke={color}
                fill={color}
                fillOpacity={0.3}
                strokeWidth={2}
              />
            )
          })}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

/**
 * Bar Chart Renderer
 */
function BarChartRenderer({
  data,
  series,
  xAxis: xAxisProp,
  yAxis: yAxisProp,
  showLegend,
  height,
}: ChartRendererProps) {
  const xAxis = normalizeAxisConfig(xAxisProp)
  const yAxis = normalizeAxisConfig(yAxisProp)
  const xField = xAxis?.field ?? 'name'

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <BarChart data={data as Record<string, unknown>[]}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis
            dataKey={xField}
            tick={{ fill: '#9ca3af', fontSize: 11 }}
            axisLine={{ stroke: '#4b5563' }}
            tickLine={{ stroke: '#4b5563' }}
          />
          <YAxis
            tick={{ fill: '#9ca3af', fontSize: 11 }}
            axisLine={{ stroke: '#4b5563' }}
            tickLine={{ stroke: '#4b5563' }}
            label={
              yAxis?.label
                ? { value: yAxis.label, angle: -90, position: 'insideLeft', fill: '#9ca3af' }
                : undefined
            }
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1f2937',
              border: '1px solid #374151',
              borderRadius: '0.375rem',
            }}
            labelStyle={{ color: '#e5e7eb' }}
            itemStyle={{ color: '#e5e7eb' }}
          />
          {showLegend && (
            <Legend
              wrapperStyle={{ paddingTop: 10 }}
              formatter={(value) => <span className="text-gray-300 text-xs">{value}</span>}
            />
          )}
          {series.map((s, i) => (
            <Bar
              key={s.field}
              dataKey={s.field}
              name={s.label ?? s.field}
              fill={s.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length]}
              radius={[4, 4, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

/**
 * Donut Chart Renderer
 */
function DonutChartRenderer({
  data,
  series,
  showLegend,
  height,
}: Omit<ChartRendererProps, 'xAxis' | 'yAxis'>) {
  // For donut charts, we expect data to be an array of { name, value } objects
  // or we extract from the first series field
  const chartData = useMemo(() => {
    if (series.length === 0) return data

    // If data has the series fields, transform to pie format
    const primarySeries = series.find((s) => s.primary) ?? series[0]
    if (!primarySeries) return data

    return (data as Record<string, unknown>[]).map((item, i) => ({
      name: String(item.name ?? item.label ?? `Item ${i + 1}`),
      value: Number(item[primarySeries.field] ?? 0),
      color: series[i]?.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length],
    }))
  }, [data, series])

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={chartData as Array<{ name: string; value: number; color?: string }>}
            cx="50%"
            cy="50%"
            innerRadius="60%"
            outerRadius="80%"
            paddingAngle={2}
            dataKey="value"
            nameKey="name"
          >
            {(chartData as Array<{ color?: string }>).map((entry, i) => (
              <Cell
                key={`cell-${i}`}
                fill={entry.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: '#1f2937',
              border: '1px solid #374151',
              borderRadius: '0.375rem',
            }}
            labelStyle={{ color: '#e5e7eb' }}
            itemStyle={{ color: '#e5e7eb' }}
          />
          {showLegend && (
            <Legend
              formatter={(value) => <span className="text-gray-300 text-xs">{value}</span>}
            />
          )}
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

/**
 * Gauge Chart Renderer (simplified as a half-donut)
 */
function GaugeChartRenderer({
  data,
  series,
  height,
}: Omit<ChartRendererProps, 'xAxis' | 'yAxis' | 'showLegend'>) {
  // Extract value from first data item and first series
  const value = useMemo(() => {
    if (data.length === 0 || series.length === 0) return 0
    const firstItem = data[0] as Record<string, unknown>
    return Number(firstItem[series[0].field] ?? 0)
  }, [data, series])

  // Create gauge data (value vs remaining to 100)
  const gaugeData = [
    { name: 'value', value: Math.min(100, Math.max(0, value)) },
    { name: 'remaining', value: Math.max(0, 100 - value) },
  ]

  // Color based on value
  const color = value >= 90 ? '#ef4444' : value >= 70 ? '#f59e0b' : '#22c55e'

  return (
    <div style={{ width: '100%', height }} className="relative">
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={gaugeData}
            cx="50%"
            cy="70%"
            startAngle={180}
            endAngle={0}
            innerRadius="60%"
            outerRadius="80%"
            dataKey="value"
            stroke="none"
          >
            <Cell fill={color} />
            <Cell fill="#374151" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      {/* Center label */}
      <div className="absolute inset-0 flex items-center justify-center pt-4">
        <span className="text-2xl font-bold text-gray-200">{Math.round(value)}%</span>
      </div>
    </div>
  )
}

/**
 * Sparkline Renderer (minimal line chart)
 */
function SparklineRenderer({
  data,
  series,
  height,
}: Omit<ChartRendererProps, 'xAxis' | 'yAxis' | 'showLegend'>) {
  if (series.length === 0) {
    return <div className="text-gray-500 text-sm">No series configured</div>
  }

  const primarySeries = series[0]

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <LineChart data={data as Record<string, unknown>[]}>
          <Line
            type="monotone"
            dataKey={primarySeries.field}
            stroke={primarySeries.color ?? DEFAULT_COLORS[0]}
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export default ChartVisualization
