"use client";

import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
import { ArrowRightLeftIcon, BookOpenTextIcon, ChevronDownIcon, LanguagesIcon, XIcon } from "lucide-react";
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { LANGUAGE_CODES, LANGUAGES, language, type LanguageCode } from "@/lib/languages";
import { createLocalStore } from "@/lib/local-store";
import { cn } from "@/lib/utils";

import { lookUp } from "./actions";
import { SELECTION_UI, selectionAnchor, useSelection, type Selected } from "./selection";

// The dictionary, as decided in AGENTS.md (Dictionary): it lives in the
// empty space left of the essay, the mirror of the review's notes on the
// right, and the essay never moves for it. Hidden, it folds to one quiet
// button in the same spot. ⌘K (Ctrl+K) opens it or focuses its field;
// Escape goes back to the essay. Without room beside the essay (about
// 1312px of window), the same lookup opens in a sheet from the left, from
// the app bar's book.
//
//   <Dictionary enabled={!mock}>
//     <AppBar>… <Dictionary.Trigger /> …</AppBar>
//     <main className="relative …"><Dictionary.Margin />…</main>
//   </Dictionary>
//
// The language is a Pair: [your language ▾] ⇄ Français, source on the left.
// Lookups wait for a pause in typing, and each one is a single translation
// from Google Translate (lookUp in actions.ts) until a dictionary source is
// licensed.
//
// Selecting French in the essay offers the same lookup in place (AGENTS.md,
// Selection lookup): a "Translate ⌘K" pill above the selection that grows
// into its meaning when clicked. With words selected, ⌘K translates them
// instead of opening the panel.

const WIDE = "(min-width: 1312px)";
const DEBOUNCE_MS = 300;
const RECENT_MAX = 6;

type Direction = "to-fr" | "from-fr";
type Settings = { lang: LanguageCode; direction: Direction; open: boolean; recent: string[] };

const DEFAULTS: Settings = { lang: "en", direction: "to-fr", open: true, recent: [] };

const settingsStore = createLocalStore<Settings>({
  prefix: "ink:dictionary",
  parse,
  serialize: (s) => JSON.stringify(s),
  fallback: () => DEFAULTS,
  saveDelayMs: 0,
});

function parse(raw: string | null): Settings | null {
  if (!raw) return null;
  try {
    const s = JSON.parse(raw) as Partial<Settings>;
    return {
      lang: LANGUAGE_CODES.includes(s.lang as LanguageCode) ? (s.lang as LanguageCode) : DEFAULTS.lang,
      direction: s.direction === "from-fr" ? "from-fr" : "to-fr",
      open: s.open !== false,
      recent: Array.isArray(s.recent) ? s.recent.filter((w) => typeof w === "string").slice(0, RECENT_MAX) : [],
    };
  } catch {
    return null;
  }
}

type DictionaryContext = {
  enabled: boolean;
  /** null until the client knows the window's width. */
  wide: boolean | null;
  settings: Settings | null;
  update: (patch: Partial<Settings>) => void;
  query: string;
  setQuery: (q: string) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  /** Open or hide the margin panel, moving focus with it. */
  show: (open: boolean) => void;
  sheetOpen: boolean;
  setSheetOpen: (open: boolean) => void;
  /** The panel was opened or hidden by the user: only then does it animate. */
  moved: boolean;
  focusEssay: () => void;
};

const Context = createContext<DictionaryContext | null>(null);

function useDictionary() {
  const ctx = use(Context);
  if (!ctx) throw new Error("Dictionary parts must be inside <Dictionary>");
  return ctx;
}

