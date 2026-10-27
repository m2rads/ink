// Compares three layouts for the verb data behind lookUpVerb, each run in a
// fresh Node process (what Vercel runs) as Next would bundle it: the JSON
// inlined in the module. Run with `bun scripts/bench-conjugation.ts` after
// `bun scripts/build-conjugation.ts`; results are in lib/conjugation/NOTICE.md.
//
//   A  one JSON of every verb's forms; a Map of all ~250k forms built at cold start
//   B  a sorted form index searched in place (like lib/gender) + one line per verb, decoded on demand
//   C  what ships: stems + ~150 shared ending templates, forms found by their ending (lib/conjugation.ts)
//
// Writes to .cache/conjugation/bench/ (git-ignored), as .mjs so the project's
// tsconfig never picks the generated modules up.

import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { fold, lower } from "../lib/conjugation/key";
import lefff from "../lib/conjugation/lefff.json";
import { CELL, FIELD, HIDDEN, LINE, SLOT, SPELLING } from "../lib/conjugation/table";

const ROOT = join(import.meta.dir, "..");
const DIR = join(ROOT, ".cache/conjugation/bench");
mkdirSync(DIR, { recursive: true });

// Every verb's 45 slots, spelled out, from the shipped file.
const templates = lefff.templates.split(LINE).map((line) => {
  const [end, cells] = line.split(FIELD);
  return { end, slots: cells.split(CELL).map((c) => (c ? c.split(SPELLING) : [])) };
});
const verbs = lefff.verbs.split(LINE).map((line) => {
  const [inf, t] = line.split(FIELD);
  const { end, slots } = templates[parseInt(t, 36)];
  const stem = inf.slice(0, inf.length - end.length);
  const full = slots.map((c, i) => [...(i === SLOT.W ? [end] : []), ...c].map((s) => (s.startsWith(HIDDEN) ? HIDDEN + stem + s.slice(1) : stem + s)));
  return { inf, slots: full };
});

// Sample: 20,000 forms drawn evenly from every verb, and 2,000 words that aren't verbs.
const allForms = verbs.flatMap((v) => v.slots.flat().map((s) => s.replace(HIDDEN, "")));
const sample: string[] = [];
for (let i = 0; i < 20000; i++) sample.push(allForms[Math.floor((i * 7919) % allForms.length)]);
const nonVerbs = "maison très voiture pomme travail rouge sous avec beaucoup pendant problème société quelque chose".split(" ");
for (let i = 0; i < 2000; i++) sample.push(nonVerbs[i % nonVerbs.length]);
await Bun.write(join(DIR, "sample.json"), JSON.stringify(sample));

// A: every verb as arrays of forms.
await Bun.write(join(DIR, "a.json"), JSON.stringify({ verbs: verbs.map((v) => [v.inf, v.slots.map((c) => c.join(SPELLING)).join(CELL)]) }));
await Bun.write(
  join(DIR, "a.src.mjs"),
  `import data from "./a.json";
let map = null;
export function lookUp(word) {
  if (!map) {
    map = new Map();
    data.verbs.forEach(([, cells], v) => cells.split(",").forEach((c, slot) => { for (const s of c ? c.split("/") : []) {
      const k = s.replace("~", "").normalize("NFC").toLowerCase();
      const l = map.get(k); if (l) l.push(v * 64 + slot); else map.set(k, [v * 64 + slot]); } }));
  }
  return (map.get(word.normalize("NFC").toLowerCase()) ?? []).map((p) => [data.verbs[p >> 6][0], p & 63]);
}
`,
);

// B: sorted `key;form;verb.slot,…` lines, binary-searched in one string; verbs as lines.
const byKey = new Map<string, Map<string, string[]>>();
verbs.forEach((v, i) =>
  v.slots.forEach((c, slot) => {
    for (const s of c) {
      const form = lower(s.replace(HIDDEN, ""));
      const key = fold(form);
      const forms = byKey.get(key) ?? new Map<string, string[]>();
      forms.set(form, [...(forms.get(form) ?? []), `${i.toString(36)}.${slot.toString(36)}`]);
      byKey.set(key, forms);
    }
  }),
);
const lines = [...byKey.keys()]
  .sort()
  .flatMap((key) => [...byKey.get(key)!].map(([form, hits]) => `${key};${form === key ? "" : form};${hits.join(",")}`));
await Bun.write(join(DIR, "b.json"), JSON.stringify({ index: lines.join("|"), verbs: verbs.map((v) => v.inf + ";" + v.slots.map((c) => c.join("/")).join(",")).join("|") }));
await Bun.write(
  join(DIR, "b.src.mjs"),
  `import data from "./b.json";
const INDEX = data.index;
let starts = null;
const keyAt = (s) => INDEX.slice(s, INDEX.indexOf(";", s));
const end = (s) => { const e = INDEX.indexOf("|", s); return e === -1 ? INDEX.length : e; };
export function lookUp(word) {
  const form = word.normalize("NFC").toLowerCase();
  const key = form.normalize("NFD").replace(/\\p{M}/gu, "");
  let lo = 0, hi = INDEX.length;
  while (lo < hi) { const s = INDEX.lastIndexOf("|", ((lo + hi) >>> 1) - 1) + 1; if (keyAt(s) < key) lo = end(s) + 1; else hi = s; }
  const out = [];
  starts ??= (() => { const a = [0]; for (let i = 0; i < data.verbs.length; i++) if (data.verbs[i] === "|") a.push(i + 1); return a; })();
  for (let s = lo; s < INDEX.length && keyAt(s) === key; s = end(s) + 1) {
    const [, f, hits] = INDEX.slice(s, end(s)).split(";");
    if ((f || key) !== form) continue;
    for (const h of hits.split(",")) { const [v, slot] = h.split(".").map((x) => parseInt(x, 36)); out.push([data.verbs.slice(starts[v], data.verbs.indexOf(";", starts[v])), slot]); }
  }
  return out;
}
`,
);

