// Builds the noun-gender index behind lookUpGender (lib/gender.ts) from
// Morphalou 3.1 and Lexique 3.83. Run with `bun scripts/build-gender.ts`;
// add `--report` to print where the two sources disagree on a frequent noun,
// which is how lib/gender/curated.ts was checked.
//
// Downloads go to .cache/gender/ (git-ignored) and are reused. Two files come
// out, kept apart because their licences differ (lib/gender/NOTICE.md):
//   lib/gender/morphalou.json  every noun form → gender and lemma (LGPL-LR)
//   lib/gender/lexique.json    which ambiguous forms are mostly nouns (CC BY-SA 4.0)

import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { foldCase, genderKey } from "../lib/gender/key";

const ROOT = join(import.meta.dir, "..");
const CACHE = join(ROOT, ".cache/gender");
const OUT = join(ROOT, "lib/gender");

const MORPHALOU_URL =
  "https://repository.ortolang.fr/api/content/morphalou/latest/Morphalou3.1_formatCSV_toutEnUn.zip";
const LEXIQUE_URL = "http://www.lexique.org/databases/Lexique383/Lexique383.zip";
const MORPHALOU_CSV = join(CACHE, "morphalou/Morphalou3.1_formatCSV_toutEnUn/Morphalou3.1_CSV.csv");
const LEXIQUE_TSV = join(CACHE, "lexique/Lexique383.tsv");

/** A form's noun share (Lexique, mean of book and film frequency) at or above which the noun is its main reading. */
export const NOUN_SHARE = 0.5;