function subscribeWide(onChange: () => void) {
  const mq = matchMedia(WIDE);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function DictionaryRoot({ enabled = true, children }: { enabled?: boolean; children: React.ReactNode }) {
  const [settings, setSettings] = settingsStore.useValue("settings");
  const wide = useSyncExternalStore(
    subscribeWide,
    () => matchMedia(WIDE).matches,
    () => null,
  );
  const [query, setQuery] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [moved, setMoved] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const toggleRef = useRef<HTMLButtonElement | null>(null);
  const lastField = useRef<HTMLTextAreaElement | null>(null);
  const { selected, readNow, dismiss } = useSelection(enabled);
  const [asked, setAsked] = useState<Selected | null>(null);

  // Where the writer was, so Escape and ⌘K can take them back.
  useEffect(() => {
    const track = (e: FocusEvent) => {
      const t = e.target;
      if (t instanceof HTMLTextAreaElement && !t.closest("[data-dictionary]")) lastField.current = t;
    };
    document.addEventListener("focusin", track);
    return () => document.removeEventListener("focusin", track);
  }, []);

  const focusEssay = useCallback(() => {
    const el = lastField.current?.isConnected ? lastField.current : document.querySelector<HTMLTextAreaElement>("main textarea");
    el?.focus();
  }, []);

  const update = useCallback(
    (patch: Partial<Settings>) => setSettings({ ...settingsStore.read("settings"), ...patch }),
    [setSettings],
  );

  const show = useCallback(
    (open: boolean) => {
      setMoved(true);
      update({ open });
      requestAnimationFrame(() => (open ? inputRef.current : toggleRef.current)?.focus());
    },
    [update],
  );

  useEffect(() => {
    if (!enabled) return;
    const down = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== "k" || e.shiftKey || e.altKey) return;
      if (!(isMac() ? e.metaKey : e.ctrlKey)) return;
      e.preventDefault();
      const now = readNow();
      if (now) setAsked(now);
      else if (!wide) setSheetOpen((o) => !o);
      else if (!settingsStore.read("settings").open) show(true);
      else if (document.activeElement === inputRef.current) focusEssay();
      else inputRef.current?.focus();
    };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, [enabled, wide, show, focusEssay, readNow]);

  return (
    <Context
      value={{
        enabled,
        wide,
        settings,
        update,
        query,
        setQuery,
        inputRef,
        show,
        sheetOpen,
        setSheetOpen,
        moved,
        focusEssay,
      }}
    >
      <ToggleRef.Provider value={toggleRef}>{children}</ToggleRef.Provider>
      {enabled && wide === false && <DictionarySheet />}
      {enabled && (
        <SelectionLookup
          selected={selected}
          asked={sameSelection(asked, selected)}
          onAsk={setAsked}
          onDismiss={dismiss}
        />
      )}
    </Context>
  );
}

// The folded button's ref lives apart, so hiding can return focus to it.
const ToggleRef = createContext<React.RefObject<HTMLButtonElement | null> | null>(null);

