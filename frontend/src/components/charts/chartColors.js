export const CHART_COLORS = {
  income: "#25d366",
  expense: "#fb7185",
  teal: "#0f766e",
  tealLight: "#2fb8a3",
  neutral: "#94a3b8",
};

export const formatMonth = (month, { full = false } = {}) => {
  if (!month) return "";
  const [year, monthPart] = String(month).split("-");
  const index = Number(monthPart) - 1;
  const date = new Date(Number(year), index, 1);
  if (Number.isNaN(date.getTime())) return month;
  return date.toLocaleDateString("en-US", {
    month: full ? "long" : "short",
    year: full ? "numeric" : "2-digit",
  });
};
