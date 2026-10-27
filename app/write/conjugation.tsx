"use client";

import { ChevronDownIcon } from "lucide-react";
import { Fragment, useState } from "react";

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  infinitive,
  MOODS,
  PERSONS,
  rows,
  tense as tenseOf,
  TENSES,
  type Segment,
  type Spellings,
} from "@/lib/conjugation/compose";
import type {
  Reading,
  TenseId,
  Verb,
  VerbLookup,
} from "@/lib/conjugation/types";
import { cn } from "@/lib/utils";

// A French verb's conjugation in the dictionary (AGENTS.md, Dictionary:
// Conjugation). Two views of what lookUp returns with a translation:
//
// - VerbEntry, in the panel's result: one tense at a time behind a menu
//   grouped by mood, six persons. A form typed in ("allions") opens on its
//   tense with its person marked, and its other readings are a click away.
// - SelectionVerb, in the selection card: what the selected form is, read
//   with the words before it (aller · Imparfait · nous), and that tense's
//   rows with the writer's person marked; one tab per reading when the form
//   fits several.
//
// Forms come as segments (compose.ts): pronouns and agreement are quieter
// than the verb, and a form only breaks between its words, never inside
// "levé(e)(s)", so long ones wrap under themselves in the narrow margin.

/** The tense picked last in the panel, for the next verb looked up as an infinitive. */
let lastTense: TenseId = "present";

/** The panel's verb entry: the verb, a tense menu and that tense's rows. */
export function VerbEntry({
  lookup,
  className,
}: {
  lookup: VerbLookup;
  className?: string;
}) {
  const { verb, readings } = lookup;
  const [tense, setTense] = useState<TenseId>(
    () => readings[0]?.tense ?? lastTense,
  );

  function choose(t: TenseId) {
    setTense(t);
    lastTense = t;
  }

  return (
    <section
      aria-label={`Conjugation of ${infinitive(verb)}`}
      className={className}
    >
      <VerbLine verb={verb} facts={facts(verb)} />
      <TenseMenu value={tense} onValueChange={choose} className="mt-3" />
      <Rows
        verb={verb}
        tense={tense}
        marked={personsIn(readings, tense)}
        className="mt-2"
      />
      {readings.length > 1 && (
        <p className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-label text-text-3">
          Also
          {readings
            .filter((r) => r.tense !== tense)
            .map((r) => (
              <button
                key={r.tense}
                type="button"
                lang="fr"
                onClick={() => choose(r.tense)}
                className="relative text-text-2 underline decoration-border-strong underline-offset-4 transition-colors duration-150 before:absolute before:-inset-x-1 before:-inset-y-1 hover:text-text hover:decoration-current"
              >
                {tenseOf(r.tense).full}
              </button>
            ))}
        </p>
      )}
    </section>
  );
}

/**
 * The selection card's part: what the selected form is and its tense's rows.
 * Nothing in it takes focus, like the rest of the card.
 */
export function SelectionVerb({
  lookup,
  className,
}: {
  lookup: VerbLookup;
  className?: string;
}) {
  const { verb, readings } = lookup;
  // An infinitive has no reading: its présent, with nothing marked.
  const list: Reading[] = readings.length
    ? readings
    : [{ tense: "present", persons: [] }];
  const [tab, setTab] = useState(list[0].tense);
  const active = list.find((r) => r.tense === tab) ?? list[0];

  const line = !readings.length
    ? facts(verb)
    : [
        ...(list.length === 1 ? [tenseOf(active.tense).full] : []),
        ...personNames(active),
      ];

  return (
    <section
      aria-label={`Conjugation of ${infinitive(verb)}`}
      className={className}
    >
      <VerbLine verb={verb} facts={line} />
      {list.length > 1 ? (
        <Tabs
          value={active.tense}
          onValueChange={(v) => setTab(v as TenseId)}
          className="mt-1 gap-1"
        >
          <TabsList variant="line" className="-ml-2.5">
            {list.map((r) => (
              <TabsTrigger key={r.tense} value={r.tense} lang="fr">
                {short(r.tense)}
              </TabsTrigger>
            ))}
          </TabsList>
          {list.map((r) => (
            <TabsContent key={r.tense} value={r.tense}>
              <Rows verb={verb} tense={r.tense} marked={r.persons} />
            </TabsContent>
          ))}
        </Tabs>
      ) : (
        <>
          {!readings.length && (
            <p lang="fr" className="mt-2 text-label text-text-3">
              {tenseOf(active.tense).full}
            </p>
          )}
          <Rows
            verb={verb}
            tense={active.tense}
            marked={active.persons}
            className="mt-1.5"
          />
        </>
      )}
    </section>
  );
}

