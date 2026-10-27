// The grammatical gender of a French noun, for the dictionary. Server only:
// the lookup action returns it with the translation, so it costs no extra
// request and the data never ships to the browser. Client code may import
// the types, never the function (it pulls in 4 MB of index).
//
// Data: lib/gender/morphalou.json (every noun form → gender, from Morphalou
// 3.1), lib/gender/lexique.json (which forms are mostly something else, from
// Lexique 3.83), lib/gender/curated.ts (hand-checked fixes and meanings).
// Built by scripts/build-gender.ts; licences in lib/gender/NOTICE.md.

import { EITHER, EXTRA_FORMS, NONE, NOUN_FIRST, ONE, SENSES } from "./gender/curated";
import { foldCase, genderKey } from "./gender/key";
import lexique from "./gender/lexique.json";
import morphalou from "./gender/morphalou.json";

export type Genre = "m" | "f";

/** What the dictionary shows for a French noun. */
export type Gender =
  /** One gender, any meaning: la maison, le chat. `plural`: only used in the plural (les vacances). */
  | { kind: "one"; lemma: string; gender: Genre; plural?: boolean }
  /** Either gender for the same meaning, by who it is: un or une élève, enfant, artiste. */
  | { kind: "either"; lemma: string }
  /** The gender changes the meaning: le tour (a turn), la tour (a tower). Glosses are short English. */
  | { kind: "senses"; lemma: string; senses: { gender: Genre; gloss: string }[] };

/**
 * The gender of `text` if it's a French noun (or a noun phrase like "pomme
 * de terre", or the noun with its article: "la tour", "l'arbre"); a plural
 * gives its singular as `lemma`. Null for anything else: verbs, adjectives,
 * several words, unknown words.
 */
export function lookUpGender(text: string): Gender | null {
  const input = parse(text);
  if (!input) return null;
  const found = candidates(input.noun);
  if (!found.length) return null;

  const results: Gender[] = [];
  for (const c of found) {
    // A word that is mostly a verb, adjective, preposition… ("pendant",
    // "devoir", "été") gets no gender unless an article makes it a noun.
    if (!input.article && !mainlyNoun(c) && !curatedLists().noun.has(foldCase(c.form))) continue;
    // "Paris" is not the plural of "pari", nor "Tours" of "tour".
    if (input.capital && c.lemma !== c.form) continue;
    const result = resolve(c.lemma, c.gender, c.plural);
    if (result) results.push(result);
  }
  const result = pick(results, input.hint);
  if (result?.kind === "senses" && input.hint) {
    // "la tour": the tower first, the turn still shown.
    const senses = [...result.senses].sort((a, b) => Number(b.gender === input.hint) - Number(a.gender === input.hint));
    return { ...result, senses };
  }
  return result;
}

// ---------------------------------------------------------------- input

/** `noun` is case-folded (lib/gender/key.ts); `capital`: it was written Like this. */
type Input = { noun: string; article: boolean; hint: Genre | null; capital: boolean };

