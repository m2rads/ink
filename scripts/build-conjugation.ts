// Builds the verb tables behind lookUpVerb (lib/conjugation.ts) from the
// Lefff conjugation table in the npm package french-verbs-lefff, with
// Ink's fixes (lib/conjugation/curated.ts), and Lexique 3.83 for how
// often each verb and form is used. Run with `bun scripts/build-conjugation.ts`.
//
// Downloads go to .cache/conjugation/ (git-ignored) and are reused; Lexique
// is taken from .cache/gender/ when the gender build already fetched it.
// Three files come out, kept apart because their licences differ
// (lib/conjugation/NOTICE.md):
//   lib/conjugation/lefff.json          every verb as stem + ending template (LGPL-LR)
//   lib/conjugation/LICENSE-LGPLLR.txt  the licence text shipped with Lefff
//   lib/conjugation/lexique.json        verbs by frequency, forms that are mostly other words (CC BY-SA 4.0)

import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { BOTH, DROP, FIXES, H_ASPIRÉ, LIKE, PRONOMINAL, ÊTRE } from "../lib/conjugation/curated";
import { lower } from "../lib/conjugation/key";
import { CELL, FIELD, FLAG, HIDDEN, LINE, SLOT, SLOTS, SPELLING, type TenseKey } from "../lib/conjugation/table";

const ROOT = join(import.meta.dir, "..");
const CACHE = join(ROOT, ".cache/conjugation");
const OUT = join(ROOT, "lib/conjugation");

const LEFFF_VERSION = "3.4.0";
const LEFFF_URL = `https://registry.npmjs.org/french-verbs-lefff/-/french-verbs-lefff-${LEFFF_VERSION}.tgz`;
const LEFFF_DIR = join(CACHE, `french-verbs-lefff-${LEFFF_VERSION}`);
const LEFFF_JSON = join(LEFFF_DIR, "package/dist/conjugations.json");
const LEFFF_LICENSE = join(LEFFF_DIR, "package/dist/LICENSE");
const LEXIQUE_URL = "http://www.lexique.org/databases/Lexique383/Lexique383.zip";
const LEXIQUE_TSV = [join(ROOT, ".cache/gender/lexique/Lexique383.tsv"), join(CACHE, "lexique/Lexique383.tsv")];

/**
 * A form's verb share (Lexique, mean of book and film frequency) below
 * which it reads as another word unless the sentence says verb ("la porte"
 * vs "il porte"), and below which even a word typed alone isn't shown as a
 * verb ("plus", "tu", "bois"; "porte" typed alone still is).
 */
export const VERB_SHARE = 0.5;
export const RARE_SHARE = 0.15;

async function download(url: string, file: string) {
  if (existsSync(file)) return;
  console.log(`downloading ${url}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} answered ${res.status}`);
  await Bun.write(file, res);
}

function run(cmd: string[]) {
  const p = Bun.spawnSync(cmd);
  if (p.exitCode !== 0) throw new Error(`${cmd.join(" ")} failed: ${p.stderr}`);
}

async function fetchSources() {
  mkdirSync(CACHE, { recursive: true });
  if (!existsSync(LEFFF_JSON)) {
    const tgz = join(CACHE, `french-verbs-lefff-${LEFFF_VERSION}.tgz`);
    await download(LEFFF_URL, tgz);
    mkdirSync(LEFFF_DIR, { recursive: true });
    run(["tar", "-xzf", tgz, "-C", LEFFF_DIR]);
  }
  let lexique = LEXIQUE_TSV.find(existsSync);
  if (!lexique) {
    const zip = join(CACHE, "Lexique383.zip");
    await download(LEXIQUE_URL, zip);
    run(["unzip", "-o", "-q", zip, "-d", join(CACHE, "lexique")]);
    lexique = LEXIQUE_TSV[1];
  }
  return { lefff: LEFFF_JSON, lexique };
}

// ---------------------------------------------------------------- tables

/** 45 slots (lib/conjugation/table.ts), each the spellings of one form, "~" for lookup-only. */
type Cells = string[][];
type Table = { inf: string; cells: Cells };

