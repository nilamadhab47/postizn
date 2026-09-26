"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarIcon, ChevronDownIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const HOURS = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);

type Period = "AM" | "PM";

export function IstDateTimePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = parseLocal(value) ?? roundUp(new Date());
  const [month, setMonth] = useState(selected);

  useEffect(() => {
    const parsed = parseLocal(value);
    if (parsed) setMonth(parsed);
  }, [value]);

  function commit(next: Date) {
    onChange(toLocalInput(next));
  }

  const hour12 = selected.getHours() % 12 || 12;
  const minute = snapMinute(selected.getMinutes());
  const period: Period = selected.getHours() >= 12 ? "PM" : "AM";

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (typeof next === "boolean") setOpen(next);
      }}
    >
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            className="h-10 gap-2 rounded-xl border-line bg-card px-3 font-semibold hover:bg-card hover:text-foreground"
          />
        }
      >
        <span className="rounded-md bg-accent/15 px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-accent">
          IST
        </span>
        <CalendarIcon className="size-3.5 text-muted" />
        <span className={value ? "text-foreground" : "text-muted"}>
          {value ? formatTrigger(selected) : "Pick date & time"}
        </span>
        <ChevronDownIcon className="size-3.5 text-muted" />
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[min(100vw-1.5rem,34rem)] gap-0 overflow-hidden p-0"
      >
        <div className="border-b border-line px-4 py-3">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-muted">
            Schedule in IST
          </p>
          <p className="mt-1 text-base font-bold tracking-tight">
            {formatFull(selected)}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row">
          <div className="min-w-0 flex-1 p-2">
            <Calendar
              mode="single"
              selected={selected}
              month={month}
              onMonthChange={setMonth}
              onSelect={(day) => {
                if (!day) return;
                setMonth(day);
                commit(merge(day, selected.getHours(), selected.getMinutes()));
              }}
              disabled={{ before: startOfToday() }}
              className="bg-transparent p-1"
            />
          </div>
          <div className="flex gap-1 border-t border-line p-3 sm:w-[11.5rem] sm:border-l sm:border-t-0">
            <TimeColumn
              label="Hour"
              items={HOURS}
              value={hour12}
              format={(item) => String(item).padStart(2, "0")}
              onSelect={(h) => commit(merge(selected, to24(h, period), minute))}
            />
            <TimeColumn
              label="Min"
              items={MINUTES}
              value={minute}
              format={(item) => String(item).padStart(2, "0")}
              onSelect={(m) =>
                commit(merge(selected, selected.getHours(), m))
              }
            />
            <TimeColumn
              label=""
              items={["AM", "PM"] as const}
              value={period}
              format={(item) => item}
              onSelect={(next) =>
                commit(merge(selected, to24(hour12, next), minute))
              }
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 border-t border-line bg-sidebar px-3 py-2.5">
          <Quick
            label="Today"
            onClick={() =>
              commit(merge(new Date(), selected.getHours(), minute))
            }
          />
          <Quick
            label="Tomorrow"
            onClick={() => {
              const day = new Date();
              day.setDate(day.getDate() + 1);
              commit(merge(day, selected.getHours(), minute));
            }}
          />
          <Quick
            label="7:00 pm"
            onClick={() => commit(merge(selected, 19, 0))}
          />
          <Quick
            label="9:00 pm"
            onClick={() => commit(merge(selected, 21, 0))}
          />
          <button
            type="button"
            onClick={() => {
              onChange("");
              setOpen(false);
            }}
            className="ml-auto rounded-lg px-2 py-1 text-xs font-semibold text-muted hover:bg-background hover:text-foreground"
          >
            Clear
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function TimeColumn<T extends string | number>({
  label,
  items,
  value,
  format,
  onSelect,
}: {
  label: string;
  items: readonly T[];
  value: T;
  format: (item: T) => string;
  onSelect: (item: T) => void;
}) {
  const active = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    active.current?.scrollIntoView({ block: "center" });
  }, [value]);

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      {label ? (
        <p className="mb-1 text-center text-[10px] font-extrabold uppercase tracking-wide text-muted">
          {label}
        </p>
      ) : (
        <p className="mb-1 h-4" />
      )}
      <div className="flex max-h-56 flex-col gap-0.5 overflow-y-auto pr-0.5">
        {items.map((item) => {
          const on = item === value;
          return (
            <button
              key={String(item)}
              ref={on ? active : undefined}
              type="button"
              onClick={() => onSelect(item)}
              className={`rounded-lg px-2 py-1.5 text-sm font-bold tabular-nums ${
                on
                  ? "bg-primary text-primary-foreground"
                  : "text-muted hover:bg-background hover:text-foreground"
              }`}
            >
              {format(item)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Quick({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg border border-line px-2 py-1 text-xs font-semibold hover:border-accent hover:text-accent"
    >
      {label}
    </button>
  );
}

function parseLocal(value: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toLocalInput(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function merge(day: Date, hours: number, minutes: number) {
  const next = new Date(day);
  next.setHours(hours, minutes, 0, 0);
  return next;
}

function to24(hour12: number, period: Period) {
  if (period === "AM") return hour12 === 12 ? 0 : hour12;
  return hour12 === 12 ? 12 : hour12 + 12;
}

function snapMinute(minute: number) {
  return Math.min(55, Math.round(minute / 5) * 5);
}

function roundUp(date: Date) {
  const next = new Date(date);
  next.setSeconds(0, 0);
  const snapped = snapMinute(next.getMinutes());
  if (snapped === next.getMinutes()) return next;
  if (snapped < next.getMinutes()) {
    next.setHours(next.getHours() + 1, 0, 0, 0);
    return next;
  }
  next.setMinutes(snapped);
  return next;
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatTrigger(date: Date) {
  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatFull(date: Date) {
  return date.toLocaleString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
