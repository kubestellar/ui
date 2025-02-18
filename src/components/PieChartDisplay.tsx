import { useContext } from "react";
import { ThemeContext } from "../context/ThemeContext"; // Import ThemeContext
import { PieChart, Pie, Cell, Tooltip } from "recharts";

interface Props {
  workload: { kind: string; count: number };
  color: string;
}

const PieChartDisplay = ({ workload, color }: Props) => {
  const { theme = "light" } = useContext(ThemeContext); // Get theme

  return (
    <div className="flex flex-col items-center">
      <PieChart width={150} height={150}>
        <Pie data={[{ name: "Running", value: workload.count }]} cx="50%" cy="50%" outerRadius={50} dataKey="value">
          <Cell fill={color} />
        </Pie>
        <Tooltip />
      </PieChart>
      
      {/* Apply dynamic text color based on theme */}
      <p className={`text-sm ${theme === "dark" ? "text-white" : "text-black"}`}>
        Running : {workload.count}
      </p>
      <p className={`text-md mt-2 font-semibold ${theme === "dark" ? "text-white" : "text-black"}`}>
        {workload.kind}
      </p>
    </div>
  );
};

export default PieChartDisplay;
