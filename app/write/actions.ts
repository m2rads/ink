"use server";

import { z } from "zod";

import { checkEssay, judgeFix, type EssayCheck, type FixVerdict } from "@/lib/ai/check";
import { matchesAccepted } from "@/lib/ai/correction";

// The correction loop's two server functions. They're public POST endpoints,
// so input is validated and capped here; there's no account to check yet.
// TODO: rate-limit per visitor before Ink is public, or anyone can spend the
// AI Gateway budget.

const essaySchema = z.object({
  reviewId: z.string().min(1).max(100),
  prompt: z.string().max(2_000),
  paragraphs: z.array(z.string().max(5_000)).min(1).max(60),
});

export type ReviewEvent = { type: "found"; count: number } | { type: "done"; check: EssayCheck };

/**
 * Review an essay, streamed: a `found` event each time the count of mistakes
 * so far goes up, then `done` with the result. Empty paragraphs are kept so
 * block indices still match the editor's.
 */
export async function reviewEssay(input: z.input<typeof essaySchema>): Promise<ReadableStream<ReviewEvent>> {
  const essay = essaySchema.parse(input);
  return new ReadableStream({
    async start(events) {
      try {
        const check = essay.paragraphs.every((p) => p.trim() === "")
          ? { arm: "none", model: "none", mistakes: [] }
          : await checkEssay(essay, { onFound: (count) => events.enqueue({ type: "found", count }) });
        events.enqueue({ type: "done", check });
        events.close();
      } catch (error) {
        events.error(error);
      }
    },
  });
}

const fixSchema = z.object({
  reviewId: z.string().min(1).max(100),
  sentence: z.string().max(2_000),
  wrong: z.string().max(500),
  attempt: z.string().max(500),
  rule: z.string().max(200),
  accept: z.array(z.string().max(500)).max(20),
});

/** Re-check one rewrite: an accepted answer passes without a model call. */
export async function checkFix(input: z.input<typeof fixSchema>): Promise<FixVerdict> {
  const { accept, ...fix } = fixSchema.parse(input);
  if (matchesAccepted(fix.attempt, accept)) return { correct: true, feedback: "", arm: "accepted", model: "none" };
  return judgeFix(fix);
}
