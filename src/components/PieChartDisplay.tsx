import { PieChart, Pie, Cell, Tooltip } from 'recharts';

interface Props {
  workload: { kind: string; count: number };
  color: string;
}

const PieChartDisplay = ({ workload, color }: Props) => {
  const data = [{ name: 'Running', value: workload.count }];

  return (
    <div className="flex flex-col items-center">
      <PieChart width={150} height={150}>
        <Pie data={data} cx="50%" cy="50%" outerRadius={50} dataKey="value">
          <Cell fill={color} />
        </Pie>
        <Tooltip />
      </PieChart>
      <p className="text-sm text-gray-300">Running : {workload.count}</p>
      <p className="text-md mt-2 font-semibold">{workload.kind}</p>
    </div>
  );
};

export default PieChartDisplay;
