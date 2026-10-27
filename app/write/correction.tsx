"use client";

import { CornerDownLeftIcon, RepeatIcon } from "lucide-react";
import { createContext, use, useEffect, useLayoutEffect, useRef, useState } from "react";

import { TruncateWords } from "@/components/truncate-words";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CATEGORIES, CATEGORY_LABEL, matchesAccepted, type Category } from "@/lib/ai/correction";
import { cn } from "@/lib/utils";

import type { MarkStatus } from "./review-store";

// Margin, the correction view decided in AGENTS.md (docs/prototypes/
// correction-loop.html?v=3), on the essay itself: the essay stays editable,
// every mistake is numbered in the text, a note per mistake sits in a column
// beside its paragraph, and chips filter by category. The writer fixes a
// mistake by rewriting the highlighted words where they are; putting the
// caret in a highlight opens its note, and Enter (or the note's Check)
// checks the rewrite. Wrong → feedback and a hint. "Show answer" is there any
// time and shows it in the note, never in the text: the writer types it in,
// or puts it in with the note's icon button. Skip is always there.
//
//   <Correction mistakes={…} onCheck={…} onResolve={…} onChange={…} onFocusMark={…}>
//     <Correction.Layout>
//       {title}
//       <Correction.Header>
//         <Correction.Aside>{status}<Correction.Filters /></Correction.Aside>
//       </Correction.Header>
//       <EssayEditor
//         renderUnderlay={(b) => <Correction.Marks blockId={b.id} text={b.text} />}
//         renderAfter={(b) => <Correction.Notes blockId={b.id} />}
//         {...useCorrectionText()}
//       />
//     </Correction.Layout>
//   </Correction>
//
// Marks are drawn under the editor's text (Marks, in its underlay), so they
// never move a letter; their words are whatever is there now, since the
// caller keeps each mark's range in step with the writer's edits. The text
// never moves for a note either: where there's room to the right of the
// essay, Layout places each paragraph's Notes there, beside their paragraph,
// and a tall open note pushes only the notes below it. Interface copy stays
// out of the essay's column: Header's Aside (status, summary, filters) heads
// the notes column, level with the top of the layout (the title), and the
// header row above the essay takes no room. Without room (phones, narrow
// windows) notes fall back into the flow under each paragraph and the Aside
// above the essay. State that outlives the view (status, attempts) belongs to
// the caller through onResolve/onChange; the feedback on each try lives here.

export type CorrectionMistake = {
  id: string;
  blockId: string;
  /** Where the mark is in its block's current text. */
  start: number;
  end: number;
  /** The words in the mark now: the original, the writer's rewrite, or what resolved it. */
  current: string;
  /** In reading order, from 1. */
  number: number;
  category: Category;
  wrong: string;
  fix: string;
  rule: string;
  explain: string;
  hint: string;
  status: MarkStatus;
  attempts: number;
  hinted: boolean;
  /** The answer is shown in the note; a fix typed after it counts as shown, not fixed. */
  answered: boolean;
  /** Mistakes of this category in earlier essays. */
  seen: number;
};

export type Verdict = { correct: boolean; feedback: string };

type Feedback = { kind: "unchanged" } | { kind: "wrong"; text: string } | { kind: "failed" };

type MistakePatch = Partial<Pick<CorrectionMistake, "status" | "attempts" | "hinted" | "answered">>;

// Category color classes, written out so Tailwind sees them. Tints only, at
// the strengths color.md allows: quiet at rest (/8, underline at 60%), so the
// mark whose note is open stands out at full strength (/24).
const TONE: Record<Category, { text: string; dot: string; mark: string; skipped: string; active: string }> = {
  preposition: {
    text: "text-c-prep",
    dot: "bg-c-prep",
    mark: "bg-c-prep/8 decoration-c-prep/60",
    skipped: "decoration-c-prep/60",
    active: "bg-c-prep/24 decoration-c-prep",
  },
  agreement: {
    text: "text-c-accord",
    dot: "bg-c-accord",
    mark: "bg-c-accord/8 decoration-c-accord/60",
    skipped: "decoration-c-accord/60",
    active: "bg-c-accord/24 decoration-c-accord",
  },
  conjugation: {
    text: "text-c-conj",
    dot: "bg-c-conj",
    mark: "bg-c-conj/8 decoration-c-conj/60",
    skipped: "decoration-c-conj/60",
    active: "bg-c-conj/24 decoration-c-conj",
  },
  spelling: {
    text: "text-c-ortho",
    dot: "bg-c-ortho",
    mark: "bg-c-ortho/8 decoration-c-ortho/60",
    skipped: "decoration-c-ortho/60",
    active: "bg-c-ortho/24 decoration-c-ortho",
  },
};

