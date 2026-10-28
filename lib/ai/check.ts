import { generateText, Output, streamText, type LanguageModel } from "ai";
import { z } from "zod";

import { armFor, type Arm, type Task } from "./config";
import { askReportSchema, MAX_SUGGESTIONS, type AskReport } from "./ask";
import { ASK_INSTRUCTIONS, ITEM_CHECK_INSTRUCTIONS, REVIEW_INSTRUCTIONS } from "./instructions";
import { resolveModel } from "./models";
import { anchorItems, reviewReportSchema, type Item, type ReportedItem, type ReviewReport } from "./review";

// The AI calls behind the review and the slash command. Server only: they read the config
// and spend the AI Gateway key, or a provider's own key without one (see
// models.ts). No temperature: reasoning models reject it.

export type ReviewInput = {
  /** Assigns the A/B arm; the review's item checks pass the same id. */
  reviewId: string;
  /** The prompt the essay answers (the essay's title), when there is one. */
  prompt: string;
  paragraphs: string[];
  /** 0-based paragraphs to give items for; the rest are context. All when absent. */
  review?: number[];
  /** Open items already shown in the other paragraphs, so they aren't repeated: [paragraph index, title]. */
  shown?: [number, string][];
  /** Focus titles from the writer's earlier essays, with how many essays each came up in. */
  earlier?: [string, number][];
  /**
   * What the grammar checker already underlines in each paragraph (lib/grammar.ts).
   * The model is told to leave it alone, and any item overlapping it is dropped.
   */
  underlined?: { start: number; end: number; message: string }[][];
};

export type ReviewResult = Omit<ReviewReport, "items"> & { arm: string; model: string; items: Item[] };

export type ReviewOptions = {
  /** Replaces the configured arm (tests, evals). */
  model?: LanguageModel;
  /** Called as the model writes its items out, with how many are anchored so far. */
  onFound?: (count: number) => void;
};

// Streamed so the review can show progress. A reasoning model thinks first
// and then writes the report out; every item but the last in a partial
// output is complete, so those are anchored and counted as they arrive.
export async function runReview(input: ReviewInput, { model, onFound }: ReviewOptions = {}): Promise<ReviewResult> {
  const allowed = input.review ? new Set(input.review) : undefined;
  const keep = (items: Item[]) => items.filter((m) => !underlinedAt(input, m));
  return run("check", input.reviewId, model, async (m, arm) => {
    const stream = streamText({
      model: m,
      reasoning: arm.reasoning,
      instructions: REVIEW_INSTRUCTIONS,
      prompt: reviewPrompt(input),
      output: Output.object({ schema: reviewReportSchema }),
      abortSignal: AbortSignal.timeout(150_000),
    });
    let found = 0;
    for await (const partial of stream.partialOutputStream) {
      const complete = (partial.items ?? []).slice(0, -1) as ReportedItem[];
      const count = keep(anchorItems(input.paragraphs, complete, allowed).items).length;
      if (count > found) onFound?.((found = count));
    }
    const [output, usage] = await Promise.all([stream.output, stream.usage]);
    const anchored = anchorItems(input.paragraphs, output.items, allowed);
    const items = keep(anchored.items);
    return {
      result: { ...output, items },
      log: {
        level: output.level,
        task: output.task,
        items: items.length,
        dropped: anchored.dropped.length,
        repeated: anchored.items.length - items.length,
        usage,
      },
    };
  });
}

// Empty paragraphs keep their number, so the model's paragraph numbers match
// the editor's blocks.
function reviewPrompt({ prompt, paragraphs, review, shown = [], earlier = [], underlined = [] }: ReviewInput) {
  const marked = review && review.length < paragraphs.filter((p) => p.trim()).length ? new Set(review) : null;
  const body = paragraphs.map((p, i) => `[${i + 1}]${marked?.has(i) ? " (review)" : ""} ${p}`).join("\n\n");
  const words = paragraphs.reduce((n, p) => n + p.split(/\s+/).filter(Boolean).length, 0);
  const parts = [prompt.trim() ? `Exam prompt or title:\n${prompt.trim()}` : "", `Essay (${words} words):\n\n${body}`];
  const known = underlined.flatMap((issues, i) =>
    issues.map((u) => `[${i + 1}] "${paragraphs[i].slice(u.start, u.end)}": ${u.message}`),
  );
  if (known.length) parts.push(`Already underlined:\n${known.join("\n")}`);
  if (marked && shown.length) parts.push(`Open items already shown:\n${shown.map(([i, t]) => `[${i + 1}] ${t}`).join("\n")}`);
  if (earlier.length) parts.push(`Focus from earlier essays:\n${earlier.map(([t, n]) => `${t} (${n} ${n === 1 ? "essay" : "essays"})`).join("\n")}`);
  return parts.filter(Boolean).join("\n\n");
}

