const SIZES = {
  sm: "h-4 w-4 border-2",
  md: "h-8 w-8 border-2",
  lg: "h-12 w-12 border-[3px]",
};

const Spinner = ({ size = "md", className = "" }) => {
  return (
    <span
      className={`${SIZES[size] ?? SIZES.md} inline-block animate-spin rounded-full ${className}`}
      style={{
        borderColor: "var(--border-strong)",
        borderTopColor: "var(--brand)",
      }}
      role="status"
      aria-label="Loading"
    />
  );
};

export default Spinner;
