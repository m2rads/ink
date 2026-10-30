import { lookUpVerb, type VerbLookup } from "./conjugation";
import { AVOIR, ÊTRE } from "./conjugation/auxiliaries";
import { verbView, type VerbView } from "./conjugation/compose";
import { lookUpGender, type Gender } from "./gender";
import type { LanguageCode } from "./languages";
import { translate } from "./translate";

// The dictionary's lookup, server only: one translation from Google
// Translate, and what the French side is.

/**
 * `gender` and `verb` are the French side's: what was typed from French, the
 * translation into it. A selection gets one of them when the word is both
 * (été, marche); the panel gets both. `view` only when asked for (`tables`).
 */
export type Lookup = { translation: string; gender: Gender | null; verb: (VerbLookup & { view?: VerbView }) | null };

/**
 * The dictionary's lookup: one translation, from Google Translate, and what
 * the French side is: a noun's gender (lib/gender.ts), a verb's conjugation
 * read with the words before it (lib/conjugation.ts). Both run on this
 * server: no extra request, and the data never reaches the browser. With
 * `tables`, a verb comes with its tables finished (the Mac app), as the web's
 * views compose them.
 */
export async function lookUp({
  text,
  lang,
  direction,
  before,
  tables,
}: {
  text: string;
  lang: LanguageCode;
  direction: "to-fr" | "from-fr";
  /** A selection's words before it in the essay (wordsBefore in selection.ts); absent in the panel. */
  before?: string;
  tables?: boolean;
}): Promise<Lookup> {
  const [from, to] = direction === "to-fr" ? [lang, "fr"] : ["fr", lang];
  const translation = await translate({ text, from, to });
  const french = direction === "to-fr" ? translation : text;
  const gender = genderOf(french);
  const verb = verbOf(french, before, tables);
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
function verbOf(french: string, before = "", tables = false): Lookup["verb"] {
  try {
    const found = lookUpVerb(french, before);
    return found && tables ? { ...found, view: verbView(found.verb) } : found;
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
