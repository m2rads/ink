import { z } from "zod";

// What a check returns, and the pure text work around it. No AI calls here,
// so the correction view can import it on the client.

export const CATEGORIES = ["preposition", "agreement", "conjugation", "spelling"] as const;
export type Category = (typeof CATEGORIES)[number];

/** One mistake as the model reports it: located by quote, not by offset. */
export const reportedMistakeSchema = z.object({
  paragraph: z.number().int().min(1).describe("Number of the paragraph the mistake is in, as given in brackets."),
  wrong: z
    .string()
    .min(1)
    .describe("The mistaken words copied exactly from the paragraph: the shortest span that holds the error."),
  category: z.enum(CATEGORIES),
  fix: z.string().describe("The best correction of exactly that span."),
  accept: z
    .array(z.string())
    .min(1)
    .describe("Every correct rewrite of the span a teacher would accept, including fix."),
  rule: z.string().describe("The rule in under 60 characters, in English, e.g. “Dépendre always takes de”."),
  explain: z
    .string()
    .describe("One or two sentences in English on why. Wrap French words in *asterisks*. Never quote the fix."),
  hint: z.string().describe("A nudge toward the fix that doesn't give it away, in English."),
});

export const essayReportSchema = z.object({ mistakes: z.array(reportedMistakeSchema) });

export type ReportedMistake = z.infer<typeof reportedMistakeSchema>;

/** A mistake pinned to its place in the essay. */
export type Mistake = Omit<ReportedMistake, "paragraph"> & {
  id: string;
  /** Index into the essay's blocks. */
  block: number;
  /** UTF-16 offsets of `wrong` in that block's text. */
  start: number;
  end: number;
};

/**
 * Pin reported mistakes to offsets in the text. A quote that isn't in its
 * paragraph is dropped rather than guessed at, and so is one that overlaps a
 * mistake already placed: the view can only mark each phrase once. Repeated
 * quotes take the next unclaimed occurrence.
 */
export function anchorMistakes(
  paragraphs: string[],
  reported: ReportedMistake[],
): { mistakes: Mistake[]; dropped: ReportedMistake[] } {
  const mistakes: Mistake[] = [];
  const dropped: ReportedMistake[] = [];

  for (const { paragraph, ...rest } of reported) {
    const block = paragraph - 1;
    const text = paragraphs[block];
    const span = text === undefined ? null : findFree(text, rest.wrong, mistakes.filter((m) => m.block === block));
    if (!span) {
      dropped.push({ paragraph, ...rest });
      continue;
    }
    mistakes.push({ ...rest, id: `${block}:${span.start}`, block, ...span });
  }

  mistakes.sort((a, b) => a.block - b.block || a.start - b.start);
  return { mistakes, dropped };
}

function findFree(text: string, quote: string, taken: Mistake[]) {
  for (let from = 0; ; ) {
    const start = text.indexOf(quote, from);
    if (start === -1) return null;
    const end = start + quote.length;
    if (!taken.some((m) => start < m.end && m.start < end)) return { start, end };
    from = start + 1;
  }
}

/**
 * Whether a rewrite is one of the accepted answers, ignoring the differences
 * a keyboard makes: straight vs curly apostrophes, runs of spaces, edges.
 * Matching here answers instantly; only other rewrites go to the model.
 */
export function matchesAccepted(attempt: string, accept: string[]): boolean {
  const a = normalize(attempt);
  return accept.some((x) => normalize(x) === a);
}

function normalize(s: string) {
  return s.normalize("NFC").replace(/[‘’ʼ]/g, "'").replace(/\s+/g, " ").trim();
}