/** "aller · Irregular · être": the infinitive, then short facts; it breaks only between them. */
function VerbLine({ verb, facts }: { verb: Verb; facts: React.ReactNode[] }) {
  return (
    <p className="text-ui text-pretty">
      <span lang="fr" className="font-serif whitespace-nowrap text-text-2">
        {infinitive(verb)}
      </span>
      {facts.map((f, i) => (
        <Fragment key={i}>
          <span aria-hidden className="text-text-3">
            {" · "}
          </span>
          <span className="whitespace-nowrap text-text-3">{f}</span>
        </Fragment>
      ))}
    </p>
  );
}

/** The verb's group ("1st group", "e → è") and auxiliary. */
function facts(verb: Verb): React.ReactNode[] {
  const aux =
    verb.aux === "both" ? (
      <span lang="fr">
        être <span lang="en">or</span> avoir
      </span>
    ) : (
      <span lang="fr">{verb.aux}</span>
    );
  return [...verb.group.split(" · "), aux];
}

function personNames(r: Reading) {
  const names = r.persons.map((p) => PERSONS[p]).join(", ");
  return names
    ? [
        <span key="persons" lang="fr">
          {names}
        </span>,
      ]
    : [];
}

const personsIn = (readings: Reading[], tense: TenseId) =>
  readings.find((r) => r.tense === tense)?.persons ?? [];

/** A tab's label: the indicative by its name, the other moods by theirs (Subjonctif, Conditionnel passé). */
function short(id: TenseId) {
  const t = tenseOf(id);
  if (t.mood === "Indicatif" || t.mood === "Participe") return t.name;
  return t.name === "Présent" ? t.mood : t.full;
}

function TenseMenu({
  value,
  onValueChange,
  className,
}: {
  value: TenseId;
  onValueChange: (t: TenseId) => void;
  className?: string;
}) {
  const current = tenseOf(value);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            size="xs"
            aria-label={`Tense: ${current.full}`}
            className={className}
          >
            <span lang="fr">{current.full}</span>
            <ChevronDownIcon data-icon="inline-end" />
          </Button>
        }
      />
      <DropdownMenuContent className="w-56">
        {MOODS.map((mood, i) => (
          <DropdownMenuGroup key={mood}>
            {i > 0 && <DropdownMenuSeparator />}
            {mood !== "Participe" && (
              <DropdownMenuLabel lang="fr">{mood}</DropdownMenuLabel>
            )}
            <DropdownMenuRadioGroup
              value={value}
              onValueChange={(v) => onValueChange(v as TenseId)}
            >
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

/** A tense's rows, the persons in `marked` on a quiet fill. */
function Rows({
  verb,
  tense,
  marked,
  className,
}: {
  verb: Verb;
  tense: TenseId;
  marked: number[];
  className?: string;
}) {
  return (
    <ul lang="fr" className={cn("grid gap-px font-serif text-ui", className)}>
      {/* Persons a verb doesn't have are left out: falloir is "il faut" alone. */}
      {rows(verb, tense)
        .filter((r) => r.forms.length > 0)
        .map((r, i) => {
          const on = r.person !== undefined && marked.includes(r.person);
          return (
            <li
              key={i}
              aria-current={on || undefined}
              className={cn(
                "-mx-2 rounded-row px-2 py-0.5",
                // A long form wraps under itself, indented, so each person still reads as one row.
                r.label ? "flex items-baseline gap-3" : "pl-6 -indent-4",
                on && "bg-sunken",
              )}
            >
              {r.label && (
                <span className="w-16 shrink-0 font-sans text-label text-text-3">
                  {r.label}
                </span>
              )}
              <Form forms={r.forms} />
            </li>
          );
        })}
    </ul>
  );
}

/** One person's form; other correct spellings follow after a slash, verb part only (paie / paye). */
function Form({ forms }: { forms: Spellings }) {
  const [first, ...others] = forms;
  return (
    <span className="min-w-0">
      <Segments segments={first} />
      {others.map((o, i) => (
        <Fragment key={i}>
          <span className="text-text-3"> / </span>
          <Segments segments={o.filter((s) => s.k !== "pro")} />
        </Fragment>
      ))}
    </span>
  );
}

/** Pronouns and agreement quiet; each part unbroken, the participle and its agreement as one. */
function Segments({ segments }: { segments: Segment[] }) {
  const lead = segments.filter((s) => s.k === "pro" || s.k === "aux");
  const tail = segments.filter((s) => s.k === "verb" || s.k === "agree");
  return (
    <>
      {lead.map((s, i) => (
        <span
          key={i}
          className={cn("whitespace-nowrap", s.k === "pro" && "text-text-3")}
        >
          {s.t}
        </span>
      ))}
      <span className="whitespace-nowrap">
        {tail.map((s, i) => (
          <span key={i} className={s.k === "agree" ? "text-text-3" : undefined}>
            {s.t}
          </span>
        ))}
      </span>
    </>
  );
}
