import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import ChartTooltip from "./ChartTooltip";
import { formatCurrency } from "../../utils/format";
import EmptyState from "../EmptyState";

const ExpenseDonut = ({ data = [], height = 260, total }) => {
  const slices = data.filter((slice) => (slice.value || 0) > 0);
  const sum = total ?? slices.reduce((acc, slice) => acc + (slice.value || 0), 0);

  if (slices.length === 0) {
    return (
      <EmptyState
        icon="chartPie"
        title="No outgoing amounts"
        description="Refunds, salaries and expenses will be summarised here."
      />
    );
  }

  return (
    <div className="chart-draw relative" style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={slices}
            dataKey="value"
            nameKey="name"
            innerRadius="62%"
            outerRadius="92%"
            paddingAngle={3}
            stroke="none"
            animationDuration={900}
          >
            {slices.map((slice) => (
              <Cell key={slice.name} fill={slice.color} />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[0.65rem] font-semibold uppercase tracking-wider text-faint">
          Total
        </span>
        <span className="text-lg font-bold text-content">{formatCurrency(sum)}</span>
      </div>
    </div>
  );
};

export default ExpenseDonut;