const FOCUS =
  "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-focus-ring";

const resolved = (s: MarkStatus) => s === "fixed" || s === "revealed";

type ContextValue = {
  mistakes: CorrectionMistake[];
  activeId: string | null;
  filter: Category[];
  setFilter: (next: Category[]) => void;
  shown: (m: CorrectionMistake) => boolean;
  feedback: Record<string, Feedback | undefined>;
  pendingId: string | null;
  /** Toggle a mistake open or closed (a click on its note), sending the caret to it on opening. */
  select: (id: string) => void;
  /** The caret is at [start, end] in a paragraph: open the mistake it's in, close the open one it left. */
  caretAt: (blockId: string, start: number, end: number) => void;
  /** Close a mistake's note, leaving the caret in its words; it reopens once the caret leaves and comes back. */
  dismiss: (id: string) => void;
  /** Move the caret to the next unresolved mistake after `from`, in reading order; false if there's none. */
  focusNext: (from: string) => boolean;
  focusMark: (id: string) => void;
  check: (id: string) => void;
  /** Show the answer in the note, leaving the essay alone. */
  answer: (id: string) => void;
  /** Put the answer into the essay. */
  apply: (id: string) => void;
  skip: (id: string) => void;
  hint: (id: string) => void;
};

const CorrectionContext = createContext<ContextValue | null>(null);

function useCorrection() {
  const ctx = use(CorrectionContext);
  if (!ctx) throw new Error("Correction parts must be inside <Correction>.");
  return ctx;
}

type CorrectionProps = Omit<React.ComponentProps<"div">, "onChange"> & {
  mistakes: CorrectionMistake[];
  activeId?: string | null;
  defaultActiveId?: string | null;
  onActiveIdChange?: (id: string | null) => void;
  /** Categories shown; empty shows all. */
  filter?: Category[];
  defaultFilter?: Category[];
  onFilterChange?: (filter: Category[]) => void;
  /** Judge a rewrite. Called only when it differs from the original. */
  onCheck: (id: string, attempt: string) => Promise<Verdict>;
  /**
   * The words in the mark resolve it. With `replacement` (Use answer), put
   * that in the essay in place of the mark's words first.
   */
  onResolve: (id: string, how: "fixed" | "revealed", replacement?: string) => void;
  onChange: (id: string, patch: MistakePatch) => void;
  /** Put the caret at the end of the mark's words in the essay. */
  onFocusMark: (id: string) => void;
};

