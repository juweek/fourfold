const dateFormatterCache = new Map<string, Intl.DateTimeFormat>();

export function todayInTz(timeZone: string, date = new Date()) {
  let formatter = dateFormatterCache.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    dateFormatterCache.set(timeZone, formatter);
  }
  const parts = formatter.formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function nowHHMMInTz(timeZone: string, date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "00";
  return `${part("hour")}:${part("minute")}`;
}

export function dateInTz(date: string, timeZone: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("en-US", { timeZone, ...options }).format(
    new Date(`${date}T12:00:00Z`),
  );
}

export function addDays(date: string, amount: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + amount);
  return value.toISOString().slice(0, 10);
}

export function startOfWeek(date: string) {
  const value = new Date(`${date}T12:00:00Z`);
  const day = value.getUTCDay();
  value.setUTCDate(value.getUTCDate() - ((day + 6) % 7));
  return value.toISOString().slice(0, 10);
}

export function weekOfSeason(date: string, seasonStart = "2026-08-05") {
  const delta = new Date(`${date}T12:00:00Z`).getTime() - new Date(`${seasonStart}T12:00:00Z`).getTime();
  return Math.max(1, Math.min(26, Math.floor(delta / 604_800_000) + 1));
}
