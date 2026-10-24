import { describe, expect, mock, test } from "bun:test";
import { MockLanguageModelV4 } from "ai/test";

import { checkEssay } from "./check";
import { DEFAULT_CONFIG, parseConfig, pickArm, type Arm } from "./config";
import { anchorMistakes, matchesAccepted, type ReportedMistake } from "./correction";

const quiet = { error: mock(), info: mock() };
console.error = quiet.error;
console.info = quiet.info;

describe("pickArm", () => {
  const arms: Arm[] = [
    { id: "a", model: "anthropic/claude-sonnet-5.5", weight: 50 },
    { id: "b", model: "openai/gpt-5.5", weight: 50 },
  ];
  const units = Array.from({ length: 4000 }, (_, i) => `essay-${i}`);

  test("gives a unit the same arm every time", () => {
    for (const u of units.slice(0, 50)) expect(pickArm(arms, u, "check").id).toBe(pickArm(arms, u, "check").id);
  });

  test("splits traffic by weight", () => {
    const share = (w: Arm[]) => units.filter((u) => pickArm(w, u, "check").id === "a").length / units.length;
    expect(share(arms)).toBeGreaterThan(0.46);
    expect(share(arms)).toBeLessThan(0.54);
    const skewed = [{ ...arms[0], weight: 9 }, { ...arms[1], weight: 1 }];
    expect(share(skewed)).toBeGreaterThan(0.87);
    expect(share(skewed)).toBeLessThan(0.93);
  });

  test("never picks an arm at weight 0", () => {
    const paused = [{ ...arms[0], weight: 0 }, arms[1]];
    expect(units.every((u) => pickArm(paused, u, "check").id === "b")).toBe(true);
  });
});

describe("parseConfig", () => {
  test("accepts arms without weights", () => {
    const config = parseConfig(
      { check: [{ id: "x", model: "google/gemini-3.5-flash" }], fix: [{ id: "y", model: "openai/gpt-5.4-mini" }] },
      "test",
    );
    expect(config.check[0].weight).toBe(1);
  });

  test("falls back to the default instead of failing", () => {
    expect(parseConfig({ check: [] }, "test")).toBe(DEFAULT_CONFIG);
    expect(parseConfig({ check: [{ id: "x", model: "no-slash" }], fix: [] }, "test")).toBe(DEFAULT_CONFIG);
  });
});

const report = (r: Partial<ReportedMistake> & Pick<ReportedMistake, "paragraph" | "wrong">): ReportedMistake => ({
  category: "spelling",
  fix: "",
  accept: [""],
  rule: "",
  explain: "",
  hint: "",
  ...r,
});

describe("anchorMistakes", () => {
  const paragraphs = ["Je travaille de la maison chaque jours.", "", "Il faut que les gens peuvent choisir. Les gens peuvent."];

  test("pins quotes to offsets, in reading order", () => {
    const { mistakes } = anchorMistakes(paragraphs, [
      report({ paragraph: 3, wrong: "peuvent" }),
      report({ paragraph: 1, wrong: "de la maison" }),
    ]);
    expect(mistakes.map((m) => [m.block, m.start, m.end])).toEqual([
      [0, 13, 25],
      [2, 21, 28],
    ]);
  });

  test("takes the next occurrence when a quote repeats", () => {
    const { mistakes } = anchorMistakes(paragraphs, [
      report({ paragraph: 3, wrong: "peuvent" }),
      report({ paragraph: 3, wrong: "peuvent" }),
    ]);
    expect(mistakes.map((m) => m.start)).toEqual([21, 47]);
  });

  test("drops quotes that aren't in the paragraph, are out of range or overlap", () => {
    const { mistakes, dropped } = anchorMistakes(paragraphs, [
      report({ paragraph: 1, wrong: "chaque jours" }),
      report({ paragraph: 1, wrong: "jours" }),
      report({ paragraph: 1, wrong: "à la maison" }),
      report({ paragraph: 9, wrong: "Je" }),
    ]);
    expect(mistakes).toHaveLength(1);
    expect(dropped.map((d) => d.wrong)).toEqual(["jours", "à la maison", "Je"]);
  });
});

describe("matchesAccepted", () => {
  test("ignores apostrophe style, spacing and edges", () => {
    expect(matchesAccepted("  qu'ils  puissent ", ["qu’ils puissent"])).toBe(true);
    expect(matchesAccepted("qu’ils peuvent", ["qu’ils puissent"])).toBe(false);
  });
});

describe("checkEssay", () => {
  test("returns anchored mistakes and the arm that made them", async () => {
    const model = new MockLanguageModelV4({
      provider: "mock",
      modelId: "french",
      doGenerate: async () => ({
        content: [
          {
            type: "text",
            text: JSON.stringify({
              mistakes: [
                report({ paragraph: 1, wrong: "chaque jours", category: "agreement", accept: ["chaque jour"] }),
                report({ paragraph: 1, wrong: "invented" }),
              ],
            }),
          },
        ],
        finishReason: { unified: "stop", raw: undefined },
        usage: {
          inputTokens: { total: 10, noCache: 10, cacheRead: undefined, cacheWrite: undefined },
          outputTokens: { total: 20, text: 20, reasoning: undefined },
        },
        warnings: [],
      }),
    });
    const result = await checkEssay({ essayId: "e1", title: "", paragraphs: ["Je lis chaque jours."] }, model);
    expect(result.arm).toBe("override");
    expect(result.model).toBe("mock/french");
    expect(result.mistakes).toHaveLength(1);
    expect(result.mistakes[0]).toMatchObject({ block: 0, start: 7, end: 19, category: "agreement" });
  });
});