function CorrectionRoot({
  mistakes,
  activeId: activeIdProp,
  defaultActiveId = null,
  onActiveIdChange,
  filter: filterProp,
  defaultFilter = [],
  onFilterChange,
  onCheck,
  onResolve,
  onChange,
  onFocusMark,
  children,
  ...props
}: CorrectionProps) {
  const [activeState, setActiveState] = useState(defaultActiveId);
  const activeId = activeIdProp !== undefined ? activeIdProp : activeState;
  const setActive = (id: string | null) => {
    if (id === activeId) return;
    if (activeIdProp === undefined) setActiveState(id);
    onActiveIdChange?.(id);
  };

  const [filterState, setFilterState] = useState(defaultFilter);
  const filter = filterProp ?? filterState;
  const setFilter = (next: Category[]) => {
    if (filterProp === undefined) setFilterState(next);
    onFilterChange?.(next);
    const active = mistakes.find((m) => m.id === activeId);
    if (active && next.length > 0 && !next.includes(active.category)) setActive(null);
  };
  const shown = (m: CorrectionMistake) => filter.length === 0 || filter.includes(m.category);

  const [feedback, setFeedback] = useState<Record<string, Feedback | undefined>>({});
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  // The mistake closed with Escape while the caret is still in its words.
  const dismissed = useRef<string | null>(null);
  // A check outlives its render: its verdict is compared with the words as they are when it lands.
  const latest = useRef(mistakes);
  useLayoutEffect(() => {
    latest.current = mistakes;
  });

  const byId = (id: string) => mistakes.find((m) => m.id === id);
  const say = (id: string, next: Feedback | undefined) => setFeedback((f) => ({ ...f, [id]: next }));

  // On to the next open mistake after `from` among those shown, wrapping around.
  function advance(from: string) {
    const list = mistakes.filter(shown);
    const i = list.findIndex((m) => m.id === from);
    const order = [...list.slice(i + 1), ...list.slice(0, Math.max(i, 0))];
    const next = order.find((m) => m.status === "open" && m.id !== from);
    setActive(next?.id ?? null);
    if (next) onFocusMark(next.id);
  }

  function announceResolved(how: string) {
    const done = mistakes.filter((m) => resolved(m.status)).length + 1;
    setAnnouncement(`${how}. ${done} of ${mistakes.length} done.`);
  }

  const ctx: ContextValue = {
    mistakes,
    activeId,
    filter,
    setFilter,
    shown,
    feedback,
    pendingId,
    select(id) {
      const m = byId(id);
      if (!m || resolved(m.status)) return;
      if (activeId === id) return setActive(null);
      dismissed.current = null;
      setActive(id);
      onFocusMark(id);
    },
    caretAt(blockId, start, end) {
      const m = mistakes.find(
        (x) => x.blockId === blockId && shown(x) && !resolved(x.status) && x.start <= start && end <= x.end,
      );
      if (dismissed.current !== m?.id) dismissed.current = null;
      if (m && dismissed.current !== m.id) setActive(m.id);
      else if (!m) setActive(null);
    },
    dismiss(id) {
      dismissed.current = id;
      if (activeId === id) setActive(null);
    },
    focusNext(from) {
      const list = mistakes.filter(shown);
      const next = list.slice(list.findIndex((m) => m.id === from) + 1).find((m) => !resolved(m.status));
      if (!next) return false;
      onFocusMark(next.id);
      return true;
    },
    focusMark: onFocusMark,
    async check(id) {
      const m = byId(id);
      if (!m || pendingId) return;
      const attempt = m.current;
      if (!attempt.trim() || matchesAccepted(attempt, [m.wrong])) {
        say(id, { kind: "unchanged" });
        shake(document.getElementById(noteId(id)));
        return;
      }
      setPendingId(id);
      try {
        const verdict = await onCheck(id, attempt);
        // Rewritten again while it was checked: the verdict is for words that are gone.
        if (latest.current.find((x) => x.id === id)?.current !== attempt) return;
        if (verdict.correct) {
          say(id, undefined);
          announceResolved(m.answered ? "Shown" : "Fixed");
          onResolve(id, m.answered ? "revealed" : "fixed");
          advance(id);
        } else {
          say(id, { kind: "wrong", text: verdict.feedback });
          onChange(id, { attempts: m.attempts + 1 });
          shake(document.getElementById(noteId(id)));
          onFocusMark(id);
        }
      } catch {
        say(id, { kind: "failed" });
        onFocusMark(id);
      } finally {
        setPendingId(null);
      }
    },
    answer(id) {
      onChange(id, { answered: true });
      onFocusMark(id);
    },
    apply(id) {
      const m = byId(id);
      if (!m) return;
      say(id, undefined);
      announceResolved("Shown");
      onResolve(id, "revealed", m.fix);
      advance(id);
    },
    skip(id) {
      say(id, undefined);
      onChange(id, { status: "skipped" });
      advance(id);
    },
    hint(id) {
      onChange(id, { hinted: true });
      onFocusMark(id);
    },
  };

  return (
    <CorrectionContext value={ctx}>
      <div data-slot="correction" {...props}>
        {children}
        <p className="sr-only" aria-live="polite">
          {announcement}
        </p>
      </div>
    </CorrectionContext>
  );
}

