import Icon from "./Icons";

export const inputClass = "input";

export const errorInputClass =
  "input border-red-400 focus:border-red-500 focus:shadow-[0_0_0_3px_rgba(239,68,68,0.18)]";

export const FormField = ({
  label,
  hint,
  error,
  success,
  htmlFor,
  className = "",
  children,
}) => (
  <div className={className}>
    {label && (
      <label
        htmlFor={htmlFor}
        className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[color:var(--text-muted)]"
      >
        {label}
      </label>
    )}
    {children}
    {hint && !error && (
      <p className="mt-1.5 text-[11px] text-[color:var(--text-faint)]">{hint}</p>
    )}
    {error && (
      <p
        className="mt-1.5 flex items-center gap-1 text-[11px] font-semibold text-[color:var(--danger)]"
        role="alert"
      >
        <Icon name="warning" className="h-3.5 w-3.5" />
        {error}
      </p>
    )}
    {!error && success && (
      <p className="mt-1.5 flex items-center gap-1 text-[11px] font-semibold text-[color:var(--brand-strong)]">
        <Icon name="success" className="h-3.5 w-3.5" />
        {success}
      </p>
    )}
  </div>
);

export default FormField;
