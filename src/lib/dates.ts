export const DEFAULT_TZ = "Europe/Warsaw";

function parts(date: Date, tz: string) {
  const f = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const p = Object.fromEntries(f.formatToParts(date).map((x) => [x.type, x.value]));
  return {
    year: Number(p.year),
    month: Number(p.month),
    day: Number(p.day),
    hour: Number(p.hour),
    minute: Number(p.minute),
    second: Number(p.second),
  };
}

/** "YYYY-MM-DD" of the given instant in the given time zone. */
export function toDateKey(date: Date | string, tz = DEFAULT_TZ) {
  const p = parts(typeof date === "string" ? new Date(date) : date, tz);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

export function todayKey(tz = DEFAULT_TZ) {
  return toDateKey(new Date(), tz);
}

/** "HH:mm" of the given instant in the given time zone. */
export function toTimeKey(date: Date | string, tz = DEFAULT_TZ) {
  const p = parts(typeof date === "string" ? new Date(date) : date, tz);
  return `${String(p.hour).padStart(2, "0")}:${String(p.minute).padStart(2, "0")}`;
}

export function addDays(key: string, n: number) {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dt.toISOString().slice(0, 10);
}

export function diffDays(fromKey: string, toKey: string) {
  const a = Date.parse(fromKey + "T00:00:00Z");
  const b = Date.parse(toKey + "T00:00:00Z");
  return Math.round((b - a) / 86_400_000);
}

/** ISO weekday (1 = Monday ... 7 = Sunday) of a date key. */
export function weekdayOf(key: string) {
  const d = new Date(key + "T12:00:00Z").getUTCDay();
  return d === 0 ? 7 : d;
}

export function startOfWeek(key: string) {
  return addDays(key, 1 - weekdayOf(key));
}

export function startOfMonth(key: string) {
  return key.slice(0, 8) + "01";
}

export function addMonths(key: string, n: number) {
  const [y, m] = key.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1 + n, 1));
  return dt.toISOString().slice(0, 10);
}

/** Converts a wall-clock time in `tz` ("YYYY-MM-DD", "HH:mm") to a UTC ISO string. */
export function zonedToUtcISO(dateKey: string, time = "00:00", tz = DEFAULT_TZ) {
  const [y, m, d] = dateKey.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const target = Date.UTC(y, m - 1, d, hh, mm);
  let guess = target;
  for (let i = 0; i < 2; i++) {
    const p = parts(new Date(guess), tz);
    const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
    guess += target - asUtc;
  }
  return new Date(guess).toISOString();
}

/** Converts "YYYY-MM-DDTHH:mm" (datetime-local input) in `tz` to UTC ISO. */
export function localInputToISO(value: string, tz = DEFAULT_TZ) {
  const [date, time = "00:00"] = value.split("T");
  return zonedToUtcISO(date, time.slice(0, 5), tz);
}

/** UTC ISO to "YYYY-MM-DDTHH:mm" for a datetime-local input in `tz`. */
export function isoToLocalInput(iso: string, tz = DEFAULT_TZ) {
  return `${toDateKey(iso, tz)}T${toTimeKey(iso, tz)}`;
}

export function formatDate(value: Date | string, tz = DEFAULT_TZ, opts: Intl.DateTimeFormatOptions = {}) {
  const date = typeof value === "string" ? new Date(value.length === 10 ? value + "T12:00:00Z" : value) : value;
  return new Intl.DateTimeFormat("pl-PL", {
    timeZone: typeof value === "string" && value.length === 10 ? "UTC" : tz,
    day: "numeric",
    month: "long",
    ...opts,
  }).format(date);
}

export function formatDateTime(value: string, tz = DEFAULT_TZ) {
  return new Intl.DateTimeFormat("pl-PL", {
    timeZone: tz,
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatWeekday(key: string, style: "long" | "short" = "long") {
  return new Intl.DateTimeFormat("pl-PL", { timeZone: "UTC", weekday: style }).format(new Date(key + "T12:00:00Z"));
}

/** "dzisiaj", "jutro", "za 4 dni", "wczoraj", "3 dni temu". */
export function relativeDays(targetKey: string, fromKey: string) {
  const n = diffDays(fromKey, targetKey);
  if (n === 0) return "dzisiaj";
  if (n === 1) return "jutro";
  if (n === 2) return "pojutrze";
  if (n === -1) return "wczoraj";
  if (n > 0) return `za ${n} ${plural(n, "dzień", "dni", "dni")}`;
  return `${-n} ${plural(-n, "dzień", "dni", "dni")} temu`;
}

export function plural(n: number, one: string, few: string, many: string) {
  if (n === 1) return one;
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

export function greeting(tz = DEFAULT_TZ) {
  const h = parts(new Date(), tz).hour;
  if (h < 5) return "Dobranoc";
  if (h < 12) return "Dzień dobry";
  if (h < 18) return "Miłego popołudnia";
  return "Dobry wieczór";
}

export function minutesLabel(min: number | null | undefined) {
  if (!min) return "";
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (!h) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
}

export const WEEKDAY_SHORT = ["pon", "wt", "śr", "czw", "pt", "sob", "nd"];
