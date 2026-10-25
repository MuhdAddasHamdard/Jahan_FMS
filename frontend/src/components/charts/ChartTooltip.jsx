import { formatCurrency } from "../../utils/format";

const ChartTooltip = ({ active, payload, label, labelFormatter }) => {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="glass-strong rounded-xl px-3 py-2 shadow-[var(--shadow-float)]">
      <p className="mb-1 text-xs font-semibold text-content">
        {labelFormatter ? labelFormatter(label) : label}
      </p>
      <div className="space-y-0.5">
        {payload.map((entry) => (
          <div
            key={entry.dataKey ?? entry.name}
            className="flex items-center justify-between gap-4 text-xs"
          >
            <span className="flex items-center gap-1.5 text-muted">
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: entry.color ?? entry.payload?.fill }}
              />
              {entry.name}
            </span>
            <span className="font-semibold text-content">
              {formatCurrency(entry.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ChartTooltip;
