import { KABUL_TIME_ZONE } from "../../utils/format";

export const CHART_COLORS = {
  income: "#25d366",
  expense: "#fb7185",
  teal: "#0f766e",
  tealLight: "#2fb8a3",
  neutral: "#94a3b8",
};

export const formatMonth = (month, { full = false } = {}) => {
  if (!month) return "";
  const date = new Date(`${month}-01T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return month;
  return date.toLocaleDateString("en-US", {
    timeZone: KABUL_TIME_ZONE,
    month: full ? "long" : "short",
    year: full ? "numeric" : "2-digit",
  });
};
