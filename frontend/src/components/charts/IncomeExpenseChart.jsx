import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import ChartTooltip from "./ChartTooltip";
import { CHART_COLORS, formatMonth } from "./chartColors";
import EmptyState from "../EmptyState";

const compact = (value) => {
  const number = Number(value) || 0;
  if (Math.abs(number) >= 1_000_000) return `${(number / 1_000_000).toFixed(1)}M`;
  if (Math.abs(number) >= 1_000) return `${(number / 1_000).toFixed(number >= 10_000 ? 0 : 1)}k`;
  return String(number);
};

const IncomeExpenseChart = ({ data = [], height = 300 }) => {
  const hasData = data.some((row) => (row.income || 0) > 0 || (row.expense || 0) > 0);

  if (!hasData) {
    return (
      <EmptyState
        icon="chart"
        title="No financial activity yet"
        description="Once fees are collected or expenses recorded, monthly trends will appear here."
      />
    );
  }

  return (
    <div className="chart-draw" style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="incomeFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART_COLORS.income} stopOpacity={0.34} />
              <stop offset="100%" stopColor={CHART_COLORS.income} stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="expenseFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART_COLORS.expense} stopOpacity={0.28} />
              <stop offset="100%" stopColor={CHART_COLORS.expense} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="4 6"
            vertical={false}
            stroke="var(--border)"
          />
          <XAxis
            dataKey="month"
            tickFormatter={(value) => formatMonth(value)}
            tick={{ fill: "var(--text-faint)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            dy={6}
          />
          <YAxis
            tickFormatter={compact}
            tick={{ fill: "var(--text-faint)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={48}
          />
          <Tooltip
            cursor={{ stroke: "var(--border-strong)", strokeWidth: 1 }}
            content={
              <ChartTooltip
                labelFormatter={(value) => formatMonth(value, { full: true })}
              />
            }
          />
          <Legend
            verticalAlign="top"
            height={32}
            iconType="circle"
            wrapperStyle={{ fontSize: 12, color: "var(--text-muted)" }}
          />
          <Area
            type="monotone"
            dataKey="income"
            name="Income"
            stroke={CHART_COLORS.income}
            strokeWidth={2.5}
            fill="url(#incomeFill)"
            animationDuration={900}
          />
          <Area
            type="monotone"
            dataKey="expense"
            name="Expenses"
            stroke={CHART_COLORS.expense}
            strokeWidth={2.5}
            fill="url(#expenseFill)"
            animationDuration={900}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default IncomeExpenseChart;