/**
 * What the essay's editor needs from the correction: its caret opens and
 * closes notes (onTextSelect), and in the open mark Enter checks a rewrite,
 * Escape closes the note and Tab goes to the note's buttons (onTextKeyDown).
 */
export function useCorrectionText() {
  const { mistakes, activeId, caretAt, dismiss, check } = useCorrection();
  return {
    onTextSelect: caretAt,
    onTextKeyDown(block: { id: string }, e: React.KeyboardEvent<HTMLTextAreaElement>) {
      const m = mistakes.find((x) => x.id === activeId && x.blockId === block.id);
      if (!m) return;
      const plain = !e.shiftKey && !e.metaKey && !e.ctrlKey && !e.altKey;
      if (e.key === "Enter" && plain && !matchesAccepted(m.current, [m.wrong])) {
        // An untouched mark lets Enter split the paragraph as usual.
        e.preventDefault();
        check(m.id);
      } else if (e.key === "Escape") {
        e.preventDefault();
        dismiss(m.id);
      } else if (e.key === "Tab" && !e.shiftKey) {
        // Straight to this mistake's Check, Hint and Skip.
        const first = document.getElementById(noteBodyId(m.id))?.querySelector("button");
        if (first) {
          e.preventDefault();
          first.focus();
        }
      }
    },
  };
}

function shake(el: HTMLElement | null) {
  if (!el || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  el.animate(
    [
      { transform: "translateX(0)" },
      { transform: "translateX(-3px)" },
      { transform: "translateX(3px)" },
      { transform: "translateX(0)" },
    ],
    { duration: 240, easing: "ease-out" },
  );
}

const noteId = (id: string) => `note-${id}`;
const noteBodyId = (id: string) => `note-body-${id}`;

/** Chips that filter by category, each with what's left to resolve. Only categories in this review appear. */
/** Small chips in the notes column; touch-sized above the essay, where phones and narrow windows see them. */
function Filters({ className, ...props }: Omit<React.ComponentProps<"div">, "onChange" | "defaultValue">) {
  const { mistakes, filter, setFilter } = useCorrection();
  const layout = use(LayoutContext);
  const present = CATEGORIES.filter((c) => mistakes.some((m) => m.category === c));
  if (present.length < 2) return null;

  return (
    <ToggleGroup
      multiple
      variant="outline"
      size={layout === "margin" ? "sm" : "lg"}
      value={filter}
      onValueChange={(next) => setFilter(next as Category[])}
      aria-label="Filter mistakes by category"
      className={cn("flex-wrap", className)}
      {...props}
    >
      {present.map((c) => {
        const left = mistakes.filter((m) => m.category === c && !resolved(m.status)).length;
        return (
          <ToggleGroupItem key={c} value={c} aria-label={`${CATEGORY_LABEL[c]}, ${left} left`}>
            <span className={cn("size-2 rounded-full", TONE[c].dot)} aria-hidden />
            {CATEGORY_LABEL[c]}
            <span className="text-text-3 tabular-nums">{left}</span>
          </ToggleGroupItem>
        );
      })}
    </ToggleGroup>
  );
}

// Margin layout. Distances in px: the gap between the essay and its notes,
// the space kept clear at the window's edge, the notes column's width range,
// and the gap between one paragraph's notes and the next.
const GAP = 32;
const EDGE = 16;
const NOTES_MIN = 200;
const NOTES_MAX = 288;
const STACK = 6;

// Classes for anything Layout places in the margin. Layout sets
// data-layout="margin" or "stacked" on itself, and data-ready once placed so
// later moves glide instead of the first placement flying in.
const IN_MARGIN =
  "group-data-[layout=margin]/margin:absolute group-data-[layout=margin]/margin:top-0 group-data-[layout=margin]/margin:left-0 group-data-[layout=margin]/margin:m-0 group-data-ready/margin:transition-transform group-data-ready/margin:duration-200 group-data-ready/margin:ease-in-out";

/**
 * The essay's column: holds the title, the editor and its margin. Writes
 * positions straight to the DOM (left, width, translateY) on every render and
 * resize, so placing notes never re-renders anything.
 */
type MarginLayout = "margin" | "stacked";

const LayoutContext = createContext<MarginLayout>("stacked");

function Layout({ className, children, ...props }: React.ComponentProps<"div">) {
  // Subscribes to the correction, so notes are re-placed whenever one opens,
  // resolves or the filter changes.
  useCorrection();
  const ref = useRef<HTMLDivElement>(null);
  // Mirrors data-layout for what renders differently in the margin (the
  // filters' size). Set only when it flips, so placing never re-renders.
  const [layout, setLayout] = useState<MarginLayout>("stacked");
  // Note cards whose height is animating (opening or closing). While any is,
  // the notes below follow it frame by frame instead of gliding on their own
  // transition, so they move in step with the card rather than trailing it.
  const growing = useRef(new Set<EventTarget>());

  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    const place = () => setLayout(placeMargin(root, growing.current.size === 0));
    place();
    const observer = new ResizeObserver(place);
    observer.observe(root);
    root.querySelectorAll("[data-margin-block]").forEach((b) => observer.observe(b));
    window.addEventListener("resize", place);
    const frame = requestAnimationFrame(() => (root.dataset.ready = ""));
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", place);
      cancelAnimationFrame(frame);
    };
  });

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const set = growing.current;
    const start = (e: TransitionEvent) => {
      if (e.propertyName === "grid-template-rows") set.add(e.target!);
    };
    const end = (e: TransitionEvent) => {
      if (e.propertyName === "grid-template-rows") set.delete(e.target!);
    };
    root.addEventListener("transitionrun", start);
    root.addEventListener("transitionend", end);
    root.addEventListener("transitioncancel", end);
    return () => {
      root.removeEventListener("transitionrun", start);
      root.removeEventListener("transitionend", end);
      root.removeEventListener("transitioncancel", end);
    };
  }, []);

  return (
    <div ref={ref} data-slot="correction-layout" className={cn("group/margin relative", className)} {...props}>
      <LayoutContext value={layout}>{children}</LayoutContext>
    </div>
  );
}

