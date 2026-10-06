export const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100";

export const errorInputClass = `${inputClass} border-red-400 focus:border-red-500 focus:ring-red-100`;

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
    <label
      htmlFor={htmlFor}
      className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500"
    >
      {label}
    </label>
    {children}
    {hint && <p className="mt-1 text-[11px] text-slate-400">{hint}</p>}
    {error && (
      <p className="mt-1 text-[11px] font-semibold text-red-600" role="alert">
        {error}
      </p>
    )}
    {!error && success && (
      <p className="mt-1 text-[11px] font-semibold text-teal-600">{success}</p>
    )}
  </div>
);

export default FormField;
