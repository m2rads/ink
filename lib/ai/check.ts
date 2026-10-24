import { generateText, Output, type LanguageModel } from "ai";
import { z } from "zod";

import { armFor, type Arm, type Task } from "./config";
import { anchorMistakes, essayReportSchema, type Mistake } from "./correction";

// The two AI calls behind the correction loop. Server only: they read the
// config and spend the AI Gateway key (AI_GATEWAY_API_KEY, or the deployment's
// OIDC token on Vercel).

const CHECK_INSTRUCTIONS = `You correct essays written by adult learners of French preparing for the TEF Canada writing exam (Expression écrite). Your notes are read by the learner, who will rewrite each mistake themselves.

Report only clear errors in these four categories:
- preposition: wrong, missing or extra preposition, including contractions (de + le → du).
- agreement: gender or number agreement of adjectives, determiners, past participles.
- conjugation: wrong tense, mood (subjunctive after il faut que, etc.), person or verb form.
- spelling: misspelled words, missing or wrong accents.

Never report style, word choice, register, repetition, punctuation or spacing, or anything correct in Canadian or European French. If you aren't sure something is wrong, leave it out: flagging correct French teaches the learner a mistake. An essay with no mistakes gets an empty list.

For each mistake, copy the wrong words exactly as written, and keep the span as short as the correction allows, so the learner rewrites a phrase, not a sentence.`;

const FIX_INSTRUCTIONS = `A learner of French is fixing a mistake in their own essay. Decide whether their rewrite of the marked phrase is correct French in the sentence, fixes the error named by the rule, and keeps the meaning. Accept any correct rewrite, not only the expected one. If it's wrong, say what is still wrong in one short sentence of English, without giving the answer.`;

export type EssayInput = {
  /** Assigns the A/B arm, so one essay always gets the same model. */
  essayId: string;
  /** The prompt the essay answers, when there is one. */
  title: string;
  paragraphs: string[];
};

export type EssayCheck = { arm: string; model: string; mistakes: Mistake[] };

export async function checkEssay(input: EssayInput, model?: LanguageModel): Promise<EssayCheck> {
  return run("check", input.essayId, model, async (m) => {
    const { output, usage } = await generateText({
      model: m,
      instructions: CHECK_INSTRUCTIONS,
      prompt: essayPrompt(input),
      output: Output.object({ schema: essayReportSchema }),
      abortSignal: AbortSignal.timeout(90_000),
    });
    const { mistakes, dropped } = anchorMistakes(input.paragraphs, output.mistakes);
    return { result: { mistakes }, log: { mistakes: mistakes.length, dropped: dropped.length, usage } };
  });
}

function essayPrompt({ title, paragraphs }: EssayInput) {
  const body = paragraphs.map((p, i) => `[${i + 1}] ${p}`).join("\n\n");
  return title.trim() ? `Prompt: ${title.trim()}\n\nEssay:\n\n${body}` : `Essay:\n\n${body}`;
}

export type FixInput = {
  essayId: string;
  /** The sentence as the learner wrote it, mistake included. */
  sentence: string;
  wrong: string;
  attempt: string;
  rule: string;
};

const fixVerdictSchema = z.object({
  correct: z.boolean(),
  feedback: z.string().describe("Empty when correct."),
});

export type FixVerdict = z.infer<typeof fixVerdictSchema> & { arm: string; model: string };

export async function judgeFix(input: FixInput, model?: LanguageModel): Promise<FixVerdict> {
  return run("fix", input.essayId, model, async (m) => {
    const { output, usage } = await generateText({
      model: m,
      instructions: FIX_INSTRUCTIONS,
      prompt: `Sentence: ${input.sentence}\nMarked phrase: ${input.wrong}\nRule: ${input.rule}\nLearner's rewrite of the phrase: ${input.attempt}`,
      output: Output.object({ schema: fixVerdictSchema }),
      abortSignal: AbortSignal.timeout(20_000),
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
  call: (model: LanguageModel) => Promise<{ result: T; log: Record<string, unknown> }>,
): Promise<T & { arm: string; model: string }> {
  const arm: Arm = override
    ? { id: "override", model: modelName(override), weight: 1 }
    : await armFor(task, unit);
  const started = performance.now();
  try {
    const { result, log } = await call(override ?? arm.model);
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
