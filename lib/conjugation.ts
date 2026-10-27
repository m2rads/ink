import { fold, lower, sameLetters } from "./conjugation/key";
import lefff from "./conjugation/lefff.json";
import lexique from "./conjugation/lexique.json";
import { CELL, FIELD, FLAG, HIDDEN, IMPERATIVE_PERSONS, LINE, SIMPLE, SLOT, SLOTS, SPELLING } from "./conjugation/table";
import type { CompoundTense, Form, Reading, SimpleTense, Six, TenseId, Verb, VerbLookup } from "./conjugation/types";

// French verb conjugation for the dictionary. Server only: the lookup action
// returns it with the translation, so it costs no extra request and the full
// verb list never ships to the browser; the client gets one verb's forms and
// builds compound tenses itself (conjugation/compose.ts).
//
// Data: lib/conjugation/lefff.json (7,800 verbs from Lefff, as stems and
// shared ending templates, with Ink's fixes), lib/conjugation/lexique.json
// (verb frequency and forms that are mostly other words, from Lexique 3.83).
// Built by scripts/build-conjugation.ts; licences and measurements in
// lib/conjugation/NOTICE.md.

export type { VerbLookup } from "./conjugation/types";

/**
 * The verb `text` is a form of, read with the words `before` it when they're
 * known (a selection in the essay): "allions" → aller, imparfait or
 * subjonctif présent, nous; "suis allé" → aller, passé composé, je; an
 * infinitive ("aller", "se lever") → the verb with no readings. Null when
 * it isn't a verb form.
 */
