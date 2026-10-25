import { describe, expect, test } from "bun:test";

import {
  IDLE,
  elapsed,
  end,
  formatClock,
  parseTimer,
  pause,
  remaining,
  resume,
  speakClock,
  start,
  status,
} from "./timer";

const MIN = 60_000;
const B = 35 * MIN;

describe("running", () => {
  test("idle until started, then counts from the start time", () => {
    expect(status(IDLE, B, 1000)).toBe("idle");
    const s = start(IDLE, 1000);
    expect(status(s, B, 1000 + 10 * MIN)).toBe("running");
    expect(remaining(s, B, 1000 + 10 * MIN)).toBe(25 * MIN);
  });

  test("a clock reading older than the start never shows more than full time", () => {
    const s = start(IDLE, 10_000);
    expect(remaining(s, B, 9_400)).toBe(B);
    expect(formatClock(remaining(s, B, 9_400))).toBe("35:00");
  });

  test("starting twice keeps the first start time", () => {
    const s = start(IDLE, 1000);
    expect(start(s, 9999)).toBe(s);
  });

  test("is over at exactly the duration, and goes negative after", () => {
    const s = start(IDLE, 0);
    expect(status(s, B, B - 1)).toBe("running");
    expect(status(s, B, B)).toBe("over");
    expect(remaining(s, B, B + 65_000)).toBe(-65_000);
  });
});

describe("pausing (practice)", () => {
  test("paused time doesn't count", () => {
    let s = start(IDLE, 0);
    s = pause(s, 5 * MIN);
    expect(status(s, B, 20 * MIN)).toBe("paused");
    expect(elapsed(s, 20 * MIN)).toBe(5 * MIN);
    s = resume(s, 20 * MIN);
    expect(elapsed(s, 30 * MIN)).toBe(15 * MIN);
  });

  test("pauses add up across several pauses", () => {
    let s = start(IDLE, 0);
    s = resume(pause(s, 1 * MIN), 3 * MIN);
    s = resume(pause(s, 10 * MIN), 14 * MIN);
    expect(s.pausedMs).toBe(6 * MIN);
    expect(elapsed(s, 20 * MIN)).toBe(14 * MIN);
  });

  test("pause before start and double pause/resume are no-ops", () => {
    expect(pause(IDLE, 5)).toBe(IDLE);
    const p = pause(start(IDLE, 0), 10);
    expect(pause(p, 20)).toBe(p);
    const r = resume(p, 30);
    expect(resume(r, 40)).toBe(r);
  });
});

describe("ending early (mock)", () => {
  test("stops the clock where it is and the run is over", () => {
    const s = end(start(IDLE, 0), 10 * MIN);
    expect(status(s, B, 20 * MIN)).toBe("over");
    expect(remaining(s, B, 20 * MIN)).toBe(25 * MIN);
  });

  test("can't pause, resume or end again once ended", () => {
    const s = end(start(IDLE, 0), 10 * MIN);
    expect(pause(s, 11 * MIN)).toBe(s);
    expect(resume(s, 11 * MIN)).toBe(s);
    expect(end(s, 12 * MIN)).toBe(s);
    expect(end(IDLE, 5)).toBe(IDLE);
  });
});

describe("formatClock", () => {
  test("counts down in m:ss, rounding up", () => {
    expect(formatClock(B)).toBe("35:00");
    expect(formatClock(34 * MIN + 12_000)).toBe("34:12");
    expect(formatClock(59_001)).toBe("1:00");
    expect(formatClock(500)).toBe("0:01");
    expect(formatClock(0)).toBe("0:00");
  });

  test("shows overtime with a plus", () => {
    expect(formatClock(-500)).toBe("+0:00");
    expect(formatClock(-65_000)).toBe("+1:05");
  });
});

describe("speakClock", () => {
  test("reads time left and overtime in words", () => {
    expect(speakClock(34 * MIN + 12_000)).toBe("34 minutes 12 seconds left");
    expect(speakClock(1 * MIN)).toBe("1 minute left");
    expect(speakClock(-61_000)).toBe("1 minute 1 second over time");
    expect(speakClock(0)).toBe("0 seconds left");
  });
});

describe("parseTimer", () => {
  test("round-trips a stored state", () => {
    const s = pause(start(IDLE, 100), 200);
    expect(parseTimer(JSON.stringify(s))).toEqual(s);
  });

  test("reads states saved before endedAt existed", () => {
    expect(parseTimer(JSON.stringify({ startedAt: 100, pausedAt: null, pausedMs: 0 }))).toEqual({
      startedAt: 100,
      pausedAt: null,
      pausedMs: 0,
      endedAt: null,
    });
  });

  test("rejects corrupt or partial data", () => {
    expect(parseTimer("{")).toBeNull();
    expect(parseTimer(JSON.stringify({ startedAt: "soon" }))).toBeNull();
    expect(parseTimer(null)).toBeNull();
  });
});
