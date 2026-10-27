"use server";

import { z } from "zod";

import { checkEssay, judgeFix, type EssayCheck, type FixVerdict } from "@/lib/ai/check";
import { matchesAccepted } from "@/lib/ai/correction";
import { lookUpGender, type Gender } from "@/lib/gender";
import { LANGUAGE_CODES } from "@/lib/languages";
import { translate } from "@/lib/translate";

// The correction loop's two server functions, and the dictionary's lookup.
// They're public POST endpoints, so input is validated and capped here;
// there's no account to check yet.
// TODO: rate-limit per visitor before Ink is public, or anyone can spend the
// AI Gateway and Google Translate budgets.

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

const lookupSchema = z.object({
  text: z.string().trim().min(1).max(100),
  /** The learner's language (LANGUAGES), the other side being French. */
  lang: z.enum(LANGUAGE_CODES),
  direction: z.enum(["to-fr", "from-fr"]),
});

/** `gender` is the French side's: what was typed from French, the translation into it. */
export type Lookup = { translation: string; gender: Gender | null };

/**
 * The dictionary's lookup: one translation, from Google Translate, and the
 * gender of the French side when it's a noun (lib/gender.ts, on this server:
 * no extra request, and the data never reaches the browser).
 */
export async function lookUp(input: z.input<typeof lookupSchema>): Promise<Lookup> {
  const { text, lang, direction } = lookupSchema.parse(input);
  const [from, to] = direction === "to-fr" ? [lang, "fr"] : ["fr", lang];
  const translation = await translate({ text, from, to });
  return { translation, gender: genderOf(direction === "to-fr" ? translation : text) };
}

/** A gender bug never costs the translation. */
function genderOf(french: string): Gender | null {
  try {
    return lookUpGender(french);
  } catch (error) {
    console.error(JSON.stringify({ event: "dict.gender.error", error: String(error) }));
    return null;
  }
}