const PERSONS: Record<TenseKey, number> = { W: 1, P: 6, I: 6, J: 6, F: 6, C: 6, S: 6, Y: 3, G: 1, K: 4 };

/**
 * Lefff's table: keys P S Y I G K J T F C W, six persons each (Y: the six
 * with "NA" where the imperative has no person; G one; K four), null for a
 * missing person. T (imparfait du subjonctif) isn't shown in Ink: dropped.
 */
function readLefff(json: Record<string, Record<string, (string | null)[]>>): Map<string, Table> {
  const drop = new Set(DROP);
  const tables = new Map<string, Table>();
  for (const [inf, v] of Object.entries(json)) {
    // No present at all: forfaire, quérir, issir… only an infinitive or a participle survives.
    if (drop.has(inf) || (!v.P && !FIXES[inf]?.P)) continue;
    const cells: Cells = Array.from({ length: SLOTS }, () => []);
    const put = (key: TenseKey, person: number, form: string | null | undefined) => {
      if (form && form !== "NA") cells[SLOT[key] + person] = [form];
    };
    for (const key of ["P", "I", "J", "F", "C", "S"] as const) for (let p = 0; p < 6; p++) put(key, p, v[key]?.[p]);
    [1, 3, 4].forEach((p, i) => put("Y", i, v.Y?.[p]));
    put("G", 0, v.G?.[0]);
    for (let i = 0; i < 4; i++) put("K", i, v.K?.[i]);
    tables.set(inf, { inf, cells });
  }
  return tables;
}

/** "assieds/assois - ~x" → [["assieds", "assois"], [], ["~x"]]. */
function parseCells(text: string): string[][] {
  return text.split(" ").map((p) => (p === "-" ? [] : p.split("/")));
}

function applyFixes(tables: Map<string, Table>) {
  for (const [inf, fix] of Object.entries(FIXES)) {
    const t = tables.get(inf);
    if (!t) throw new Error(`curated fix for ${inf}, which Lefff doesn't have`);
    for (const [key, text] of Object.entries(fix) as [TenseKey, string][]) {
      const cells = parseCells(text);
      if (cells.length !== PERSONS[key]) throw new Error(`${inf} ${key}: ${cells.length} persons, expected ${PERSONS[key]}`);
      cells.forEach((c, i) => (t.cells[SLOT[key] + i] = c));
    }
  }
  for (const [inf, [prefix, base]] of Object.entries(LIKE)) {
    const b = tables.get(base);
    if (!b || !tables.has(inf)) throw new Error(`LIKE ${inf} ← ${base}: not in Lefff`);
    const add = (s: string) => (s.startsWith(HIDDEN) ? HIDDEN + prefix + s.slice(1) : prefix + s);
    tables.set(inf, { inf, cells: b.cells.map((c) => c.map(add)) });
  }
}

// ---------------------------------------------------------------- variants

const shown = (c: string[]) => c.filter((s) => !s.startsWith(HIDDEN));

function addHidden(cell: string[], spelling: string) {
  if (!cell.includes(spelling) && !cell.includes(HIDDEN + spelling)) cell.push(HIDDEN + spelling);
}

/**
 * Payer, essayer, balayer…: before a silent e the y may stay or become i,
 * both standard (je paie / je paye, je paierai / je payerai). Lefff keeps
 * only the y; the i spelling, the more common, goes first.
 */
function ayerVariants(t: Table) {
  if (!t.inf.endsWith("ayer") || t.inf === "bayer") return;
  for (const cell of t.cells) {
    const s = cell[0];
    const m = s && /^(.*a)y(e(?:s|nt)?|er.*)$/.exec(s);
    if (m && cell.length === 1) cell.unshift(`${m[1]}i${m[2]}`);
  }
}

/**
 * The 1990 spellings, recognised in a lookup but not shown (NOTICE.md):
 * - è for every -eler/-eter verb but appeler and jeter (il ruissèle, il étiquète);
 * - è in the future of céder-type verbs (je cèderai);
 * - no circumflex on i and u (il connait, il plait, entrainer), except in
 *   passé simple endings (nous connûmes), dû and mû, and croître, whose
 *   circumflex tells it from croire.
 */
