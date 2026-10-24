"use client";

import { useMemo, useState } from "react";

import { cn } from "@/lib/utils";

// GitHub-style year of writing: 53 week columns ending today, one square per
// day. Cells share the width of the column (53 equal tracks, square cells),
// so the graph fills the page at any desktop width and scrolls only on
// phones. Five gray levels from the text color read in both themes. Hovering
// a day shows it in the caption line instead of hundreds of tooltips.

const LEVEL = ["bg-text/7", "bg-text/25", "bg-text/45", "bg-text/70", "bg-text"] as const;
const WEEKDAYS = ["", "Mon", "", "Wed", "", "Fri", ""];
// The label column plus 53 equal week columns, shared by the month row and
// the day grid so labels line up with their columns.
const COLUMNS = "grid-cols-[1.75rem_repeat(53,minmax(0,1fr))]";

type Day = { date: string; count: number; words: number; future: boolean };

export type Activity = { date: string; words: number };

export function ContributionGraph({
  activity,
  today,
  className,
}: {
  /** One entry per essay: its local day (YYYY-MM-DD) and word count. */
  activity: Activity[];
  today: string;
  className?: string;
}) {
  const year = useMemo(() => buildYear(activity, today), [activity, today]);
  const [hovered, setHovered] = useState<Day | null>(null);

  const summary =
    year.total === 0
      ? "No essays in the last year"
      : `${plural(year.total, "essay")} and ${plural(year.words, "word")} in the last year`;

  return (
    <figure className={cn("min-w-0", className)}>
      <div className="overflow-x-auto pb-1">
        <div className="grid min-w-160 gap-y-1">
          <div className={cn("grid gap-x-1 text-caption text-text-3", COLUMNS)} aria-hidden>
            {year.months.map((m) => (
              <span key={m.week} className="whitespace-nowrap" style={{ gridColumn: m.week + 2 }}>
                {m.label}
              </span>
            ))}
          </div>
          <div
            role="img"
            aria-label={summary}
            onPointerLeave={() => setHovered(null)}
            className={cn("grid grid-flow-col grid-rows-7 gap-1", COLUMNS)}
          >
            {WEEKDAYS.map((d, i) => (
              <span key={`label-${i}`} className="flex items-center text-caption leading-none text-text-3" aria-hidden>
                {d}
              </span>
            ))}
            {year.days.map((day) => (
              <span
                key={day.date}
                aria-hidden
                onPointerEnter={() => !day.future && setHovered(day)}
                className={cn("aspect-square rounded-cell", day.future ? "invisible" : LEVEL[Math.min(day.count, 4)])}
              />
            ))}
          </div>
        </div>
      </div>
      <figcaption className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-caption text-text-3 tabular-nums">
        <span>{hovered ? describe(hovered) : summary}</span>
        <span className="flex items-center gap-1" aria-hidden>
          Less
          {LEVEL.map((l) => (
            <span key={l} className={cn("size-2.5 rounded-cell", l)} />
          ))}
          More
        </span>
      </figcaption>
    </figure>
  );
}

/** Consecutive days with an essay, ending today (or yesterday, if today is still blank). */
export function currentStreak(activity: Activity[], today: string): number {
  const days = new Set(activity.map((a) => a.date));
  let day = days.has(today) ? today : addDays(today, -1);
  let streak = 0;
  while (days.has(day)) {
    streak++;
    day = addDays(day, -1);
  }
  return streak;
}

function buildYear(activity: Activity[], today: string) {
  const byDay = new Map<string, { count: number; words: number }>();
  for (const a of activity) {
    const d = byDay.get(a.date) ?? { count: 0, words: 0 };
    byDay.set(a.date, { count: d.count + 1, words: d.words + a.words });
  }
  // From the Sunday 52 weeks before this week's Sunday, through today.
  const start = addDays(today, -dayOfWeek(today) - 52 * 7);
  const days: Day[] = [];
  const months: { week: number; label: string }[] = [];
  for (let i = 0; i < 53 * 7; i++) {
    const date = addDays(start, i);
    const v = byDay.get(date);
    days.push({ date, count: v?.count ?? 0, words: v?.words ?? 0, future: date > today });
    // Label a month in the week its first day falls in (not the last week,
    // where the label would run off the edge).
    if (date.endsWith("-01") && i < 52 * 7) months.push({ week: Math.floor(i / 7), label: monthName(date) });
  }
  const inYear = activity.filter((a) => a.date >= start && a.date <= today);
  return { days, months, total: inYear.length, words: inYear.reduce((n, a) => n + a.words, 0) };
}

function describe(day: Day) {
  const label = new Date(`${day.date}T00:00:00`).toLocaleDateString("en", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  return day.count === 0 ? `${label} · No essays` : `${label} · ${plural(day.count, "essay")} · ${plural(day.words, "word")}`;
}

function plural(n: number, word: string) {
  return `${n.toLocaleString("en")} ${word}${n === 1 ? "" : "s"}`;
}

function addDays(date: string, days: number) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function dayOfWeek(date: string) {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

function monthName(date: string) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en", { month: "short", timeZone: "UTC" });
}
