import { describe, expect, test } from "bun:test";

import {
  MAX_MS,
  elapsed,
  formatClock,
  isDone,
  isWarning,
  pause,
  reading,
  resume,
  speakClock,
  startTimer,
} from "./timer";

const MIN = 60_000;

describe("counting down", () => {
  test("reads the time left from the start time", () => {
    const t = startTimer(25 * MIN, 1000);
    expect(reading(t, 1000 + 10 * MIN)).toBe(15 * MIN);
    expect(isDone(t, 1000 + 10 * MIN)).toBe(false);
  });

  test("a clock reading older than the start never shows more than the limit", () => {
    const t = startTimer(25 * MIN, 10_000);
    expect(reading(t, 9_400)).toBe(25 * MIN);
    expect(formatClock(reading(t, 9_400))).toBe("25:00");
  });

  test("stops itself at 0:00, never below", () => {
    const t = startTimer(25 * MIN, 0);
    expect(isDone(t, 25 * MIN)).toBe(true);
    expect(reading(t, 40 * MIN)).toBe(0);
    expect(formatClock(reading(t, 40 * MIN))).toBe("0:00");
  });

  test("warns in the last 5 minutes, but not on a timer that short to begin with", () => {
    const t = startTimer(25 * MIN, 0);
    expect(isWarning(t, 19 * MIN)).toBe(false);
    expect(isWarning(t, 20 * MIN)).toBe(true);
    expect(isWarning(startTimer(3 * MIN, 0), 0)).toBe(false);
  });
});

describe("counting up", () => {
  test("reads the time so far", () => {
    const t = startTimer(null, 0);
    expect(reading(t, 7 * MIN)).toBe(7 * MIN);
    expect(formatClock(reading(t, 7 * MIN + 500), false)).toBe("7:00");
  });

  test("stops itself after MAX_MS, so a forgotten tab can't count for days", () => {
    const t = startTimer(null, 0);
    expect(isDone(t, MAX_MS - 1)).toBe(false);
    expect(isDone(t, 3 * 24 * 60 * MIN)).toBe(true);
    expect(reading(t, 3 * 24 * 60 * MIN)).toBe(MAX_MS);
  });

  test("never warns", () => {
    expect(isWarning(startTimer(null, 0), 60 * MIN)).toBe(false);
  });
});

describe("pausing", () => {
  test("time paused doesn't count", () => {
    let t = startTimer(25 * MIN, 0);
    t = pause(t, 5 * MIN);
    expect(reading(t, 50 * MIN)).toBe(20 * MIN);
    t = resume(t, 50 * MIN);
    expect(reading(t, 55 * MIN)).toBe(15 * MIN);
  });

  test("pausing twice keeps the first pause; resuming a running timer changes nothing", () => {
    const t = pause(startTimer(null, 0), 1000);
    expect(pause(t, 9000)).toBe(t);
    const running = startTimer(null, 0);
    expect(resume(running, 5000)).toBe(running);
  });

  test("a finished timer can't be paused", () => {
    const t = startTimer(MIN, 0);
    expect(pause(t, 2 * MIN)).toBe(t);
  });

  test("elapsed is measured to the pause while paused", () => {
    const t = pause(startTimer(null, 0), 3 * MIN);
    expect(elapsed(t, 90 * MIN)).toBe(3 * MIN);
  });
});

describe("formatting", () => {
  test("minutes and seconds, then hours", () => {
    expect(formatClock(61_000)).toBe("1:01");
    expect(formatClock(62 * MIN + 3000)).toBe("1:02:03");
  });

  test("a countdown rounds up, a count-up rounds down", () => {
    expect(formatClock(59_001)).toBe("1:00");
    expect(formatClock(59_001, false)).toBe("0:59");
  });

  test("spoken", () => {
    expect(speakClock(34 * MIN + 12_000)).toBe("34 minutes 12 seconds left");
    expect(speakClock(MIN, false)).toBe("1 minute so far");
    expect(speakClock(0)).toBe("0 seconds left");
    expect(speakClock(61 * MIN, false)).toBe("1 hour 1 minute so far");
  });
});
