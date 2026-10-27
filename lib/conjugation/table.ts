import type { SimpleTense } from "./types";

// The layout of one verb's forms in lib/conjugation/lefff.json, shared by
// scripts/build-conjugation.ts (which writes it) and lib/conjugation.ts
// (which reads it). Client-safe, no data.
//
// A verb is 45 slots. Each slot holds its spellings, the shown one first;
// a spelling starting with "~" is recognised in a lookup but never shown
// (1990 reform spellings), and an empty slot is a person the verb lacks.
//
// The file stores paradigms, not verbs: every verb is a stem plus a
// template of endings ("aim" + er: e, es, e, ons…), and the 7,800 verbs
// share about 900 templates. Template lines are `infEnding;slot,slot,…`
// with spellings in a slot joined by "/"; verb lines are
// `infinitive;template id (base 36);flags`.

/** Where each tense starts. W: other spellings of the infinitive. Y: impératif tu, nous, vous. K: participe passé m, m pl, f, f pl. */
export const SLOT = { W: 0, P: 1, I: 7, J: 13, F: 19, C: 25, S: 31, Y: 37, G: 40, K: 41 } as const;
export const SLOTS = 45;
export type TenseKey = keyof typeof SLOT;

export const SIMPLE: [TenseKey, SimpleTense][] = [
  ["P", "present"],
  ["I", "imparfait"],
  ["J", "passeSimple"],
  ["F", "futur"],
  ["C", "conditionnel"],
  ["S", "subjonctif"],
];

/** Imperative slots are persons 1, 3, 4 (tu, nous, vous) in a Six. */
export const IMPERATIVE_PERSONS = [1, 3, 4];

/** Verb flags: conjugated with être, with either auxiliary, only pronominal, starts with an h aspiré. */
export const FLAG = { être: "e", both: "b", pronominal: "p", aspirate: "h" } as const;

export const HIDDEN = "~";
export const FIELD = ";";
export const LINE = "|";
export const CELL = ",";
export const SPELLING = "/";
