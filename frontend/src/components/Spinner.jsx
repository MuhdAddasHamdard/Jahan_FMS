const Spinner = ({ size = "md" }) => {
  const sizeClass =
    size === "sm"
      ? "h-4 w-4 border-2"
      : size === "lg"
        ? "h-12 w-12 border-4"
        : "h-8 w-8 border-2";

  return (
    <div
      className={`${sizeClass} animate-spin rounded-full border-slate-300 border-t-teal-600`}
      role="status"
      aria-label="Loading"
    />
  );
};

export default Spinner;