export function lookUpVerb(text: string, before?: string): VerbLookup | null {
  if (!text || text.length > 120) return null;
  // A selection with words before it, mid-sentence: a capital there is a name ("Paris", not parier).
  const midSentence = before !== undefined && before.trim() !== "" && !/[.!?…:]["»”)\s]*$/.test(before);
  const own = tokens(text, !midSentence);
  if (!own.length || own.length > 10) return null;
  // Only the last few words matter: a subject, que, ne and pronouns, an auxiliary.
  const list = [...tokens((before ?? "").slice(-160), true).slice(-8), ...own.map((t) => ({ ...t, own: true }))];

  // Typed into the dictionary, a word that is often something else may still be meant as a verb ("porte").
  const typed = before === undefined;
  let best: Candidate | null = null;
  for (let i = list.length - own.length; i < list.length; i++) {
    const c = candidateAt(list, i, typed);
    if (c && (!best || c.score >= best.score)) best = c;
  }
  if (!best) return null;
  return { verb: decode(best.verb, best.pronominal), readings: order(best.readings, best.que) };
}

/** Every verb and tense a single word can be: the reverse index, for tests and benchmarks. */
export function readForm(word: string): { verb: string; tense: TenseId | "infinitif"; person: number }[] {
  const ix = index();
  return analyze(word).map((h) => {
    const r = readingOf(h.slot);
    return { verb: ix.inf[h.verb], tense: r?.tense ?? "infinitif", person: r?.person ?? -1 };
  });
}

// ---------------------------------------------------------------- index

type Index = {
  inf: string[];
  template: number[];
  flags: string[];
  /** Per template: the infinitive's ending, as written and folded, and each slot's spellings ("~" for lookup-only). */
  infEnd: string[];
  infEndKey: string[];
  slots: string[][][];
  /** fold(infinitive) → verbs. */
  byInf: Map<string, number[]>;
  /** fold(ending) → template × SLOTS + slot. */
  byEnding: Map<string, number[]>;
  rank: Map<string, number>;
  /** Forms mostly used as another word: a verb only when the sentence says so ("il porte", not "la porte"). */
  other: Set<string>;
  /** Forms almost never a verb ("plus", "tu", "bois"): not even typed alone. */
  rare: Set<string>;
};

// Built on the first lookup, from 270 KB of JSON: a few milliseconds
// (NOTICE.md). Every form is found by its ending, so there's no form list
// to load: about 150 templates × 45 slots of endings, and the verbs.
let ix: Index | null = null;
function index(): Index {
  if (ix) return ix;
  const inf: string[] = [];
  const template: number[] = [];
  const flags: string[] = [];
  const byInf = new Map<string, number[]>();
  for (const line of lefff.verbs.split(LINE)) {
    const [i, t, f] = line.split(FIELD);
    const v = inf.length;
    inf.push(i);
    template.push(parseInt(t, 36));
    flags.push(f);
    const key = fold(i);
    const list = byInf.get(key);
    if (list) list.push(v);
    else byInf.set(key, [v]);
  }
  const infEnd: string[] = [];
  const infEndKey: string[] = [];
  const slots: string[][][] = [];
  const byEnding = new Map<string, number[]>();
  lefff.templates.split(LINE).forEach((line, t) => {
    const [end, cells] = line.split(FIELD);
    infEnd.push(end);
    infEndKey.push(fold(end));
    const parsed = cells.split(CELL).map((c) => (c ? c.split(SPELLING) : []));
    slots.push(parsed);
    parsed.forEach((spellings, slot) => {
      const all = slot === SLOT.W ? [end, ...spellings] : spellings;
      for (const s of all) {
        const key = fold(s.startsWith(HIDDEN) ? s.slice(1) : s);
        const packed = t * SLOTS + slot;
        const list = byEnding.get(key);
        if (!list) byEnding.set(key, [packed]);
        else if (!list.includes(packed)) list.push(packed);
      }
    });
  });
  const rank = new Map(lexique.rank.split(LINE).map((v, i) => [v, i]));
  const other = new Set(lexique.other.split(LINE));
  const rare = new Set(lexique.rare.split(LINE));
  ix = { inf, template, flags, infEnd, infEndKey, slots, byInf, byEnding, rank, other, rare };
  return ix;
}

type Hit = { verb: number; slot: number };

/**
 * Every (verb, slot) whose form is `word`. Each split of the word into
 * stem + ending is tried against the endings index, and the stem must
 * rebuild a known infinitive with that template. Exact spellings win;
 * without one, accents may have been left out ("etais"), never changed.
 */
function analyze(word: string): Hit[] {
  const { byEnding, byInf, template, inf, infEnd, infEndKey, slots } = index();
  const typed = lower(word);
  const key = fold(word);
  const exact: Hit[] = [];
  const loose: Hit[] = [];
  const seen = new Set<number>();
  for (let k = 0; k <= key.length; k++) {
    const entries = byEnding.get(key.slice(k));
    if (!entries) continue;
    const stemKey = key.slice(0, k);
    for (const packed of entries) {
      const t = (packed / SLOTS) | 0;
      const slot = packed % SLOTS;
      for (const v of byInf.get(stemKey + infEndKey[t]) ?? []) {
        if (template[v] !== t || seen.has(v * SLOTS + slot)) continue;
        const stem = inf[v].slice(0, inf[v].length - infEnd[t].length);
        const spellings = slot === SLOT.W ? [infEnd[t], ...slots[t][slot]] : slots[t][slot];
        // "entraine" is entraîner's 1990 spelling exactly, not "entraîne" with an accent left out.
        let match: Hit[] | null = null;
        for (const s of spellings) {
          const form = lower(stem + (s.startsWith(HIDDEN) ? s.slice(1) : s));
          if (form === typed) {
            match = exact;
            break;
          }
          if (sameLetters(typed, form)) match = loose;
        }
        if (!match) continue;
        seen.add(v * SLOTS + slot);
        match.push({ verb: v, slot });
      }
    }
  }
  return exact.length ? exact : loose;
}

type SlotReading = { tense: SimpleTense | "imperatif" | "participes"; person: number };

function readingOf(slot: number): SlotReading | null {
  if (slot === SLOT.W) return null;
  if (slot >= SLOT.K || slot === SLOT.G) return { tense: "participes", person: -1 };
  if (slot >= SLOT.Y) return { tense: "imperatif", person: IMPERATIVE_PERSONS[slot - SLOT.Y] };
  const i = Math.floor((slot - SLOT.P) / 6);
  return { tense: SIMPLE[i][1], person: (slot - SLOT.P) % 6 };
}

const isFinite = (slot: number) => slot >= SLOT.P && slot < SLOT.Y;

// ---------------------------------------------------------------- verb

const PRONOUN_AFTER = ["-toi", "-nous", "-vous"];

/** One verb's forms, as the dictionary shows them. */
function decode(v: number, pronominal: boolean): Verb {
  const { inf, template, flags, infEnd, slots } = index();
  const t = template[v];
  const stem = inf[v].slice(0, inf[v].length - infEnd[t].length);
  const form = (slot: number, suffix = ""): Form => {
    const shown = slots[t][slot].filter((s) => !s.startsWith(HIDDEN)).map((s) => stem + s + suffix);
    return shown.length === 1 ? shown[0] : shown;
  };
  const first = (slot: number) => slots[t][slot].find((s) => !s.startsWith(HIDDEN));
  const simple = Object.fromEntries(
    SIMPLE.map(([key, tense]) => [tense, [0, 1, 2, 3, 4, 5].map((p) => form(SLOT[key] + p)) as Six]),
  ) as Verb["simple"];
  const reflexive = pronominal || flags[v].includes(FLAG.pronominal);
  const g = first(SLOT.G);
  const k = first(SLOT.K);
  const verb: Verb = {
    inf: inf[v],
    group: groupOf(inf[v], simple),
    aux: reflexive || flags[v].includes(FLAG.être) ? "être" : flags[v].includes(FLAG.both) ? "both" : "avoir",
    participePresent: g === undefined ? "" : stem + g,
    participePasse: k === undefined ? "" : stem + k,
    simple,
    // "lève-toi": the imperative carries the pronoun of a pronominal verb.
    imperatif: [0, 1, 2].map((i) => form(SLOT.Y + i, reflexive ? PRONOUN_AFTER[i] : "")) as Verb["imperatif"],
  };
  if (reflexive) verb.pronominal = true;
  if (flags[v].includes(FLAG.aspirate)) verb.aspirate = true;
  return verb;
}

const firstOf = (f: Form) => (Array.isArray(f) ? f[0] : f);

/** "1st group", "1st group · e → è", "2nd group", "Irregular": from the forms, so it can't disagree with them. */
function groupOf(inf: string, simple: Verb["simple"]): string {
  const je = firstOf(simple.present[0]);
  if (inf.endsWith("er") && inf !== "aller" && je) {
    const root = inf.slice(0, -2);
    const parts = ["1st group"];
    const last = root.at(-1)!;
    if (last === "c") parts.push("c → ç");
    if (last === "g") parts.push("g → ge");
    if (root.endsWith("ay")) parts.push("y → i or y");
    else if (/[ou]y$/.test(root)) parts.push("y → i");
    else {
      const strong = je.replace(/e$/, "");
      if (strong === root + last) parts.push(`${last} → ${last}${last}`);
      else if (strong.length === root.length && strong !== root) {
        const at = [...root].findIndex((ch, i) => strong[i] !== ch);
        parts.push(`${root[at]} → ${strong[at]}`);
      }
    }
    // Envoyer's future: neither the infinitive (parlerai) nor the present's stem (lèverai, paierai).
    const futureStem = firstOf(simple.futur[0])?.slice(0, -2);
    if (futureStem && futureStem !== inf && futureStem !== `${je.replace(/e$/, "")}er`) parts.push(`futur ${futureStem}-`);
    return parts.join(" · ");
  }
  const nous = firstOf(simple.present[3]);
  if (/ïr$|ir$/.test(inf) && nous?.endsWith("ssons") && /[iï]ssons$/.test(nous)) return "2nd group";
  return "Irregular";
}

// ---------------------------------------------------------------- reading a sentence

type Token = { w: string; cap: boolean; start: boolean; own?: boolean };

const SUBJECT: Record<string, number[]> = {
  je: [0],
  "j'": [0],
  tu: [1],
  il: [2],
  elle: [2],
  on: [2],
  ce: [2, 5],
  "c'": [2, 5],
  ça: [2],
  cela: [2],
  nous: [3],
  vous: [4],
  ils: [5],
  elles: [5],
};
/** Between a subject and its verb: je ne le lui ai pas dit. */
const OBJECT = new Set(["ne", "n'", "me", "m'", "te", "t'", "se", "s'", "nous", "vous", "le", "la", "les", "l'", "lui", "leur", "y", "en"]);
const REFLEXIVE: Record<string, number[]> = { me: [0], "m'": [0], te: [1], "t'": [1], se: [2, 5], "s'": [2, 5], nous: [3], vous: [4] };
/** Between an auxiliary and its participle: je n'ai jamais vraiment compris. */
const ADVERBS = new Set(
  "pas plus jamais rien point guère bien déjà toujours encore souvent vraiment beaucoup trop peu mal tout tous longtemps enfin aussi même presque sûrement certainement également pourtant ensuite alors vite très tant autant mieux finalement seulement d'abord".split(" "),
);
const DETERMINERS = new Set("le la l' les un une des du au aux ce cet cette ces mon ton son ma ta sa mes tes ses notre votre nos vos leur leurs chaque".split(" "));
const PLURAL = new Set("les des ces mes tes ses nos vos leurs aux".split(" "));
const QUE = new Set(["que", "qu'"]);
const FUNCTION = new Set([...Object.keys(SUBJECT), ...OBJECT, ...DETERMINERS, ...QUE, "qui", "et", "ou", "de", "d'", "à", "en"]);
const ELISION = /^(j|m|t|s|n|l|qu|c|d|jusqu|lorsqu|puisqu|quoiqu)'(.+)$/;
const CLITICS = new Set(["je", "tu", "ce", "il", "elle", "on", "nous", "vous", "ils", "elles", "moi", "toi", "le", "la", "les", "lui", "leur", "y", "en"]);

/** Words, with elisions split ("j'", "ai") and clitics after a hyphen kept apart ("a", "-il"; "lève", "-toi"). */
function tokens(text: string, startsSentence: boolean): Token[] {
  const out: Token[] = [];
  let start = startsSentence;
  for (const [piece] of text.normalize("NFC").replace(/[’‘ʼ]/g, "'").matchAll(/[\p{L}\p{M}'-]+|[.!?…:]/gu)) {
    if (/^[.!?…:]$/.test(piece)) {
      start = true;
      continue;
    }
    const raw = piece.replace(/^['-]+|-+$/g, "");
    if (!raw) continue;
    // Only the piece's first word carries its capital and sentence start ("J'" of "J'ai").
    const cap = /^\p{Lu}/u.test(raw);
    const first = out.length;
    const push = (w: string) => out.push({ w, cap: cap && out.length === first, start: start && out.length === first });
    const word = lower(raw);
    const m = ELISION.exec(word);
    const words = m ? [`${m[1]}'`, m[2]] : [word];
    for (const w of words) {
      // "va-t'en": the t' of an elided pronoun is dropped like the euphonic t of "a-t-il".
      const parts = w.split("-");
      const tail = parts
        .slice(1)
        .flatMap((p) => p.split(/(?<=')/))
        .filter((p) => p !== "t" && p !== "t'");
      if (parts.length > 1 && tail.length && tail.every((p) => CLITICS.has(p))) {
        push(parts[0]);
        for (const p of tail) push(`-${p}`);
      } else push(w);
    }
    start = false;
  }
  return out;
}

/** What the words around token `i` say about it. */
type Context = {
  /** Persons the subject allows: a pronoun, or a noun after a determiner (3rd person). */
  subject: number[] | null;
  pronoun: boolean;
  reflexive: boolean;
  /** ne, a reflexive pronoun, "qui": the word is a verb even if it's mostly something else. */
  verbal: boolean;
  que: boolean;
  /** A clitic after a hyphen: inversion (a-t-il) or imperative (lève-toi, dis-moi). */
  inverted: number[] | null;
  imperative: boolean;
  /** "je m'en vais": s'en aller, which the tables can't show; it's shown as aller. */
  en: boolean;
};

const reflexiveFor = (c: Context, inf: string) => c.reflexive && !(c.en && inf === "aller");

function contextAt(list: Token[], i: number): Context {
  let j = i - 1;
  while (j >= 0 && (OBJECT.has(list[j].w) || Object.hasOwn(SUBJECT, list[j].w))) j--;
  const run = list.slice(j + 1, i).map((t) => t.w);
  const s = run.findIndex((w) => Object.hasOwn(SUBJECT, w));
  let subject = s >= 0 ? SUBJECT[run[s]] : null;
  const pronoun = !!subject;
  const after = run.slice(s + 1);
  const reflexive = after.some((w) => {
    const r = REFLEXIVE[w];
    return !!r && (subject ? r.some((p) => subject!.includes(p)) : w === "se" || w === "s'");
  });
  let verbal = reflexive || run.includes("ne") || run.includes("n'");
  if (!subject && j >= 0) {
    if (list[j].w === "qui") verbal = true;
    else if (j >= 1 && DETERMINERS.has(list[j - 1].w) && !FUNCTION.has(list[j].w)) subject = PLURAL.has(list[j - 1].w) ? [5] : [2];
  }
  const lead = subject && !pronoun ? j - 1 : j + 1;
  const que = list.slice(Math.max(0, lead - 3), lead).some((t) => QUE.has(t.w));
  const next = list[i + 1]?.w;
  let inverted: number[] | null = null;
  let imperative = false;
  if (next?.startsWith("-")) {
    const clitic = next.slice(1);
    if (Object.hasOwn(SUBJECT, clitic)) inverted = SUBJECT[clitic];
    // "-nous", "-vous": a question (pouvez-vous) or an imperative (asseyez-vous); both readings are kept.
    imperative = !inverted || clitic === "nous" || clitic === "vous";
  }
  return { subject, pronoun, reflexive, verbal: verbal || que, que, inverted, imperative, en: after.includes("en") };
}

type Candidate = { score: number; verb: number; readings: { tense: TenseId; person: number }[]; pronominal: boolean; que: boolean };

const COMPOUND: Record<SimpleTense, CompoundTense> = {
  present: "passeCompose",
  imparfait: "plusQueParfait",
  passeSimple: "passeAnterieur",
  futur: "futurAnterieur",
  conditionnel: "conditionnelPasse",
  subjonctif: "subjonctifPasse",
};

/** The auxiliary before a participle at `i`, past adverbs and an inverted subject: "n'ai jamais compris", "a-t-il compris". */
function auxBefore(list: Token[], i: number): number {
  let j = i - 1;
  while (j >= 0 && (ADVERBS.has(list[j].w) || list[j].w.startsWith("-"))) j--;
  return j;
}

/** The best reading of token `i` as a verb, scored by how much the sentence supports it. */
function candidateAt(list: Token[], i: number, typed: boolean): Candidate | null {
  const tok = list[i];
  if (tok.w.startsWith("-")) return null;
  const hits = analyze(tok.w);
  if (!hits.length) return null;
  const ix = index();
  const byVerb = new Map<number, number[]>();
  for (const h of hits) byVerb.set(h.verb, [...(byVerb.get(h.verb) ?? []), h.slot]);
  const verbs = [...byVerb.keys()].sort((a, b) => preference(b, byVerb.get(b)!) - preference(a, byVerb.get(a)!));

  // A participle after être or avoir: a compound tense, or a passive.
  const participles = verbs.filter((v) => byVerb.get(v)!.some((s) => s >= SLOT.K));
  if (participles.length) {
    const compound = compoundAt(list, i, participles);
    if (compound) return compound;
  }
  if (FUNCTION.has(tok.w)) return null;

  const c = contextAt(list, i);
  let best: Candidate | null = null;
  for (const v of verbs) {
    const slots = byVerb.get(v)!;
    const pronominalOnly = ix.flags[v].includes(FLAG.pronominal);
    const readings = slots.map(readingOf).filter((r): r is SlotReading => !!r);
    let score = 1;
    let kept = readings;
    let pronominal = pronominalOnly;
    if (!readings.length) {
      // The infinitive: "se lever", "s'asseoir".
      const se = list[i - 1]?.w === "se" || list[i - 1]?.w === "s'";
      score = se ? 2 : 1;
      pronominal ||= se;
    } else if (c.subject || c.inverted) {
      const persons = (c.inverted ?? c.subject)!;
      const finite = readings.filter(
        (r) => r.tense !== "participes" && persons.includes(r.person) && (r.tense !== "imperatif" || (c.inverted && c.imperative)),
      );
      if (finite.length) {
        kept = finite;
        score = c.pronoun || c.inverted ? 3 : 2;
        pronominal ||= reflexiveFor(c, ix.inf[v]);
      }
    } else if (c.imperative) {
      const imperative = readings.filter((r) => r.tense === "imperatif");
      if (imperative.length) {
        kept = imperative;
        score = 3;
        pronominal ||= list[i + 1].w === "-toi" && imperative.some((r) => r.person === 1);
      }
    } else if (c.verbal) {
      score = 2;
      pronominal ||= reflexiveFor(c, ix.inf[v]);
    }
    if (score === 1 && (ix.rare.has(tok.w) || (!typed && ix.other.has(tok.w)) || (tok.cap && !tok.start))) continue;
    if (best && best.score >= score) continue;
    best = { score, verb: v, readings: kept.map((r) => ({ tense: r.tense, person: r.person })), pronominal, que: c.que };
  }
  return best;
}

/** "j'ai mangé", "nous nous sommes levés", "qu'il ait fini", "a été vendu" (a passive: the participle). */
function compoundAt(list: Token[], i: number, participles: number[]): Candidate | null {
  const ix = index();
  const j = auxBefore(list, i);
  if (j < 0) return null;
  const aux = list[j].w;
  const participle = (v: number): Candidate => ({ score: 4, verb: v, readings: [{ tense: "participes", person: -1 }], pronominal: false, que: false });
  // après avoir mangé, étant parti, être allé: an infinitive or participle compound.
  if (aux === "avoir" || aux === "être" || aux === "ayant" || aux === "étant") return participle(participles[0]);
  // "a été vendue": the passive, read as the participle (and not as être's passé composé, which ties and is further left).
  const k = auxBefore(list, j);
  if (aux === "été" && k >= 0 && analyze(list[k].w).some((h) => isFinite(h.slot) && ix.inf[h.verb] === "avoir")) {
    return participle(participles[0]);
  }

  const auxHits = analyze(aux).filter((h) => isFinite(h.slot) && (ix.inf[h.verb] === "être" || ix.inf[h.verb] === "avoir"));
  if (!auxHits.length) return null;
  const c = contextAt(list, j);
  for (const v of participles) {
    const own = ix.flags[v];
    const reflexive = reflexiveFor(c, ix.inf[v]) || own.includes(FLAG.pronominal);
    const usable = auxHits.filter((h) => {
      const être = ix.inf[h.verb] === "être";
      if (reflexive) return être;
      if (own.includes(FLAG.both)) return true;
      return être === own.includes(FLAG.être);
    });
    const persons = c.inverted ?? c.subject;
    const matching = usable.filter((h) => !persons || persons.includes(readingOf(h.slot)!.person));
    const chosen = matching.length ? matching : usable;
    if (!chosen.length) continue;
    const readings = chosen.map((h) => {
      const r = readingOf(h.slot)!;
      return { tense: COMPOUND[r.tense as SimpleTense] as TenseId, person: r.person };
    });
    return { score: 4, verb: v, readings, pronominal: reflexive, que: c.que };
  }
  // être + the participle of an avoir verb: a passive (la maison est vendue).
  if (auxHits.some((h) => ix.inf[h.verb] === "être")) return participle(participles[0]);
  return null;
}

/**
 * Which verb a form shared by several is read as first: one of its
 * readings outside the passé simple ("vis": vivre's present before voir's
 * passé simple, rare in essays), then the more frequent verb.
 */
function preference(v: number, slots: number[]): number {
  const ix = index();
  const common = slots.some((s) => !(s >= SLOT.J && s < SLOT.J + 6)) ? 1e6 : 0;
  const rank = ix.rank.get(ix.inf[v]);
  return common + (rank === undefined ? 0 : 1e5 - rank);
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
  "participes",
];

/** One reading per tense, in the tables' order; after "que", the subjunctive first; the passé simple last. */
function order(entries: { tense: TenseId; person: number }[], que: boolean): Reading[] {
  const by = new Map<TenseId, number[]>();
  for (const e of entries) {
    const persons = by.get(e.tense) ?? [];
    if (e.person >= 0 && !persons.includes(e.person)) persons.push(e.person);
    by.set(e.tense, persons);
  }
  // The passé simple is rare in essays: "assis", "mis" open on the participle, "fut" still on its only reading.
  const weight = (t: TenseId) =>
    que && (t === "subjonctif" || t === "subjonctifPasse") ? 0 : t === "passeSimple" || t === "passeAnterieur" ? 2 : 1;
  return [...by]
    .map(([tense, persons]) => ({ tense, persons: persons.sort((a, b) => a - b) }))
    .sort((a, b) => weight(a.tense) - weight(b.tense) || ORDER.indexOf(a.tense) - ORDER.indexOf(b.tense));
}
