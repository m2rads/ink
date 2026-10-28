import { generateText, Output, streamText, type LanguageModel } from "ai";
import { z } from "zod";

import { armFor, type Arm, type Task } from "./config";
import { anchorMistakes, essayReportSchema, type Mistake, type ReportedMistake } from "./correction";
import { CHECK_INSTRUCTIONS, FIX_INSTRUCTIONS } from "./instructions";
import { resolveModel } from "./models";

// The two AI calls behind the correction loop. Server only: they read the
// config and spend the AI Gateway key, or a provider's own key without one
// (see models.ts). No temperature: reasoning models reject it.

export type EssayInput = {
  /** Assigns the A/B arm; the review's fix checks pass the same id. */
  reviewId: string;
  /** The prompt the essay answers, when there is one. */
  prompt: string;
  paragraphs: string[];
  /**
   * What the grammar checker already underlines in each paragraph (lib/grammar.ts).
   * The model is told to leave it alone, and any mark overlapping it is dropped.
   */
  underlined?: { start: number; end: number; message: string }[][];
};

export type EssayCheck = { arm: string; model: string; mistakes: Mistake[] };

export type CheckOptions = {
  /** Replaces the configured arm (tests, evals). */
  model?: LanguageModel;
  /** Called as the model writes its mistakes out, with how many are anchored so far. */
  onFound?: (count: number) => void;
};

// Streamed so the review can show progress. A reasoning model thinks first
// and then writes the mistakes out one by one; every mistake but the last in
// a partial output is complete, so those are anchored and counted as they
// arrive, and the count matches the final result's.
export async function checkEssay(input: EssayInput, { model, onFound }: CheckOptions = {}): Promise<EssayCheck> {
  return run("check", input.reviewId, model, async (m, arm) => {
    const stream = streamText({
      model: m,
      reasoning: arm.reasoning,
      instructions: CHECK_INSTRUCTIONS,
      prompt: essayPrompt(input),
      output: Output.object({ schema: essayReportSchema }),
      abortSignal: AbortSignal.timeout(120_000),
    });
    let found = 0;
    for await (const partial of stream.partialOutputStream) {
      const complete = (partial.mistakes ?? []).slice(0, -1) as ReportedMistake[];
      const count = anchorMistakes(input.paragraphs, complete).mistakes.filter((m) => !underlinedAt(input, m)).length;
      if (count > found) onFound?.((found = count));
    }
    const [output, usage] = await Promise.all([stream.output, stream.usage]);
    const anchored = anchorMistakes(input.paragraphs, output.mistakes);
    const mistakes = anchored.mistakes.filter((m) => !underlinedAt(input, m));
    const repeated = anchored.mistakes.length - mistakes.length;
    return { result: { mistakes }, log: { mistakes: mistakes.length, dropped: anchored.dropped.length, repeated, usage } };
  });
}

// Empty paragraphs keep their number, so the model's paragraph numbers match
// the editor's blocks.
function essayPrompt({ prompt, paragraphs, underlined = [] }: EssayInput) {
  const body = paragraphs.map((p, i) => `[${i + 1}] ${p}`).join("\n\n");
  const essay = prompt.trim() ? `Exam prompt:\n${prompt.trim()}\n\nEssay:\n\n${body}` : `Essay:\n\n${body}`;
  const known = underlined.flatMap((issues, i) =>
    issues.map((u) => `[${i + 1}] "${paragraphs[i].slice(u.start, u.end)}": ${u.message}`),
  );
  return known.length ? `${essay}\n\nAlready underlined:\n${known.join("\n")}` : essay;
}

/** Whether a mark falls on something the grammar checker already underlines. */
function underlinedAt({ underlined = [] }: EssayInput, m: Mistake) {
  return (underlined[m.block] ?? []).some((u) => m.start < u.end && u.start < m.end);
}

export type FixInput = {
  reviewId: string;
  /** The sentence as the learner wrote it, mistake included. */
  sentence: string;
  wrong: string;
  attempt: string;
  rule: string;
};

const fixVerdictSchema = z.object({
  correct: z.boolean(),
  feedback: z
    .string()
    .describe("Empty when correct. Otherwise a few words of English on what's still wrong, without the answer."),
});

export type FixVerdict = z.infer<typeof fixVerdictSchema> & { arm: string; model: string };

export async function judgeFix(input: FixInput, model?: LanguageModel): Promise<FixVerdict> {
  return run("fix", input.reviewId, model, async (m, arm) => {
    const { output, usage } = await generateText({
      model: m,
      reasoning: arm.reasoning,
      instructions: FIX_INSTRUCTIONS,
      prompt: `Sentence: ${input.sentence}\nMarked phrase: ${input.wrong}\nRule: ${input.rule}\nLearner's rewrite of the phrase: ${input.attempt}`,
      output: Output.object({ schema: fixVerdictSchema }),
      abortSignal: AbortSignal.timeout(30_000),
    });
    return { result: output, log: { correct: output.correct, usage } };
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
