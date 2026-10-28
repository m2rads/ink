"use client";

import { createContext, use, useEffect, useRef, useState } from "react";

import { Kbd } from "@/components/ui/kbd";
import { Popover, PopoverContent } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import type { AskReport, Suggestion } from "@/lib/ai/ask";
import { cn } from "@/lib/utils";

import { askFrench } from "./actions";
import { insertText, type Block, type Caret } from "./blocks";
import { caretTop, caretX, rangeRects } from "./caret";

// The essay's slash command (AGENTS.md, Ask): "/" typed at the start of a
// word, then what the writer wants to say (English, a question, unsure
// French); Enter asks, and a menu above the line lists French that fits
// the sentence. ↑/↓ choose, Enter (or a click) puts it in place of the
// command, Escape closes and leaves what was typed. A space right after the
// "/" makes it plain text; so does the caret leaving the command.
//
// Wired to the editor from outside it (native listeners on its root, capture
// phase, so Enter and the arrows never reach the editor while the menu is
// up). The command's halo and the "Type / to ask…" hint are drawn in
// the editor's underlay (AskLayer), so they follow the text.

type Session = { el: HTMLTextAreaElement; blockId: string; start: number };
type Status = "typing" | "loading" | "done" | "failed";

type AskValue = {
  session: Session | null;
  query: string;
  status: Status;
  answer: AskReport | null;
  active: number;
  setActive: (i: number) => void;
  pick: (i: number) => void;
  close: () => void;
  /** Where the caret sits while it's collapsed in the essay, for the hint. */
  caret: Caret | null;
  /** The essay has no text yet: its own placeholder speaks instead of the hint. */
  empty: boolean;
};

const AskContext = createContext<AskValue | null>(null);

function useAskContext() {
  const ctx = use(AskContext);
  if (!ctx) throw new Error("Ask parts must be inside <Ask>");
  return ctx;
}

