import { useEffect, useRef, useState } from "react";

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Smoothly counts up to `value` on mount / change.
 * Respects prefers-reduced-motion and formats via the `format` callback.
 */
const AnimatedNumber = ({ value, format, duration = 900, className = "" }) => {
  const target = Number(value) || 0;
  const [display, setDisplay] = useState(() => (prefersReducedMotion() ? target : 0));
  const frame = useRef(0);
  const startRef = useRef(0);

  useEffect(() => {
    if (prefersReducedMotion()) {
      const id = requestAnimationFrame(() => setDisplay(target));
      return () => cancelAnimationFrame(id);
    }

    startRef.current = 0;
    const step = (timestamp) => {
      if (!startRef.current) startRef.current = timestamp;
      const progress = Math.min((timestamp - startRef.current) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(target * eased);
      if (progress < 1) {
        frame.current = requestAnimationFrame(step);
      }
    };

    frame.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame.current);
  }, [target, duration]);

  const output = format ? format(display) : Math.round(display).toLocaleString();

  return (
    <span className={className} aria-label={String(target)}>
      {output}
    </span>
  );
};

export default AnimatedNumber;
