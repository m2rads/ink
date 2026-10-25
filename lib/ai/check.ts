import { generateText, Output, type LanguageModel } from "ai";
import { z } from "zod";

import { armFor, type Arm, type Task } from "./config";
import { anchorMistakes, essayReportSchema, type Mistake } from "./correction";
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
};

export type EssayCheck = { arm: string; model: string; mistakes: Mistake[] };

export async function checkEssay(input: EssayInput, model?: LanguageModel): Promise<EssayCheck> {
  return run("check", input.reviewId, model, async (m, arm) => {
    const { output, usage } = await generateText({
      model: m,
      reasoning: arm.reasoning,
      instructions: CHECK_INSTRUCTIONS,
      prompt: essayPrompt(input),
      output: Output.object({ schema: essayReportSchema }),
      abortSignal: AbortSignal.timeout(120_000),
    });
    const { mistakes, dropped } = anchorMistakes(input.paragraphs, output.mistakes);
    return { result: { mistakes }, log: { mistakes: mistakes.length, dropped: dropped.length, usage } };
  });
}

// Empty paragraphs keep their number, so the model's paragraph numbers match
// the editor's blocks.
function essayPrompt({ prompt, paragraphs }: EssayInput) {
  const body = paragraphs.map((p, i) => `[${i + 1}] ${p}`).join("\n\n");
  return prompt.trim() ? `Exam prompt:\n${prompt.trim()}\n\nEssay:\n\n${body}` : `Essay:\n\n${body}`;
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
    .describe("Empty when correct. Otherwise one short sentence in English on what's still wrong, without the answer."),
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
