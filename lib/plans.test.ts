import { describe, expect, test } from "bun:test";

import { formatPrice, isPass, passStart } from "./plans";

describe("passStart", () => {
  const now = new Date("2026-11-01T12:00:00Z");

  test("starts now with no pass running", () => {
    expect(passStart(now, null)).toEqual(now);
  });

  test("starts when the running pass ends", () => {
    const end = new Date("2026-11-20T08:00:00Z");
    expect(passStart(now, end)).toEqual(end);
  });

  test("a pass that already ended doesn't delay it", () => {
    expect(passStart(now, new Date("2026-10-01T00:00:00Z"))).toEqual(now);
  });
});

test("isPass knows only the passes", () => {
  expect(isPass("pass_1m")).toBe(true);
  expect(isPass("pass_3m")).toBe(true);
  expect(isPass("free")).toBe(false);
  expect(isPass(undefined)).toBe(false);
});

test("formatPrice drops cents only when there are none", () => {
  expect(formatPrice(1_900)).toBe("$19");
  expect(formatPrice(1_950)).toBe("$19.50");
});
