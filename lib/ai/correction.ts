// The text work around the review's marks: matching a rewrite to accepted
// answers, finding a marked phrase again after edits, and the sentence around
// it. No AI calls, so the client can import it.

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

/**
 * Where `needle` is in `text` now. Edits after a review move marks around,
 * so it picks the occurrence whose preceding text best matches `before` (the
 * words that led up to it when it was marked), then the one closest to its
 * old offset. A phrase that's gone returns null.
 */
export function locate(
  text: string,
  needle: string,
  near: number,
  before = "",
): { start: number; end: number } | null {
  if (!needle) return null;
  let best = -1;
  let bestScore = -1;
  for (let i = text.indexOf(needle); i !== -1; i = text.indexOf(needle, i + 1)) {
    const score = sharedSuffix(text.slice(0, i), before);
    if (score > bestScore || (score === bestScore && Math.abs(i - near) < Math.abs(best - near))) {
      best = i;
      bestScore = score;
    }
  }
  return best === -1 ? null : { start: best, end: best + needle.length };
}

/** How many characters `a` and `b` share at their ends. */
function sharedSuffix(a: string, b: string) {
  let n = 0;
  while (n < a.length && n < b.length && a[a.length - 1 - n] === b[b.length - 1 - n]) n++;
  return n;
}

/** The text just before an offset, kept with a mark so locate() can find it again. */
export function contextBefore(text: string, start: number) {
  return text.slice(Math.max(0, start - 24), start);
}

/** The sentence holding [start, end), so a fix is judged in context. */
export function sentenceAround(text: string, start: number, end: number): string {
  const before = text.slice(0, start);
  const from = Math.max(before.search(/[^.!?…]*$/), 0);
  const after = text.slice(end).search(/[.!?…]/);
  const to = after === -1 ? text.length : end + after + 1;
  return text.slice(from, to).trim();
}
