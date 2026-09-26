import { DEFAULT_TIMEZONE } from "@postn/shared";

export function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function startOfWeek(date: Date) {
  const d = startOfDay(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

export function addDays(date: Date, amount: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + amount);
  return d;
}

export function addMonths(date: Date, amount: number) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + amount);
  return startOfDay(d);
}

export function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function toIsoDate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function weekDays(anchor: Date) {
  const start = startOfWeek(anchor);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function monthCells(anchor: Date) {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const start = startOfWeek(first);
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

export function hourLabel(hour: number) {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  return d.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/** Wall clock in Asia/Kolkata, stored as a local Date so calendar cells stay civil dates. */
export function istWallClock(date = new Date()) {
  const parts = istParts(date);
  return new Date(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
}

export function istParts(date: Date) {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: DEFAULT_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const bag = Object.fromEntries(
    fmt.formatToParts(date).map((part) => [part.type, part.value]),
  );
  return {
    year: Number(bag.year),
    month: Number(bag.month),
    day: Number(bag.day),
    hour: Number(bag.hour),
    minute: Number(bag.minute),
    second: Number(bag.second ?? "0"),
  };
}

export function rangeLabel(
  view: "day" | "week" | "month",
  cursor: Date,
) {
  if (view === "day") {
    return cursor.toLocaleDateString("en-IN", {
      weekday: "long",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }
  if (view === "week") {
    const days = weekDays(cursor);
    const a = days[0];
    const b = days[6];
    const sameMonth = a.getMonth() === b.getMonth();
    const left = a.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
    });
    const right = b.toLocaleDateString("en-IN", {
      day: "numeric",
      month: sameMonth ? undefined : "short",
      year: "numeric",
    });
    return `${left} – ${right}`;
  }
  return cursor.toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
}

export function dayRelation(day: Date, today: Date) {
  const a = startOfDay(day).getTime();
  const b = startOfDay(today).getTime();
  if (a < b) return "past" as const;
  if (a > b) return "future" as const;
  return "today" as const;
}

export function hourRelation(day: Date, hour: number, now: Date) {
  const rel = dayRelation(day, now);
  if (rel === "past") return "past" as const;
  if (rel === "future") return "future" as const;
  if (hour < now.getHours()) return "past" as const;
  if (hour === now.getHours()) return "now" as const;
  return "future" as const;
}

export function composeHref(date: Date, hour = 10) {
  const stamp = `${toIsoDate(date)}T${String(hour).padStart(2, "0")}:00`;
  return `/compose?at=${encodeURIComponent(stamp)}`;
}

export const HOURS = Array.from({ length: 24 }, (_, i) => i);
export const ROW_PX = 68;

/** Asia/Kolkata is UTC+05:30 with no DST. Civil fields on `day` are IST. */
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

export function istSlotToIso(day: Date, hour: number, minute = 0) {
  const utc =
    Date.UTC(day.getFullYear(), day.getMonth(), day.getDate(), hour, minute) -
    IST_OFFSET_MS;
  return new Date(utc).toISOString();
}

export function hourFromClientY(lane: HTMLElement, clientY: number) {
  const hour = Math.floor((clientY - lane.getBoundingClientRect().top) / ROW_PX);
  return Math.min(23, Math.max(0, hour));
}

export function scheduleIso(day: Date, hour: number, now: Date) {
  const iso = istSlotToIso(day, hour, 0);
  if (new Date(iso).getTime() >= Date.now() + 30_000) return iso;
  if (sameDay(day, startOfDay(now)) && hour === now.getHours()) {
    return new Date(Date.now() + 120_000).toISOString();
  }
  return iso;
}