/** The slash command around the editor whose root has id `root`. */
export function Ask({
  root,
  blocks,
  onChange,
  children,
}: {
  root: string;
  blocks: Block[];
  onChange: (next: Block[], caret: Caret) => void;
  children: React.ReactNode;
}) {
  const [session, setSession] = useState<Session | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<Status>("typing");
  const [answer, setAnswer] = useState<AskReport | null>(null);
  const [active, setActive] = useState(0);
  const [caret, setCaret] = useState<Caret | null>(null);
  const run = useRef(0);

  // Native listeners read the latest state through this.
  const live = useRef({ session, query, status, answer, active, blocks, onChange });
  useEffect(() => {
    live.current = { session, query, status, answer, active, blocks, onChange };
  });

  function close() {
    run.current++;
    setSession(null);
    setQuery("");
    setStatus("typing");
    setAnswer(null);
    setActive(0);
  }

  async function ask() {
    const { session: s, query: q, blocks: now } = live.current;
    if (!s || !q.trim()) return;
    const id = ++run.current;
    setStatus("loading");
    const text = now.find((b) => b.id === s.blockId)?.text ?? "";
    try {
      const result = await askFrench({ query: q, before: text.slice(0, s.start), after: text.slice(s.start + 1 + q.length) });
      if (id !== run.current) return;
      setAnswer(result);
      setActive(0);
      setStatus("done");
    } catch (error) {
      console.error(error);
      if (id === run.current) setStatus("failed");
    }
  }

  function pick(i: number) {
    const { session: s, answer: a, query: q, blocks: now, onChange: change } = live.current;
    const choice = a?.suggestions[i];
    if (!s || !choice) return;
    const edit = insertText(now, s.blockId, s.start, s.start + 1 + q.length, choice.fr);
    change(edit.blocks, edit.caret);
    close();
    requestAnimationFrame(() => {
      s.el.focus({ preventScroll: true });
      s.el.setSelectionRange(edit.caret.offset, edit.caret.offset);
    });
  }

  useEffect(() => {
    const el = document.getElementById(root);
    if (!el) return;

    const blockOf = (t: EventTarget | null) => {
      if (!(t instanceof HTMLTextAreaElement)) return null;
      const id = t.closest<HTMLElement>("[data-wrapper]")?.dataset.wrapper;
      return id ? { el: t, blockId: id } : null;
    };
    const atWordStart = (t: HTMLTextAreaElement, at: number) => at === 0 || /\s/.test(t.value[at - 1]);

    const onInput = (e: Event) => {
      const at = blockOf(e.target);
      if (!at) return;
      const s = live.current.session;
      const caretAt = at.el.selectionStart;
      if (!s) {
        // A "/" at the start of a word in what was just inserted (typed, or pasted).
        const data = (e as InputEvent).data ?? "";
        const from = caretAt - data.length;
        const i = [...data].findIndex((ch, k) => ch === "/" && atWordStart(at.el, from + k));
        if (i < 0) return;
        const q = at.el.value.slice(from + i + 1, caretAt);
        if (/^\s/.test(q)) return;
        setSession({ ...at, start: from + i });
        setQuery(q);
        return;
      }
      const v = at.el.value;
      const q = v.slice(s.start + 1, caretAt);
      // Gone, moved away, or a space right after the "/": it's text now.
      if (at.blockId !== s.blockId || v[s.start] !== "/" || caretAt <= s.start || /^\s/.test(q) || q.includes("\n") || q.length > 200) {
        return close();
      }
      setQuery(q);
      // Editing the query drops an answer on its way; Enter asks again.
      if (live.current.status === "loading") run.current++;
      setStatus("typing");
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const at = blockOf(e.target);
      const { session: s, status: st, answer: a, active: i, query: q } = live.current;
      if (!s || !at) return;
      const plain = !e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey;
      const stop = () => {
        e.preventDefault();
        e.stopPropagation();
      };
      const count = a?.suggestions.length ?? 0;

      if (e.key === "Escape") {
        stop();
        close();
      } else if (e.key === "Enter" && plain) {
        // A bare "/" asks nothing: Enter does what it always does.
        if (!q.trim()) return close();
        stop();
        if (st === "done" && count > 0) pick(i);
        else if (st !== "loading") void ask();
      } else if (st === "done" && count > 0 && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
        stop();
        setActive((i + (e.key === "ArrowUp" ? count - 1 : 1)) % count);
      }
    };

    // The caret leaving the command (a click, ←/→/Home/End past it) ends it.
    const onCaret = (e: Event) => {
      if (e instanceof KeyboardEvent && !["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
      const at = blockOf(e.target);
      const { session: s, query: q } = live.current;
      if (!s || !at) return;
      const c = at.el.selectionStart;
      if (at.blockId !== s.blockId || c <= s.start || c > s.start + 1 + q.length) close();
    };
    // So does focus leaving the paragraph for anything but the menu.
    const onFocusOut = (e: FocusEvent) => {
      const { session: s } = live.current;
      if (s && e.target === s.el) {
        const to = e.relatedTarget;
        if (!(to instanceof Element && to.closest("[data-ask-ui]"))) close();
      }
      if (!(e.relatedTarget instanceof Node && el.contains(e.relatedTarget))) setCaret(null);
    };

    // The hint follows a collapsed caret in the essay.
    const onSelection = () => {
      const t = document.activeElement;
      const at = t instanceof HTMLTextAreaElement && el.contains(t) ? blockOf(t) : null;
      const next = at && at.el.selectionStart === at.el.selectionEnd ? { blockId: at.blockId, offset: at.el.selectionStart } : null;
      setCaret((c) => (c?.blockId === next?.blockId && c?.offset === next?.offset ? c : next));
    };

    el.addEventListener("input", onInput);
    el.addEventListener("keydown", onKeyDown, true);
    el.addEventListener("keyup", onCaret);
    el.addEventListener("mouseup", onCaret);
    el.addEventListener("focusout", onFocusOut);
    document.addEventListener("selectionchange", onSelection);
    return () => {
      el.removeEventListener("input", onInput);
      el.removeEventListener("keydown", onKeyDown, true);
      el.removeEventListener("keyup", onCaret);
      el.removeEventListener("mouseup", onCaret);
      el.removeEventListener("focusout", onFocusOut);
      document.removeEventListener("selectionchange", onSelection);
    };
    // The handlers read state through `live`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [root]);

  const value: AskValue = {
    session,
    query,
    status,
    answer,
    active,
    setActive,
    pick,
    close,
    caret,
    empty: !blocks.some((b) => b.text.trim()),
  };

  return (
    <AskContext value={value}>
      {children}
      <Menu />
    </AskContext>
  );
}

/** Where the open command is in `blockId`'s text, if it's there: other layers keep out of it. */
export function useCommandRange(blockId: string): { start: number; end: number } | null {
  const { session, query } = useAskContext();
  return session?.blockId === blockId ? { start: session.start, end: session.start + 1 + query.length } : null;
}

/** On an empty line, where the caret is. */
function onEmptyLine(text: string, offset: number) {
  return (offset === 0 || text[offset - 1] === "\n") && (offset === text.length || text[offset] === "\n");
}

/**
 * For the editor's underlay, over the other layers: a faint halo on the
 * command while it's open, so "/" plus words reads as a command, not text;
 * and, on an empty line with the caret, "Type / to ask how to say something
 * in French".
 */
export function AskLayer({ block }: { block: Block }) {
  const { session, query, caret, empty } = useAskContext();
  const text = block.text;

  if (session?.blockId === block.id) {
    const end = Math.min(text.length, session.start + 1 + query.length);
    return (
      <div aria-hidden className="absolute inset-0">
        {text.slice(0, session.start)}
        <span className="-mx-0.5 rounded-row bg-sunken px-0.5">{text.slice(session.start, end)}</span>
        {text.slice(end)}
      </div>
    );
  }

  if (!session && !empty && caret?.blockId === block.id && onEmptyLine(text, caret.offset)) {
    return (
      <div aria-hidden className="absolute inset-0">
        {text.slice(0, caret.offset)}
        <span className="font-sans text-ui text-text-3">
          Type <Kbd className="mx-0.5 align-[0.1em]">/</Kbd> to ask how to say something in French
        </span>
        {text.slice(caret.offset)}
      </div>
    );
  }
  return null;
}

/** The menu, above the command's line (below when there's no room, the app bar included: DESIGN.md rule 10). */
function Menu() {
  const ask = useAskContext();
  const s = ask.session;
  return (
    <Popover open={!!s} onOpenChange={(open) => !open && ask.close()}>
      <PopoverContent
        data-ask-ui=""
        anchor={s ? anchorFor(s, ask.query) : null}
        side="top"
        align="start"
        sideOffset={6}
        collisionPadding={{ top: 64, right: 16, bottom: 16, left: 16 }}
        initialFocus={false}
        finalFocus={false}
        className="max-h-(--available-height) w-md max-w-[calc(100vw-2rem)] gap-0 overflow-y-auto overscroll-contain p-0"
      >
        <Results />
      </PopoverContent>
    </Popover>
  );
}

function Results() {
  const { status, answer, active, setActive, pick } = useAskContext();
  if (status === "loading" && !answer) return <Loading />;
  if (status === "failed") return <Line>Couldn’t search. Press Enter to try again</Line>;
  if (!answer) return <Line>Search for translation in English or French</Line>;
  if (answer.suggestions.length === 0) return <Line>No suggestions. Try saying it another way</Line>;
  // An answer for an older query stays, dimmed, until the new one arrives.
  const stale = status !== "done";
  return (
    <div className={cn("transition-opacity duration-150", stale && "opacity-45")}>
      {answer.readAs && (
        <p className="px-3 pt-2.5 pb-1 text-caption text-pretty text-text-3">
          <Rich text={answer.readAs} />
        </p>
      )}
      <ul role="listbox" aria-label="French suggestions" className="grid p-1">
        {answer.suggestions.map((s, i) => (
          <li key={s.fr} role="option" aria-selected={i === active}>
            <button
              type="button"
              tabIndex={-1}
              // Keeps the caret in the essay.
              onPointerDown={(e) => e.preventDefault()}
              onMouseMove={() => setActive(i)}
              onClick={() => pick(i)}
              className={cn(
                "grid w-full cursor-pointer gap-0.5 rounded-row px-2.5 py-2 text-start transition-colors duration-100",
                i === active && "bg-sunken",
              )}
            >
              <SuggestionText s={s} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SuggestionText({ s }: { s: Suggestion }) {
  return (
    <>
      <span className="flex items-baseline justify-between gap-3">
        <span lang="fr" className="font-serif text-body text-pretty text-text">
          {s.fr}
        </span>
        {s.tag && (
          <span className="shrink-0 rounded-tight bg-sunken px-1.5 text-caption font-medium text-text-2">{s.tag}</span>
        )}
      </span>
      <span className="text-caption text-pretty text-text-3">
        <Rich text={s.note} />
      </span>
    </>
  );
}

function Line({ children }: { children: React.ReactNode }) {
  return <p className="px-3 py-2.5 text-ui text-text-2">{children}</p>;
}

/** Three rows the size of real ones, so the menu doesn't jump when they arrive. */
function Loading() {
  return (
    <div aria-busy className="grid p-1">
      {[0.8, 0.65, 0.9].map((w) => (
        <div key={w} className="grid gap-2 px-2.5 py-2.5">
          <Skeleton className="h-4" style={{ width: `${w * 100}%` }} />
          <Skeleton className="h-3 w-1/2" />
        </div>
      ))}
    </div>
  );
}

/** The AI marks French with *asterisks*; it's set in Literata italic. */
function Rich({ text }: { text: string }) {
  return text.split(/\*([^*]+)\*/g).map((part, i) =>
    i % 2 ? (
      <em key={i} lang="fr" className="font-serif italic">
        {part}
      </em>
    ) : (
      part
    ),
  );
}

/** A virtual anchor around the command's lines, computed live so it follows scrolling and edits. */
function anchorFor(s: Session, query: string) {
  return {
    contextElement: s.el,
    getBoundingClientRect() {
      const box = s.el.getBoundingClientRect();
      const lines = rangeRects(s.el, s.start, s.start + 1 + query.length).map(
        (r) => new DOMRect(box.left + r.x, box.top + r.y, r.width, r.height),
      );
      if (lines.length === 0) {
        const lh = parseFloat(getComputedStyle(s.el).lineHeight);
        return new DOMRect(box.left + caretX(s.el, s.start), box.top + caretTop(s.el, s.start), 0, lh);
      }
      const left = Math.min(...lines.map((b) => b.left));
      const right = Math.max(...lines.map((b) => b.right));
      return new DOMRect(left, lines[0].top, right - left, lines[lines.length - 1].bottom - lines[0].top);
    },
  };
}
