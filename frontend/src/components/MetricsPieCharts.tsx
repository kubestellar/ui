import { useMemo } from 'react';
import { PieChart, Pie, Cell, Legend, ResponsiveContainer, Label } from 'recharts';
import { useHttpRequestsTotal, useHttpErrorRequestsTotal } from '../hooks/queries/useMetricsQueries';

const PIE_COLORS = [
  '#6366F1', '#22D3EE', '#F59E42', '#10B981', '#F43F5E', '#A78BFA', '#FBBF24', '#3B82F6', 
  '#F472B6', '#34D399', '#F87171', '#818CF8', '#FDE68A', '#60A5FA', '#FCA5A5', '#6EE7B7', 
  '#FCD34D', '#C7D2FE', '#F9A8D4', '#A3E635', '#FECACA', '#D1FAE5', '#FDE68A', '#F3F4F6', 
  '#E5E7EB', '#D1D5DB', '#9CA3AF', '#6B7280', '#4B5563', '#374151', '#1F2937', '#111827'
];

const getTotalValue = (data: { value: number }[]) => data.reduce((sum, d) => sum + d.value, 0);

const arcLabel = (_data: { value: number }[], total: number) => ({ value }: { value: number }) => {
  if (!total || total === 0) return '';
  const percent = value / total;
  return percent > 0.08 ? `${value}` : '';
};

const PieChartSection = ({ 
  title, 
  data, 
  loading, 
  color 
}: { 
  title: string; 
  data: { name: string; value: number }[]; 
  loading: boolean; 
  color: string 
}) => {
  const donutSize = { outer: 80, inner: 48 };
  
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
      {loading ? (
        <div className="h-40 flex items-center justify-center text-gray-400">Loading...</div>
      ) : data.length === 0 ? (
        <div className="h-40 flex items-center justify-center text-gray-400">No data</div>
      ) : (
        <ResponsiveContainer width="100%" height={donutSize.outer * 3.2}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={donutSize.outer}
              innerRadius={donutSize.inner}
              isAnimationActive={false}
              label={arcLabel(data, getTotalValue(data))}
              labelLine={false}
              minAngle={5}
            >
              {data.map((_entry, idx) => (
                <Cell
                  key={`cell-${idx}`}
                  fill={PIE_COLORS[idx % PIE_COLORS.length]}
                  style={{ cursor: 'default' }}
                />
              ))}
              <Label
                value={getTotalValue(data)}
                position="center"
                fontSize={donutSize.outer / 2.5}
                fill={color}
                className="font-bold"
              />
            </Pie>
            <Legend
              wrapperStyle={{ paddingTop: 20 }}
              content={({ payload }) => (
                <ul className="flex flex-wrap gap-4 mt-4 justify-center">
                  {payload && payload.map((entry, idx) => (
                    <li
                      key={`legend-item-${idx}`}
                      className="flex items-center gap-3 px-3 py-1 rounded text-base text-gray-700 dark:text-gray-200"
                      style={{ cursor: 'default' }}
                    >
                      <span
                        className="inline-block w-4 h-4 rounded-full border border-gray-300 dark:border-gray-700"
                        style={{ backgroundColor: entry.color }}
                      />
                      {entry.value}
                    </li>
                  ))}
                </ul>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

const MetricsPieCharts = () => {
  const { data: httpRequestsTotal, isLoading: httpRequestsLoading } = useHttpRequestsTotal();
  const { data: httpErrorRequestsTotal, isLoading: httpErrorRequestsLoading } = useHttpErrorRequestsTotal();
  
  const topN = 6;
  
  // Pie chart data: group by path, show top 6, rest as 'Other'
  const pieChartData = useMemo(() => {
    if (!httpRequestsTotal || httpRequestsTotal.length === 0) return [];
    
    const grouped: Record<string, number> = {};
    httpRequestsTotal.forEach(item => {
      const path = item.labels.path || 'unknown';
      const segments = path.split('/').filter(Boolean);
      const name = segments.length > 0 ? segments[segments.length - 1] : path;
      grouped[name] = (grouped[name] || 0) + item.value;
    });
    
    const sorted = Object.entries(grouped).sort((a, b) => b[1] - a[1]);
    const top = sorted.slice(0, topN);
    const otherSum = sorted.slice(topN).reduce((sum, [, v]) => sum + v, 0);
    
    const data = top.map(([name, value]) => ({ name, value }));
    if (otherSum > 0) data.push({ name: 'Other', value: otherSum });
    
    return data;
  }, [httpRequestsTotal]);
  
  const errorPieChartData = useMemo(() => {
    if (!httpErrorRequestsTotal || httpErrorRequestsTotal.length === 0) return [];
    
    const grouped: Record<string, number> = {};
    httpErrorRequestsTotal.forEach(item => {
      const path = item.labels.path || 'unknown';
      const segments = path.split('/').filter(Boolean);
      const name = segments.length > 0 ? segments[segments.length - 1] : path;
      grouped[name] = (grouped[name] || 0) + item.value;
    });
    
    const sorted = Object.entries(grouped).sort((a, b) => b[1] - a[1]);
    const top = sorted.slice(0, topN);
    const otherSum = sorted.slice(topN).reduce((sum, [, v]) => sum + v, 0);
    
    const data = top.map(([name, value]) => ({ name, value }));
    if (otherSum > 0) data.push({ name: 'Other', value: otherSum });
    
    return data;
  }, [httpErrorRequestsTotal]);
  
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <PieChartSection
        title="HTTP Requests by Path"
        data={pieChartData}
        loading={httpRequestsLoading}
        color="#1E293B"
      />
      <PieChartSection
        title="HTTP Error Requests by Path"
        data={errorPieChartData}
        loading={httpErrorRequestsLoading}
        color="#B91C1C"
      />
    </div>
  );
};

export default MetricsPieCharts;
