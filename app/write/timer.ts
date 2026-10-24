// The exam clock as timestamps, never as a counter: time left is always
// computed from when the run started, so reloads, background-tab throttling
// and a closed laptop can't make it drift. Pure functions; times in ms.

export type TimerState = {
  startedAt: number | null;
  /** Set while paused (practice runs only). */
  pausedAt: number | null;
  /** Total time spent paused before the current pause. */
  pausedMs: number;
};

export type TimerStatus = "idle" | "running" | "paused" | "over";

export const IDLE: TimerState = { startedAt: null, pausedAt: null, pausedMs: 0 };

export const EXAM_MINUTES = { A: 25, B: 35 } as const;

/** Time left at which the clock turns to a warning. */
export const WARN_AT_MS = 5 * 60_000;

export function start(s: TimerState, now: number): TimerState {
  return s.startedAt === null ? { startedAt: now, pausedAt: null, pausedMs: 0 } : s;
}

export function pause(s: TimerState, now: number): TimerState {
  return s.startedAt !== null && s.pausedAt === null ? { ...s, pausedAt: now } : s;
}

export function resume(s: TimerState, now: number): TimerState {
  return s.pausedAt === null ? s : { ...s, pausedAt: null, pausedMs: s.pausedMs + (now - s.pausedAt) };
}

export function elapsed(s: TimerState, now: number): number {
  if (s.startedAt === null) return 0;
  // `now` comes from a once-a-second tick, so just after starting it can be
  // slightly older than `startedAt`; never let that read as more than full time.
  return Math.max(0, (s.pausedAt ?? now) - s.startedAt - s.pausedMs);
}

/** Negative once time is up (practice runs keep going into overtime). */
export function remaining(s: TimerState, durationMs: number, now: number): number {
  return durationMs - elapsed(s, now);
}

export function status(s: TimerState, durationMs: number, now: number): TimerStatus {
  if (s.startedAt === null) return "idle";
  if (remaining(s, durationMs, now) <= 0) return "over";
  return s.pausedAt === null ? "running" : "paused";
}

/**
 * "34:12" counting down, rounded up so it reads 0:00 exactly when time is up;
 * "+1:05" for overtime.
 */
export function formatClock(ms: number): string {
  const over = ms < 0;
  const total = over ? Math.floor(-ms / 1000) : Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = String(total % 60).padStart(2, "0");
  return `${over ? "+" : ""}${m}:${s}`;
}

/** Spoken clock for screen readers: "34 minutes 12 seconds left". */
export function speakClock(ms: number): string {
  const over = ms < 0;
  const total = over ? Math.floor(-ms / 1000) : Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  const parts = [m && `${m} minute${m === 1 ? "" : "s"}`, s && `${s} second${s === 1 ? "" : "s"}`].filter(Boolean);
  const amount = parts.length ? parts.join(" ") : "0 seconds";
  return over ? `${amount} over time` : `${amount} left`;
}

export function parseTimer(raw: string | null): TimerState | null {
  if (!raw) return null;
  try {
    const t = JSON.parse(raw) as Partial<TimerState>;
    const num = (v: unknown) => typeof v === "number" && Number.isFinite(v);
    if ((t.startedAt === null || num(t.startedAt)) && (t.pausedAt === null || num(t.pausedAt)) && num(t.pausedMs)) {
      return { startedAt: t.startedAt ?? null, pausedAt: t.pausedAt ?? null, pausedMs: t.pausedMs! };
    }
  } catch {
    // Corrupt JSON: treat as a run that hasn't started.
  }
  return null;
}
