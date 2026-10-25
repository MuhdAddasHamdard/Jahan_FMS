import Icon from "./Icons";

const EmptyState = ({
  icon = "document",
  title = "Nothing here yet",
  description,
  action,
  className = "",
}) => (
  <div
    className={`flex flex-col items-center justify-center px-6 py-14 text-center ${className}`}
  >
    <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[color:var(--surface-2)] text-[color:var(--text-faint)]">
      <Icon name={icon} className="h-6 w-6" />
    </span>
    <p className="mt-4 text-sm font-semibold text-[color:var(--text)]">{title}</p>
    {description && (
      <p className="mt-1 max-w-sm text-sm text-[color:var(--text-muted)]">
        {description}
      </p>
    )}
    {action && <div className="mt-5">{action}</div>}
  </div>
);

export default EmptyState;