// Determiners stripped before the lookup, with the gender they show. "l'",
// "les", "mon"… say nothing ("mon amie"); they still mark a noun.
const DETERMINERS: [RegExp, Genre | null][] = [
  [/^(?:le|un|du|ce|cet) /i, "m"],
  [/^(?:la|une|cette|ma|ta|sa|de la) /i, "f"],
  [/^(?:les|des|ces|mon|ton|son|mes|tes|ses|notre|votre|leur|nos|vos|leurs) /i, null],
  [/^(?:de l|l|d)'/i, null],
];

function parse(text: string): Input | null {
  // A pasted or selected word may bring its punctuation or quotes along.
  let rest = text
    .normalize("NFC")
    .replace(/[\u2019\u2018\u02bc]/g, "'")
    .replace(/^[\s"«»“”(\[.,;:!?…]+|[\s"«»“”)\].,;:!?…]+$/g, "")
    .replace(/\s+/g, " ");
  if (!rest || rest.length > 60) return null;
  // Letters, and the spaces, hyphens and apostrophes of compounds; no digits.
  if (!/^\p{L}+(?:[-' ]\p{L}+)*$/u.test(rest)) return null;

  let article = false;
  let hint: Genre | null = null;
  for (const [re, gender] of DETERMINERS) {
    const m = re.exec(rest);
    if (m) {
      article = true;
      hint = gender;
      rest = rest.slice(m[0].length);
      break;
    }
  }
  if (!rest) return null;
  return { noun: foldCase(rest), article, hint, capital: /^\p{Lu}\p{Ll}/u.test(rest) };
}

// ---------------------------------------------------------------- index

type Candidate = { form: string; gender: "m" | "f" | "b"; other: boolean; plural: boolean; lemma: string };

/**
 * The index entries for `noun` (case-folded, accents kept). Accents may be
 * left out ("eleve" finds "élève") only when that leaves one spelling.
 */
function candidates(noun: string): Candidate[] {
  const key = genderKey(noun);
  const { none } = curatedLists();
  const all = [...extraLines(key), ...indexLines(key)].map(toCandidate).filter((c) => !none.has(foldCase(c.lemma)));
  const exact = all.filter((c) => foldCase(c.form) === noun);
  const pool = exact.length ? exact : new Set(all.map((c) => foldCase(c.form))).size === 1 ? all : [];
  // "cours" is a noun of its own (m) and the plural of "cour" (f): the lemma wins.
  const lemmas = pool.filter((c) => c.lemma === c.form);
  return lemmas.length ? lemmas : pool;
}

// morphalou.json is one string of `key;form;gender;lemma` lines joined by
// "|", sorted by key (scripts/build-gender.ts). Searching it in place costs
// no parse and no index at cold start; a lookup is a binary search over
// character offsets, about a microsecond.
const INDEX: string = morphalou.index;
const FIELD = ";";
const LINE = "|";

function indexLines(key: string): string[] {
  // Binary search over character positions for the first line whose key is
  // >= `key`. lo and hi are always line starts, and so is the start of the
  // line holding any position between them.
  let lo = 0;
  let hi = INDEX.length;
  while (lo < hi) {
    const start = INDEX.lastIndexOf(LINE, ((lo + hi) >>> 1) - 1) + 1;
    if (keyAt(start) < key) lo = lineEnd(start) + 1;
    else hi = start;
  }
  const out: string[] = [];
  for (let start = lo; start < INDEX.length && keyAt(start) === key; start = lineEnd(start) + 1) {
    out.push(INDEX.slice(start, lineEnd(start)));
  }
  return out;
}

function lineEnd(start: number) {
  const end = INDEX.indexOf(LINE, start);
  return end === -1 ? INDEX.length : end;
}

function keyAt(start: number) {
  return INDEX.slice(start, INDEX.indexOf(FIELD, start));
}

function toCandidate(line: string): Candidate {
  const [key, shown, field, delta] = line.split(FIELD);
  const form = shown || key;
  const g = field[0];
  const lower = g.toLowerCase() as Candidate["gender"];
  return { form, gender: lower, other: g !== lower, plural: field[1] === "p", lemma: delta ? applyDelta(form, delta) : form };
}

// "3al" on "chevaux": drop 3 characters, add "al".
function applyDelta(form: string, delta: string) {
  const n = parseInt(delta, 10);
  return form.slice(0, form.length - n) + delta.slice(String(n).length);
}

// Morphalou lacks a few plurals (chefs-d'œuvre): lines in the same shape.
let extra: Map<string, string[]> | null = null;
function extraLines(key: string): string[] {
  if (!extra) {
    extra = new Map();
    for (const [form, lemma] of EXTRA_FORMS) {
      const lemmaLine = indexLines(genderKey(lemma)).find((l) => toCandidate(l).lemma === lemma);
      if (!lemmaLine) continue;
      const k = genderKey(form);
      const line = [k, form, lemmaLine.split(FIELD)[2], `${form.length}${lemma}`].join(FIELD);
      extra.set(k, [...(extra.get(k) ?? []), line]);
    }
  }
  return extra.get(key) ?? [];
}

// ---------------------------------------------------------------- reading

let sets: { noun: Set<string>; other: Set<string>; disputed: Set<string> } | null = null;
function lexiqueSets() {
  sets ??= {
    noun: new Set(lexique.noun.split("|")),
    other: new Set(lexique.other.split("|")),
    disputed: new Set(lexique.disputed.split("|")),
  };
  return sets;
}

/**
 * Whether a form is mainly read as a noun. Lexique's frequencies decide
 * when it has the form: at least half its uses (books and films averaged)
 * must be the noun. A form only Morphalou knows, and knows as something
 * else too, counts as not mainly a noun.
 */
function mainlyNoun(c: Candidate) {
  const { noun, other } = lexiqueSets();
  const form = foldCase(c.form);
  if (other.has(form)) return false;
  return !c.other || noun.has(form);
}

// ---------------------------------------------------------------- answer

let curated: {
  senses: Map<string, { gender: Genre; gloss: string }[]>;
  either: Set<string>;
  one: Map<string, Genre>;
  none: Set<string>;
  noun: Set<string>;
} | null = null;
function curatedLists() {
  curated ??= {
    senses: new Map(Object.entries(SENSES).map(([k, v]) => [foldCase(k), v])),
    either: new Set(EITHER.map(foldCase)),
    one: new Map(Object.entries(ONE).map(([k, v]) => [foldCase(k), v])),
    none: new Set(NONE.map(foldCase)),
    noun: new Set(NOUN_FIRST.map(foldCase)),
  };
  return curated;
}

function resolve(lemma: string, gender: Candidate["gender"], plural: boolean): Gender | null {
  const { senses, either, one } = curatedLists();
  const k = foldCase(lemma);
  const s = senses.get(k);
  if (s) return { kind: "senses", lemma, senses: s };
  if (either.has(k)) return { kind: "either", lemma };
  const g = one.get(k) ?? (lexiqueSets().disputed.has(k) ? null : gender === "b" ? "b" : gender);
  if (!g) return null;
  if (g === "b") return { kind: "either", lemma };
  return plural ? { kind: "one", lemma, gender: g, plural } : { kind: "one", lemma, gender: g };
}

// Several lemmas for one form: fine if they agree; else the article's
// gender picks ("le/la …"), else nothing rather than a guess.
function pick(results: Gender[], hint: Genre | null): Gender | null {
  const distinct = [...new Map(results.map((r) => [JSON.stringify(r), r])).values()];
  if (distinct.length <= 1) return distinct[0] ?? null;
  if (hint) {
    const matching = distinct.filter((r) => r.kind === "one" && r.gender === hint);
    if (matching.length === 1) return matching[0];
  }
  return null;
}
