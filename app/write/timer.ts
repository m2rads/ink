// The essay's timer as timestamps, never as a counter: what it reads is
// always computed from when it started, so background-tab throttling and a
// sleeping laptop can't make it drift. Pure functions; times in ms.
//
// With a limit it counts down and stops itself at 0:00; without one it
// counts up and stops itself after MAX_MS, so a forgotten tab can't count
// for days.

export type Timer = {
  /** Time to count down, in ms; null counts up. */
  limitMs: number | null;
  startedAt: number;
  /** Set while paused. */
  pausedAt: number | null;
  /** Total time spent paused before the current pause. */
  pausedMs: number;
};

/** A timer without a limit stops itself here. */
export const MAX_MS = 4 * 60 * 60_000;

/** Time left at which a countdown turns to a warning. */
export const WARN_AT_MS = 5 * 60_000;

export function startTimer(limitMs: number | null, now: number): Timer {
  return { limitMs, startedAt: now, pausedAt: null, pausedMs: 0 };
}

export function pause(t: Timer, now: number): Timer {
  return t.pausedAt === null && !isDone(t, now) ? { ...t, pausedAt: now } : t;
}

export function resume(t: Timer, now: number): Timer {
  return t.pausedAt === null ? t : { ...t, pausedAt: null, pausedMs: t.pausedMs + (now - t.pausedAt) };
}

/** Time counted so far, never past the limit (or MAX_MS). */
export function elapsed(t: Timer, now: number): number {
  // `now` comes from a once-a-second tick, so just after starting it can be
  // slightly older than `startedAt`; never let that read as negative.
  const counted = Math.max(0, (t.pausedAt ?? now) - t.startedAt - t.pausedMs);
  return Math.min(counted, t.limitMs ?? MAX_MS);
}

/** It has stopped by itself: the countdown reached 0:00, or the count-up reached MAX_MS. */
export function isDone(t: Timer, now: number): boolean {
  return elapsed(t, now) >= (t.limitMs ?? MAX_MS);
}

/** What the clock shows: time left for a countdown, time so far otherwise. */
export function reading(t: Timer, now: number): number {
  return t.limitMs === null ? elapsed(t, now) : t.limitMs - elapsed(t, now);
}

/** A countdown in its last WARN_AT_MS. */
export function isWarning(t: Timer, now: number): boolean {
  return t.limitMs !== null && t.limitMs > WARN_AT_MS && reading(t, now) <= WARN_AT_MS;
}

/**
 * "34:12", or "1:02:03" past an hour. Rounded up, so a countdown reads 0:00
 * exactly when time is up and a count-up shows 0:00 for its first second.
 */
export function formatClock(ms: number, countingDown = true): string {
  const total = countingDown ? Math.ceil(ms / 1000) : Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}

/** For screen readers: "34 minutes 12 seconds left", or "12 minutes so far" counting up. */
export function speakClock(ms: number, countingDown = true): string {
  const total = countingDown ? Math.ceil(ms / 1000) : Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const unit = (n: number, word: string) => n && `${n} ${word}${n === 1 ? "" : "s"}`;
  const parts = [unit(h, "hour"), unit(m, "minute"), unit(s, "second")].filter(Boolean);
  const amount = parts.length ? parts.join(" ") : "0 seconds";
  return countingDown ? `${amount} left` : `${amount} so far`;
}
