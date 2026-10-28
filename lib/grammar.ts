// French grammar and spelling, checked by Grammalecte (https://grammalecte.net),
// for the essay's underlines (AGENTS.md, Grammar). Server only: the
// checkGrammar action calls it, and the review uses it to keep the AI off
// what a rule already catches. Client code may import the types, never the
// function.
//
// Grammalecte's JavaScript build is written for a browser worker: its files
// share one global scope and read their data with a synchronous
// XMLHttpRequest. So it runs here in a node:vm context that looks like that
// worker (a `self`, an XMLHttpRequest that reads from disk) rather than
// through its half-finished Node path. Loading takes about 300 ms, once per
// server process; a paragraph takes a few ms.
//
// The files come from vendor/grammalecte, fetched on install by
// scripts/fetch-grammalecte.ts (GPL 3, kept out of the repo; see there).
// Without them, checks return nothing rather than failing the page.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import vm from "node:vm";

import { DATA, SCRIPTS } from "./grammar/files";

/** One mistake in a paragraph: where, Grammalecte's explanation, and its corrections. */
export type GrammarIssue = {
  /** UTF-16 offsets in the paragraph. */
  start: number;
  end: number;
  /** Grammalecte's explanation, in French ("Accord de genre erroné : « problème » est masculin."). */
  message: string;
  /** Grammalecte's rule family: gn (agreement in the noun phrase), conj, ppas, infi, conf (homophones)…, or spell. */
  kind: string;
  /** Its corrections, best first, at most three; shown only when the writer asks. Often none. */
  answers: string[];
};

const ROOT = join(process.cwd(), "vendor", "grammalecte");

// What a learner's practice essay should be checked for. Off: typography a
// keyboard can't easily type (curly apostrophes, « » spacing, ligatures),
// inclusive-writing forms, number and unit formatting, and markup.
const OPTIONS = { typo: false, apos: false, eepi: false, num: false, unit: false, chim: false, html: false, md: false, latex: false };

const SPELLING = "Mot absent du dictionnaire.";

type Engine = {
  parse: (text: string, country: string, debug: boolean, options: null, context: boolean) => RawIssue[];
  getSpellChecker: () => {
    parseParagraph: (text: string) => { nStart: number; nEnd: number }[];
    /** Yields lists of suggestions, the main dictionary's first. */
    suggest: (word: string, limit: number) => Iterable<string[]>;
  };
};
type RawIssue = { nStart: number; nEnd: number; sMessage: string; sType: string; aSuggestions: string[] };

const ANSWERS = 3;
/** The speller's third guess is rarely a word a learner meant ("embouteillâtes"). */
const SPELLINGS = 2;

// Kept on globalThis so `next dev`'s module reloads don't load it again.
const store = globalThis as typeof globalThis & { __inkGrammalecte?: Engine | null };

function engine(): Engine | null {
  if (store.__inkGrammalecte !== undefined) return store.__inkGrammalecte;
  try {
    class DiskRequest {
      url = "";
      responseText = "";
      open(_method: string, url: string) {
        this.url = url;
      }
      overrideMimeType() {}
      send() {
        this.responseText = readFileSync(this.url, "utf8");
      }
    }
    const scope: Record<string, unknown> = { console: quiet, XMLHttpRequest: DiskRequest };
    scope.self = scope;
    vm.createContext(scope);
    for (const file of SCRIPTS) vm.runInContext(readFileSync(join(ROOT, file), "utf8"), scope, { filename: file });

    const global = (name: string) => vm.runInContext(name, scope) as { init: (json: string) => void };
    global("conj").init(readFileSync(join(ROOT, DATA.conj), "utf8"));
    global("phonet").init(readFileSync(join(ROOT, DATA.phonet), "utf8"));
    global("mfsp").init(readFileSync(join(ROOT, DATA.mfsp), "utf8"));

    const gc = vm.runInContext("gc_engine", scope) as Engine & {
      load: (context: string, colors: string, path: string) => void;
      setOptions: (options: Map<string, boolean>) => void;
    };
    gc.load("JavaScript", "aHSL", join(ROOT, dirname(DATA.dictionary)));
    if (!gc.getSpellChecker()) throw new Error("dictionary not loaded");
    gc.setOptions(new Map(Object.entries(OPTIONS)));
    store.__inkGrammalecte = gc;
  } catch (error) {
    console.error(JSON.stringify({ event: "grammar.unavailable", error: String(error) }));
    store.__inkGrammalecte = null;
  }
  return store.__inkGrammalecte;
}

/**
 * The grammar and spelling mistakes in one paragraph, in reading order. A
 * misspelled word inside a grammar mistake is left to the grammar one, so
 * no two issues overlap.
 */
export function checkGrammar(paragraph: string): GrammarIssue[] {
  if (!paragraph.trim()) return [];
  const gc = engine();
  if (!gc) return [];

  const speller = gc.getSpellChecker();
  const grammar: GrammarIssue[] = gc.parse(paragraph, "FR", false, null, false).map((e) => ({
    start: e.nStart,
    end: e.nEnd,
    message: e.sMessage,
    kind: e.sType,
    answers: [...e.aSuggestions].slice(0, ANSWERS),
  }));
  const spelling: GrammarIssue[] = speller.parseParagraph(paragraph).map((e) => {
    const [main = []] = speller.suggest(paragraph.slice(e.nStart, e.nEnd), SPELLINGS);
    return { start: e.nStart, end: e.nEnd, message: SPELLING, kind: "spell", answers: [...main].slice(0, SPELLINGS) };
  });

  const issues: GrammarIssue[] = [];
  for (const issue of [...grammar, ...spelling].sort((a, b) => a.start - b.start || b.end - a.end)) {
    const last = issues.at(-1);
    if (last && issue.start < last.end) continue;
    issues.push(issue);
  }
  return issues;
}

// Grammalecte logs every file it loads; only its errors are worth keeping.
const quiet = { ...console, log: () => {}, info: () => {} };
