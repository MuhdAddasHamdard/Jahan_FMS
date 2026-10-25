import { useEffect, useRef, useState } from "react";
import Icon from "./Icons";

const TONES = {
  default: "text-content hover:bg-surface-2",
  danger: "text-[color:var(--danger)] hover:bg-red-500/10",
};

const RowActions = ({ actions = [], label = "Row actions" }) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const handlePointer = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    const handleKey = (event) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const visible = actions.filter((action) => action && action.hidden !== true);

  if (visible.length === 0) {
    return <span className="text-xs text-faint">—</span>;
  }

  return (
    <div ref={containerRef} className="relative inline-block text-left">
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="icon-btn h-8 w-8"
      >
        <Icon name="dotsVertical" className="h-4 w-4" />
      </button>
      {open && (
        <div
          role="menu"
          className="glass-strong animate-scale-in absolute right-0 z-30 mt-1 w-44 origin-top-right overflow-hidden rounded-xl p-1 shadow-[var(--shadow-float)]"
        >
          {visible.map((action, index) => (
            <button
              key={`${action.label}-${index}`}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                action.onClick?.();
              }}
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold transition ${TONES[action.tone] ?? TONES.default}`}
            >
              {action.icon && <Icon name={action.icon} className="h-3.5 w-3.5" />}
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default RowActions;