/** Whether an item falls on something the grammar checker already underlines. */
function underlinedAt({ underlined = [] }: ReviewInput, m: Item) {
  return (underlined[m.block] ?? []).some((u) => m.start < u.end && u.start < m.end);
}

export type ItemCheckInput = {
  reviewId: string;
  /** The passage as it stands now: the sentence or paragraph the item is about. */
  passage: string;
  /** The words the item was about, as first written. */
  quote: string;
  title: string;
  why: string;
};

const itemVerdictSchema = z.object({
  resolved: z.boolean(),
  feedback: z
    .string()
    .describe("Empty when resolved. Otherwise a few words of English on what's still missing, without the answer. French in *asterisks*."),
});

export type ItemVerdict = z.infer<typeof itemVerdictSchema> & { arm: string; model: string };

export async function judgeItem(input: ItemCheckInput, model?: LanguageModel): Promise<ItemVerdict> {
  return run("fix", input.reviewId, model, async (m, arm) => {
    const { output, usage } = await generateText({
      model: m,
      reasoning: arm.reasoning,
      instructions: ITEM_CHECK_INSTRUCTIONS,
      prompt: `Coach's note: ${input.title}. ${input.why}\nThe words it was about: ${input.quote}\nThe passage now: ${input.passage}`,
      output: Output.object({ schema: itemVerdictSchema }),
      abortSignal: AbortSignal.timeout(30_000),
    });
    return { result: output, log: { resolved: output.resolved, usage } };
  });
}

export type AskInput = {
  /** What the writer typed after "/". */
  query: string;
  /** The paragraph's text before and after the query, for fitting the French in. */
  before: string;
  after: string;
};

export type AskResult = AskReport & { arm: string; model: string };

/** French to put in place of the slash command's query. Fast: no reasoning, a short answer. */
export async function suggestFrench(input: AskInput, model?: LanguageModel): Promise<AskResult> {
  return run("ask", crypto.randomUUID(), model, async (m, arm) => {
    const { output, usage } = await generateText({
      model: m,
      reasoning: arm.reasoning,
      instructions: ASK_INSTRUCTIONS,
      prompt: `Sentence: ${input.before}[QUERY]${input.after}\nQuery: ${input.query}`,
      output: Output.object({ schema: askReportSchema }),
      abortSignal: AbortSignal.timeout(20_000),
    });
    const suggestions = output.suggestions.filter((s) => s.fr.trim()).slice(0, MAX_SUGGESTIONS);
    return { result: { readAs: output.readAs, suggestions }, log: { suggestions: suggestions.length, usage } };
  });
}

/**
 * Picks the arm, times the call and logs one line per call: the record an
 * A/B comparison is read from. A model passed in (tests, evals) skips the
 * config and is logged as arm "override".
 */
async function run<T extends object>(
  task: Task,
  unit: string,
  override: LanguageModel | undefined,
  call: (model: LanguageModel, arm: Arm) => Promise<{ result: T; log: Record<string, unknown> }>,
): Promise<T & { arm: string; model: string }> {
  const arm: Arm = override
    ? { id: "override", model: modelName(override), weight: 1 }
    : await armFor(task, unit);
  const started = performance.now();
  try {
    const { result, log } = await call(override ?? resolveModel(arm.model), arm);
    console.info(
      JSON.stringify({ event: `ai.${task}`, arm: arm.id, model: arm.model, unit, ms: ms(started), ...log }),
    );
    return { ...result, arm: arm.id, model: arm.model };
  } catch (error) {
    console.error(
      JSON.stringify({ event: `ai.${task}.error`, arm: arm.id, model: arm.model, unit, ms: ms(started) }),
      error,
    );
    throw error;
  }
}

function modelName(model: LanguageModel) {
  return typeof model === "string" ? model : `${model.provider}/${model.modelId}`;
}

function ms(since: number) {
  return Math.round(performance.now() - since);
}
