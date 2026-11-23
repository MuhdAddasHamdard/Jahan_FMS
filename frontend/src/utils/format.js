export const KABUL_TIME_ZONE = "Asia/Kabul";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "AFN",
  currencyDisplay: "code",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const count = new Intl.NumberFormat("en-US");
const dateParts = { year: "numeric", month: "short", day: "numeric" };
const timeParts = { hour: "numeric", minute: "2-digit" };
const date = new Intl.DateTimeFormat("en-US", { timeZone: KABUL_TIME_ZONE, ...dateParts });
const time = new Intl.DateTimeFormat("en-US", { timeZone: KABUL_TIME_ZONE, ...timeParts });
const dateTime = new Intl.DateTimeFormat("en-US", { timeZone: KABUL_TIME_ZONE, ...dateParts, ...timeParts });
const dateInput = new Intl.DateTimeFormat("en-CA", {
  timeZone: KABUL_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export const formatCurrency = (value) => currency.format(Number(value) || 0);
export const formatCount = (value) => count.format(Number(value) || 0);

const parseDate = (value) => {
  if (value === undefined || value === null || value === "") return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const toDateInput = (value) => {
  const parsed = parseDate(value);
  if (!parsed) return "";
  const parts = Object.fromEntries(dateInput.formatToParts(parsed).map(({ type, value }) => [type, value]));
  return `${parts.year.padStart(4, "0")}-${parts.month}-${parts.day}`;
};

export const changedDateInput = (value, original) =>
  value && value !== toDateInput(original) ? value : undefined;

export const kabulYearToDate = (now = new Date()) => {
  const to = toDateInput(now);
  return { from: `${to.slice(0, 4)}-01-01`, to };
};

export const formatDate = (value) => {
  const parsed = parseDate(value);
  return parsed ? date.format(parsed) : "";
};

export const formatTime = (value) => {
  const parsed = parseDate(value);
  return parsed ? time.format(parsed) : "";
};

export const formatDateTime = (value) => {
  const parsed = parseDate(value);
  return parsed ? `${dateTime.format(parsed)} Kabul` : "";
};
