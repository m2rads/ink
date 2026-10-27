import { VERBS, type CompoundTense, type Form, type SimpleTense, type TenseId, type Verb } from "./data";

// Throwaway: /proto/conjugation. Builds every displayed form from data.ts as
// segments (pronoun, auxiliary, verb, agreement), so each direction can style
// the parts, and reads a selected form back to verb · tense · person.

export type Kind = "pro" | "aux" | "verb" | "agree";
export type Segment = { t: string; k: Kind };
/** One person's form: one segment list per correct spelling. */
export type Spellings = Segment[][];

export const PERSONS = ["je", "tu", "il/elle", "nous", "vous", "ils/elles"] as const;
const REFLEXIVE = ["me", "te", "se", "nous", "vous", "se"];
/** Être verbs' participle agreement, by person (vous can be one person). */
const AGREE = ["(e)", "(e)", "(e)", "(e)s", "(e)(s)", "(e)s"];

const COMPOUND: Record<CompoundTense, SimpleTense> = {
  passeCompose: "present",
  plusQueParfait: "imparfait",
  passeAnterieur: "passeSimple",
  futurAnterieur: "futur",
  conditionnelPasse: "conditionnel",
  subjonctifPasse: "subjonctif",
};

export type Mood = "Indicatif" | "Subjonctif" | "Conditionnel" | "Impératif" | "Participe";

export const TENSES: { id: TenseId; mood: Mood; name: string; full: string }[] = [
  { id: "present", mood: "Indicatif", name: "Présent", full: "Présent" },
  { id: "passeCompose", mood: "Indicatif", name: "Passé composé", full: "Passé composé" },
  { id: "imparfait", mood: "Indicatif", name: "Imparfait", full: "Imparfait" },
  { id: "plusQueParfait", mood: "Indicatif", name: "Plus-que-parfait", full: "Plus-que-parfait" },
  { id: "passeSimple", mood: "Indicatif", name: "Passé simple", full: "Passé simple" },
  { id: "passeAnterieur", mood: "Indicatif", name: "Passé antérieur", full: "Passé antérieur" },
  { id: "futur", mood: "Indicatif", name: "Futur simple", full: "Futur simple" },
  { id: "futurAnterieur", mood: "Indicatif", name: "Futur antérieur", full: "Futur antérieur" },
  { id: "subjonctif", mood: "Subjonctif", name: "Présent", full: "Subjonctif présent" },
  { id: "subjonctifPasse", mood: "Subjonctif", name: "Passé", full: "Subjonctif passé" },
  { id: "conditionnel", mood: "Conditionnel", name: "Présent", full: "Conditionnel présent" },
  { id: "conditionnelPasse", mood: "Conditionnel", name: "Passé", full: "Conditionnel passé" },
  { id: "imperatif", mood: "Impératif", name: "Présent", full: "Impératif" },
  { id: "participes", mood: "Participe", name: "Participes", full: "Participes" },
];

export const MOODS: Mood[] = ["Indicatif", "Subjonctif", "Conditionnel", "Impératif", "Participe"];

export const tense = (id: TenseId) => TENSES.find((t) => t.id === id)!;

const AUX = { être: VERBS.find((v) => v.inf === "être")!, avoir: VERBS.find((v) => v.inf === "avoir")! };

const spellings = (f: Form) => (Array.isArray(f) ? f : [f]);
const startsWithVowel = (w: string) => /^[aeiouâàéèêëîïôûùœ]/i.test(w);

/** "je" + "ai" → "j’ai"; "me" + "étais" → "m’étais"; "que" + "il/elle" → "qu’il/elle". */
function elide(word: string, next: string) {
  if (!startsWithVowel(next)) return `${word} `;
  if (word === "je" || word === "me" || word === "te" || word === "se") return `${word[0]}’`;
  if (word === "que") return "qu’";
  return `${word} `;
}

export const label = (v: Verb) => (v.pronominal ? `se ${v.inf}` : v.inf);
/** The infinitive as written: "se lever", "s’…" before a vowel. */
export const infinitive = (v: Verb) => (v.pronominal ? `${elide("se", v.inf)}${v.inf}` : v.inf);

/** The verb part of a form for `person`, with its auxiliary and agreement for compound tenses. */
function verbPart(v: Verb, id: SimpleTense | CompoundTense, person: number): Segment[][] {
  if (id in COMPOUND) {
    const aux = AUX[v.aux];
    const auxForms = spellings(aux.simple[COMPOUND[id as CompoundTense]][person]);
    const agree = v.aux === "être" ? AGREE[person] : "";
    return auxForms.map((a) => [
      { t: `${a} `, k: "aux" },
      { t: v.participePasse, k: "verb" },
      ...(agree ? [{ t: agree, k: "agree" as const }] : []),
    ]);
  }
  return spellings(v.simple[id as SimpleTense][person]).map((f) => [{ t: f, k: "verb" }]);
}

