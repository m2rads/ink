"use client";

import { ChevronDownIcon } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { MOODS, TENSES, tense as tenseOf, type Identified } from "./conjugate";
import type { TenseId } from "./data";
import { DictionaryShell, personsFor, Rows, VerbHeader } from "./parts";

// Direction 1, Entry: conjugation is part of a verb's dictionary entry. The
// meaning, then one tense at a time behind a menu, six persons. A form typed
// into the lookup ("allions") opens on its tense with its person marked.
// The tense chosen stays for the next verb.

export function Entry() {
  const last = useRef<TenseId>("present");
  return (
    <DictionaryShell>
      {(found, query) => (
        <EntryResult
          key={query}
          found={found}
          initial={found.readings[0]?.tense ?? last.current}
          onTense={(t) => (last.current = t)}
        />
      )}
    </DictionaryShell>
  );
}

function EntryResult({ found, initial, onTense }: { found: Identified; initial: TenseId; onTense: (t: TenseId) => void }) {
  const [tense, setTense] = useState(initial);
  return (
    <div className="px-1">
      <VerbHeader verb={found.verb} />
      <div className="mt-5 flex items-center justify-between gap-2">
        <h3 className="eyebrow text-text-3">Conjugation</h3>
        <TenseMenu
          value={tense}
          onChange={(t) => {
            setTense(t);
            onTense(t);
          }}
        />
      </div>
      <div className="mt-2">
        <Rows verb={found.verb} tense={tense} highlight={personsFor(found, tense)} />
      </div>
      {found.readings.length > 1 && (
        <p className="mt-3 flex flex-wrap items-baseline gap-x-2 text-label text-text-3">
          Also
          {found.readings
            .filter((r) => r.tense !== tense)
            .map((r) => (
              <button
                key={r.tense}
                type="button"
                lang="fr"
                onClick={() => setTense(r.tense)}
                className="relative text-text-2 underline decoration-border-strong underline-offset-4 transition-colors duration-150 before:absolute before:-inset-x-1 before:-inset-y-2 hover:text-text hover:decoration-current"
              >
                {tenseOf(r.tense).full}
              </button>
            ))}
        </p>
      )}
    </div>
  );
}

function TenseMenu({ value, onChange }: { value: TenseId; onChange: (t: TenseId) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" size="xs" aria-label={`Tense: ${tenseOf(value).full}`} className="-mr-1">
            <span lang="fr">{tenseOf(value).full}</span>
            <ChevronDownIcon data-icon="inline-end" />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-56">
        {MOODS.map((mood, i) => (
          <DropdownMenuGroup key={mood}>
            {i > 0 && <DropdownMenuSeparator />}
            {mood !== "Participe" && <DropdownMenuLabel lang="fr">{mood}</DropdownMenuLabel>}
            <DropdownMenuRadioGroup value={value} onValueChange={(v) => onChange(v as TenseId)}>
              {TENSES.filter((t) => t.mood === mood).map((t) => (
                <DropdownMenuRadioItem key={t.id} value={t.id} closeOnClick>
                  <span lang="fr">{t.name}</span>
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuGroup>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
