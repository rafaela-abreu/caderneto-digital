export type DateFormat = "dd/MM/yyyy" | "MM/dd/yyyy" | "yyyy-MM-dd";

function partsFor(value: number | Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(value);
  return Object.fromEntries(parts.map(item => [item.type, item.value]));
}

export function calendarDayKey(value: number | Date, timezone: string) {
  const parts = partsFor(value, timezone);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function formatDate(value: number | Date, format: DateFormat, timezone: string) {
  const parts = partsFor(value, timezone);
  if (format === "MM/dd/yyyy") return `${parts.month}/${parts.day}/${parts.year}`;
  if (format === "yyyy-MM-dd") return `${parts.year}-${parts.month}-${parts.day}`;
  return `${parts.day}/${parts.month}/${parts.year}`;
}

export function formatDateTime(value: number | Date, format: DateFormat, timezone: string) {
  return `${formatDate(value, format, timezone)} ${new Intl.DateTimeFormat("pt-BR", { timeZone: timezone, hour: "2-digit", minute: "2-digit" }).format(value)}`;
}