const firstText = (segs: Segment[]) => segs[0]?.t ?? "";

/** The reflexive pronoun and the verb, without the subject: "me suis levé(e)". */
export function withoutSubject(v: Verb, id: SimpleTense | CompoundTense, person: number): Spellings {
  return verbPart(v, id, person).map((segs) =>
    v.pronominal ? [{ t: elide(REFLEXIVE[person], firstText(segs)), k: "pro" }, ...segs] : segs,
  );
}

/** The whole form: "que nous nous soyons levé(e)s". */
export function conjugate(v: Verb, id: SimpleTense | CompoundTense, person: number): Spellings {
  const subj = id === "subjonctif" || id === "subjonctifPasse";
  return withoutSubject(v, id, person).map((segs) => {
    const next = firstText(segs);
    const subject = elide(PERSONS[person], next);
    const lead = subj ? `${elide("que", PERSONS[person])}${subject}` : subject;
    return [{ t: lead, k: "pro" }, ...segs];
  });
}

/** The rows of a tense: six persons, three for the imperative, three participles. */
export function rows(v: Verb, id: TenseId): { person?: number; label?: string; forms: Spellings }[] {
  if (id === "imperatif") {
    return [1, 3, 4].map((person, i) => ({
      person,
      forms: spellings(v.imperatif[i]).map((f) => [{ t: f, k: "verb" as const }]),
    }));
  }
  if (id === "participes") {
    const agree = v.aux === "être" ? "(e)(s)" : "";
    const auxPart = v.aux === "être" ? "étant" : "ayant";
    const refl = (next: string) => (v.pronominal ? [{ t: elide("se", next), k: "pro" as const }] : []);
    return [
      { label: "Présent", forms: [[...refl(v.participePresent), { t: v.participePresent, k: "verb" }]] },
      { label: "Passé", forms: [[{ t: v.participePasse, k: "verb" }]] },
      {
        label: "Composé",
        forms: [
          [
            ...refl(auxPart),
            { t: `${auxPart} `, k: "aux" },
            { t: v.participePasse, k: "verb" },
            ...(agree ? [{ t: agree, k: "agree" as const }] : []),
          ],
        ],
      },
    ];
  }
  return PERSONS.map((_, person) => ({ person, forms: conjugate(v, id, person) }));
}

export const isCompound = (id: TenseId): id is CompoundTense => id in COMPOUND;

// ── Reading a form back ────────────────────────────────────────────────────

export type Reading = { tense: TenseId; persons: number[] };
export type Identified = { verb: Verb; readings: Reading[] };

const fold = (s: string) => s.normalize("NFC").toLocaleLowerCase("fr").replace(/’/g, "'");

type Entry = { verb: Verb; tense: SimpleTense | "imperatif"; person: number };
const FORMS = new Map<string, Entry[]>();
const PARTICIPLES = new Map<string, Verb>();
const INFINITIVES = new Map<string, Verb>();

const SIMPLE: SimpleTense[] = ["present", "imparfait", "passeSimple", "futur", "conditionnel", "subjonctif"];

for (const verb of VERBS) {
  INFINITIVES.set(fold(verb.inf), verb);
  if (verb.pronominal) INFINITIVES.set(fold(`se ${verb.inf}`), verb);
  for (const t of SIMPLE) {
    verb.simple[t].forEach((f, person) => {
      for (const s of spellings(f)) {
        const list = FORMS.get(fold(s)) ?? [];
        list.push({ verb, tense: t, person });
        FORMS.set(fold(s), list);
      }
    });
  }
  verb.imperatif.forEach((f, i) => {
    for (const s of spellings(f)) {
      const key = fold(s.split("-")[0]);
      const list = FORMS.get(key) ?? [];
      list.push({ verb, tense: "imperatif", person: [1, 3, 4][i] });
      FORMS.set(key, list);
    }
  });
  const pp = fold(verb.participePasse);
  for (const end of ["", "e", "s", "es"]) {
    // pris takes no extra s
    PARTICIPLES.set(pp.endsWith("s") && end.endsWith("s") ? pp + end.slice(0, -1) : pp + end, verb);
  }
}

