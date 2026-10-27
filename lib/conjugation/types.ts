// The shapes of French verb conjugation in Ink, shared by the server lookup
// (lib/conjugation.ts) and the dictionary's views (compose.ts renders them).
// Client-safe: types only.

/** je, tu, il/elle, nous, vous, ils/elles */
export type Six = [Form, Form, Form, Form, Form, Form];
/** A form, or every correct spelling of it (payer: paie, paye); [] for a person the verb lacks (il faut has no je). */
export type Form = string | string[];

export type SimpleTense = "present" | "imparfait" | "passeSimple" | "futur" | "conditionnel" | "subjonctif";
export type CompoundTense =
  | "passeCompose"
  | "plusQueParfait"
  | "passeAnterieur"
  | "futurAnterieur"
  | "conditionnelPasse"
  | "subjonctifPasse";
export type TenseId = SimpleTense | CompoundTense | "imperatif" | "participes";

/**
 * One verb's simple forms; compound tenses are built from these and être or
 * avoir (compose.ts), so a compound form can't disagree with its parts.
 * Forms are the verb alone: no subject, no reflexive pronoun.
 */
export type Verb = {
  /** Without "se". */
  inf: string;
  pronominal?: boolean;
  /** Starts with an h aspiré: no elision (je hais, se hâter). Other verbs in h elide (j'habite). */
  aspirate?: boolean;
  /** A short label: "1st group", "2nd group", "Irregular", "1st group · e → è". */
  group: string;
  /** "both": être when it has no object (je suis passé), avoir with one (j'ai passé un examen). */
  aux: "être" | "avoir" | "both";
  /** "" when the verb has none (falloir, gésir). */
  participePresent: string;
  participePasse: string;
  simple: Record<SimpleTense, Six>;
  /** tu, nous, vous. Pronominal verbs carry their pronoun (lève-toi). */
  imperatif: [Form, Form, Form];
};

/** A tense a looked-up form belongs to, and its persons (0–5 as in Six). */
export type Reading = { tense: TenseId; persons: number[] };

/** What the dictionary gets for a verb: its forms, and what the looked-up form is (empty for an infinitive). */
export type VerbLookup = { verb: Verb; readings: Reading[] };
