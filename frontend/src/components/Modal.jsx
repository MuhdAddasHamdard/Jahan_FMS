import { useEffect } from "react";
import Icon from "./Icons";

const SIZES = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
};

const Modal = ({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  icon,
}) => {
  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose?.();
    };

    document.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <div
        className="fixed inset-0 bg-slate-950/55 backdrop-blur-[3px] animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`glass-strong animate-scale-in relative w-full ${SIZES[size] ?? SIZES.md} overflow-hidden rounded-2xl shadow-[var(--shadow-float)]`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[color:var(--border)] px-5 py-4">
          <div className="flex items-start gap-3">
            {icon && (
              <span className="brand-mark flex h-9 w-9 shrink-0 items-center justify-center rounded-xl">
                <Icon name={icon} className="h-5 w-5" />
              </span>
            )}
            <div>
              <h2 className="text-base font-semibold text-[color:var(--text)]">
                {title}
              </h2>
              {description && (
                <p className="mt-0.5 text-xs text-[color:var(--text-muted)]">
                  {description}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="icon-btn h-8 w-8"
          >
            <Icon name="close" className="h-4 w-4" />
          </button>
        </div>

        <div className="thin-scroll max-h-[70vh] overflow-y-auto px-5 py-4">
          {children}
        </div>

        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-[color:var(--border)] bg-[color:var(--surface-2)] px-5 py-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;
