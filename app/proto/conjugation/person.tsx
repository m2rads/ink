"use client";

import { useRef, useState } from "react";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

import { conjugate, PERSONS, tense as tenseOf, type Identified } from "./conjugate";
import type { SimpleTense, CompoundTense } from "./data";
import { DictionaryShell, Form, VerbHeader } from "./parts";

// Direction 4, By person: mid-essay the writer already knows the subject
// ("nous") and roughly when; what they doubt is the form. So the slice is one
// person across the six tenses TEF writing leans on, with the auxiliary and
// the participle's agreement stated at the top and visible in the forms.

const EXAM: (SimpleTense | CompoundTense)[] = ["present", "passeCompose", "imparfait", "futur", "conditionnel", "subjonctif"];

const SHORT = ["je", "tu", "il", "nous", "vous", "ils"];

export function ByPerson() {
  const last = useRef(0);
  return (
    <DictionaryShell>
      {(found, query) => {
        const typed = found.readings.find((r) => r.persons.length === 1)?.persons[0];
        return (
          <PersonResult key={query} found={found} initial={typed ?? last.current} onPerson={(p) => (last.current = p)} />
        );
      }}
    </DictionaryShell>
  );
}

function PersonResult({ found, initial, onPerson }: { found: Identified; initial: number; onPerson: (p: number) => void }) {
  const [person, setPerson] = useState(initial);
  const { verb } = found;
  const typed = new Set(found.readings.filter((r) => r.persons.includes(person)).map((r) => r.tense));

  return (
    <div className="px-1">
      <VerbHeader verb={verb} facts={false} />
      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-label">
        <dt className="text-text-3">Auxiliary</dt>
        <dd lang="fr">{verb.aux}</dd>
        <dt className="text-text-3">Agreement</dt>
        <dd>{verb.aux === "être" ? "With the subject" : "With a direct object before it"}</dd>
      </dl>

      <ToggleGroup
        variant="outline"
        size="sm"
        spacing={0}
        value={[String(person)]}
        onValueChange={(v) => {
          // One person is always chosen.
          const next = v.length ? Number(v[v.length - 1]) : person;
          setPerson(next);
          onPerson(next);
        }}
        aria-label="Subject"
        className="mt-5"
      >
        {SHORT.map((s, i) => (
          <ToggleGroupItem key={s} value={String(i)} aria-label={PERSONS[i]} lang="fr">
            {s}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      <ul className="mt-4 grid gap-3">
        {EXAM.map((t) => (
          <li key={t} className={typed.has(t) ? "-mx-2 rounded-row bg-sunken px-2 py-1" : "py-1"}>
            <p lang="fr" className="text-label text-text-3">
              {tenseOf(t).full}
            </p>
            <p className="text-body">
              <Form forms={conjugate(verb, t, person)} />
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
