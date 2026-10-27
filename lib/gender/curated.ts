// Hand-checked genders that win over the generated index. Ink's own list
// (facts, glosses in our words), not derived from Morphalou or Lexique.
//
// Morphalou 3.1 can't be shown unchecked: it files le/la tour and élève
// alike as "invariable", marks profession nouns feminine (juge, ministre,
// médecin, even conseil), and gets some common words wrong outright
// (autoroute m, modèle f, ton f). `bun scripts/build-gender.ts --report`
// lists where it and Lexique 3.83 disagree; every frequent one is settled
// here, and the rare ones are left unanswered (lexique.json, `disputed`).

import type { Genre } from "../gender";

type Sense = { gender: Genre; gloss: string };

/**
 * The gender changes the meaning. Only pairs where a learner could mean
 * either; a noun whose other gender is rare or archaic (l'ombre m, a fish)
 * is under ONE instead, so it doesn't plant doubt about the common word.
 */
export const SENSES: Record<string, Sense[]> = {
  aide: [
    { gender: "f", gloss: "help, aid; assistant (a woman)" },
    { gender: "m", gloss: "assistant (a man)" },
  ],
  cache: [
    { gender: "f", gloss: "hiding place" },
    { gender: "m", gloss: "cache (computing); mask (photography)" },
  ],
  coche: [
    { gender: "f", gloss: "tick, check mark" },
    { gender: "m", gloss: "stagecoach (rater le coche: miss the boat)" },
  ],
  crêpe: [
    { gender: "f", gloss: "pancake" },
    { gender: "m", gloss: "crepe (fabric)" },
  ],
  critique: [
    { gender: "f", gloss: "criticism; review" },
    { gender: "m", gloss: "critic" },
  ],
  finale: [
    { gender: "f", gloss: "final (of a competition)" },
    { gender: "m", gloss: "finale (music)" },
  ],
  garde: [
    { gender: "f", gloss: "guard duty, watch; custody" },
    { gender: "m", gloss: "guard, warden (a person)" },
  ],
  greffe: [
    { gender: "f", gloss: "graft; transplant" },
    { gender: "m", gloss: "court registry" },
  ],
  guide: [
    { gender: "m", gloss: "guide (a person or a book)" },
    { gender: "f", gloss: "girl guide; reins (plural)" },
  ],
  livre: [
    { gender: "m", gloss: "book" },
    { gender: "f", gloss: "pound (weight, money)" },
  ],
  manche: [
    { gender: "f", gloss: "sleeve; round, set (in a game)" },
    { gender: "m", gloss: "handle" },
  ],
  manœuvre: [
    { gender: "f", gloss: "manoeuvre; operation (of a machine)" },
    { gender: "m", gloss: "labourer" },
  ],
  mémoire: [
    { gender: "f", gloss: "memory" },
    { gender: "m", gloss: "dissertation, thesis; report" },
  ],
  merci: [
    { gender: "m", gloss: "thanks, a thank-you" },
    { gender: "f", gloss: "mercy (à la merci de)" },
  ],
  "mi-temps": [
    { gender: "f", gloss: "half-time (sport)" },
    { gender: "m", gloss: "part-time job" },
  ],
  mode: [
    { gender: "f", gloss: "fashion" },
    { gender: "m", gloss: "mode, method; mood (grammar)" },
  ],
  mort: [
    { gender: "f", gloss: "death" },
    { gender: "m", gloss: "dead man" },
  ],
  moule: [
    { gender: "m", gloss: "mould (for shaping)" },
    { gender: "f", gloss: "mussel" },
  ],
  mousse: [
    { gender: "f", gloss: "foam; moss; mousse" },
    { gender: "m", gloss: "ship's boy" },
  ],
  office: [
    { gender: "m", gloss: "office, agency; (church) service" },
    { gender: "f", gloss: "pantry" },
  ],
  orange: [
    { gender: "f", gloss: "orange (the fruit)" },
    { gender: "m", gloss: "orange (the colour)" },
  ],
  page: [
    { gender: "f", gloss: "page (of a book)" },
    { gender: "m", gloss: "page boy" },
  ],
  parallèle: [
    { gender: "m", gloss: "comparison; line of latitude" },
    { gender: "f", gloss: "parallel line" },
  ],
  pendule: [
    { gender: "f", gloss: "clock" },
    { gender: "m", gloss: "pendulum" },
  ],
  physique: [
    { gender: "f", gloss: "physics" },
    { gender: "m", gloss: "physique, looks" },
  ],
  pique: [
    { gender: "f", gloss: "pike (weapon); cutting remark" },
    { gender: "m", gloss: "spades (cards)" },
  ],
  platine: [
    { gender: "m", gloss: "platinum" },
    { gender: "f", gloss: "turntable" },
  ],
  poêle: [
    { gender: "f", gloss: "frying pan" },
    { gender: "m", gloss: "stove" },
  ],
  poste: [
    { gender: "m", gloss: "job, position; set (TV, radio); station" },
    { gender: "f", gloss: "post office; mail" },
  ],
  pupille: [
    { gender: "f", gloss: "pupil (of the eye)" },
    { gender: "m", gloss: "ward (a boy in someone's care)" },
  ],
  rose: [
    { gender: "f", gloss: "rose (the flower)" },
    { gender: "m", gloss: "pink (the colour)" },
  ],
  solde: [
    { gender: "m", gloss: "balance (of an account); sale (les soldes)" },
    { gender: "f", gloss: "soldier's pay" },
  ],
  somme: [
    { gender: "f", gloss: "sum, amount" },
    { gender: "m", gloss: "nap" },
  ],
  tour: [
    { gender: "m", gloss: "turn; trip, tour; lap" },
    { gender: "f", gloss: "tower" },
  ],
  vapeur: [
    { gender: "f", gloss: "steam, vapour" },
    { gender: "m", gloss: "steamship" },
  ],
  vase: [
    { gender: "m", gloss: "vase" },
    { gender: "f", gloss: "mud, silt" },
  ],
  vigile: [
    { gender: "m", gloss: "security guard" },
    { gender: "f", gloss: "eve (of a religious feast)" },
  ],
  voile: [
    { gender: "m", gloss: "veil" },
    { gender: "f", gloss: "sail; sailing" },
  ],
};