function reformSpellings(t: Table) {
  const { inf, cells } = t;
  const visible = () => cells.map(shown);

  if (/e[lt]er$/.test(inf) && !/(?:appeler|jeter)$/.test(inf)) {
    const root = inf.slice(0, -2);
    const doubled = root + root.at(-1);
    const reform = `${root.slice(0, -2)}è${root.at(-1)}`;
    visible().forEach((spellings, i) => {
      for (const s of spellings) if (s.startsWith(doubled)) addHidden(cells[i], reform + s.slice(doubled.length));
    });
  }

  const p0 = cells[SLOT.P][0];
  const at = p0 ? [...inf].findIndex((ch, i) => ch === "é" && p0[i] === "è" && inf.slice(0, i) === p0.slice(0, i)) : -1;
  if (at >= 0) {
    for (const key of ["F", "C"] as const) {
      for (let p = 0; p < 6; p++) {
        const cell = cells[SLOT[key] + p];
        for (const s of shown(cell)) if (s[at] === "é" && s.slice(0, at) === inf.slice(0, at)) addHidden(cell, `${s.slice(0, at)}è${s.slice(at + 1)}`);
      }
    }
  }

  if (!/^(?:re)?croître$/.test(inf)) {
    const plain = (s: string) => s.replace(/î/g, "i").replace(/û/g, "u");
    const keep = new Set([SLOT.J + 3, SLOT.J + 4]);
    if (/^(?:re)?(?:dû|mû)$/.test(cells[SLOT.K][0] ?? "")) keep.add(SLOT.K);
    visible().forEach((spellings, i) => {
      if (keep.has(i)) return;
      for (const s of spellings) if (/[îû]/.test(s)) addHidden(cells[i], plain(s));
    });
    if (/[îû]/.test(inf)) addHidden(cells[SLOT.W], plain(inf));
  }
}

// ---------------------------------------------------------------- templates

function commonPrefix(words: string[]) {
  let p = words[0];
  for (const w of words) while (!w.startsWith(p)) p = p.slice(0, -1);
  return p;
}

/** Every verb as stem + template; templates numbered by how many verbs use them, the most used first. */
function encode(tables: Map<string, Table>, flagsOf: (inf: string) => string) {
  const verbs: { inf: string; template: string; flags: string }[] = [];
  for (const t of [...tables.values()].sort((a, b) => (a.inf < b.inf ? -1 : 1))) {
    const all = [t.inf, ...t.cells.flat().map((s) => s.replace(HIDDEN, ""))];
    // No ending may be empty: an empty cell is a missing person ("il vêt" keeps "t" as its ending).
    let stem = commonPrefix(all);
    while (stem && all.some((s) => s.length === stem.length)) stem = stem.slice(0, -1);
    const cut = (s: string) => (s.startsWith(HIDDEN) ? HIDDEN + s.slice(1 + stem.length) : s.slice(stem.length));
    const template = t.inf.slice(stem.length) + FIELD + t.cells.map((c) => c.map(cut).join(SPELLING)).join(CELL);
    verbs.push({ inf: t.inf, template, flags: flagsOf(t.inf) });
  }
  const uses = new Map<string, number>();
  for (const v of verbs) uses.set(v.template, (uses.get(v.template) ?? 0) + 1);
  const templates = [...uses.keys()].sort((a, b) => uses.get(b)! - uses.get(a)! || (a < b ? -1 : 1));
  const id = new Map(templates.map((t, i) => [t, i]));
  const lines = verbs.map((v) => [v.inf, id.get(v.template)!.toString(36), v.flags].join(FIELD));
  for (const l of [...templates, ...lines]) if (l.includes(LINE)) throw new Error(`"${LINE}" in ${l}`);
  return { templates, lines };
}