/** `glide`: notes slide to new places on their transition; otherwise they jump there (to follow a card's own animation). */
function placeMargin(root: HTMLElement, glide = true): MarginLayout {
  const blocks = [...root.querySelectorAll<HTMLElement>("[data-margin-block]")];
  const box = root.getBoundingClientRect();
  const first = root.querySelector<HTMLElement>("[data-slot=correction-marks]");
  const right = first ? first.getBoundingClientRect().right : box.right;
  const room = document.documentElement.clientWidth - right - GAP - EDGE;

  if (room < NOTES_MIN) {
    root.dataset.layout = "stacked";
    root.style.minHeight = "";
    for (const b of blocks) b.style.cssText = "";
    return "stacked";
  }

  root.dataset.layout = "margin";
  // Each is placed inside its positioned parent: a paragraph's notes inside
  // the paragraph's block, so they move with it; the Aside inside the layout.
  const parentBox = (b: HTMLElement) => (b.offsetParent ?? root).getBoundingClientRect();
  // Widths first, so the heights read below are the final ones.
  for (const b of blocks) {
    b.style.left = `${right - parentBox(b).left + GAP}px`;
    b.style.width = `${Math.min(room, NOTES_MAX)}px`;
  }
  // In window coordinates from here on.
  let bottom = -Infinity;
  for (const b of blocks) {
    // Notes line up with their paragraph, the header's Aside with its status.
    const paragraph = b.parentElement?.querySelector<HTMLElement>("[data-slot=correction-marks]");
    const status = b.closest("[data-slot=correction-header]")?.firstElementChild;
    const want = paragraph
      ? paragraph.getBoundingClientRect().top
      : status && status !== b
        ? besideFirstLine(b, status)
        : box.top;
    const height = b.offsetHeight;
    const y = height === 0 ? want : Math.max(want, bottom + STACK);
    if (!glide) b.style.transition = "none";
    b.style.transform = `translateY(${y - parentBox(b).top}px)`;
    if (height > 0) bottom = y + height;
  }
  if (!glide) {
    // Commit the jumps, then give the notes their transition back.
    void root.offsetHeight;
    for (const b of blocks) b.style.transition = "";
  }
  // Notes can run past the last paragraph; keep them inside the page.
  root.style.minHeight = bottom > box.top ? `${bottom - box.top}px` : "";
  return "margin";
}

