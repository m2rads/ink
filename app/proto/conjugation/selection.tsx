"use client";

import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SELECTION_UI, selectionAnchor, useSelection, type Selected } from "@/app/write/selection";
import { cn } from "@/lib/utils";

import { identify, infinitive, tense as tenseOf, type Identified, type Reading } from "./conjugate";
import type { TenseId } from "./data";
import { Essay, ProtoAppBar } from "./harness";
import { Listen, Rows, Shortcut, useHotkey } from "./parts";

// Direction 3, Selection: start from the word in the essay. Select a verb
// form ("allions", "suis allé") and a small pill says what it is, read with
// the words before it: aller · Imparfait / Subjonctif. Clicking it, or ⌘K,
// grows it into that tense's six persons with the writer's person marked;
// a form that fits several tenses shows each as a tab. Like the selection
// lookup it never takes focus, so typing still replaces the selection.

export function Selection() {
  const { selected, readNow, dismiss } = useSelection(true);
  const [asked, setAsked] = useState<Selected | null>(null);
  const found = selected ? identify(selected.term, selected.el.value.slice(0, selected.start)) : null;

  useHotkey(() => {
    const now = readNow();
    if (now) setAsked(now);
  });

  return (
    <>
      <ProtoAppBar />
      <Essay />
      <SelectionCard
        selected={found ? selected : null}
        found={found}
        asked={same(asked, selected)}
        onAsk={setAsked}
        onDismiss={dismiss}
      />
    </>
  );
}

const same = (a: Selected | null, b: Selected | null) =>
  !!a && !!b && a.el === b.el && a.start === b.start && a.end === b.end;

const short = (t: TenseId) => {
  const x = tenseOf(t);
  return x.mood === "Indicatif" || x.mood === "Participe" ? x.name : x.mood;
};

function summary(readings: Reading[]) {
  if (!readings.length) return "Infinitif";
  if (readings.length > 2) return `${readings.length} tenses`;
  return readings.map((r) => short(r.tense)).join(" / ");
}

function SelectionCard({
  selected,
  found,
  asked,
  onAsk,
  onDismiss,
}: {
  selected: Selected | null;
  found: Identified | null;
  asked: boolean;
  onAsk: (s: Selected) => void;
  onDismiss: () => void;
}) {
  // What was last shown, so the popover keeps its content and place while it fades out.
  const [held, setHeld] = useState<{ selected: Selected; found: Identified; asked: boolean } | null>(null);
  if (selected && found && (held?.selected !== selected || held.asked !== asked)) setHeld({ selected, found, asked });

  return (
    <PopoverPrimitive.Root
      open={!!selected}
      onOpenChange={(open) => {
        if (!open) onDismiss();
      }}
    >
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Positioner
          anchor={held ? selectionAnchor(held.selected) : null}
          side={held && matchMedia("(pointer: coarse)").matches ? "bottom" : "top"}
          sideOffset={6}
          collisionPadding={16}
          className="isolate z-50"
        >
          <PopoverPrimitive.Popup
            {...{ [SELECTION_UI]: "" }}
            aria-label="Conjugation of the selection"
            initialFocus={false}
            finalFocus={false}
            // Pressing inside keeps the caret and the selection in the essay.
            onPointerDown={(e) => e.preventDefault()}
            onMouseDown={(e) => e.preventDefault()}
            className={cn(
              "origin-(--transform-origin) bg-raised text-text shadow-overlay outline-hidden transition-[opacity,scale] duration-150 ease-out data-starting-style:scale-95 data-starting-style:opacity-0 data-ending-style:scale-95 data-ending-style:opacity-0 data-ending-style:duration-100 data-ending-style:ease-in",
              held?.asked ? "w-72 rounded-card px-3 pt-2.5 pb-2" : "rounded-full p-0.5",
            )}
          >
            {held &&
              (held.asked ? (
                <Card found={held.found} />
              ) : (
                <Button variant="ghost" size="xs" onClick={() => onAsk(held.selected)}>
                  <span lang="fr" className="font-serif italic">
                    {infinitive(held.found.verb)}
                  </span>
                  <span className="text-text-3">·</span>
                  <span lang="fr">{summary(held.found.readings)}</span>
                  <span className="ml-1">
                    <Shortcut />
                  </span>
                </Button>
              ))}
          </PopoverPrimitive.Popup>
        </PopoverPrimitive.Positioner>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

function Card({ found }: { found: Identified }) {
  const { verb, readings } = found;
  const list: Reading[] = readings.length ? readings : [{ tense: "present", persons: [] }];
  const [tab, setTab] = useState<TenseId>(list[0].tense);

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-baseline gap-2">
            <span lang="fr" className="font-serif text-title">
              {infinitive(verb)}
            </span>
            <span className="text-ui text-text-2">{verb.meaning}</span>
          </p>
          <p className="text-label text-text-3">
            {verb.group} · <span lang="fr">{verb.aux}</span>
          </p>
        </div>
        <Listen text={infinitive(verb)} className="-mt-0.5 -mr-1.5" />
      </div>
      {list.length > 1 ? (
        <Tabs value={tab} onValueChange={(v) => setTab(v as TenseId)} className="mt-2 gap-2">
          <TabsList variant="line" className="-ml-2.5">
            {list.map((r) => (
              <TabsTrigger key={r.tense} value={r.tense} lang="fr">
                {tenseOf(r.tense).full}
              </TabsTrigger>
            ))}
          </TabsList>
          {list.map((r) => (
            <TabsContent key={r.tense} value={r.tense}>
              <Rows verb={verb} tense={r.tense} highlight={r.persons} size="ui" />
            </TabsContent>
          ))}
        </Tabs>
      ) : (
        <div className="mt-3">
          <p lang="fr" className="mb-1 text-label font-medium">
            {readings.length ? tenseOf(list[0].tense).full : "Présent"}
          </p>
          <Rows verb={verb} tense={list[0].tense} highlight={list[0].persons} size="ui" />
        </div>
      )}
    </div>
  );
}