/** In the essay's column (positioned `relative`): fills the space to its left. */
function Margin() {
  const { enabled, wide, settings, show, moved } = useDictionary();
  const toggleRef = use(ToggleRef);
  if (!enabled || !wide || !settings) return null;

  const enter = moved && "transition-[opacity,translate] duration-200 ease-out starting:-translate-x-1 starting:opacity-0";

  return (
    // Fills the column's height so the sticky part follows the writer down the essay.
    <div className="absolute top-0 right-full bottom-0 w-64 pr-6">
      <div className="sticky top-20 mt-12">
        {settings.open ? (
          <section
            data-dictionary=""
            aria-label="Dictionary"
            className={cn("flex max-h-[calc(100dvh-8rem)] flex-col", enter)}
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="eyebrow text-text-3">Dictionary</h2>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-label="Hide dictionary"
                      onClick={() => show(false)}
                      className="-mr-1.5"
                    />
                  }
                >
                  <XIcon />
                </TooltipTrigger>
                <TooltipContent>Hide</TooltipContent>
              </Tooltip>
            </div>
            <Lookup />
          </section>
        ) : (
          <Button ref={toggleRef} variant="ghost" size="sm" onClick={() => show(true)} className={cn("-ml-3", enter || undefined)}>
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
}

/** For the app bar: opens the sheet when there's no room beside the essay. */
function Trigger({ className }: { className?: string }) {
  const { enabled, wide, setSheetOpen } = useDictionary();
  if (!enabled || wide !== false) return null;
  return (
    <Button variant="ghost" size="icon-sm" aria-label="Dictionary" onClick={() => setSheetOpen(true)} className={className}>
      <BookOpenTextIcon />
    </Button>
  );
}

function DictionarySheet() {
  const { sheetOpen, setSheetOpen, inputRef, focusEssay } = useDictionary();
  return (
    <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
      <SheetContent
        side="left"
        data-dictionary=""
        initialFocus={inputRef}
        finalFocus={() => {
          focusEssay();
          return false;
        }}
        className="gap-0"
      >
        <SheetHeader className="pr-12">
          <SheetTitle>Dictionary</SheetTitle>
        </SheetHeader>
        <Lookup className="px-4 pb-4" />
      </SheetContent>
    </Sheet>
  );
}

/** The language pair, the field and the result: the same in the margin and the sheet. */
function Lookup({ className }: { className?: string }) {
  const { settings, update, query, setQuery, inputRef, focusEssay } = useDictionary();
  const id = useId();
  const settled = useDebounced(query, DEBOUNCE_MS);
  if (!settings) return null;

  const lang = language(settings.lang);
  const toFrench = settings.direction === "to-fr";
  // Clearing the field shows the start state at once.
  const term = query.trim() ? settled.trim() : "";

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", className)}>
      <Pair />
      <form
        role="search"
        className="mt-3 shrink-0"
        onSubmit={(e) => e.preventDefault()}
      >
        <label htmlFor={id} className="sr-only">
          {toFrench ? `Translate from ${lang.name} into French` : `Translate from French into ${lang.name}`}
        </label>
        <Input
          ref={inputRef}
          id={id}
          // Not type="search": its first Escape only clears the text.
          type="text"
          enterKeyHint="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              focusEssay();
            }
          }}
          placeholder="Look up…"
          lang={toFrench ? lang.code : "fr"}
          dir="auto"
          maxLength={100}
          autoComplete="off"
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="off"
          data-1p-ignore
          data-lpignore="true"
        />
      </form>
      {/* The recent rows' hover reaches 8px past the field on each side; this
          padding (cancelled by the margin) keeps that inside the scroller, so
          it never scrolls sideways. */}
      <div className="-mx-2 min-h-0 flex-1 overflow-y-auto overscroll-contain px-2">
        {!query.trim() ? (
          <Start
            recent={settings.recent}
            onPick={(w) => {
              setQuery(w);
              inputRef.current?.focus();
            }}
          />
        ) : term ? (
          <Result
            key={`${settings.lang}:${settings.direction}:${term}`}
            term={term}
            lang={settings.lang}
            direction={settings.direction}
            onFound={(w) => update({ recent: [w, ...settings.recent.filter((r) => r !== w)].slice(0, RECENT_MAX) })}
          />
        ) : null}
      </div>
    </div>
  );
}