async function fetchOnce(url: string, zip: string, dir: string, expect: string) {
  if (existsSync(expect)) return;
  mkdirSync(join(CACHE, dir), { recursive: true });
  const zipPath = join(CACHE, zip);
  if (!existsSync(zipPath)) {
    console.log(`downloading ${url}`);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${url} answered ${res.status}`);
    await Bun.write(zipPath, res);
  }
  const unzip = Bun.spawnSync(["unzip", "-o", "-q", zipPath, "-d", join(CACHE, dir)]);
  if (unzip.exitCode !== 0) throw new Error(`unzip ${zip} failed: ${unzip.stderr}`);
  if (!existsSync(expect)) throw new Error(`${expect} not in ${zip}`);
}

type Genre = "m" | "f" | "b";

// `sources`: how many of the lexicons Morphalou merged list the lemma (TLF,
// DELA, Dicollecte, Lefff…); strays like "chevau" have few.
// `perForm`: gender given per form (amour, délice, orgue).
type Noun = { lemma: string; gender: Genre; forms: string[]; pluralOnly: boolean; sources: number; perForm: boolean };

// Morphalou's CSV: one row per inflected form; the lemma columns (0–8) are
// filled only on a lemma's first row. Lemma gender is masculine, feminine,
// invariable (both: épicènes and le/la tour alike) or "-", which is either
// amour/délice/orgue (gender given per form) or an unchecked entry.
function readMorphalou(csv: string) {
  const nouns: Noun[] = [];
  const otherForms = new Set<string>(); // every form of a verb, adjective, preposition…
  const lines = csv.split(/\r?\n/);
  const start = lines.findIndex((l) => l.startsWith("GRAPHIE;ID;")) + 1;

  let lemma: {
    text: string;
    noun: boolean;
    gender: string;
    sources: string;
    forms: { form: string; number: string; gender: string }[];
  } | null = null;
  const flush = () => {
    if (!lemma?.noun) return;
    const gender = nounGender(lemma.gender, lemma.forms);
    if (!gender || !wellFormed(lemma.text)) return;
    // Plurals and invariable forms; a singular spelled unlike the lemma is a
    // variant, sometimes a stray one (travail lists "taf"), so it's left out.
    const forms = lemma.forms
      .filter(
        (f) =>
          f.form !== lemma!.text &&
          f.number !== "singular" &&
          wellFormed(f.form) &&
          !feminineOf(f.form, lemma!.text),
      )
      .map((f) => f.form);
    const pluralOnly = lemma.forms.every((f) => f.number === "plural");
    nouns.push({
      lemma: lemma.text,
      gender,
      forms: [...new Set(forms)],
      pluralOnly,
      sources: new Set(lemma.sources.split(" ").filter(Boolean)).size,
      perForm: lemma.gender === "-",
    });
  };

  for (let i = start; i < lines.length; i++) {
    const c = lines[i].split(";");
    if (c.length < 18) continue;
    if (c[0]) {
      flush();
      lemma = { text: c[0], noun: c[2] === "Nom commun", gender: c[5], sources: c[8], forms: [] };
      if (!lemma.noun) otherForms.add(c[0]);
    }
    if (!lemma) continue;
    if (lemma.noun) lemma.forms.push({ form: c[9], number: c[11], gender: c[13] });
    else otherForms.add(c[9]);
  }
  flush();
  return { nouns, otherForms };
}

function nounGender(gender: string, forms: { form: string; number: string; gender: string }[]): Genre | null {
  if (gender === "masculine") return "m";
  if (gender === "feminine") return "f";
  if (gender === "invariable") return "b";
  // amour, délice, orgue: the singular's gender, which is what the panel shows.
  const singular = forms.find((f) => f.number === "singular")?.gender;
  if (singular === "masculine") return "m";
  if (singular === "feminine") return "f";
  return null;
}

// A feminine plural filed under a masculine lemma (aide-soignant lists
// "aides-soignantes"): some word gains "es" where the lemma's doesn't end in
// s, x or z. Shown with the lemma's gender it would be wrong.
function feminineOf(form: string, lemma: string) {
  const fw = form.split(/[- ']/);
  const lw = lemma.split(/[- ']/);
  return fw.length === lw.length && fw.some((w, i) => w === `${lw[i]}es` && !/[sxz]$/.test(lw[i]));
}

// Spellings with and without the ligature (œil/oeil, cœur/coeur) are
// separate lemmas, and only one of them may carry a form: "yeux" is filed
// under "oeil". Merge them under the ligature spelling.
function mergeLigatures(nouns: Noun[]): Noun[] {
  const byFold = new Map<string, Noun>();
  for (const noun of nouns) {
    const fold = foldCase(noun.lemma);
    const seen = byFold.get(fold);
    if (!seen) {
      byFold.set(fold, { ...noun, forms: [...noun.forms] });
      continue;
    }
    // The ligature spelling's gender wins: œuvre is f, its "oeuvre" twin b.
    if (/[œæ]/.test(noun.lemma) && !/[œæ]/.test(seen.lemma)) Object.assign(seen, { lemma: noun.lemma, gender: noun.gender });
    seen.forms.push(...noun.forms);
    seen.sources = Math.max(seen.sources, noun.sources);
    seen.perForm ||= noun.perForm;
  }
  return [...byFold.values()].map((noun) => {
    // One spelling per form, the ligature one when both are listed.
    const forms = new Map<string, string>();
    for (const form of noun.forms) {
      const fold = foldCase(form);
      const prev = forms.get(fold);
      if (!prev || (/[œæ]/.test(form) && !/[œæ]/.test(prev))) forms.set(fold, form);
    }
    forms.delete(foldCase(noun.lemma));
    return { ...noun, forms: [...forms.values()] };
  });
}

// "yeux", "aïeux" and "délices" are lemmas of their own as well as plurals
// of œil, aïeul and délice. The plural-only twin says less (the panel would
// show "yeux" as the lemma, and "délices" as feminine where the singular's
// gender is wanted), so it goes when it's an irregular plural of the same
// gender or a plural of amour, délice or orgue. "vacances" stays.
function dropPluralTwins(nouns: Noun[]): Noun[] {
  const twins = new Map<string, Noun[]>();
  for (const n of nouns) for (const f of n.forms) twins.set(f, [...(twins.get(f) ?? []), n]);
  return nouns.filter(
    (n) =>
      !n.pluralOnly ||
      !twins.get(n.lemma)?.some((of) => of.perForm || (of.gender === n.gender && !n.lemma.startsWith(of.lemma))),
  );
}

// A plural several lemmas list goes to the best-attested ones ("chevaux":
// cheval, listed by six lexicons, not a stray "chevau" listed by two).
// Lemmas themselves are left alone: "fils" (son) and "fois" stay nouns of
// their own beside the plurals of fil and foi.
function dropWeakClaims(nouns: Noun[]): Noun[] {
  const best = new Map<string, number>();
  for (const n of nouns) for (const f of n.forms) best.set(f, Math.max(best.get(f) ?? 0, n.sources));
  return nouns.map((n) => ({ ...n, forms: n.forms.filter((f) => best.get(f)! <= n.sources) }));
}

// Lowercase words, hyphens, apostrophes and single spaces. Leaves out
// acronyms and names (OS, Conseil), "bibliopège ou"-style artefacts, digits.
function wellFormed(text: string) {
  return /^[a-zàâäçéèêëîïôöùûüÿœæ]+(?:[-' ][a-zàâäçéèêëîïôöùûüÿœæ]+)*$/.test(text) && !/(^| )ou( |$)/.test(text);
}

type Lexeme = { noun: number; other: number; genders: Set<string>; lemma: string };

// Lexique 3.83: one row per (form, lemma, part of speech). freqfilms2 and
// freqlivres (columns 9, 10) are the form's frequency per million words.
function readLexique(tsv: string) {
  const forms = new Map<string, Lexeme>();
  for (const line of tsv.split("\n").slice(1)) {
    const c = line.split("\t");
    if (c.length < 10) continue;
    const [ortho, , lemme, cgram, genre, nombre] = c;
    const freq = (Number(c[8]) + Number(c[9])) / 2;
    const e = forms.get(ortho) ?? { noun: 0, other: 0, genders: new Set(), lemma: "" };
    if (cgram === "NOM") {
      e.noun += freq;
      if (ortho === lemme || nombre !== "p") e.genders.add(genre);
      e.lemma ||= lemme;
    } else {
      e.other += freq;
    }
    forms.set(ortho, e);
  }
  return forms;
}

// Lexique spells œ and æ out ("oeuvre"); Morphalou keeps the ligatures.
function lexemeOf(lexique: Map<string, Lexeme>, form: string) {
  return lexique.get(form) ?? lexique.get(form.replace(/œ/g, "oe").replace(/æ/g, "ae"));
}

// Lexique's gender for a lemma, when its singular rows give exactly one (it
// leaves many blank, maison among them).
function lexiqueGender(lex: Lexeme): "m" | "f" | null {
  const genders = [...lex.genders].filter(Boolean);
  return genders.length === 1 && (genders[0] === "m" || genders[0] === "f") ? genders[0] : null;
}

// Index lines, sorted by key: `key;form;gender;lemma`, joined by "|" (JSON
// needn't escape either, unlike tab and newline). `form` is empty
// when it equals the key (no accents, ligature or hyphen); `gender` is
// uppercase when the form is also another part of speech in Morphalou, and
// ends in "p" when the noun is only used in the plural (les vacances);
// `lemma` is empty when the form is the lemma, else the number of characters
// to drop from the form's end and what to add (chevaux → "3al" → cheval).
function indexLines(nouns: Noun[], otherForms: Set<string>) {
  const lines = new Set<string>();
  for (const noun of nouns) {
    for (const form of [noun.lemma, ...noun.forms]) {
      const key = genderKey(form);
      const shown = form === key ? "" : form;
      const gender = (otherForms.has(form) ? noun.gender.toUpperCase() : noun.gender) + (noun.pluralOnly ? "p" : "");
      lines.add([key, shown, gender, form === noun.lemma ? "" : lemmaDelta(form, noun.lemma)].join(";"));
    }
  }
  return [...lines].sort((a, b) => {
    const ka = a.slice(0, a.indexOf(";"));
    const kb = b.slice(0, b.indexOf(";"));
    return ka < kb ? -1 : ka > kb ? 1 : a < b ? -1 : a > b ? 1 : 0;
  });
}

function lemmaDelta(form: string, lemma: string) {
  let same = 0;
  while (same < form.length && same < lemma.length && form[same] === lemma[same]) same++;
  return `${form.length - same}${lemma.slice(same)}`;
}

// For every noun form that has another reading in either source, whether the
// noun is its main one by Lexique's frequencies. Forms Lexique doesn't list
// are left out: lookUpGender then shows them only if Morphalou knows no other
// reading. Forms are case-folded (lib/gender/key.ts), as lookUpGender compares them.
function nounShares(nouns: Noun[], otherForms: Set<string>, lexique: Map<string, Lexeme>) {
  const noun = new Set<string>();
  const other = new Set<string>();
  const seen = new Set<string>();
  for (const n of nouns) {
    for (const form of [n.lemma, ...n.forms]) {
      if (seen.has(form)) continue;
      seen.add(form);
      const lex = lexemeOf(lexique, form);
      if (!lex || (lex.other === 0 && !otherForms.has(form))) continue;
      if (lex.noun + lex.other === 0) continue;
      if (lex.noun / (lex.noun + lex.other) >= NOUN_SHARE) {
        if (otherForms.has(form)) noun.add(foldCase(form));
      } else {
        other.add(foldCase(form));
      }
    }
  }
  return { noun: [...noun].sort(), other: [...other].sort() };
}

// Lemmas whose gender Lexique gives as the opposite of Morphalou's (or as
// one where Morphalou has both). Unless curated.ts settles one, lookUpGender
// says nothing rather than pick a side.
function disputed(nouns: Noun[], lexique: Map<string, Lexeme>) {
  const out: string[] = [];
  for (const n of nouns) {
    const lex = lexemeOf(lexique, n.lemma);
    const gender = lex && lex.lemma === n.lemma ? lexiqueGender(lex) : null;
    if (gender && gender !== n.gender) out.push(foldCase(n.lemma));
  }
  return [...new Set(out)].sort();
}

// Frequent nouns where Morphalou and Lexique give different genders: each
// was checked by hand and, where Morphalou is wrong, fixed in curated.ts.
function report(nouns: Noun[], lexique: Map<string, Lexeme>) {
  const byLemma = new Map(nouns.map((n) => [n.lemma, n]));
  const rows: string[] = [];
  for (const [form, lex] of lexique) {
    if (lex.lemma !== form) continue;
    const lexGender = lexiqueGender(lex);
    const n = byLemma.get(form);
    if (!lexGender || !n || n.gender === lexGender) continue;
    rows.push(`${lex.noun.toFixed(2)}\t${form}\tmorphalou:${n.gender}\tlexique:${lexGender}`);
  }
  rows.sort((a, b) => parseFloat(b) - parseFloat(a));
  console.log(rows.join("\n"));
}

if (import.meta.main) {
  await fetchOnce(MORPHALOU_URL, "Morphalou3.1_formatCSV_toutEnUn.zip", "morphalou", MORPHALOU_CSV);
  await fetchOnce(LEXIQUE_URL, "Lexique383.zip", "lexique", LEXIQUE_TSV);

  const read = readMorphalou(await Bun.file(MORPHALOU_CSV).text());
  const nouns = dropPluralTwins(dropWeakClaims(mergeLigatures(read.nouns)));
  const otherForms = read.otherForms;
  const lexique = readLexique(await Bun.file(LEXIQUE_TSV).text());

  if (process.argv.includes("--report")) {
    report(nouns, lexique);
  } else {
    const lines = indexLines(nouns, otherForms);
    const shares = nounShares(nouns, otherForms, lexique);
    const contested = disputed(nouns, lexique);
    mkdirSync(OUT, { recursive: true });
    await Bun.write(join(OUT, "morphalou.json"), JSON.stringify({ index: lines.join("|") }) + "\n");
    await Bun.write(
      join(OUT, "lexique.json"),
      JSON.stringify({ noun: shares.noun.join("|"), other: shares.other.join("|"), disputed: contested.join("|") }) + "\n",
    );
    console.log(
      `${nouns.length} nouns, ${lines.length} index lines; ${shares.noun.length} mostly-noun, ${shares.other.length} mostly-other and ${contested.length} disputed`,
    );
  }
}
