// How much of an essay one review sends. TEF essays are 80–300 words, far
// under these; they're for the writer who pastes something much longer.
// Instead of refusing it, a review looks closely at the next FOCUS_CHARS of
// paragraphs to review, and sends up to CONTEXT_CHARS in all so the level
// still rests on more than those (the opening and closing paragraphs first,
// for structure). Paragraphs left over keep their "not reviewed" dot, and
// the next review takes them. Client-safe: the web app plans with it, and
// the API holds every client to the same limits (lib/api/schemas.ts).

export const FOCUS_CHARS = 6_000;
export const CONTEXT_CHARS = 12_000;
/** A single paragraph longer than this is sent cut short. */
export const PARAGRAPH_CHARS = 5_000;

export type ReviewPlan = {
  /** Every paragraph, in place: "" for one not sent (in `omitted`), so numbers match the editor's. */
  paragraphs: string[];
  /** The paragraphs looked at closely. */
  review: number[];
  /** Paragraphs not sent, with their word counts, so the model knows there's more. */
  omitted: [number, number][];
  /** Paragraphs that wanted review and wait for the next one. */
  left: number;
};

const words = (text: string) => text.split(/\s+/).filter(Boolean).length;

/** Which of `texts` to send, reviewing the paragraphs in `todo` (in order) as far as the budget goes. */
export function planReview(texts: string[], todo: number[]): ReviewPlan {
  const clip = (i: number) => texts[i].slice(0, PARAGRAPH_CHARS);
  const review: number[] = [];
  let size = 0;
  // In order, stopping at the first that doesn't fit, so the next review carries on from there.
  for (const i of todo) {
    const n = clip(i).length;
    if (review.length && size + n > FOCUS_CHARS) break;
    review.push(i);
    size += n;
  }

  const sent = new Set(review);
  const written = texts.flatMap((t, i) => (t.trim() ? [i] : []));
  // The opening and closing paragraphs first: they carry the structure the level is judged on.
  const context = [written[0], written.at(-1), ...written.slice(1, -1)].filter((i): i is number => i !== undefined);
  for (const i of context) {
    if (sent.has(i)) continue;
    const n = clip(i).length;
    if (size + n > CONTEXT_CHARS) continue;
    sent.add(i);
    size += n;
  }

  return {
    paragraphs: texts.map((t, i) => (sent.has(i) ? clip(i) : t.trim() ? "" : t)),
    review,
    omitted: written.filter((i) => !sent.has(i)).map((i) => [i, words(texts[i])]),
    left: todo.length - review.length,
  };
}
