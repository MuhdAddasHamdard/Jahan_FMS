import { Link } from "react-router-dom";
import Icon from "./Icons";

const PageHeader = ({
  title,
  description,
  action,
  breadcrumbs = [],
  icon,
  eyebrow,
}) => {
  return (
    <div className="mb-6">
      {breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="mb-3">
          <ol className="flex flex-wrap items-center gap-1.5 text-xs text-[color:var(--text-faint)]">
            {breadcrumbs.map((crumb, index) => {
              const isLast = index === breadcrumbs.length - 1;
              return (
                <li key={`${crumb.label}-${index}`} className="flex items-center gap-1.5">
                  {index > 0 && <Icon name="chevronRight" className="h-3 w-3" />}
                  {crumb.to && !isLast ? (
                    <Link
                      to={crumb.to}
                      className="transition hover:text-[color:var(--text)]"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span
                      className={
                        isLast ? "font-medium text-[color:var(--text-muted)]" : ""
                      }
                      aria-current={isLast ? "page" : undefined}
                    >
                      {crumb.label}
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          {icon && (
            <span className="brand-mark flex h-11 w-11 shrink-0 items-center justify-center rounded-xl">
              <Icon name={icon} className="h-5 w-5" />
            </span>
          )}
          <div>
            {eyebrow && (
              <p className="text-xs font-semibold uppercase tracking-wider text-[color:var(--brand-strong)]">
                {eyebrow}
              </p>
            )}
            <h1 className="text-2xl font-bold tracking-tight text-[color:var(--text)]">
              {title}
            </h1>
            {description && (
              <p className="mt-1 max-w-2xl text-sm text-[color:var(--text-muted)]">
                {description}
              </p>
            )}
          </div>
        </div>
        {action}
      </div>
    </div>
  );
};

export default PageHeader;
