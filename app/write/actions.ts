"use server";

import { z } from "zod";

import { checkEssay, judgeFix, type EssayCheck, type FixVerdict } from "@/lib/ai/check";
import { matchesAccepted } from "@/lib/ai/correction";

// The correction loop's two server functions. They're public POST endpoints,
// so input is validated and capped here; there's no account to check yet.
// TODO: rate-limit per visitor before Ink is public, or anyone can spend the
// AI Gateway budget.

const essaySchema = z.object({
  essayId: z.string().min(1).max(100),
  title: z.string().max(500),
  paragraphs: z.array(z.string().max(5_000)).min(1).max(60),
});

/** Check a finished essay. Empty paragraphs are kept so block indices still match the editor's. */
export async function correctEssay(input: z.input<typeof essaySchema>): Promise<EssayCheck> {
  const essay = essaySchema.parse(input);
  if (essay.paragraphs.every((p) => p.trim() === "")) return { arm: "none", model: "none", mistakes: [] };
  return checkEssay(essay);
}

const fixSchema = z.object({
  essayId: z.string().min(1).max(100),
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