/** [your language ▾] ⇄ Français, the side you type in on the left. */
function Pair() {
  const { settings, update } = useDictionary();
  if (!settings) return null;
  const lang = language(settings.lang);
  const toFrench = settings.direction === "to-fr";

  const own = (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="xs" aria-label={`Your language: ${lang.name}`} className="-mx-1 min-w-0">
            <span lang={lang.code} dir={lang.rtl ? "rtl" : "ltr"}>
              {lang.native}
            </span>
            <ChevronDownIcon data-icon="inline-end" />
          </Button>
        }
      />
      <DropdownMenuContent className="w-72">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Your language</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={settings.lang} onValueChange={(v) => update({ lang: v as LanguageCode })}>
            {LANGUAGES.map((l) => (
              <DropdownMenuRadioItem key={l.code} value={l.code}>
                <span lang={l.code} dir={"rtl" in l ? "rtl" : "ltr"} className="whitespace-nowrap">
                  {l.native}
                </span>
                {"hint" in l && <span className="ml-auto whitespace-nowrap text-text-3">{l.name}</span>}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
  const french = (
    <span lang="fr" className="px-1.5 text-label font-medium text-text-2">
      Français
    </span>
  );

  return (
    <div className="flex items-center gap-1 text-label">
      {toFrench ? own : french}
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={toFrench ? "Translate from French instead" : `Translate from ${lang.name} instead`}
              onClick={() => update({ direction: toFrench ? "from-fr" : "to-fr" })}
            />
          }
        >
          <ArrowRightLeftIcon />
        </TooltipTrigger>
        <TooltipContent>Swap</TooltipContent>
      </Tooltip>
      {toFrench ? french : own}
    </div>
  );
}

function Start({ recent, onPick }: { recent: string[]; onPick: (word: string) => void }) {
  if (!recent.length) {
    return (
      <p className="flex items-center gap-2 px-1 py-4 text-label text-text-3">
        <Shortcut /> from anywhere
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
              className="-mx-2 w-[calc(100%+1rem)] rounded-row px-2 py-1.5 text-left text-ui text-text-2 transition-colors duration-150 hover:bg-sunken hover:text-text"
            >
              {w}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

type Answer = { ok: true; translation: string } | { ok: false };

/** Answers fetched this session, so going back to a word doesn't ask again. */
const answers = new Map<string, Answer>();

function Result({
  term,
  lang,
  direction,
  onFound,
}: {
  term: string;
  lang: LanguageCode;
  direction: Direction;
  onFound: (word: string) => void;
}) {
  const { answer, retry } = useAnswer(term, lang, direction);

  const found = answer?.ok === true && !sameWord(answer.translation, term);
  // A word counts as looked up once the writer stops on its answer.
  useEffect(() => {
    if (!found) return;
    const t = setTimeout(() => onFound(term), 900);
    return () => clearTimeout(t);
    // onFound changes every render; the word is what matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [found, term]);

  const target = direction === "to-fr" ? "fr" : lang;

  return (
    <div className="px-1 py-4" aria-live="polite">
      {!answer ? (
        <p className="text-label text-text-3">Translating…</p>
      ) : !answer.ok ? (
        <p className="text-label text-text-2">
          Couldn’t translate “<span dir="auto">{term}</span>”.{" "}
          <button
            type="button"
            onClick={retry}
            className="relative text-text underline decoration-border-strong underline-offset-4 transition-colors duration-150 before:absolute before:-inset-x-1 before:-inset-y-2 hover:decoration-current"
          >
            Try again
          </button>
        </p>
      ) : !found ? (
        <p className="text-ui text-text-3">
          No translation for “<span dir="auto">{term}</span>”. Check the spelling, or swap the languages.
        </p>
      ) : (
        <p lang={target} dir="auto" className={cn("text-title text-balance", target === "fr" && "font-serif")}>
          {answer.translation}
        </p>
      )}
    </div>
  );
}

/** The answer for `term`, from this session's answers or a lookup. Key the caller by term. */
function useAnswer(term: string, lang: LanguageCode, direction: Direction) {
  const key = `${lang}:${direction}:${term.toLocaleLowerCase("fr")}`;
  const [answer, setAnswer] = useState<Answer | undefined>(() => answers.get(key));
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (answers.has(key)) return;
    let current = true;
    lookUp({ text: term, lang, direction }).then(
      ({ translation }) => {
        const next: Answer = { ok: true, translation };
        answers.set(key, next);
        if (current) setAnswer(next);
      },
      (error: unknown) => {
        console.error(error);
        if (current) setAnswer({ ok: false });
      },
    );
    return () => {
      current = false;
    };
  }, [key, term, lang, direction, attempt]);

  return {
    answer,
    retry() {
      setAnswer(undefined);
      setAttempt((n) => n + 1);
    },
  };
}

const sameSelection = (a: Selected | null, b: Selected | null) =>
  !!a && !!b && a.el === b.el && a.start === b.start && a.end === b.end;

/**
 * Above French selected in the essay: a "Translate ⌘K" pill that grows into
 * the selection's meaning when asked. It never takes focus, so typing still
 * replaces the selection; Escape or a click elsewhere closes it. On touch
 * screens it sits below, out of the way of the system's copy/paste menu.
 */
function SelectionLookup({
  selected,
  asked,
  onAsk,
  onDismiss,
}: {
  selected: Selected | null;
  asked: boolean;
  onAsk: (s: Selected) => void;
  onDismiss: () => void;
}) {
  const { settings } = useDictionary();
  // What was last shown, so the popover keeps its words and place while it fades out.
  const [held, setHeld] = useState<{ selected: Selected; asked: boolean } | null>(null);
  if (selected && (held?.selected !== selected || held.asked !== asked)) setHeld({ selected, asked });
  if (!settings) return null;

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
            aria-label="Translate the selection"
            initialFocus={false}
            finalFocus={false}
            // Pressing inside keeps the caret and the selection in the essay.
            onPointerDown={(e) => e.preventDefault()}
            className={cn(
              "origin-(--transform-origin) bg-raised text-text shadow-overlay outline-hidden transition-[opacity,scale] duration-150 ease-out data-starting-style:scale-95 data-starting-style:opacity-0 data-ending-style:scale-95 data-ending-style:opacity-0 data-ending-style:duration-100 data-ending-style:ease-in",
              held?.asked ? "grid w-max max-w-72 gap-1 rounded-card px-3 py-2.5" : "rounded-full p-0.5",
            )}
          >
            {held &&
              (held.asked ? (
                <>
                  <p lang="fr" className="font-serif text-label text-text-3 italic">
                    {held.selected.term}
                  </p>
                  <SelectionMeaning key={`${settings.lang}:${held.selected.term}`} term={held.selected.term} lang={settings.lang} />
                </>
              ) : (
                <Button variant="ghost" size="xs" onClick={() => onAsk(held.selected)}>
                  <LanguagesIcon data-icon="inline-start" />
                  Translate
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

/** The selection's meaning in the writer's language; a placeholder line holds its place while it loads. */
function SelectionMeaning({ term, lang }: { term: string; lang: LanguageCode }) {
  const { answer, retry } = useAnswer(term, lang, "from-fr");
  return (
    <div aria-live="polite" className="min-h-[1lh] text-body">
      {!answer ? (
        <Skeleton className="mt-[0.3lh] h-[0.55lh] w-32" />
      ) : !answer.ok ? (
        <p className="text-ui text-text-2">
          Couldn’t translate.{" "}
          <button
            type="button"
            onClick={retry}
            className="relative text-text underline decoration-border-strong underline-offset-4 transition-colors duration-150 before:absolute before:-inset-x-1 before:-inset-y-2 hover:decoration-current"
          >
            Try again
          </button>
        </p>
      ) : sameWord(answer.translation, term) ? (
        <p className="text-ui text-text-3">No translation. Check the spelling</p>
      ) : (
        <p lang={lang} dir="auto" className="font-medium text-balance">
          {answer.translation}
        </p>
      )}
    </div>
  );
}

/** Google gives an unknown word back unchanged. */
function sameWord(a: string, b: string) {
  const fold = (s: string) => s.normalize("NFC").toLocaleLowerCase("fr").trim();
  return fold(a) === fold(b);
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

function isMac() {
  return typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
}

/** ⌘K, or Ctrl+K off the Mac. Rendered only on the client (the margin waits for the window's width). */
function Shortcut() {
  return (
    <KbdGroup>
      <Kbd>{isMac() ? "⌘" : "Ctrl"}</Kbd>
      <Kbd>K</Kbd>
    </KbdGroup>
  );
}

export const Dictionary = Object.assign(DictionaryRoot, { Margin, Trigger });
