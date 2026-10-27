"use client";

import { BookOpenTextIcon, Volume2Icon, XIcon } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { speakFrench, useCanSpeakFrench } from "@/lib/speech";
import { cn } from "@/lib/utils";

import { infinitive, label, plain, resolve, rows, type Identified, type Segment, type Spellings } from "./conjugate";
import { VERBS, type TenseId, type Verb } from "./data";
import { Essay, ProtoAppBar, useProto } from "./harness";

// Throwaway: /proto/conjugation. What the directions share: a form drawn
// from its segments, a tense's rows, the verb's heading, and the dictionary
// itself (in the margin left of the essay, or a sheet on narrow windows),
// which the in-dictionary directions fill with their own result.

const WIDE = "(min-width: 1312px)";

export function useWide() {
  const [wide, setWide] = useState<boolean | null>(null);
  useEffect(() => {
    const mq = matchMedia(WIDE);
    const update = () => setWide(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return wide;
}

const KIND: Record<Segment["k"], string> = {
  pro: "text-text-3",
  aux: "",
  verb: "",
  agree: "text-text-3",
};

/** One person's form; other correct spellings follow after a slash, verb part only. */
export function Form({ forms, className }: { forms: Spellings; className?: string }) {
  const [first, ...others] = forms;
  return (
    <span lang="fr" className={cn("font-serif", className)}>
      {first.map((s, i) => (
        <span key={i} className={KIND[s.k]}>
          {s.t}
        </span>
      ))}
      {others.map((o, i) => (
        <span key={i}>
          <span className="text-text-3"> / </span>
          {o
            .filter((s) => s.k !== "pro")
            .map((s) => s.t)
            .join("")}
        </span>
      ))}
    </span>
  );
}

/** A tense's rows, with the persons in `highlight` marked. */
export function Rows({
  verb,
  tense,
  highlight = [],
  size = "body",
}: {
  verb: Verb;
  tense: TenseId;
  highlight?: number[];
  size?: "body" | "ui";
}) {
  return (
    <ul className="grid gap-px">
      {rows(verb, tense).map((r, i) => {
        const on = r.person !== undefined && highlight.includes(r.person);
        return (
          <li
            key={i}
            aria-current={on ? "true" : undefined}
            className={cn(
              // A long form wraps under itself, indented, so each person still reads as one row.
              "-mx-2 flex items-baseline gap-3 rounded-row px-2 py-0.5",
              !r.label && "pl-6 -indent-4",
              size === "body" ? "text-body" : "text-ui",
              on && "bg-sunken",
            )}
          >
            {r.label && <span className="w-16 shrink-0 text-label text-text-3">{r.label}</span>}
            <Form forms={r.forms} />
          </li>
        );
      })}
    </ul>
  );
}

/** Reads `text` aloud in French; nothing where the browser has no French voice. */
export function Listen({ text, className }: { text: string; className?: string }) {
  const canSpeak = useCanSpeakFrench();
  if (!canSpeak) return null;
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={`Listen to “${text}”`}
            onClick={() => speakFrench(text)}
            className={className}
          />
        }
      >
        <Volume2Icon />
      </TooltipTrigger>
      <TooltipContent>Listen</TooltipContent>
    </Tooltip>
  );
}

/** The infinitive, its meaning, and its facts. */
export function VerbHeader({ verb, facts = true }: { verb: Verb; facts?: boolean }) {
  return (
    <div>
      <div className="flex items-start justify-between gap-2">
        <p lang="fr" className="font-serif text-title">
          {infinitive(verb)}
        </p>
        <Listen text={infinitive(verb)} className="-my-0.5 -mr-1.5" />
      </div>
      <p className="text-ui text-text-2">{verb.meaning}</p>
      {facts && (
        <p className="mt-1 text-label text-text-3">
          {verb.group} · <span lang="fr">{verb.aux}</span>
        </p>
      )}
    </div>
  );
}

export function isMac() {
  return typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
}

export function Shortcut() {
  return (
    <KbdGroup>
      <Kbd>{isMac() ? "⌘" : "Ctrl"}</Kbd>
      <Kbd>K</Kbd>
    </KbdGroup>
  );
}

/** ⌘K on Mac, Ctrl+K elsewhere. */
export function useHotkey(onPress: () => void) {
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== "k" || e.shiftKey || e.altKey) return;
      if (!(isMac() ? e.metaKey : e.ctrlKey)) return;
      e.preventDefault();
      onPress();
    };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  });
}

type Render = (found: Identified, query: string) => React.ReactNode;

