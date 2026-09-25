"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  HOURS,
  ROW_PX,
  addDays,
  addMonths,
  composeHref,
  dayRelation,
  hourLabel,
  hourRelation,
  monthCells,
  rangeLabel,
  sameDay,
  startOfDay,
  weekDays,
} from "@/lib/calendar";
import {
  groupPostsByHour,
  postsOnDay,
  sampleCalendarPosts,
  type CalPost,
} from "@/lib/sample-calendar-posts";
import {
  DaySheet,
  HourCluster,
  PostCard,
  PostModal,
} from "@/components/calendar/post-preview";

type View = "day" | "week" | "month";

export function CalendarBoard() {
  const today = useMemo(() => startOfDay(new Date()), []);
  const [now, setNow] = useState(() => new Date());
  const [view, setView] = useState<View>("week");
  const [cursor, setCursor] = useState(today);
  const posts = useMemo(() => sampleCalendarPosts(today), [today]);
  const [active, setActive] = useState<{ post: CalPost; queue: CalPost[] } | null>(
    null,
  );
  const [dayPeek, setDayPeek] = useState<Date | null>(null);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (view === "month") return;
    const node = document.querySelector(`[data-hour="${now.getHours()}"]`);
    node?.scrollIntoView({ block: "center", behavior: "auto" });
  }, [view, cursor]);

  const days = view === "day" ? [cursor] : weekDays(cursor);
  const months = monthCells(cursor);
  const peekPosts = dayPeek ? postsOnDay(posts, dayPeek) : [];

  function openPost(post: CalPost, queue: CalPost[]) {
    setActive({ post, queue });
  }

  function jump(dir: -1 | 1) {
    if (view === "day") setCursor((d) => addDays(d, dir));
    else if (view === "week") setCursor((d) => addDays(d, dir * 7));
    else setCursor((d) => addMonths(d, dir));
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-line px-5">
        <div className="flex min-w-0 items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">Calendar</h1>
          <div className="flex items-center gap-1">
            <IconButton label="Previous" onClick={() => jump(-1)}>
              ‹
            </IconButton>
            <button
              type="button"
              onClick={() => setCursor(today)}
              className="rounded-lg px-3 py-1.5 text-sm font-semibold text-muted hover:bg-card hover:text-foreground"
            >
              Today
            </button>
            <IconButton label="Next" onClick={() => jump(1)}>
              ›
            </IconButton>
          </div>
          <p className="truncate text-lg font-semibold text-accent">
            {rangeLabel(view, cursor)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Legend />
          <div className="flex rounded-xl border border-line bg-card p-1">
            {(["day", "week", "month"] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setView(item)}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold capitalize ${
                  view === item
                    ? "bg-accent text-accent-fg"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
          <Link
            href="/compose"
            className="rounded-xl bg-accent px-4 py-2 text-sm font-bold text-accent-fg"
          >
            New post
          </Link>
        </div>
      </header>

      {view === "month" ? (
        <MonthGrid
          cells={months}
          today={today}
          cursor={cursor}
          posts={posts}
          onOpen={openPost}
          onOpenDay={setDayPeek}
        />
      ) : (
        <TimeGrid
          days={days}
          today={today}
          now={now}
          posts={posts}
          onOpen={openPost}
          onOpenDay={setDayPeek}
        />
      )}

      {dayPeek && peekPosts.length > 0 && !active ? (
        <DaySheet
          day={dayPeek}
          posts={peekPosts}
          onClose={() => setDayPeek(null)}
          onOpen={openPost}
        />
      ) : null}

      {active ? (
        <PostModal
          post={active.post}
          queue={active.queue}
          onClose={() => setActive(null)}
          onSelect={(post) => setActive({ post, queue: active.queue })}
        />
      ) : null}
    </div>
  );
}

function TimeGrid({
  days,
  today,
  now,
  posts,
  onOpen,
  onOpenDay,
}: {
  days: Date[];
  today: Date;
  now: Date;
  posts: CalPost[];
  onOpen: (post: CalPost, queue: CalPost[]) => void;
  onOpenDay: (day: Date) => void;
}) {
  const nowTop = (now.getHours() + now.getMinutes() / 60) * ROW_PX;
  const cols = `4.5rem repeat(${days.length}, minmax(0, 1fr))`;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        className="grid shrink-0 px-3 pt-3 pb-2"
        style={{ gridTemplateColumns: cols, columnGap: 10 }}
      >
        <div className="flex flex-col items-end justify-end pb-2 pr-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted">
            IST
          </p>
          <p className="text-[10px] font-semibold text-today">
            {now.toLocaleTimeString("en-IN", {
              hour: "numeric",
              minute: "2-digit",
            })}
          </p>
        </div>
        {days.map((day) => (
          <DayTicket
            key={day.toISOString()}
            day={day}
            today={today}
            now={now}
            count={postsOnDay(posts, day).length}
            onOpenDay={onOpenDay}
          />
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-auto px-3 pb-6">
        <div className="grid" style={{ gridTemplateColumns: cols, columnGap: 10 }}>
          <div>
            {HOURS.map((hour) => {
              const rel = hourRelation(today, hour, now);
              return (
                <div
                  key={hour}
                  data-hour={hour}
                  className={`flex items-start justify-end pr-2 pt-1 text-[11px] font-bold ${
                    rel === "past"
                      ? "text-muted/35 line-through decoration-muted/50"
                      : rel === "now"
                        ? "text-today"
                        : "text-muted"
                  }`}
                  style={{ height: ROW_PX }}
                >
                  {hourLabel(hour)}
                </div>
              );
            })}
          </div>

          {days.map((day) => {
            const rel = dayRelation(day, today);
            const lanePosts = postsOnDay(posts, day);
            return (
              <div
                key={day.toISOString()}
                className={`cal-hours relative overflow-hidden rounded-2xl ${
                  rel === "past"
                    ? "cal-lane-past"
                    : rel === "today"
                      ? "cal-lane-today"
                      : "cal-lane-future cal-dots"
                }`}
              >
                {HOURS.map((hour) => {
                  const slot = hourRelation(day, hour, now);
                  const filled = lanePosts.some((post) => post.hour === hour);
                  if (slot === "past") {
                    return (
                      <div
                        key={hour}
                        className="pointer-events-none"
                        style={{ height: ROW_PX }}
                      />
                    );
                  }
                  return (
                    <Link
                      key={hour}
                      href={composeHref(day, hour)}
                      className={`group block ${
                        slot === "now" ? "bg-today/10" : "hover:bg-accent/10"
                      }`}
                      style={{ height: ROW_PX }}
                    >
                      {!filled ? (
                        <span className="invisible ml-3 mt-2 inline-flex rounded-md bg-accent px-2 py-0.5 text-[11px] font-bold text-accent-fg group-hover:visible">
                          {slot === "now" ? "Post now" : "Schedule"}
                        </span>
                      ) : null}
                    </Link>
                  );
                })}

                {rel === "past" ? (
                  <div className="cal-passed-wash pointer-events-none absolute inset-0 z-[5]" />
                ) : null}
                {rel === "today" ? (
                  <div
                    className="cal-passed-wash pointer-events-none absolute inset-x-0 top-0 z-[5]"
                    style={{ height: nowTop }}
                  />
                ) : null}

                {groupPostsByHour(lanePosts).map(([hour, cluster]) => (
                  <div
                    key={hour}
                    className="absolute right-1.5 left-1.5 z-10"
                    style={{ top: hour * ROW_PX + 6, height: ROW_PX - 12 }}
                  >
                    <HourCluster
                      posts={cluster}
                      onOpen={onOpen}
                      onOpenHour={() =>
                        onOpen(cluster[1] ?? cluster[0], cluster)
                      }
                    />
                  </div>
                ))}

                {rel === "today" ? (
                  <div
                    className="pointer-events-none absolute inset-x-0 z-20 flex items-center gap-1"
                    style={{ top: nowTop }}
                  >
                    <span className="rounded-full bg-today px-1.5 py-0.5 text-[9px] font-extrabold tracking-wide text-white">
                      NOW
                    </span>
                    <span className="h-0.5 flex-1 bg-today" />
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function DayTicket({
  day,
  today,
  now,
  count,
  onOpenDay,
}: {
  day: Date;
  today: Date;
  now: Date;
  count: number;
  onOpenDay: (day: Date) => void;
}) {
  const rel = dayRelation(day, today);
  const label =
    rel === "today"
      ? "Today"
      : rel === "past"
        ? "Passed"
        : sameDay(day, addDays(today, 1))
          ? "Tomorrow"
          : "";

  return (
    <button
      type="button"
      onClick={() => count > 0 && onOpenDay(day)}
      className={`rounded-2xl px-3 py-2.5 text-left ${
        rel === "today"
          ? "bg-accent text-accent-fg"
          : rel === "past"
            ? "bg-card/60 text-muted"
            : "bg-card"
      } ${count > 0 ? "hover:brightness-110" : ""}`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-wider">
          {day.toLocaleDateString("en-IN", { weekday: "short" })}
        </p>
        {label ? (
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${
              rel === "today"
                ? "bg-accent-fg/15"
                : rel === "past"
                  ? "bg-black/30"
                  : "bg-accent-2/30 text-foreground"
            }`}
          >
            {label}
          </span>
        ) : null}
      </div>
      <div className="mt-1 flex items-end justify-between">
        <p className={`text-2xl font-extrabold ${rel === "past" ? "opacity-60" : ""}`}>
          {day.getDate()}
        </p>
        {count > 0 ? (
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
              rel === "today" ? "bg-accent-fg/20" : "bg-foreground/10 text-foreground"
            }`}
          >
            {count}
          </span>
        ) : null}
      </div>
      {rel === "today" ? (
        <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wide opacity-80">
          {now.toLocaleTimeString("en-IN", {
            hour: "numeric",
            minute: "2-digit",
          })}{" "}
          live
        </p>
      ) : null}
    </button>
  );
}

function MonthGrid({
  cells,
  today,
  cursor,
  posts,
  onOpen,
  onOpenDay,
}: {
  cells: Date[];
  today: Date;
  cursor: Date;
  posts: CalPost[];
  onOpen: (post: CalPost, queue: CalPost[]) => void;
  onOpenDay: (day: Date) => void;
}) {
  return (
    <div className="min-h-0 flex-1 overflow-auto p-4">
      <div className="grid h-full min-h-[720px] grid-cols-7 gap-2">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((label) => (
          <div
            key={label}
            className="px-2 text-sm font-bold uppercase tracking-wide text-muted"
          >
            {label}
          </div>
        ))}
        {cells.map((day) => {
          const inMonth = day.getMonth() === cursor.getMonth();
          const rel = dayRelation(day, today);
          const dayPosts = postsOnDay(posts, day);
          const visible = dayPosts.slice(0, 2);
          const extra = dayPosts.length - visible.length;
          return (
            <div
              key={day.toISOString()}
              className={`flex min-h-[118px] flex-col rounded-2xl p-2.5 ${
                rel === "today"
                  ? "cal-lane-today"
                  : rel === "past"
                    ? "cal-lane-past"
                    : inMonth
                      ? "cal-lane-future cal-dots"
                      : "bg-card/30"
              }`}
            >
              <div className="mb-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() =>
                    dayPosts.length > 0 ? onOpenDay(day) : undefined
                  }
                  className={`inline-flex size-8 items-center justify-center rounded-full text-base font-extrabold ${
                    rel === "today"
                      ? "bg-accent text-accent-fg"
                      : rel === "past"
                        ? "text-muted"
                        : "text-foreground"
                  }`}
                >
                  {day.getDate()}
                </button>
                {rel === "past" && inMonth ? (
                  <span className="text-[10px] font-bold uppercase tracking-wide text-muted">
                    Passed
                  </span>
                ) : null}
                {rel === "today" ? (
                  <span className="text-[10px] font-extrabold uppercase tracking-wide text-accent">
                    Today
                  </span>
                ) : null}
                {sameDay(day, addDays(today, 1)) ? (
                  <span className="text-[10px] font-extrabold uppercase tracking-wide text-accent-2">
                    Tomorrow
                  </span>
                ) : null}
              </div>
              <div className="flex flex-col gap-1">
                {visible.map((post) => (
                  <div key={post.id} className="h-8">
                    <PostCard
                      post={post}
                      compact
                      onOpen={(item) => onOpen(item, dayPosts)}
                    />
                  </div>
                ))}
                {extra > 0 ? (
                  <button
                    type="button"
                    onClick={() => onOpenDay(day)}
                    className="rounded-lg bg-foreground/10 px-2 py-1 text-left text-[11px] font-extrabold uppercase tracking-wide hover:bg-accent hover:text-accent-fg"
                  >
                    +{extra} more
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Legend() {
  return (
    <div className="hidden items-center gap-3 text-[11px] font-bold uppercase tracking-wide text-muted lg:flex">
      <span className="flex items-center gap-1.5">
        <i className="size-2 rounded-full bg-[#5d8a52]" /> Posted
      </span>
      <span className="flex items-center gap-1.5">
        <i className="size-2 rounded-full bg-accent" /> Queued
      </span>
      <span className="flex items-center gap-1.5">
        <i className="size-2 rounded-full bg-today" /> Failed
      </span>
    </div>
  );
}

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex size-9 items-center justify-center rounded-lg border border-line bg-card text-xl font-bold leading-none hover:border-accent hover:text-accent"
    >
      {children}
    </button>
  );
}
