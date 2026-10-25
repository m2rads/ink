import { describe, expect, mock, test } from "bun:test";
import { MockLanguageModelV4 } from "ai/test";

import { checkEssay } from "./check";
import { DEFAULT_CONFIG, parseConfig, pickArm, type Arm } from "./config";
import { resolveModel } from "./models";
import { anchorMistakes, contextBefore, locate, matchesAccepted, sentenceAround, type ReportedMistake } from "./correction";

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
      report({ paragraph: 1.5, wrong: "Je" }),
      report({ paragraph: 1, wrong: "" }),
    ]);
    expect(mistakes).toHaveLength(1);
    expect(dropped.map((d) => d.wrong)).toEqual(["jours", "à la maison", "Je", "Je", ""]);
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
                report({ paragraph: 1, wrong: "chaque jours", category: "agreement", fix: "chaque jour", accept: [] }),
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
    const result = await checkEssay({ reviewId: "r1", prompt: "", paragraphs: ["Je lis chaque jours."] }, model);
    expect(result.arm).toBe("override");
    expect(result.model).toBe("mock/french");
    expect(result.mistakes).toHaveLength(1);
    expect(result.mistakes[0]).toMatchObject({ block: 0, start: 7, end: 19, category: "agreement" });
    // The fix is always an accepted answer, even when the model leaves it out of accept.
    expect(result.mistakes[0].accept).toEqual(["chaque jour"]);
  });
});

describe("locate", () => {
  test("keeps the old offset when the phrase is still there", () => {
    expect(locate("le chat et le chien", "le", 11)).toEqual({ start: 11, end: 13 });
  });

  test("follows the phrase by the words before it after an edit", () => {
    const before = contextBefore("le chat et le chien", 11);
    expect(locate("Hier, le chat et le chien", "le", 11, before)).toEqual({ start: 17, end: 19 });
  });

  test("falls back to the nearest occurrence", () => {
    expect(locate("le chat et le chien", "le", 9)).toEqual({ start: 11, end: 13 });
  });

  test("returns null once the phrase is gone", () => {
    expect(locate("la chatte", "le", 0)).toBeNull();
  });
});

describe("sentenceAround", () => {
  const text = "J’aime Paris. Il faut que les gens peuvent choisir ! Bien sûr.";

  test("returns the sentence holding the span", () => {
    const start = text.indexOf("peuvent");
    expect(sentenceAround(text, start, start + 7)).toBe("Il faut que les gens peuvent choisir !");
  });

  test("works at the edges of the paragraph", () => {
    expect(sentenceAround(text, 0, 6)).toBe("J’aime Paris.");
    expect(sentenceAround("Sans point final", 5, 10)).toBe("Sans point final");
  });
});

describe("resolveModel", () => {
  test("sends providers without their own key through AI Gateway", () => {
    expect(resolveModel("openai/gpt-6-sol", { AI_GATEWAY_API_KEY: "vck_x" })).toBe("openai/gpt-6-sol");
    expect(resolveModel("anthropic/claude-sonnet-5.5", { VERCEL_OIDC_TOKEN: "t", OPENAI_API_KEY: "sk-x" })).toBe(
      "anthropic/claude-sonnet-5.5",
    );
  });

  test("calls OpenAI directly when there's an OpenAI key, even with a Gateway key", () => {
    for (const env of [{ OPENAI_API_KEY: "sk-x" }, { OPENAI_API_KEY: "sk-x", AI_GATEWAY_API_KEY: "vck_x" }]) {
      const model = resolveModel("openai/gpt-6-sol", env);
      expect(typeof model).not.toBe("string");
      expect(model).toMatchObject({ modelId: "gpt-6-sol" });
    }
  });

  test("says which key is missing", () => {
    expect(() => resolveModel("openai/gpt-6-sol", {})).toThrow(/AI_GATEWAY_API_KEY or OPENAI_API_KEY/);
    expect(() => resolveModel("anthropic/claude-sonnet-5.5", { OPENAI_API_KEY: "sk-x" })).toThrow(/add "anthropic"/);
  });
});
