"use client";

import { useRef, useState } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

import { PERSONS, tense as tenseOf, withoutSubject, type Identified, type Segment } from "./conjugate";
import type { CompoundTense, SimpleTense, Verb } from "./data";
import { DictionaryShell, VerbHeader } from "./parts";

// Direction 5, Pairs: the tenses learners confuse, side by side for each
// person, with the letters that tell them apart marked: irai / irais,
// allons / allions. Where the two forms are the same word, it says so.

type T = SimpleTense | CompoundTense;
const PAIRS: { id: string; label: string; a: T; b: T }[] = [
  { id: "futur", label: "Futur", a: "futur", b: "conditionnel" },
  { id: "passe", label: "Passé", a: "passeCompose", b: "imparfait" },
  { id: "subj", label: "Subjonctif", a: "present", b: "subjonctif" },
];

export function Pairs() {
  const last = useRef("futur");
  return (
    <DictionaryShell>
      {(found, query) => {
        const typed = PAIRS.find((p) => found.readings.some((r) => r.tense === p.a || r.tense === p.b))?.id;
        return <PairsResult key={query} found={found} initial={typed ?? last.current} onPair={(p) => (last.current = p)} />;
      }}
    </DictionaryShell>
  );
}

function PairsResult({ found, initial, onPair }: { found: Identified; initial: string; onPair: (p: string) => void }) {
  const [pair, setPair] = useState(initial);
  return (
    <div className="px-1">
      <VerbHeader verb={found.verb} />
      <Tabs
        value={pair}
        onValueChange={(v) => {
          setPair(v as string);
          onPair(v as string);
        }}
        className="mt-5 gap-4"
      >
        <TabsList className="w-full">
          {PAIRS.map((p) => (
            <TabsTrigger key={p.id} value={p.id} lang="fr">
              {p.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {PAIRS.map((p) => (
          <TabsContent key={p.id} value={p.id}>
            <PairTable found={found} a={p.a} b={p.b} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function PairTable({ found, a, b }: { found: Identified; a: T; b: T }) {
  const { verb } = found;
  const marked = (t: T, p: number) => found.readings.some((r) => r.tense === t && r.persons.includes(p));

  return (
    <table className="w-full table-fixed border-collapse">
      <thead>
        <tr className="text-left text-label text-text-3">
          <th scope="col" className="w-14 pb-2 font-normal">
            <span className="sr-only">Subject</span>
          </th>
          <th scope="col" lang="fr" className="pb-2 font-normal">
            {tenseOf(a).full}
          </th>
          <th scope="col" lang="fr" className="pb-2 pl-3 font-normal">
            {tenseOf(b).full}
          </th>
        </tr>
      </thead>
      <tbody>
        {PERSONS.map((pro, p) => {
          const [fa, fb] = [first(verb, a, p), first(verb, b, p)];
          const [da, db] = diff(verbText(fa), verbText(fb));
          const same = text(fa) === text(fb);
          return (
            <tr key={p} className="align-baseline">
              <th scope="row" lang="fr" className="py-1 text-left text-label font-normal text-text-3">
                {pro}
              </th>
              <td className="py-1 text-ui">
                <Diffed segs={fa} range={da} on={marked(a, p)} />
              </td>
              <td className="py-1 pl-3 text-ui">
                {same ? (
                  <span className="text-label text-text-3">Same</span>
                ) : (
                  <Diffed segs={fb} range={db} on={marked(b, p)} />
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

const first = (v: Verb, t: T, p: number) => withoutSubject(v, t, p)[0];
const text = (segs: Segment[]) => segs.map((s) => s.t).join("");
/** Without the reflexive pronoun, which two forms share without telling them apart. */
const verbText = (segs: Segment[]) => text(segs.filter((s) => s.k !== "pro"));

/**
 * The part of each word that differs, as [start, end) ranges, when the two
 * share enough to compare (irai / irais); null when they're different words.
 */
function diff(a: string, b: string): [[number, number] | null, [number, number] | null] {
  if (a === b) return [null, null];
  let pre = 0;
  while (pre < a.length && pre < b.length && a[pre] === b[pre]) pre++;
  let suf = 0;
  while (suf < a.length - pre && suf < b.length - pre && a[a.length - 1 - suf] === b[b.length - 1 - suf]) suf++;
  if (pre + suf < 3) return [null, null];
  return [
    [pre, a.length - suf],
    [pre, b.length - suf],
  ];
}

/** A form with its pronoun and agreement dimmed and the differing letters marked. */
function Diffed({ segs, range, on }: { segs: Segment[]; range: [number, number] | null; on: boolean }) {
  const chars: { c: string; dim: boolean; hl: boolean }[] = [];
  // range counts the verb's letters only (see verbText).
  let i = 0;
  for (const s of segs) {
    for (const c of s.t) {
      const hl = s.k !== "pro" && !!range && i >= range[0] && i < range[1];
      if (s.k !== "pro") i++;
      chars.push({ c, dim: s.k === "pro" || s.k === "agree", hl });
    }
  }
  const runs: { t: string; dim: boolean; hl: boolean }[] = [];
  for (const ch of chars) {
    const prev = runs[runs.length - 1];
    if (prev && prev.dim === ch.dim && prev.hl === ch.hl) prev.t += ch.c;
    else runs.push({ t: ch.c, dim: ch.dim, hl: ch.hl });
  }
  return (
    <span lang="fr" className={cn("-mx-1 box-decoration-clone rounded-row px-1 font-serif", on && "bg-sunken")}>
      {runs.map((r, i) => (
        <span key={i} className={cn(r.dim && "text-text-3", r.hl && "bg-c-conj/14 text-c-conj")}>
          {r.t}
        </span>
      ))}
    </span>
  );
}
