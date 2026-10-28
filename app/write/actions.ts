"use server";

import { z } from "zod";

import { judgeItem, runReview, suggestFrench, type AskResult, type ItemVerdict, type ReviewResult } from "@/lib/ai/check";
import { matchesAccepted } from "@/lib/ai/correction";
import { lookUpVerb, type VerbLookup } from "@/lib/conjugation";
import { AVOIR, ÊTRE } from "@/lib/conjugation/auxiliaries";
import { lookUpGender, type Gender } from "@/lib/gender";
import { checkGrammar, type GrammarIssue } from "@/lib/grammar";
import { LANGUAGE_CODES } from "@/lib/languages";
import { translate } from "@/lib/translate";

// The review's two server functions, the slash command, the essay's
// grammar underlines, and the dictionary's lookup.
// They're public POST endpoints, so input is validated and capped here;
// there's no account to check yet.
// TODO: rate-limit per visitor before Ink is public, or anyone can spend the
// AI Gateway and Google Translate budgets.

const reviewSchema = z.object({
  reviewId: z.string().min(1).max(100),
  prompt: z.string().max(2_000),
  paragraphs: z.array(z.string().max(5_000)).min(1).max(60),
  review: z.array(z.number().int().min(0).max(59)).max(60).optional(),
  shown: z.array(z.tuple([z.number().int().min(0).max(59), z.string().max(200)])).max(60).optional(),
  earlier: z.array(z.tuple([z.string().max(60), z.number().int().min(1).max(10_000)])).max(12).optional(),
});

export type ReviewEvent = { type: "found"; count: number } | { type: "done"; result: ReviewResult };

/**
 * Review an essay, streamed: a `found` event each time the count of items so
 * far goes up, then `done` with the result. `review` limits items to those
 * paragraphs (an incremental review); the level always covers the whole
 * essay. Empty paragraphs are kept so block indices match the editor's.
 */
export async function reviewEssay(input: z.input<typeof reviewSchema>): Promise<ReadableStream<ReviewEvent>> {
  const essay = reviewSchema.parse(input);
  return new ReadableStream({
    async start(events) {
      try {
        const underlined = essay.paragraphs.map(checkGrammar);
        const result = await runReview(
          { ...essay, underlined },
          { onFound: (count) => events.enqueue({ type: "found", count }) },
        );
        events.enqueue({ type: "done", result });
        events.close();
      } catch (error) {
        events.error(error);
      }
    },
  });
}

const grammarSchema = z.array(z.string().max(5_000)).max(60);

/**
 * Grammalecte's grammar and spelling mistakes in each paragraph, for the
 * essay's underlines (lib/grammar.ts): where each is and its explanation.
 * The editor sends only paragraphs it hasn't checked yet.
 */
export async function findGrammar(paragraphs: string[]): Promise<GrammarIssue[][]> {
  return grammarSchema.parse(paragraphs).map(checkGrammar);
}

const itemCheckSchema = z.object({
  reviewId: z.string().min(1).max(100),
  passage: z.string().max(5_000),
  quote: z.string().max(500),
  title: z.string().max(200),
  why: z.string().max(1_000),
  /** The item's words now, and the answers that pass without a model call. */
  words: z.string().max(500),
  accept: z.array(z.string().max(500)).max(20),
});

/** Ask the AI about one item again, after the writer changed it. An accepted answer passes without a call. */
export async function checkItem(input: z.input<typeof itemCheckSchema>): Promise<ItemVerdict> {
  const { words, accept, ...item } = itemCheckSchema.parse(input);
  if (accept.length && matchesAccepted(words, accept)) return { resolved: true, feedback: "", arm: "accepted", model: "none" };
  return judgeItem(item);
}

const askSchema = z.object({
  query: z.string().trim().min(1).max(200),
  before: z.string().max(600),
  after: z.string().max(300),
});

/** The slash command: French for what the writer typed after "/", fitted to its sentence. */
export async function askFrench(input: z.input<typeof askSchema>): Promise<AskResult> {
  const { query, before, after } = askSchema.parse(input);
  // The sentence it goes in is enough context; the rest of the essay isn't sent.
  return suggestFrench({ query, before: before.slice(-300), after: after.slice(0, 150) });
}

const lookupSchema = z.object({
  text: z.string().trim().min(1).max(100),
  /** The learner's language (LANGUAGES), the other side being French. */
  lang: z.enum(LANGUAGE_CODES),
  direction: z.enum(["to-fr", "from-fr"]),
  /** A selection's words before it in the essay (wordsBefore in selection.ts); absent in the panel. */
  before: z.string().max(100).optional(),
});

/**
 * `gender` and `verb` are the French side's: what was typed from French, the
 * translation into it. A selection gets one of them when the word is both
 * (été, marche); the panel gets both.
 */
export type Lookup = { translation: string; gender: Gender | null; verb: VerbLookup | null };

/**
 * The dictionary's lookup: one translation, from Google Translate, and what
 * the French side is: a noun's gender (lib/gender.ts), a verb's conjugation
 * read with the words before it (lib/conjugation.ts). Both run on this
 * server: no extra request, and the data never reaches the browser.
 */
export async function lookUp(input: z.input<typeof lookupSchema>): Promise<Lookup> {
  const { text, lang, direction, before } = lookupSchema.parse(input);
  const [from, to] = direction === "to-fr" ? [lang, "fr"] : ["fr", lang];
  const translation = await translate({ text, from, to });
  const french = direction === "to-fr" ? translation : text;
  const gender = genderOf(french);
  const verb = verbOf(french, before);
  if (before === undefined || !gender || !verb) return { translation, gender, verb };
  // In a sentence it's one or the other: a noun after a determiner (cet été), else the verb (il a été).
  return readsAsNoun(before) ? { translation, gender, verb: null } : { translation, gender: null, verb };
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

/** A conjugation bug never costs the translation either. */
function verbOf(french: string, before = ""): VerbLookup | null {
  try {
    return lookUpVerb(french, before);
  } catch (error) {
    console.error(JSON.stringify({ event: "dict.verb.error", error: String(error) }));
    return null;
  }
}

const DETERMINERS = new Set(
  "le la l les un une des du au aux ce cet cette ces mon ton son ma ta sa mes tes ses notre votre nos vos leur leurs quel quelle quels quelles chaque".split(" "),
);
/** Right before a verb: its subject, a pronoun between them (je me, il y, ne), or être or avoir (il a été). */
const BEFORE_VERB = new Set([
  ..."je j tu il elle on nous vous ils elles me m te t se s y en ne n".split(" "),
  ...[ÊTRE, AVOIR].flatMap((v) => Object.values(v.simple).flat(2)),
]);

/**
 * Whether the words before read as a noun phrase: a determiner right before
 * (cet été), or two words back with no verb sign between (une bonne chose,
 * but il l’a été).
 */
function readsAsNoun(before: string) {
  const words = before.toLocaleLowerCase("fr").split(/[\s’']+/).filter(Boolean);
  const [previous, last] = [words.at(-2) ?? "", words.at(-1) ?? ""];
  if (DETERMINERS.has(last)) return true;
  return !BEFORE_VERB.has(last) && DETERMINERS.has(previous);
}
