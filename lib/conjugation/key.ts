// How French verb forms are compared, shared by the build script and the
// lookup so both sides agree. Client-safe, no data.

const MARKS = /\p{M}/gu;
// Most infinitives and endings are plain ASCII: skipping Unicode
// normalisation for them halves the lookup's cold start.
const PLAIN = /^[a-z' -]*$/;

/** Lowercase, one kind of apostrophe, ligatures spelled out, accents kept: "Œuvre" → "oeuvre". */
export function lower(text: string): string {
  if (PLAIN.test(text)) return text;
  return text
    .normalize("NFC")
    .toLocaleLowerCase("fr")
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae")
    .replace(/[’‘ʼ´`]/g, "'");
}

/** The index key: lower() with the accents taken off, so "etais" finds "étais". Keeps the length. */
export function fold(text: string): string {
  if (PLAIN.test(text)) return text;
  return lower(text).normalize("NFD").replace(MARKS, "").normalize("NFC");
}

/**
 * Whether `typed` can be `form` written with some accents left out
 * ("etais", "connait" for "étais", "connaît"), never with different ones:
 * "à" isn't "a", "mangé" isn't "mange". Both are lower()ed.
 */
export function sameLetters(typed: string, form: string): boolean {
  if (typed.length !== form.length) return false;
  for (let i = 0; i < typed.length; i++) {
    const t = typed[i];
    const f = form[i];
    if (t === f) continue;
    if (t.normalize("NFD").length > 1 || f.normalize("NFD").replace(MARKS, "") !== t) return false;
  }
  return true;
}
