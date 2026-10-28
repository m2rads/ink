// The Grammalecte files Ink uses, shared by scripts/fetch-grammalecte.ts
// (what to keep) and lib/grammar.ts (what to load), relative to
// vendor/grammalecte.

/** The engine, in load order: each file's globals are the next one's inputs. */
export const SCRIPTS = [
  "graphspell/helpers.js",
  "graphspell/str_transform.js",
  "graphspell/char_player.js",
  "graphspell/lexgraph_fr.js",
  "graphspell/ibdawg.js",
  "graphspell/spellchecker.js",
  "text.js",
  "graphspell/tokenizer.js",
  "fr/conj.js",
  "fr/mfsp.js",
  "fr/phonet.js",
  "fr/cregex.js",
  "fr/gc_options.js",
  "fr/gc_functions.js",
  "fr/gc_rules.js",
  "fr/gc_rules_graph.js",
  "fr/gc_engine.js",
];

/** Data the engine reads: conjugation, homophones, masculine/feminine forms, and the dictionary. */
export const DATA = {
  conj: "fr/conj_data.json",
  phonet: "fr/phonet_data.json",
  mfsp: "fr/mfsp_data.json",
  dictionary: "graphspell/_dictionaries/fr-allvars.json",
};
