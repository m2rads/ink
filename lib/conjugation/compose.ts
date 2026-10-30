import { AVOIR, ÊTRE } from "./auxiliaries";
import type { CompoundTense, Form, SimpleTense, TenseId, Verb } from "./types";

// Builds every displayed form of a verb as segments (pronoun, auxiliary,
// verb, agreement), so a view can style the parts. Client-safe: the verb's
// simple forms come from the server (lib/conjugation.ts), être and avoir
// ship with the page (auxiliaries.ts). Started from the /proto/conjugation
// prototype.

export type Kind = "pro" | "aux" | "verb" | "agree";
export type Segment = { t: string; k: Kind };
/** One person's form: one segment list per correct spelling. */
export type Spellings = Segment[][];

export const PERSONS = ["je", "tu", "il/elle", "nous", "vous", "ils/elles"] as const;
const REFLEXIVE = ["me", "te", "se", "nous", "vous", "se"];
/** Être verbs' participle agreement, by person (vous can be one person). */
const AGREE = ["(e)", "(e)", "(e)", "(e)s", "(e)(s)", "(e)s"];
/** The same for a participle already ending in s or x: assis(e), assis(es). */
const AGREE_S = ["(e)", "(e)", "(e)", "(es)", "(e)(s)", "(es)"];

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

const AUX = { être: ÊTRE, avoir: AVOIR };

const spellings = (f: Form) => (Array.isArray(f) ? f : f ? [f] : []);
const startsWithVowel = (w: string) => /^[aeiouâàéèêëîïôûùœ]/i.test(w);

/**
 * "je" + "ai" → "j’ai"; "me" + "étais" → "m’étais"; "que" + "il/elle" →
 * "qu’il/elle"; before a verb's h unless it's aspirate: "j’habite", "je hais".
 */
function elide(word: string, next: string, v?: Verb) {
  // Only the verb's own forms start with its h; être and avoir never do.
  const h = /^h/i.test(next) && !!v && v.inf.startsWith("h") && !v.aspirate;
  if (!startsWithVowel(next) && !h) return `${word} `;
  if (word === "je" || word === "me" || word === "te" || word === "se") return `${word[0]}’`;
  if (word === "que") return "qu’";
  return `${word} `;
}

export const label = (v: Verb) => (v.pronominal ? `se ${v.inf}` : v.inf);
/** The infinitive as written: "se lever", "s’…" before a vowel or h muet. */
export const infinitive = (v: Verb) => (v.pronominal ? `${elide("se", v.inf, v)}${v.inf}` : v.inf);

/**
 * The auxiliaries a verb's compound tenses take. A pronominal verb always
 * takes être. "both" (passer, sortir, monter…) shows être first, then
 * avoir, as two spellings of each person: "je suis passé(e)", "j’ai passé"
 * (être on its own, avoir with an object: j’ai passé un examen).
 */
export const auxiliaries = (v: Verb): ("être" | "avoir")[] =>
  v.pronominal ? ["être"] : v.aux === "both" ? ["être", "avoir"] : [v.aux];

/** Whether the verb has `person` at all: falloir has only il (il faut, il a fallu), pleuvoir il and ils. */
const hasPerson = (v: Verb, person: number) => Object.values(v.simple).some((six) => spellings(six[person]).length > 0);
/** Impersonal verbs take il, never elle: "il faut", "il pleut". */
const impersonal = (v: Verb) => !hasPerson(v, 0) && !hasPerson(v, 3);
const subjectOf = (v: Verb, person: number) => (impersonal(v) ? (person === 5 ? "ils" : "il") : PERSONS[person]);

const agreement = (v: Verb, person: number) => (/[sx]$/.test(v.participePasse) ? AGREE_S : AGREE)[person];

/** The verb part of a form for `person`, with its auxiliary and agreement for compound tenses. */
function verbPart(v: Verb, id: SimpleTense | CompoundTense, person: number): Segment[][] {
  if (id in COMPOUND) {
    if (!v.participePasse || !hasPerson(v, person)) return [];
    return auxiliaries(v).flatMap((auxVerb) => {
      const agree = auxVerb === "être" ? agreement(v, person) : "";
      return spellings(AUX[auxVerb].simple[COMPOUND[id as CompoundTense]][person]).map((a): Segment[] => [
        { t: `${a} `, k: "aux" },
        { t: v.participePasse, k: "verb" },
        ...(agree ? [{ t: agree, k: "agree" as const }] : []),
      ]);
    });
  }
  return spellings(v.simple[id as SimpleTense][person]).map((f) => [{ t: f, k: "verb" }]);
}

const firstText = (segs: Segment[]) => segs[0]?.t ?? "";

/** The reflexive pronoun and the verb, without the subject: "me suis levé(e)". */
export function withoutSubject(v: Verb, id: SimpleTense | CompoundTense, person: number): Spellings {
  return verbPart(v, id, person).map((segs) =>
    v.pronominal ? [{ t: elide(REFLEXIVE[person], firstText(segs), v), k: "pro" }, ...segs] : segs,
  );
}

/** The whole form: "que nous nous soyons levé(e)s". */
export function conjugate(v: Verb, id: SimpleTense | CompoundTense, person: number): Spellings {
  const subj = id === "subjonctif" || id === "subjonctifPasse";
  return withoutSubject(v, id, person).map((segs) => {
    const next = firstText(segs);
    const subject = elide(subjectOf(v, person), next, v);
    const lead = subj ? `${elide("que", subjectOf(v, person))}${subject}` : subject;
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
    const refl = (next: string) => (v.pronominal ? [{ t: elide("se", next, v), k: "pro" as const }] : []);
    const pp = v.participePasse;
    return [
      { label: "Présent", forms: v.participePresent ? [[...refl(v.participePresent), { t: v.participePresent, k: "verb" }]] : [] },
      { label: "Passé", forms: pp ? [[{ t: pp, k: "verb" }]] : [] },
      {
        label: "Composé",
        forms: !pp
          ? []
          : auxiliaries(v).map((auxVerb): Segment[] => {
              const auxPart = auxVerb === "être" ? "étant" : "ayant";
              return [
                ...refl(auxPart),
                { t: `${auxPart} `, k: "aux" },
                { t: pp, k: "verb" },
                ...(auxVerb === "être" ? [{ t: "(e)(s)", k: "agree" as const }] : []),
              ];
            }),
      },
    ];
  }
  return PERSONS.map((_, person) => ({ person, forms: conjugate(v, id, person) }));
}

export const isCompound = (id: TenseId): id is CompoundTense => id in COMPOUND;

export const plain = (segs: Segment[]) => segs.map((s) => s.t).join("");

/** A verb's finished tables, for a view that doesn't compose them itself (the Mac app). */
export type VerbView = {
  infinitive: string;
  auxiliaries: ("être" | "avoir")[];
  tables: Record<TenseId, ReturnType<typeof rows>>;
};

/** Every tense's rows, as `rows` gives them, with the infinitive and auxiliaries. */
export function verbView(v: Verb): VerbView {
  return {
    infinitive: infinitive(v),
    auxiliaries: auxiliaries(v),
    tables: Object.fromEntries(TENSES.map(({ id }) => [id, rows(v, id)])) as VerbView["tables"],
  };
}
