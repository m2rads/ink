import { describe, expect, test } from "bun:test";

import { CONTEXT_CHARS, FOCUS_CHARS, PARAGRAPH_CHARS, planReview } from "./budget";

const para = (chars: number, word = "mot") => `${word} `.repeat(Math.ceil(chars / (word.length + 1))).slice(0, chars);
const all = (texts: string[]) => texts.map((_, i) => i);

describe("planReview", () => {
  test("a TEF-sized essay is sent whole and reviewed whole", () => {
    const texts = [para(600), "", para(900), para(500)];
    const plan = planReview(texts, [0, 2, 3]);
    expect(plan.paragraphs).toEqual(texts);
    expect(plan.review).toEqual([0, 2, 3]);
    expect(plan.omitted).toEqual([]);
    expect(plan.left).toBe(0);
  });

  test("a long essay reviews paragraphs in order up to the focus budget, the rest left for next time", () => {
    const texts = Array.from({ length: 10 }, () => para(1_500));
    const plan = planReview(texts, all(texts));
    expect(plan.review).toEqual([0, 1, 2, 3]);
    expect(plan.review.reduce((n, i) => n + plan.paragraphs[i].length, 0)).toBeLessThanOrEqual(FOCUS_CHARS);
    expect(plan.left).toBe(6);
  });

  test("context fills to the budget with the closing paragraph first", () => {
    const texts = Array.from({ length: 10 }, () => para(1_500));
    const plan = planReview(texts, all(texts));
    const sent = plan.paragraphs.reduce((n, p) => n + p.length, 0);
    expect(sent).toBeLessThanOrEqual(CONTEXT_CHARS);
    expect(plan.paragraphs[9]).toBe(texts[9]);
    // 0–3 reviewed, 9 (closing), then 4–6 until the budget's full.
    expect(plan.omitted.map(([i]) => i)).toEqual([7, 8]);
    for (const [i, words] of plan.omitted) {
      expect(plan.paragraphs[i]).toBe("");
      expect(words).toBeGreaterThan(0);
    }
  });

  test("the next review carries on with what's left", () => {
    const texts = Array.from({ length: 10 }, () => para(1_500));
    const first = planReview(texts, all(texts));
    const rest = all(texts).filter((i) => !first.review.includes(i));
    const second = planReview(texts, rest);
    expect(second.review).toEqual([4, 5, 6, 7]);
    // The opening paragraph still goes along for the level.
    expect(second.paragraphs[0]).toBe(texts[0]);
  });

  test("a huge paragraph is cut short, and counts as cut", () => {
    const texts = [para(9_000), para(400), para(1_000)];
    const plan = planReview(texts, [0, 1, 2]);
    expect(plan.paragraphs[0].length).toBe(PARAGRAPH_CHARS);
    expect(plan.review).toEqual([0, 1]);
    expect(plan.left).toBe(1);
    // The last one still goes along as context.
    expect(plan.paragraphs[2]).toBe(texts[2]);
  });

  test("empty paragraphs keep their place and aren't counted as omitted", () => {
    const texts = Array.from({ length: 12 }, (_, i) => (i % 2 ? "" : para(1_500)));
    const plan = planReview(texts, texts.flatMap((t, i) => (t ? [i] : [])));
    expect(plan.paragraphs.length).toBe(12);
    expect(plan.omitted.every(([i]) => texts[i] !== "")).toBe(true);
  });
});
