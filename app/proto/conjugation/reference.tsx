"use client";

import { TableIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

import { infinitive, rows, TENSES, type Identified, type Mood } from "./conjugate";
import { DictionaryShell, Form, Listen, personsFor, Rows } from "./parts";

// Direction 2, Reference: the whole verb on one page, like a Bescherelle
// table. The dictionary keeps only the meaning and a way in; the table opens
// in a wide sheet over the essay, every mood and tense at once, with the
// form that was looked up marked where it occurs.

export function Reference() {
  return <DictionaryShell>{(found, query) => <ReferenceResult key={query} found={found} />}</DictionaryShell>;
}

function ReferenceResult({ found }: { found: Identified }) {
  const [open, setOpen] = useState(false);
  const { verb } = found;
  const present = rows(verb, "present");

  return (
    <div className="px-1">
      <div className="flex items-start justify-between gap-2">
        <p lang="fr" className="font-serif text-title">
          {infinitive(verb)}
        </p>
        <Listen text={infinitive(verb)} className="-my-0.5 -mr-1.5" />
      </div>
      <p className="text-ui text-text-2">{verb.meaning}</p>
      <p className="mt-3 text-ui">
        <Form forms={present[0].forms} />
        <span className="text-text-3">, </span>
        <Form forms={present[3].forms} />
      </p>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="mt-4">
        <TableIcon data-icon="inline-start" />
        Conjugation
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="left"
          className="gap-0 data-[side=left]:w-full data-[side=left]:sm:max-w-5xl"
        >
          <SheetHeader className="pr-12">
            <SheetTitle>Conjugation</SheetTitle>
          </SheetHeader>
          <Table found={found} />
        </SheetContent>
      </Sheet>
    </div>
  );
}

const Fact = ({ term, children }: { term: string; children: React.ReactNode }) => (
  <div className="flex gap-1.5">
    <dt className="text-text-3">{term}</dt>
    <dd lang="fr">{children}</dd>
  </div>
);

function Table({ found }: { found: Identified }) {
  const { verb } = found;
  return (
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-16 sm:px-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <div className="flex items-baseline gap-3">
          <h2 lang="fr" className="font-serif text-heading">
            {infinitive(verb)}
          </h2>
          <p className="text-ui text-text-2">{verb.meaning}</p>
        </div>
        <dl className="flex flex-wrap gap-x-5 gap-y-1 text-label">
          <Fact term="Group">
            <span lang="en">{verb.group}</span>
          </Fact>
          <Fact term="Auxiliary">{verb.aux}</Fact>
          <Fact term="Participle">{verb.participePasse}</Fact>
        </dl>
      </div>

      <MoodSection found={found} mood="Indicatif" className="mt-8" cols="lg:grid-cols-4" />
      <div className="mt-10 grid gap-10 lg:grid-cols-2 lg:gap-8">
        <MoodSection found={found} mood="Subjonctif" />
        <MoodSection found={found} mood="Conditionnel" />
        <MoodSection found={found} mood="Impératif" />
        <MoodSection found={found} mood="Participe" />
      </div>
    </div>
  );
}

function MoodSection({
  found,
  mood,
  cols = "",
  className,
}: {
  found: Identified;
  mood: Mood;
  cols?: string;
  className?: string;
}) {
  return (
    <section className={className} aria-labelledby={`mood-${mood}`}>
      <h3 id={`mood-${mood}`} lang="fr" className="eyebrow border-b pb-2 text-text-3">
        {mood === "Participe" ? "Participes" : mood}
      </h3>
      <div className={cn("mt-4 grid gap-x-8 gap-y-6 sm:grid-cols-2", cols)}>
        {TENSES.filter((t) => t.mood === mood).map((t) => (
          <div key={t.id}>
            {mood !== "Participe" && (
              <h4 lang="fr" className="mb-1.5 text-label font-medium">
                {mood === "Impératif" ? "Présent" : t.name}
              </h4>
            )}
            <Rows verb={found.verb} tense={t.id} highlight={personsFor(found, t.id)} size="ui" />
          </div>
        ))}
      </div>
    </section>
  );
}