/**
 * The essay with the dictionary beside it (or in a sheet on narrow windows),
 * as the writing screen has it. `children` draws a found verb.
 */
export function DictionaryShell({ children }: { children: Render }) {
  const { focusEssay } = useProto();
  const wide = useWide();
  const [open, setOpen] = useState(true);
  const [sheet, setSheet] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);

  function show(next: boolean) {
    setOpen(next);
    requestAnimationFrame(() => (next ? input : toggle).current?.focus());
  }

  useHotkey(() => {
    if (wide === false) return setSheet((o) => !o);
    if (!open) show(true);
    else if (document.activeElement === input.current) focusEssay();
    else input.current?.focus();
  });

  const beside = wide && (
    // Fills the column's height so the sticky part follows the writer down the essay.
    <div className="absolute top-0 right-full bottom-0 w-64 pr-6">
      <div className="sticky top-20 mt-12">
        {open ? (
          <section aria-label="Dictionary" className="flex max-h-[calc(100dvh-8rem)] flex-col">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="eyebrow text-text-3">Dictionary</h2>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button variant="ghost" size="icon-xs" aria-label="Hide dictionary" onClick={() => show(false)} className="-mr-1.5" />
                  }
                >
                  <XIcon />
                </TooltipTrigger>
                <TooltipContent>Hide</TooltipContent>
              </Tooltip>
            </div>
            <Lookup inputRef={input} onEscape={focusEssay} render={children} />
          </section>
        ) : (
          <Button ref={toggle} variant="ghost" size="sm" onClick={() => show(true)} className="-ml-3">
            <BookOpenTextIcon data-icon="inline-start" />
            Dictionary
            <span className="ml-1">
              <Shortcut />
            </span>
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <>
      <ProtoAppBar
        lead={
          wide === false && (
            <Button variant="ghost" size="icon-sm" aria-label="Dictionary" onClick={() => setSheet(true)} className="-ml-2">
              <BookOpenTextIcon />
            </Button>
          )
        }
      />
      <Essay beside={beside} />
      {wide === false && (
        <Sheet open={sheet} onOpenChange={setSheet}>
          <SheetContent
            side="left"
            initialFocus={input}
            finalFocus={() => {
              focusEssay();
              return false;
            }}
            className="gap-0"
          >
            <SheetHeader className="pr-12">
              <SheetTitle>Dictionary</SheetTitle>
            </SheetHeader>
            <Lookup inputRef={input} render={children} className="px-4 pb-4" />
          </SheetContent>
        </Sheet>
      )}
    </>
  );
}

function Lookup({
  inputRef,
  onEscape,
  render,
  className,
}: {
  inputRef: React.RefObject<HTMLInputElement | null>;
  onEscape?: () => void;
  render: Render;
  className?: string;
}) {
  const { query, setQuery } = useProto();
  const id = useId();
  const term = query.trim();
  const found = resolve(term);

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", className)}>
      <form role="search" className="shrink-0" onSubmit={(e) => e.preventDefault()}>
        <label htmlFor={id} className="sr-only">
          Look up a word
        </label>
        <Input
          ref={inputRef}
          id={id}
          type="text"
          enterKeyHint="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape" && onEscape) {
              e.preventDefault();
              onEscape();
            }
          }}
          placeholder="Look up…"
          lang="fr"
          autoComplete="off"
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="off"
          data-1p-ignore
          data-lpignore="true"
        />
      </form>
      <div className="-mx-2 min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pt-4 pb-6">
        {!term ? (
          <Recent onPick={(w) => setQuery(w)} />
        ) : found ? (
          render(found, term)
        ) : (
          <p className="px-1 text-ui text-text-3">
            No verb “<span lang="fr">{term}</span>” in the sample
          </p>
        )}
      </div>
    </div>
  );
}

function Recent({ onPick }: { onPick: (w: string) => void }) {
  return (
    <div className="px-1">
      <h3 className="eyebrow text-text-3">Recent</h3>
      <ul className="mt-2 grid gap-0.5">
        {VERBS.map((v) => (
          <li key={v.inf}>
            <button
              type="button"
              lang="fr"
              onClick={() => onPick(label(v))}
              className="-mx-2 w-[calc(100%+1rem)] rounded-row px-2 py-1.5 text-left text-ui text-text-2 transition-colors duration-150 hover:bg-sunken hover:text-text"
            >
              {label(v)}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The persons a looked-up form points at in `tense`, if it was typed as a form. */
export function personsFor(found: Identified, tense: TenseId) {
  return found.readings.find((r) => r.tense === tense)?.persons ?? [];
}

export { plain };
