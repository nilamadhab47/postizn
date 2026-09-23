import { AppHeader } from "@/components/layout/app-header";

export default function DashboardPage() {
  return <WeekBoard />;
}

export function WeekBoard() {
  const days = buildWeek();

  return (
    <div className="flex min-h-full flex-col">
      <AppHeader
        title="Calendar"
        action={{ href: "/compose", label: "New post" }}
      />
      <div className="grid flex-1 grid-cols-7 border-t border-line">
        {days.map((day) => (
          <div
            key={day.iso}
            className="min-h-[calc(100vh-3.5rem)] border-r border-line last:border-r-0"
          >
            <div className="sticky top-0 border-b border-line bg-background/90 px-3 py-2 backdrop-blur">
              <p className="text-[11px] uppercase tracking-wide text-muted">
                {day.weekday}
              </p>
              <p
                className={`text-sm font-medium ${
                  day.isToday ? "text-accent" : ""
                }`}
              >
                {day.date}
              </p>
            </div>
            <a
              href="/compose"
              className="m-2 block rounded-lg border border-dashed border-line px-2 py-6 text-center text-xs text-muted hover:border-accent/50 hover:text-foreground"
            >
              Schedule
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}

function buildWeek() {
  const start = startOfWeek(new Date());
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const today = new Date();
    return {
      iso: d.toISOString().slice(0, 10),
      weekday: d.toLocaleDateString("en-IN", { weekday: "short" }),
      date: d.getDate(),
      isToday: d.toDateString() === today.toDateString(),
    };
  });
}

function startOfWeek(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}