/**
 * Either gender, same meaning: un or une élève. Most of these Morphalou
 * already marks invariable; listed here are the ones it gets wrong (as
 * feminine, mostly professions) and après-midi, which takes both.
 */
export const EITHER: string[] = [
  "antiquaire", "après-midi", "arbitre", "architecte", "astrologue", "astronaute", "astronome",
  "baby-sitter", "bouquiniste", "camarade", "cambiste", "capitaine", "cardiologue", "cinéaste",
  "clarinettiste", "comique", "commissaire", "diamantaire", "diplomate", "détective", "dramaturge",
  "ex-champion", "futurologue", "gendarme", "généraliste", "géomètre", "graphiste", "grossiste",
  "gymnaste", "juge", "juriste", "kiné", "machiniste", "médecin", "métallurgiste", "militaire",
  "ministre", "notaire", "orfèvre", "peintre", "pilote", "politologue", "pote", "rotativiste",
  "sans-abri", "sismologue", "vidéaste", "ébéniste", "éclairagiste", "évangéliste",
];

/**
 * One gender, where the index says otherwise: Morphalou errors, words it
 * marks invariable for a rare second meaning, and nouns usually written as
 * one gender though dictionaries allow both (une interview).
 */
export const ONE: Record<string, Genre> = {
  // Morphalou has the wrong gender.
  autoroute: "f", fin: "f", cadre: "m", censeur: "m", chef: "m", clerc: "m", confrère: "m", conseil: "m",
  ingénieur: "m", mannequin: "m", membre: "m", modèle: "m", pasteur: "m", prétexte: "m",
  raideur: "f", témoin: "m", ton: "m", tome: "m", flash: "m", interview: "f", média: "m",
  media: "m", météorite: "f", enzyme: "f", alvéole: "m", chlore: "m", sarcophage: "m", camée: "m",
  tong: "f", rune: "f", minijupe: "f", groupie: "f", boum: "f", colo: "f", "semi-remorque": "m",
  ovule: "m", "micro-onde": "m", "mille-feuille": "m", phalène: "f", intifada: "f",
  // Plural noun, masculine (adjectives just before it take the feminine: les vieilles gens).
  gens: "m",
  // Invariable in Morphalou for a rare or dated second sense.
  adultère: "m", antique: "f", automatique: "m", basilique: "f", brie: "m", cartouche: "f",
  cave: "f", champagne: "m", chips: "f", classique: "m", claque: "f", coca: "m", couple: "m",
  courbe: "f", crique: "f", drague: "f", enseigne: "f", espace: "m", foudre: "f", gaffe: "f",
  gauche: "f", geste: "m", gothique: "m", graphique: "m", griffe: "f", hymne: "m", inceste: "m",
  jarre: "f", jaune: "m", laque: "f", légume: "m", louche: "f", manille: "f", matricule: "m",
  mauve: "m", mimique: "f", moufle: "f", môle: "m", ombre: "f", orge: "f", palme: "f",
  pantomime: "f", paillasse: "f", période: "f", plastique: "m", plume: "f", poisse: "f",
  politique: "f", postiche: "m", pourpre: "m", radio: "f", relaxe: "f", réglisse: "f",
  rouge: "m", sape: "f", superbe: "f", suspense: "m", tata: "f", titane: "m", transat: "m",
  trompette: "f", œuvre: "f", émeraude: "f", écarlate: "f",
};

/** Never shown: names and junk that Morphalou files as common nouns, and plurals it files as lemmas of their own. */
export const NONE: string[] = ["claude", "marie", "pâques", "chine", "canada", "sylvie", "thomas", "ève", "chefs-d'œuvre"];

/**
 * Read as nouns though another reading is more frequent (the pronoun
 * "personne", the participle "été"): the noun is the meaning a dictionary
 * lookup gives first.
 */
export const NOUN_FIRST: string[] = ["personne", "été"];

/** Forms Morphalou lacks, as [form, lemma]; the lemma must be in the index or above. */
export const EXTRA_FORMS: [string, string][] = [
  ["chefs-d'œuvre", "chef-d'œuvre"],
  ["petits-déjeuners", "petit-déjeuner"],
  // Written without the hyphen, "email" would otherwise find "émail" (enamel).
  ["email", "e-mail"],
  ["emails", "e-mail"],
];
