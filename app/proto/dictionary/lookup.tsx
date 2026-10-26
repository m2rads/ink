"use client";

import { useEffect, useId, useState } from "react";

import { Input } from "@/components/ui/input";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { cn } from "@/lib/utils";

import { CollinsResult } from "./collins";
import { language, search, type Direction, type Hit, type Language } from "./data";
import { useProto } from "./harness";

// Throwaway: /proto/dictionary. The lookup itself, shared by every variant:
// what changes between variants is how the learner's language and the
// direction of the lookup are set.

/** How long typing has to pause before a search runs. */
const DEBOUNCE_MS = 250;

/** ⌘K on Mac, Ctrl+K elsewhere, from anywhere on the page. */
export function useLookupHotkey(onPress: () => void) {
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

function isMac() {
  return typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
}

// The harness renders only after mounting, so navigator is there.
export function ShortcutHint() {
  const mac = isMac();
  return (
    <KbdGroup>
      <Kbd>{mac ? "⌘" : "Ctrl"}</Kbd>
      <Kbd>K</Kbd>
    </KbdGroup>
  );
}

/** `value`, once it has stopped changing for `ms`. */
function useDebounced<T>(value: T, ms: number) {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setSettled(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return settled;
}

export function Lookup({
  inputRef,
  source = "sample",
  direction = "auto",
  placeholder = "trajet, commute…",
  label = "Look up a word",
  showVia = false,
  start,
  onEscape,
  className,
}: {
  inputRef: React.RefObject<HTMLInputElement | null>;
  /** sample: the hand-written entries in data.ts. collins: the real API, through our route. */
  source?: "sample" | "collins";
  direction?: Direction;
  placeholder?: string;
  label?: string;
  /** Tag each result with the side it matched on (auto direction). */
  showVia?: boolean;
  /** Replaces the empty state (before anything is typed). */
  start?: React.ReactNode;
  onEscape?: () => void;
  className?: string;
}) {
  const { query, setQuery, recent, remember, lang: code } = useProto();
  const lang = language(code);
  const id = useId();
  // Searches run on the settled text, never per keystroke. Clearing the field
  // shows the empty state at once.
  const settled = useDebounced(query, DEBOUNCE_MS);
  const term = query.trim() ? settled.trim() : "";
  const collins = source === "collins";
  const hits = collins ? [] : search(term, lang, direction);
  const pending = query.trim() !== term;

  // A word counts as looked up once the reader stops on it.
  useEffect(() => {
    if (collins || !hits.length) return;
    const t = setTimeout(() => remember(term), 900);
    return () => clearTimeout(t);
  }, [collins, term, hits.length, remember]);

  return (
    <div className={cn("flex min-h-0 flex-col", className)}>
      <form
        role="search"
        className="shrink-0"
        onSubmit={(e) => {
          e.preventDefault();
          setQuery(query);
        }}
      >
        <label htmlFor={id} className="sr-only">
          {label}
        </label>
        <Input
          ref={inputRef}
          id={id}
          // Not type="search": its first Escape only clears the text, so closing took two.
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
          placeholder={placeholder}
          lang={direction === "from-fr" ? "fr" : direction === "to-fr" ? lang.code : undefined}
          dir="auto"
          autoComplete="off"
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="off"
          data-1p-ignore
          data-lpignore="true"
        />
      </form>

      <div
        className={cn(
          "min-h-0 flex-1 overflow-y-auto overscroll-contain transition-opacity duration-150",
          pending && "opacity-60",
        )}
      >
        <p className="sr-only" aria-live="polite">
          {term && !collins ? `${hits.length} ${hits.length === 1 ? "entry" : "entries"}` : ""}
        </p>
        {collins && lang.code !== "en" && (
          <p className="mt-3 rounded-row bg-sunken px-2.5 py-2 text-label text-text-2">
            Collins covers English and French only, so meanings are in English.
          </p>
        )}
        {!query.trim() ? (
          (start ?? <Start recent={recent} onPick={setQuery} />)
        ) : !term ? null : collins ? (
          <CollinsResult
            term={term}
            direction={direction === "from-fr" ? "from-fr" : "to-fr"}
            onPick={setQuery}
            onFound={remember}
          />
        ) : hits.length === 0 ? (
          <p className="px-1 py-6 text-ui text-text-3">
            Nothing for “<span dir="auto">{term}</span>”. Try the word’s base form.
          </p>
        ) : (
          <>
            {!lang.glosses && (
              <p className="mt-3 rounded-row bg-sunken px-2.5 py-2 text-label text-text-2">
                This prototype has no {lang.name} meanings yet, so these are in English.
              </p>
            )}
            <div className="divide-y">
              {hits.map((h) => (
                <EntryView key={h.entry.word} hit={h} lang={lang} showVia={showVia} className="py-4 first:pt-3" />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Start({ recent, onPick }: { recent: string[]; onPick: (w: string) => void }) {
  if (!recent.length) {
    return (
      <p className="mt-2 flex items-center gap-2 px-1 py-2 text-label text-text-3">
        <ShortcutHint /> from anywhere
      </p>
    );
  }
  return (
    <div className="px-1 py-4">
      <h3 className="eyebrow text-text-3">Recent</h3>
      <ul className="mt-2 grid gap-0.5">
        {recent.map((w) => (
          <li key={w}>
            <button
              type="button"
              dir="auto"
              onClick={() => onPick(w)}
              className="-mx-2 w-[calc(100%+1rem)] rounded-row px-2 py-1.5 text-left font-serif text-ui text-text-2 transition-colors duration-150 hover:bg-sunken hover:text-text"
            >
              {w}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function EntryView({
  hit: { entry: e, via },
  lang,
  showVia,
  className,
}: {
  hit: Hit;
  lang: Language;
  showVia: boolean;
  className?: string;
}) {
  const many = e.senses.length > 1;
  const glosses = lang.glosses ?? "en";
  return (
    <article className={cn("px-1", className)}>
      <h3 lang="fr" className="font-serif text-title text-balance">
        {e.word}
      </h3>
      <p className="mt-0.5 text-label text-text-3">
        {e.kind}
        {e.forms && <> · {e.forms}</>}
        {showVia && via === "own" && <> · from {lang.name}</>}
      </p>
      <ol className="mt-3 grid gap-3">
        {e.senses.map((s, i) => (
          <li key={i} className={cn(many && "grid grid-cols-[auto_1fr] gap-x-2")}>
            {many && <span className="text-label text-text-3 tabular-nums">{i + 1}</span>}
            <div>
              <p lang={glosses} className="text-ui text-text">
                {s[glosses]}
              </p>
              {s.fr && (
                <p lang="fr" className="mt-1 font-serif text-ui text-text-2 italic">
                  {s.fr}
                </p>
              )}
              {glosses === "en" && s.enEx && <p className="text-label text-text-3">{s.enEx}</p>}
            </div>
          </li>
        ))}
      </ol>
      {e.note && <p className="mt-3 rounded-row bg-sunken px-2.5 py-2 text-label text-text-2">{e.note}</p>}
    </article>
  );
}