function flagger(tables: Map<string, Table>) {
  const lists: [string[], string][] = [
    [ÊTRE, FLAG.être],
    [BOTH, FLAG.both],
    [PRONOMINAL, FLAG.pronominal],
    [H_ASPIRÉ, FLAG.aspirate],
  ];
  for (const [list] of lists) for (const inf of list) if (!tables.has(inf)) throw new Error(`curated verb ${inf} not in Lefff`);
  const sets = lists.map(([list, flag]) => [new Set(list), flag] as const);
  return (inf: string) => sets.filter(([s]) => s.has(inf)).map(([, f]) => f).join("");
}

// ---------------------------------------------------------------- Lexique

/**
 * From Lexique 3.83: verbs in order of use (lemma frequency, books and
 * films averaged), and forms used mostly as another word ("porte",
 * "livre", "plus"). Its per-form verb tags were tried for ordering forms
 * two verbs share and left out: too many are tagger slips ("sauriez" as
 * saurer, "parait" as parer).
 */
function readLexique(tsv: string, tables: Map<string, Table>) {
  const lemma = new Map<string, number>();
  const forms = new Map<string, { verb: Map<string, number>; other: number }>();
  for (const line of tsv.split("\n").slice(1)) {
    const c = line.split("\t");
    if (c.length < 10) continue;
    const [ortho, , lemme, cgram] = c;
    const freq = (Number(c[8]) + Number(c[9])) / 2;
    const isVerb = cgram === "VER" || cgram === "AUX";
    if (isVerb) lemma.set(lemme, Math.max(lemma.get(lemme) ?? 0, (Number(c[6]) + Number(c[7])) / 2));
    const key = lower(ortho);
    const e = forms.get(key) ?? { verb: new Map(), other: 0 };
    if (isVerb) e.verb.set(lemme, (e.verb.get(lemme) ?? 0) + freq);
    else e.other += freq;
    forms.set(key, e);
  }

  const rank = [...lemma].filter(([l, f]) => tables.has(l) && f > 0).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
  // Every form in the tables.
  const verbsOf = new Set<string>();
  for (const t of tables.values()) for (const s of [t.inf, ...t.cells.flat()]) verbsOf.add(lower(s.replace(HIDDEN, "")));

  const other: string[] = [];
  const rare: string[] = [];
  for (const form of verbsOf) {
    const e = forms.get(form);
    if (!e) continue;
    const verbFreq = [...e.verb.values()].reduce((a, b) => a + b, 0);
    const share = verbFreq + e.other > 0 ? verbFreq / (verbFreq + e.other) : 1;
    if (share < RARE_SHARE) rare.push(form);
    else if (share < VERB_SHARE) other.push(form);
  }
  return { rank: rank.map(([l]) => l), other: other.sort(), rare: rare.sort() };
}

// ---------------------------------------------------------------- main

/** The final tables, for scripts/bench-conjugation.ts too. */
export async function buildTables() {
  const sources = await fetchSources();
  const tables = readLefff(JSON.parse(await Bun.file(sources.lefff).text()));
  applyFixes(tables);
  for (const t of tables.values()) {
    ayerVariants(t);
    reformSpellings(t);
  }
  return { tables, sources };
}

if (import.meta.main) {
  const { tables, sources } = await buildTables();
  const { templates, lines } = encode(tables, flagger(tables));
  const lexique = readLexique(await Bun.file(sources.lexique).text(), tables);

  mkdirSync(OUT, { recursive: true });
  await Bun.write(join(OUT, "lefff.json"), JSON.stringify({ templates: templates.join(LINE), verbs: lines.join(LINE) }) + "\n");
  copyFileSync(LEFFF_LICENSE, join(OUT, "LICENSE-LGPLLR.txt"));
  await Bun.write(
    join(OUT, "lexique.json"),
    JSON.stringify({ rank: lexique.rank.join(LINE), other: lexique.other.join(LINE), rare: lexique.rare.join(LINE) }) + "\n",
  );
  const forms = new Set([...tables.values()].flatMap((t) => t.cells.flat()));
  console.log(
    `${tables.size} verbs, ${templates.length} templates, ${forms.size} distinct spellings; lexique: ${lexique.rank.length} ranked, ${lexique.other.length} mostly-other and ${lexique.rare.length} rarely-verb forms`,
  );
}
