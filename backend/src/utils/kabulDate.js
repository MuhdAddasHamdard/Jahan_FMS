const timeZone = "Asia/Kabul";
const calendar = new Intl.DateTimeFormat("en-CA", {
  timeZone,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const offsetFormat = new Intl.DateTimeFormat("en", { timeZone, timeZoneName: "longOffset" });
const dateOnly = /^\d{4}-\d{2}-\d{2}$/;
const localDateTime = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?)$/;

export const kabulDateKey = (date) => {
  const parts = Object.fromEntries(calendar.formatToParts(date).map(({ type, value }) => [type, value]));
  return `${parts.year.padStart(4, "0")}-${parts.month}-${parts.day}`;
};

// A UTC Date carries the wall-clock fields until the Kabul offset is applied.
const fromKabulWallTime = (wallTime) => {
  const zone = offsetFormat.formatToParts(wallTime).find(({ type }) => type === "timeZoneName").value;
  if (zone === "GMT") return wallTime;
  const [hours, minutes, seconds = 0] = zone.slice(4).split(":").map(Number);
  const direction = zone[3] === "-" ? -1 : 1;
  return new Date(wallTime.getTime() - direction * ((hours * 60 + minutes) * 60 + seconds) * 1000);
};

export const parseKabulDate = (value) => {
  if (typeof value !== "string") return new Date(NaN);
  const local = localDateTime.exec(dateOnly.test(value) ? `${value}T00:00` : value);
  if (!local) return new Date(Date.parse(value));

  const [, day, time] = local;
  const wallTime = new Date(`${day}T${time}Z`);
  if (!Number.isFinite(wallTime.getTime()) || wallTime.toISOString().slice(0, 10) !== day) return new Date(NaN);
  return fromKabulWallTime(wallTime);
};

export const buildKabulDateRange = (from, to) => {
  const range = {};
  if (from) range.gte = parseKabulDate(from);
  if (to && dateOnly.test(to)) {
    const nextDay = new Date(`${to}T00:00:00Z`);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);
    range.lt = fromKabulWallTime(nextDay);
  } else if (to) {
    range.lte = parseKabulDate(to);
  }
  return range;
};

export const isValidKabulDateRange = (from, to) => {
  if ([from, to].some((date) => date && !Number.isFinite(parseKabulDate(date).getTime()))) return false;
  const { gte, lt, lte } = buildKabulDateRange(from, to);
  return !gte || (lt ? gte < lt : !lte || gte <= lte);
};

export const kabulMonthStart = (date, monthsAhead = 0) => {
  const first = new Date(`${kabulDateKey(date).slice(0, 7)}-01T00:00:00Z`);
  first.setUTCMonth(first.getUTCMonth() + monthsAhead);
  return fromKabulWallTime(first);
};
