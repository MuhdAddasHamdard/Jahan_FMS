const ChartCard = ({
  title,
  subtitle,
  action,
  children,
  className = "",
  delay = 0,
  bodyClassName = "",
}) => (
  <section
    className={`card reveal overflow-hidden ${className}`}
    style={{ "--d": `${delay}ms` }}
  >
    <div className="flex items-start justify-between gap-3 border-b border-[color:var(--border)] px-5 py-4">
      <div className="min-w-0">
        {title && (
          <h2 className="text-sm font-semibold text-[color:var(--text)]">{title}</h2>
        )}
        {subtitle && (
          <p className="mt-0.5 text-xs text-[color:var(--text-muted)]">{subtitle}</p>
        )}
      </div>
      {action}
    </div>
    <div className={`px-4 py-4 sm:px-5 ${bodyClassName}`}>{children}</div>
  </section>
);

export default ChartCard;
