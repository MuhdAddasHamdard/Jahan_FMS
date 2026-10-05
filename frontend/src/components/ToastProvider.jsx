import { useCallback, useMemo, useRef, useState } from "react";
import { ToastContext } from "../hooks/useToast";

const ICONS = {
  success: "M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z",
  error: "M12 2a10 10 0 100 20 10 10 0 000-20zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z",
  info: "M12 2a10 10 0 100 20 10 10 0 000-20zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z",
};

const TONES = {
  success: "border-teal-200",
  error: "border-red-200",
  info: "border-slate-200",
};

const ICON_TONES = {
  success: "bg-teal-50 text-teal-600",
  error: "bg-red-50 text-red-600",
  info: "bg-slate-100 text-slate-600",
};

const ToastItem = ({ toast, onDismiss }) => (
  <div
    className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border bg-white p-4 shadow-lg ${TONES[toast.type] ?? TONES.info}`}
    role="status"
  >
    <span
      className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${ICON_TONES[toast.type] ?? ICON_TONES.info}`}
    >
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d={ICONS[toast.type] ?? ICONS.info} />
      </svg>
    </span>
    <div className="min-w-0 flex-1">
      {toast.title && (
        <p className="text-sm font-semibold text-slate-900">{toast.title}</p>
      )}
      <p className="text-sm text-slate-600">{toast.message}</p>
    </div>
    <button
      type="button"
      onClick={onDismiss}
      aria-label="Dismiss"
      className="rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
    >
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M18.3 5.71a1 1 0 00-1.41 0L12 10.59 7.11 5.7A1 1 0 105.7 7.11L10.59 12 5.7 16.89a1 1 0 101.41 1.41L12 13.41l4.89 4.89a1 1 0 001.41-1.41L13.41 12l4.89-4.89a1 1 0 000-1.4z" />
      </svg>
    </button>
  </div>
);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const push = useCallback(
    (type, message, title) => {
      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      setToasts((current) => [...current, { id, type, message, title }]);
      const timer = setTimeout(() => dismiss(id), 4000);
      timers.current.set(id, timer);
      return id;
    },
    [dismiss],
  );

  const value = useMemo(
    () => ({
      success: (message, title) => push("success", message, title),
      error: (message, title) => push("error", message, title),
      info: (message, title) => push("info", message, title),
      dismiss,
    }),
    [push, dismiss],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-4 z-[60] flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:right-4 sm:items-end">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={() => dismiss(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};
