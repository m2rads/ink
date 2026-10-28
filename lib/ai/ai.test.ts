import { describe, expect, mock, test } from "bun:test";
import { simulateReadableStream } from "ai";
import { MockLanguageModelV4 } from "ai/test";

import { runReview } from "./check";
import { DEFAULT_CONFIG, parseConfig, pickArm, type Arm } from "./config";
import { resolveModel } from "./models";
import { contextBefore, locate, matchesAccepted, sentenceAround } from "./correction";
import { anchorItems, nextLevel, type ReportedItem } from "./review";

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

const report = (r: Partial<ReportedItem> & Pick<ReportedItem, "paragraph" | "quote">): ReportedItem => ({
  kind: "fix",
  title: "",
  why: "",
  answer: "x",
  accept: [],
  ...r,
});

describe("anchorItems", () => {
  const paragraphs = ["Je travaille de la maison chaque jours.", "", "Il faut que les gens peuvent choisir. Les gens peuvent."];

  test("pins quotes to offsets, keeping the model's order of importance", () => {
    const { items } = anchorItems(paragraphs, [
      report({ paragraph: 3, quote: "peuvent" }),
      report({ paragraph: 1, quote: "de la maison" }),
    ]);
    expect(items.map((m) => [m.block, m.start, m.end])).toEqual([
      [2, 21, 28],
      [0, 13, 25],
    ]);
  });

  test("takes the next occurrence when a quote repeats", () => {
    const { items } = anchorItems(paragraphs, [
      report({ paragraph: 3, quote: "peuvent" }),
      report({ paragraph: 3, quote: "peuvent" }),
    ]);
    expect(items.map((m) => m.start)).toEqual([21, 47]);
  });

  test("drops quotes that aren't in the paragraph, are out of range, overlap or weren't asked for", () => {
    const { items, dropped } = anchorItems(
      paragraphs,
      [
        report({ paragraph: 1, quote: "chaque jours" }),
        report({ paragraph: 1, quote: "jours" }),
        report({ paragraph: 1, quote: "à la maison" }),
        report({ paragraph: 9, quote: "Je" }),
        report({ paragraph: 1.5, quote: "Je" }),
        report({ paragraph: 1, quote: "" }),
        report({ paragraph: 3, quote: "choisir" }),
      ],
      new Set([0]),
    );
    expect(items).toHaveLength(1);
    expect(dropped.map((d) => d.quote)).toEqual(["jours", "à la maison", "Je", "Je", "", "choisir"]);
  });

  test("keeps at most six changes and two strengths", () => {
    const words = "un deux trois quatre cinq six sept huit neuf dix onze".split(" ");
    const text = words.join(" ");
    const { items } = anchorItems(
      [text],
      [
        ...words.slice(0, 8).map((w) => report({ paragraph: 1, quote: w })),
        ...words.slice(8).map((w) => report({ paragraph: 1, quote: w, kind: "keep" })),
      ],
    );
    expect(items.filter((i) => i.kind !== "keep")).toHaveLength(6);
    expect(items.filter((i) => i.kind === "keep")).toHaveLength(2);
  });

  test("an answer is always accepted; clarify and keep have none", () => {
    const { items } = anchorItems(paragraphs, [
      report({ paragraph: 1, quote: "chaque jours", answer: "chaque jour", accept: ["tous les jours"] }),
      report({ paragraph: 3, quote: "choisir", kind: "clarify", answer: "décider", accept: ["décider"] }),
    ]);
    expect(items[0].accept).toEqual(["chaque jour", "tous les jours"]);
    expect(items[1]).toMatchObject({ answer: "", accept: [] });
  });
});

describe("level helpers", () => {
  test("the next level is the next full one", () => {
    expect(nextLevel("B1")).toBe("B2");
    expect(nextLevel("B1+")).toBe("B2");
    expect(nextLevel("B2+")).toBe("C1");
    expect(nextLevel("C1+")).toBeNull();
  });
});

describe("matchesAccepted", () => {
  test("ignores apostrophe style, spacing and edges", () => {
    expect(matchesAccepted("  qu'ils  puissent ", ["qu’ils puissent"])).toBe(true);
    expect(matchesAccepted("qu’ils peuvent", ["qu’ils puissent"])).toBe(false);
  });
});

describe("runReview", () => {
  const paragraphs = ["Je lis chaque jours.", "Il a parlé a sa mère."];
  const json = JSON.stringify({
    task: "TEF A",
    level: "B1",
    caveat: "",
    diagnosis: "Accuracy holds it at B1.",
    skills: [{ skill: "accuracy", level: "B1" }],
    items: [
      report({ paragraph: 1, quote: "chaque jours", answer: "chaque jour", accept: [] }),
      report({ paragraph: 1, quote: "invented" }),
      report({ paragraph: 2, quote: "a sa", answer: "à sa", accept: ["à sa"] }),
    ],
    focus: [{ title: "Prepositions", detail: "*à*" }],
  });
  // The text in 20-character deltas, the way a provider streams it.
  const model = () =>
    new MockLanguageModelV4({
      provider: "mock",
      modelId: "french",
      doStream: async () => ({
        stream: simulateReadableStream({
          chunks: [
            { type: "text-start", id: "t" },
            ...(json.match(/.{1,20}/g) ?? []).map((delta) => ({ type: "text-delta" as const, id: "t", delta })),
            { type: "text-end", id: "t" },
            {
              type: "finish",
              finishReason: { unified: "stop", raw: undefined },
              usage: {
                inputTokens: { total: 10, noCache: 10, cacheRead: undefined, cacheWrite: undefined },
                outputTokens: { total: 20, text: 20, reasoning: undefined },
              },
            },
          ],
        }),
      }),
    });

  test("returns the level, anchored items and the arm that made them", async () => {
    const result = await runReview({ reviewId: "r1", prompt: "", paragraphs }, { model: model() });
    expect(result.arm).toBe("override");
    expect(result.model).toBe("mock/french");
    expect(result.level).toBe("B1");
    expect(result.items).toHaveLength(2);
    expect(result.items[0]).toMatchObject({ block: 0, start: 7, end: 19, accept: ["chaque jour"] });
  });

  test("gives items only for the paragraphs asked about", async () => {
    const result = await runReview({ reviewId: "r1", prompt: "", paragraphs, review: [1] }, { model: model() });
    expect(result.items.map((i) => i.block)).toEqual([1]);
  });

  test("drops items on words the grammar checker underlines", async () => {
    const underlined = [[], [{ start: 11, end: 15, message: "Confusion" }]];
    const result = await runReview({ reviewId: "r1", prompt: "", paragraphs, underlined }, { model: model() });
    expect(result.items.map((i) => i.quote)).toEqual(["chaque jours"]);
  });

  test("counts items as they stream in, skipping ones that don't anchor", async () => {
    const counts: number[] = [];
    await runReview({ reviewId: "r1", prompt: "", paragraphs }, { model: model(), onFound: (n) => counts.push(n) });
    // The last item is only complete in the final output, so the stream counts up to one before it.
    expect(counts).toEqual([1]);
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