const SUBJECTS: Record<string, number> = {
  "j'": 0,
  je: 0,
  tu: 1,
  il: 2,
  elle: 2,
  on: 2,
  nous: 3,
  vous: 4,
  ils: 5,
  elles: 5,
};
/** Skipped between a subject and its verb. */
const BETWEEN = new Set(["ne", "n'", "me", "m'", "te", "t'", "se", "s'", "nous", "vous", "y", "en"]);

function tokens(text: string) {
  return fold(text)
    .split(/[\s,;:!?.«»"()]+/)
    .flatMap((w) => {
      const m = w.match(/^([a-zà-ÿ]+')(.+)$/);
      return m ? [m[1], m[2]] : [w];
    })
    .filter(Boolean);
}

/** The subject pronoun just before token `i` (skipping ne, me, se…), or null. */
function subjectBefore(list: string[], i: number): { person: number | null; que: boolean } {
  let j = i - 1;
  let person: number | null = null;
  // The subject is the first pronoun of the run: "nous nous levions", "je ne me suis".
  while (j >= 0 && (BETWEEN.has(list[j]) || Object.hasOwn(SUBJECTS, list[j]))) {
    if (Object.hasOwn(SUBJECTS, list[j])) person = SUBJECTS[list[j]];
    j--;
  }
  // "que nous allions", "que l’entreprise paie"
  const que = list.slice(Math.max(0, j - 2), j + 1).some((w) => w === "que" || w === "qu'");
  return { person, que };
}

const ORDER: TenseId[] = [
  "present",
  "passeCompose",
  "imparfait",
  "plusQueParfait",
  "passeSimple",
  "passeAnterieur",
  "futur",
  "futurAnterieur",
  "conditionnel",
  "conditionnelPasse",
  "subjonctif",
  "subjonctifPasse",
  "imperatif",
];

function group(entries: { tense: TenseId; person: number }[], que: boolean): Reading[] {
  const by = new Map<TenseId, number[]>();
  for (const e of entries) by.set(e.tense, [...(by.get(e.tense) ?? []), e.person].filter((p, i, a) => a.indexOf(p) === i));
  const isSubj = (t: TenseId) => t === "subjonctif" || t === "subjonctifPasse";
  return [...by.entries()]
    .map(([t, persons]) => ({ tense: t, persons: persons.sort() }))
    .sort((a, b) => (que ? Number(isSubj(b.tense)) - Number(isSubj(a.tense)) : 0) || ORDER.indexOf(a.tense) - ORDER.indexOf(b.tense));
}

/**
 * What `term` is, read with the words `before` it: "allions" → aller,
 * imparfait or subjonctif présent, nous. Null when it isn't a form of a verb
 * in the sample.
 */
export function identify(term: string, before = ""): Identified | null {
  const own = tokens(term);
  if (!own.length) return null;
  const inf = INFINITIVES.get(fold(term.trim()).replace(/^s'/, "").replace(/^se /, ""));
  if (inf && own.length <= 2) return { verb: inf, readings: [] };

  const list = [...tokens(before).slice(-5), ...own];
  const offset = list.length - own.length;

  for (let i = list.length - 1; i >= offset; i--) {
    const w = list[i];
    const participle = PARTICIPLES.get(w);
    if (participle) {
      // An auxiliary up to three words back makes it a compound tense.
      for (let j = i - 1; j >= Math.max(0, i - 3); j--) {
        const aux = (FORMS.get(list[j]) ?? []).filter(
          (e) => e.verb.inf === participle.aux && e.tense !== "imperatif",
        );
        if (!aux.length) continue;
        const { person, que } = subjectBefore(list, j);
        const picked = aux.filter((e) => person === null || e.person === person);
        const compound = (Object.entries(COMPOUND) as [CompoundTense, SimpleTense][]).flatMap(([c, s]) =>
          picked.filter((e) => e.tense === s).map((e) => ({ tense: c as TenseId, person: e.person })),
        );
        if (compound.length) return { verb: participle, readings: group(compound, que) };
      }
      if (!FORMS.has(w)) return { verb: participle, readings: [{ tense: "participes", persons: [] }] };
    }
    const found = FORMS.get(w);
    if (!found) continue;
    const { person, que } = subjectBefore(list, i);
    const verb = found[0].verb;
    const entries = found.filter(
      (e) => e.verb === verb && (person === null ? true : e.tense !== "imperatif" && e.person === person),
    );
    if (!entries.length) continue;
    return { verb, readings: group(entries, que) };
  }
  return null;
}

/** A verb from what the learner typed in the dictionary: an infinitive or any form. */
export function resolve(query: string): Identified | null {
  const q = query.trim();
  if (!q) return null;
  return identify(q);
}

export const plain = (segs: Segment[]) => segs.map((s) => s.t).join("");