/**
 * Where `aside` goes so its first row (a row of chips, a line of the trace)
 * is centered on the first line of `status` text, a 28px chip beside an 18px
 * line, in window coordinates. Its offset inside the aside is relative, so a
 * translate doesn't skew it.
 */
function besideFirstLine(aside: HTMLElement, status: Element) {
  const range = document.createRange();
  range.selectNodeContents(status);
  const line = range.getClientRects()[0] ?? status.getBoundingClientRect();
  const row = aside.firstElementChild?.firstElementChild ?? aside;
  const { top, height } = row.getBoundingClientRect();
  return line.top + line.height / 2 - (top - aside.getBoundingClientRect().top) - height / 2;
}

/** Holds the Aside: above the essay without room for notes, no room at all with it. */
function Header({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="correction-header"
      className={cn(
        "mb-7 grid grid-cols-1 justify-items-start gap-4 font-sans group-data-[layout=margin]/margin:mb-0",
        className,
      )}
      {...props}
    />
  );
}

/**
 * The review's own copy (status, summary, filters, the trace while it runs):
 * at the head of the notes column when there's room, above the essay
 * otherwise. Notes start below it.
 */
function Aside({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-margin-block="aside" className={cn("empty:hidden", IN_MARGIN, className)} {...props} />;
}

/**
 * A paragraph's marks, for the editor's underlay: the paragraph's text,
 * transparent there, with each mistake's words tinted and underlined in its
 * category color, and its number as a superscript that takes no width (raised
 * just past the phrase's last letter). Padding is cancelled by an equal
 * negative margin, so nothing here moves a letter of the text above it.
 */
function Marks({ blockId, text, className, ...props }: React.ComponentProps<"div"> & { blockId: string; text: string }) {
  const { mistakes, activeId, shown } = useCorrection();
  const here = mistakes.filter((m) => m.blockId === blockId);

  const parts: React.ReactNode[] = [];
  let at = 0;
  for (const m of here) {
    if (m.start < at || m.end > text.length) continue;
    parts.push(text.slice(at, m.start));
    const phrase = text.slice(m.start, m.end);
    if (resolved(m.status)) {
      parts.push(
        <span
          key={m.id}
          className={cn(
            "underline decoration-1 underline-offset-4",
            m.status === "fixed" ? "decoration-ok" : "decoration-text-3 decoration-dotted",
          )}
        >
          {phrase}
        </span>,
      );
    } else if (shown(m)) {
      const tone = TONE[m.category];
      parts.push(
        <span
          key={m.id}
          data-state={m.id === activeId ? "active" : m.status}
          className={cn(
            "relative -mx-0.5 rounded-row px-0.5 underline decoration-[1.5px] underline-offset-4 decoration-skip-ink-none transition-colors duration-150 ease-out",
            m.id === activeId ? tone.active : m.status === "skipped" ? cn("decoration-dashed", tone.skipped) : tone.mark,
          )}
        >
          <span className={cn("absolute -right-0.5 bottom-4 font-sans text-sup font-medium tabular-nums", tone.text)}>
            {m.number}
          </span>
          {phrase}
        </span>,
      );
    } else {
      parts.push(phrase);
    }
    at = m.end;
  }
  parts.push(text.slice(at));

  return (
    <div data-slot="correction-marks" className={className} {...props}>
      {parts}
    </div>
  );
}

/** The notes for one paragraph's mistakes, in reading order. */
function Notes({ blockId, className, ...props }: React.ComponentProps<"div"> & { blockId: string }) {
  const { mistakes, shown } = useCorrection();
  const here = mistakes.filter((m) => m.blockId === blockId && shown(m));
  return (
    <div
      data-margin-block="notes"
      className={cn("mt-3 grid cursor-default grid-cols-1 gap-1.5 font-sans empty:hidden", IN_MARGIN, className)}
      {...props}
    >
      {here.map((m) => (
        <Note key={m.id} mistake={m} />
      ))}
    </div>
  );
}

const STATUS_LABEL: Record<MarkStatus, string> = { open: "", fixed: "Fixed", revealed: "Shown", skipped: "Skipped" };

function Note({ mistake: m }: { mistake: CorrectionMistake }) {
  const { activeId, select, check, answer, skip, hint, pendingId, dismiss, focusMark, focusNext } = useCorrection();
  const open = activeId === m.id && !resolved(m.status);
  const done = resolved(m.status);
  const tone = TONE[m.category];
  const pending = pendingId === m.id;

  return (
    <div
      id={noteId(m.id)}
      data-state={m.status}
      className={cn(
        "rounded-card border transition-colors duration-150",
        done ? "bg-transparent" : "bg-surface",
        open && "border-border-strong",
      )}
    >
      {/* Out of the Tab order: the way in from the keyboard is the caret in
          the mark's words, then Tab. */}
      <button
        type="button"
        tabIndex={-1}
        onClick={() => select(m.id)}
        disabled={done}
        aria-expanded={open}
        aria-controls={noteBodyId(m.id)}
        aria-label={`Note ${m.number}: ${m.rule}${m.status === "open" ? "" : `, ${STATUS_LABEL[m.status].toLowerCase()}`}`}
        className={cn(
          "flex min-h-10 w-full items-center gap-2 rounded-card px-3 py-1.5 text-start transition-colors duration-150 ease-out not-disabled:cursor-pointer not-disabled:hover:bg-sunken pointer-coarse:min-h-11",
          FOCUS,
        )}
      >
        <span className={cn("w-5 shrink-0 text-caption font-semibold tabular-nums", tone.text)}>{m.number}</span>
        <TruncateWords
          text={m.rule}
          className={cn("text-label", done ? "text-text-3 line-through decoration-border-strong" : "text-text")}
        />
        {m.status !== "open" && (
          <span className={cn("shrink-0 text-caption", m.status === "fixed" ? "text-ok" : "text-text-3")}>
            {m.status === "fixed" && "✓ "}
            {STATUS_LABEL[m.status]}
          </span>
        )}
      </button>

      {/* Always mounted, so closing can animate too. The grid row eases from
          0fr to 1fr, so the card grows from its header and shrinks back into
          it, while the contents fade and lift in; closing is quicker and
          quieter than opening. Collapsed, it's inert: nothing in it can be
          focused or read out. */}
      <div
        inert={!open}
        className={cn(
          "grid transition-[grid-template-rows]",
          open ? "grid-rows-[1fr] duration-200 ease-out" : "grid-rows-[0fr] duration-150 ease-in",
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div
            id={noteBodyId(m.id)}
            onKeyDown={(e) => {
              const buttons = e.currentTarget.querySelectorAll("button");
              if (e.key === "Escape") {
                // Back to the words, with the note closed.
                e.preventDefault();
                focusMark(m.id);
                dismiss(m.id);
              } else if (e.key === "Tab" && e.shiftKey && e.target === buttons[0]) {
                // Back to the words being fixed.
                e.preventDefault();
                focusMark(m.id);
              } else if (e.key === "Tab" && !e.shiftKey && e.target === buttons[buttons.length - 1]) {
                // On to the next mistake in reading order, whose note opens
                // with the caret in its words.
                if (focusNext(m.id)) e.preventDefault();
              }
            }}
            className={cn(
              "px-3.5 pb-3.5 transition-[opacity,translate]",
              open ? "duration-200 ease-out" : "-translate-y-1 opacity-0 duration-150 ease-in",
            )}
          >
            <CategoryTag category={m.category} />
            <p className="mt-1.5 text-ui text-pretty text-text-2">
              <Rich text={m.explain} />
            </p>
            {m.seen > 0 && (
              <p className="mt-3 flex items-baseline gap-1.5 text-label text-text-2">
                <RepeatIcon className="size-3.5 shrink-0 self-center" aria-hidden />
                <span>
                  <span className="font-medium text-text">
                    {m.seen} {m.category} {m.seen === 1 ? "mistake" : "mistakes"}
                  </span>{" "}
                  in earlier essays
                </span>
              </p>
            )}
            <FeedbackFor mistake={m} />
            {/* Check leads; the two helps follow, quieter, and go once used;
                Skip, which gives up on the mistake, sits apart at the end.
                gap-3 on touch, where buttons' 44px hit areas would otherwise overlap. */}
            <div className="mt-4 flex flex-wrap items-center gap-1.5 pointer-coarse:gap-3">
              <Button size="xs" onClick={() => check(m.id)} disabled={pending}>
                {pending ? "Checking…" : "Check"}
              </Button>
              {!m.hinted && m.attempts === 0 && !m.answered && (
                <Button variant="secondary" size="xs" onClick={() => hint(m.id)}>
                  Hint
                </Button>
              )}
              {!m.answered && (
                <Button variant="secondary" size="xs" onClick={() => answer(m.id)} disabled={pending}>
                  Show answer
                </Button>
              )}
              <Button variant="ghost" size="xs" onClick={() => skip(m.id)} disabled={pending} className="ml-auto">
                Skip
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CategoryTag({ category }: { category: Category }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-caption font-semibold", TONE[category].text)}>
      <span className={cn("size-2 rounded-full", TONE[category].dot)} aria-hidden />
      {CATEGORY_LABEL[category]}
    </span>
  );
}

/** What's wrong with the last attempt, the hint once it's earned or asked for, then the answer once asked for. */
function FeedbackFor({ mistake: m }: { mistake: CorrectionMistake }) {
  const { feedback, apply, pendingId } = useCorrection();
  const fb = feedback[m.id];
  return (
    <div aria-live="polite">
      {fb && (
        <p className="mt-3 rounded-r-row border-l-2 border-warn bg-warn/10 px-2.5 py-2 text-ui text-pretty text-text">
          {fb.kind === "unchanged" && "That’s still the original."}
          {fb.kind === "failed" && "Couldn’t check. Try again."}
          {fb.kind === "wrong" && (
            <>
              Not yet. {fb.text && <Rich text={fb.text} />}
            </>
          )}
        </p>
      )}
      {(m.hinted || m.attempts >= 1) && (
        <p className="mt-3 rounded-row bg-sunken px-2.5 py-2 text-ui text-pretty text-text-2">
          <span className="mr-1 font-medium text-text">Hint</span>
          <Rich text={m.hint} />
        </p>
      )}
      {/* Shown, not applied: the writer types it in, or puts it in with the button. */}
      {m.answered && (
        <div className="mt-3 flex items-center gap-2 rounded-row bg-sunken py-1 pr-1 pl-2.5 text-ui text-text-2">
          <p className="min-w-0 flex-1 py-1 text-pretty">
            <span className="mr-1 font-medium text-text">Answer</span>
            <em lang="fr" className="font-serif text-text italic">
              {m.fix}
            </em>
          </p>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label="Put the answer in your essay"
                  onClick={() => apply(m.id)}
                  disabled={pendingId === m.id}
                  className="shrink-0"
                />
              }
            >
              <CornerDownLeftIcon />
            </TooltipTrigger>
            <TooltipContent>Use answer</TooltipContent>
          </Tooltip>
        </div>
      )}
    </div>
  );
}

/** Notes mark French with *asterisks*; it's set in Literata italic. */
function Rich({ text }: { text: string }) {
  return text.split(/\*([^*]+)\*/g).map((part, i) =>
    i % 2 ? (
      <em key={i} lang="fr" className="font-serif text-text italic">
        {part}
      </em>
    ) : (
      part
    ),
  );
}

export const Correction = Object.assign(CorrectionRoot, { Layout, Header, Aside, Filters, Marks, Notes });