await Bun.write(join(DIR, "c.src.mjs"), `export { readForm as lookUp, lookUpVerb } from "../../../lib/conjugation.ts";\n`);

// The runner: cold import + first lookup, heap after GC, then timed lookups.
await Bun.write(
  join(DIR, "run.mjs"),
  `import { readFileSync } from "node:fs";
const [file, mode] = process.argv.slice(2);
const sample = JSON.parse(readFileSync(new URL("./sample.json", import.meta.url)));
global.gc(); const heap0 = process.memoryUsage().heapUsed;
const t0 = performance.now();
const m = await import(new URL(file, import.meta.url));
const t1 = performance.now();
m.lookUp("allions");
const t2 = performance.now();
global.gc(); const heap = process.memoryUsage().heapUsed - heap0;
const times = (fn, inputs) => { const out = []; for (const w of inputs) { const s = performance.now(); fn(w); out.push((performance.now() - s) * 1000); } return out.sort((a, b) => a - b); };
for (let i = 0; i < 2; i++) times(m.lookUp, sample);
const t = times(m.lookUp, sample);
const q = (a, p) => a[Math.min(a.length - 1, Math.floor(a.length * p))].toFixed(1);
const r = { import: +(t1 - t0).toFixed(1), firstLookup: +(t2 - t1).toFixed(1), heapMB: +(heap / 1e6).toFixed(1), p50: q(t, 0.5), p99: q(t, 0.99) };
if (mode === "e2e") {
  const inputs = ["allions", "j'irais", "suis allé", "nous nous sommes levés", "que l'entreprise paie", "maison", "elle s'est levée", "qu'il ait fini", "se lever", "porte"];
  const many = Array.from({ length: 20000 }, (_, i) => inputs[i % inputs.length]);
  times((w) => m.lookUpVerb(w, "Je pense que"), many);
  const e = times((w) => m.lookUpVerb(w, "Je pense que"), many);
  r.e2eP50 = q(e, 0.5); r.e2eP99 = q(e, 0.99);
  r.resultBytes = JSON.stringify(m.lookUpVerb("allions")).length;
}
console.log(JSON.stringify(r));
`,
);

const size = async (f: string) => {
  const b = new Uint8Array(await Bun.file(f).arrayBuffer());
  return { raw: b.length, gzip: gzipSync(b, { level: 9 }).length };
};
const kb = (n: number) => `${(n / 1024).toFixed(0)} KB`;

const layouts = [
  { name: "A one JSON", files: [join(DIR, "a.json")], src: "a" },
  { name: "B form index", files: [join(DIR, "b.json")], src: "b" },
  { name: "C templates", files: [join(ROOT, "lib/conjugation/lefff.json"), join(ROOT, "lib/conjugation/lexique.json")], src: "c" },
];
const RUNS = 5;
for (const l of layouts) {
  const out = join(DIR, `${l.src}.mjs`);
  const built = Bun.spawnSync(["bun", "build", join(DIR, `${l.src}.src.mjs`), "--target=node", "--format=esm", `--outfile=${out}`]);
  if (built.exitCode !== 0) throw new Error(String(built.stderr));
  const sizes = await Promise.all(l.files.map(size));
  const results: Record<string, number | string>[] = [];
  for (let i = 0; i < RUNS; i++) {
    const p = Bun.spawnSync(["node", "--expose-gc", join(DIR, "run.mjs"), `./${l.src}.mjs`, l.src === "c" ? "e2e" : ""]);
    if (p.exitCode !== 0) throw new Error(String(p.stderr));
    results.push(JSON.parse(String(p.stdout)));
  }
  const median = (k: string) => results.map((r) => Number(r[k])).sort((a, b) => a - b)[RUNS >> 1];
  console.log(
    [
      l.name.padEnd(13),
      `data ${kb(sizes.reduce((a, s) => a + s.raw, 0))} raw / ${kb(sizes.reduce((a, s) => a + s.gzip, 0))} gzip`,
      `cold ${median("import")} + ${median("firstLookup")} ms`,
      `heap ${median("heapMB")} MB`,
      `lookup p50 ${median("p50")} µs, p99 ${median("p99")} µs`,
      results[0].e2eP50 ? `lookUpVerb p50 ${median("e2eP50")} µs, p99 ${median("e2eP99")} µs, ${results[0].resultBytes} B per result` : "",
    ].join(" · "),
  );
}
