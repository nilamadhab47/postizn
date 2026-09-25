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
