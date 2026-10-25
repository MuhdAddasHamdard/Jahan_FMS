import Icon from "./Icons";
import AnimatedNumber from "./AnimatedNumber";
import { formatCurrency } from "../utils/format";

const TONES = {
  brand: {
    tile: "bg-brand-500/12 text-[color:var(--brand-strong)]",
    value: "text-[color:var(--text)]",
    bar: "from-brand-500 to-sea-500",
  },
  teal: {
    tile: "bg-sea-500/12 text-[color:var(--teal)]",
    value: "text-[color:var(--text)]",
    bar: "from-sea-500 to-brand-500",
  },
  danger: {
    tile: "bg-red-500/12 text-[color:var(--danger)]",
    value: "text-[color:var(--danger)]",
    bar: "from-red-500 to-amber-400",
  },
  warning: {
    tile: "bg-amber-500/14 text-[color:var(--warning)]",
    value: "text-[color:var(--warning)]",
    bar: "from-amber-500 to-brand-500",
  },
  neutral: {
    tile: "bg-[color:var(--surface-3)] text-[color:var(--text-muted)]",
    value: "text-[color:var(--text)]",
    bar: "from-slate-400 to-slate-500",
  },
};

const Sparkline = ({ points, className = "" }) => {
  if (!points || points.length < 2) return null;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const span = max - min || 1;
  const width = 96;
  const height = 28;
  const step = width / (points.length - 1);
  const coords = points.map((point, index) => {
    const x = index * step;
    const y = height - ((point - min) / span) * (height - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={`h-7 w-24 ${className}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <polyline
        points={coords.join(" ")}
        fill="none"
        stroke="url(#spark)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <defs>
        <linearGradient id="spark" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--brand)" />
          <stop offset="100%" stopColor="var(--teal)" />
        </linearGradient>
      </defs>
    </svg>
  );
};

const StatCard = ({
  label,
  value,
  format = formatCurrency,
  display,
  icon,
  tone = "brand",
  hint,
  spark,
  delay = 0,
}) => {
  const theme = TONES[tone] ?? TONES.brand;
  const isNumeric = typeof value === "number";

  return (
    <div className="stat-card reveal p-5" style={{ "--d": `${delay}ms` }}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[0.7rem] font-semibold uppercase tracking-wider text-[color:var(--text-muted)]">
            {label}
          </p>
          <p className={`mt-2 text-2xl font-bold tracking-tight ${theme.value}`}>
            {isNumeric ? (
              <AnimatedNumber value={value} format={format} />
            ) : (
              display ?? value
            )}
          </p>
        </div>
        {icon && (
          <span
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${theme.tile}`}
          >
            <Icon name={icon} className="h-5 w-5" />
          </span>
        )}
      </div>
      <div className="mt-3 flex items-end justify-between gap-2">
        {hint ? (
          <p className="text-xs text-[color:var(--text-faint)]">{hint}</p>
        ) : (
          <span />
        )}
        {spark && <Sparkline points={spark} />}
      </div>
    </div>
  );
};

export default StatCard;
