"use client";

import { CheckIcon, ChevronDownIcon, CornerDownLeftIcon, RepeatIcon } from "lucide-react";
import { createContext, use, useEffect, useLayoutEffect, useRef, useState } from "react";

import { TruncateWords } from "@/components/truncate-words";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CATEGORIES, CATEGORY_LABEL, matchesAccepted, type Category } from "@/lib/ai/correction";
import { cn } from "@/lib/utils";

import type { MarkStatus } from "@/app/write/review-store";

// THROWAWAY: /proto/margin-notes. A copy of app/write/correction.tsx with a
// `noteStyle` switch for where and how notes sit in the margin:
//   current  the production behavior, one block of notes per paragraph
//   aligned  each note placed on its own; the open one level with its word,
//            the rest stacked up and down around it (Google Docs comments)
//   folded   aligned, plus resolved notes folded into one "N done" line
//   chips    closed notes as numbered chips; only the open note is a card
// Nothing outside app/proto/margin-notes imports this file.
//
// Margin, the correction view decided in AGENTS.md (docs/prototypes/
// correction-loop.html?v=3): every mistake numbered in the text, a note per
// mistake in a column beside its paragraph, chips to filter by category.
// Clicking a mark or note turns the phrase into an inline input; Enter checks
// the rewrite. Wrong → feedback and a hint. "Show answer" is there any time
// and shows it in the note, never in the text: the writer types it in, or
// puts it in with the note's icon button. Skip is always there.
//
//   <Correction mistakes={…} onCheck={…} onFix={…} onChange={…}>
//     <Correction.Layout>
//       {heading}
//       <Correction.Header>
//         <Correction.Aside>{status}<Correction.Filters /></Correction.Aside>
//       </Correction.Header>
//       <Correction.Row>
//         <Correction.Paragraph blockId={b.id} text={b.text} />
//         <Correction.Notes blockId={b.id} />
//       </Correction.Row>
//     </Correction.Layout>
//   </Correction>
//
// The text never moves for a note: where there's room to the right of the
// essay, Layout places each paragraph's Notes there, beside their paragraph,
// and a tall open note pushes only the notes below it. Interface copy stays
// out of the essay's column: Header's Aside (status, summary, filters) heads
// the notes column, level with the top of the layout (the screen's heading),
// and the header row above the essay takes no room, so the text sits where it
// did while writing. Something put in Header outside the Aside stays above the
// essay, with the Aside level with its first line. Without room (phones,
// narrow windows) notes fall back into the flow under each paragraph and the
// Aside above the essay. Read-only text with inline inputs, never contenteditable. State that
// outlives the view (status, attempts) belongs to the caller through
// onFix/onChange; what's typed and the feedback on it live here.

export type CorrectionMistake = {
  id: string;
  blockId: string;
  /** Where the mark is in its block's current text: `wrong`, or `final` once resolved. */
  start: number;
  end: number;
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
// mark being fixed or focused stands out at full strength (/24) with no ring
// or padding of its own.
const TONE: Record<Category, { text: string; dot: string; mark: string; skipped: string; field: string }> = {
  preposition: {
    text: "text-c-prep",
    dot: "bg-c-prep",
    mark: "bg-c-prep/8 decoration-c-prep/60 hover:bg-c-prep/14 hover:decoration-c-prep focus-visible:bg-c-prep/24 focus-visible:decoration-c-prep",
    skipped: "decoration-c-prep/60 hover:bg-c-prep/8 hover:decoration-c-prep focus-visible:bg-c-prep/24 focus-visible:decoration-c-prep",
    field: "bg-c-prep/24 decoration-c-prep",
  },
  agreement: {
    text: "text-c-accord",
    dot: "bg-c-accord",
    mark: "bg-c-accord/8 decoration-c-accord/60 hover:bg-c-accord/14 hover:decoration-c-accord focus-visible:bg-c-accord/24 focus-visible:decoration-c-accord",
    skipped: "decoration-c-accord/60 hover:bg-c-accord/8 hover:decoration-c-accord focus-visible:bg-c-accord/24 focus-visible:decoration-c-accord",
    field: "bg-c-accord/24 decoration-c-accord",
  },
  conjugation: {
    text: "text-c-conj",
    dot: "bg-c-conj",
    mark: "bg-c-conj/8 decoration-c-conj/60 hover:bg-c-conj/14 hover:decoration-c-conj focus-visible:bg-c-conj/24 focus-visible:decoration-c-conj",
    skipped: "decoration-c-conj/60 hover:bg-c-conj/8 hover:decoration-c-conj focus-visible:bg-c-conj/24 focus-visible:decoration-c-conj",
    field: "bg-c-conj/24 decoration-c-conj",
  },
  spelling: {
    text: "text-c-ortho",
    dot: "bg-c-ortho",
    mark: "bg-c-ortho/8 decoration-c-ortho/60 hover:bg-c-ortho/14 hover:decoration-c-ortho focus-visible:bg-c-ortho/24 focus-visible:decoration-c-ortho",
    skipped: "decoration-c-ortho/60 hover:bg-c-ortho/8 hover:decoration-c-ortho focus-visible:bg-c-ortho/24 focus-visible:decoration-c-ortho",
    field: "bg-c-ortho/24 decoration-c-ortho",
  },
};

const FOCUS =
  "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-focus-ring";

const resolved = (s: MarkStatus) => s === "fixed" || s === "revealed";

export type NoteStyle = "current" | "aligned" | "folded" | "chips";

type ContextValue = {
  noteStyle: NoteStyle;
  mistakes: CorrectionMistake[];
  activeId: string | null;
  filter: Category[];
  setFilter: (next: Category[]) => void;
  shown: (m: CorrectionMistake) => boolean;
  values: Record<string, string>;
  setValue: (id: string, value: string) => void;
  feedback: Record<string, Feedback | undefined>;
  pendingId: string | null;
  inputs: React.RefObject<Map<string, HTMLInputElement>>;
  /** Whether this mark should take focus as it mounts: its fix was just closed. Clears the claim. */
  claimFocus: (id: string) => boolean;
  /** Toggle a mistake open or closed (a click on its mark or note). */
  select: (id: string) => void;
  /** Open a mistake, never close it (keyboard focus on its mark). */
  open: (id: string) => void;
  /** Move keyboard focus to the next unresolved mistake after `from`, in reading order; false if there's none. */
  focusNext: (from: string) => boolean;
  close: (id: string) => void;
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
  noteStyle: NoteStyle;
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
  /** Write a fixed or revealed phrase into the essay. */
  onFix: (id: string, final: string, how: "fixed" | "revealed") => void;
  onChange: (id: string, patch: MistakePatch) => void;
};

function CorrectionRoot({
  noteStyle,
  mistakes,
  activeId: activeIdProp,
  defaultActiveId = null,
  onActiveIdChange,
  filter: filterProp,
  defaultFilter = [],
  onFilterChange,
  onCheck,
  onFix,
  onChange,
  children,
  ...props
}: CorrectionProps) {
  const [activeState, setActiveState] = useState(defaultActiveId);
  const activeId = activeIdProp !== undefined ? activeIdProp : activeState;
  const setActive = (id: string | null) => {
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

  const [values, setValues] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<Record<string, Feedback | undefined>>({});
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const inputs = useRef(new Map<string, HTMLInputElement>());
  const returnTo = useRef<string | null>(null);

  const byId = (id: string) => mistakes.find((m) => m.id === id);
  const setValue = (id: string, value: string) => setValues((v) => ({ ...v, [id]: value }));
  const say = (id: string, next: Feedback | undefined) => setFeedback((f) => ({ ...f, [id]: next }));

  // The next open mistake after `from` among those shown, wrapping around.
  function advance(from: string) {
    const list = mistakes.filter(shown);
    const i = list.findIndex((m) => m.id === from);
    const order = [...list.slice(i + 1), ...list.slice(0, Math.max(i, 0))];
    setActive(order.find((m) => m.status === "open" && m.id !== from)?.id ?? null);
  }

  function announceResolved(how: string) {
    const done = mistakes.filter((m) => resolved(m.status)).length + 1;
    setAnnouncement(`${how}. ${done} of ${mistakes.length} done.`);
  }

  const ctx: ContextValue = {
    noteStyle,
    mistakes,
    activeId,
    filter,
    setFilter,
    shown,
    values,
    setValue,
    feedback,
    pendingId,
    inputs,
    claimFocus(id) {
      if (returnTo.current !== id) return false;
      returnTo.current = null;
      return true;
    },
    select(id) {
      if (activeId === id) return setActive(null);
      ctx.open(id);
    },
    open(id) {
      const m = byId(id);
      if (!m || resolved(m.status) || activeId === id) return;
      if (m.status === "skipped") onChange(id, { status: "open" });
      setActive(id);
    },
    focusNext(from) {
      const list = mistakes.filter(shown);
      const next = list.slice(list.findIndex((m) => m.id === from) + 1).find((m) => !resolved(m.status));
      const mark = next && document.getElementById(markId(next.id));
      if (!mark) return false;
      mark.focus();
      return true;
    },
    close(id) {
      // The mark replaces the input after this render and takes focus back
      // as it mounts, wherever focus was inside the fix (input or note).
      returnTo.current = id;
      setActive(null);
    },
    async check(id) {
      const m = byId(id);
      if (!m || pendingId) return;
      const attempt = values[id] ?? m.wrong;
      if (!attempt.trim() || matchesAccepted(attempt, [m.wrong])) {
        say(id, { kind: "unchanged" });
        shake(inputs.current.get(id));
        return;
      }
      setPendingId(id);
      try {
        const verdict = await onCheck(id, attempt);
        if (verdict.correct) {
          say(id, undefined);
          announceResolved(m.answered ? "Shown" : "Fixed");
          onFix(id, attempt.trim(), m.answered ? "revealed" : "fixed");
          advance(id);
        } else {
          say(id, { kind: "wrong", text: verdict.feedback });
          onChange(id, { attempts: m.attempts + 1 });
          shake(inputs.current.get(id));
          inputs.current.get(id)?.focus({ preventScroll: true });
        }
      } catch {
        say(id, { kind: "failed" });
        inputs.current.get(id)?.focus({ preventScroll: true });
      } finally {
        setPendingId(null);
      }
    },
    answer(id) {
      onChange(id, { answered: true });
      inputs.current.get(id)?.focus({ preventScroll: true });
    },
    apply(id) {
      const m = byId(id);
      if (!m) return;
      say(id, undefined);
      announceResolved("Shown");
      onFix(id, m.fix, "revealed");
      advance(id);
    },
    skip(id) {
      say(id, undefined);
      onChange(id, { status: "skipped" });
      advance(id);
    },
    hint(id) {
      onChange(id, { hinted: true });
      inputs.current.get(id)?.focus({ preventScroll: true });
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

function shake(el: HTMLElement | undefined) {
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

const markId = (id: string) => `mark-${id}`;
const noteBodyId = (id: string) => `note-${id}`;

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

// Blocks that open in place (a note, the fold) in the anchored styles. In
// the margin their height never animates: it changes in one frame (at once on
// open, after the motion on close), and a clip-path reveals or hides the part
// below the header instead. The clip and every block's translate share one
// 200ms ease-in-out, so a card's visible edge and the notes around it move in
// step, all on the compositor. `--head` is the block's height when closed.
// Under the paragraph (no room beside it) the height animates as before,
// since the paragraphs below have to move with it.
const OPENS_IN_MARGIN =
  "group-data-[layout=margin]/margin:absolute group-data-[layout=margin]/margin:top-0 group-data-[layout=margin]/margin:left-0 group-data-[layout=margin]/margin:m-0 group-data-ready/margin:transition-[transform,clip-path] group-data-ready/margin:duration-200 group-data-ready/margin:ease-in-out";
const REVEAL = {
  open: "group-data-[layout=margin]/margin:[clip-path:inset(0_0_0_0_round_var(--radius-card))]",
  closed: "group-data-[layout=margin]/margin:[clip-path:inset(0_0_calc(100%-var(--head))_0_round_var(--radius-card))]",
};
/** The grid row's height in the margin: at once when opening, after the 200ms reveal when closing. */
const SNAP = {
  open: "group-data-[layout=margin]/margin:duration-0",
  closed: "group-data-[layout=margin]/margin:duration-0 group-data-[layout=margin]/margin:delay-200",
};

/**
 * The review's column: holds the heading, the essay and its margin. Writes
 * positions straight to the DOM (left, width, translateY) on every render and
 * resize, so placing notes never re-renders anything.
 */
type MarginLayout = "margin" | "stacked";

const LayoutContext = createContext<MarginLayout>("stacked");

function Layout({ className, children, ...props }: React.ComponentProps<"div">) {
  // Subscribes to the correction, so notes are re-placed whenever one opens,
  // resolves or the filter changes.
  const { noteStyle } = useCorrection();
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
    const place = () =>
      setLayout(
        noteStyle === "current" ? placeMargin(root, growing.current.size === 0) : placeAnchored(root),
      );
    place();
    const observer = new ResizeObserver(place);
    observer.observe(root);
    root.querySelectorAll("[data-margin-block]").forEach((b) => observer.observe(b));
    // Contents of collapsibles change size without their block's box doing
    // so until the row transition runs; observe them too.
    root.querySelectorAll("[data-collapse] > * > *").forEach((b) => observer.observe(b));
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
  const first = root.querySelector<HTMLElement>("[data-slot=correction-paragraph]");
  const right = first ? first.getBoundingClientRect().right : box.right;
  const room = document.documentElement.clientWidth - right - GAP - EDGE;

  if (room < NOTES_MIN) {
    root.dataset.layout = "stacked";
    root.style.minHeight = "";
    for (const b of blocks) b.style.cssText = "";
    return "stacked";
  }

  root.dataset.layout = "margin";
  // Widths first, so the heights read below are the final ones.
  for (const b of blocks) {
    b.style.left = `${right - box.left + GAP}px`;
    b.style.width = `${Math.min(room, NOTES_MAX)}px`;
  }
  let bottom = -Infinity;
  for (const b of blocks) {
    // Notes line up with their paragraph, the header's Aside with its status.
    const paragraph = b
      .closest("[data-slot=correction-row]")
      ?.querySelector<HTMLElement>("[data-slot=correction-paragraph]");
    const status = b.closest("[data-slot=correction-header]")?.firstElementChild;
    const want = paragraph
      ? paragraph.getBoundingClientRect().top - box.top
      : status && status !== b
        ? besideFirstLine(b, status) - box.top
        : 0;
    const height = b.offsetHeight;
    const y = height === 0 ? want : Math.max(want, bottom + STACK);
    if (!glide) b.style.transition = "none";
    b.style.transform = `translateY(${y}px)`;
    if (height > 0) bottom = y + height;
  }
  if (!glide) {
    // Commit the jumps, then give the notes their transition back.
    void root.offsetHeight;
    for (const b of blocks) b.style.transition = "";
  }
  // Notes can run past the last paragraph; keep them inside the page.
  root.style.minHeight = bottom > 0 ? `${bottom}px` : "";
  return "margin";
}

/**
 * The prototype's placement, for every style but `current`: each note (or
 * chips row, or fold) is its own block. With a note open, that note sits level
 * with its word's line and wins: blocks after it stack down from it, blocks
 * before it stack up from it (into the space above, even off screen), like
 * comments in Google Docs. With none open, everything stacks down, each block
 * as close to its own line as the one above allows.
 *
 * Heights are the settled ones (a note's height once its open/close finishes),
 * so every block glides once to where it ends up, in step with the card, and
 * nothing has to follow a resizing card frame by frame.
 */
function placeAnchored(root: HTMLElement): MarginLayout {
  const blocks = [...root.querySelectorAll<HTMLElement>("[data-margin-block]")];
  const box = root.getBoundingClientRect();
  const first = root.querySelector<HTMLElement>("[data-slot=correction-paragraph]");
  const right = first ? first.getBoundingClientRect().right : box.right;
  const room = document.documentElement.clientWidth - right - GAP - EDGE;

  if (room < NOTES_MIN) {
    root.dataset.layout = "stacked";
    root.style.minHeight = "";
    for (const b of blocks) {
      b.style.cssText = "";
      delete b.dataset.y;
    }
    return "stacked";
  }

  root.dataset.layout = "margin";
  for (const b of blocks) {
    b.style.left = `${right - box.left + GAP}px`;
    b.style.width = `${Math.min(room, NOTES_MAX)}px`;
  }

  const items = blocks.map((b) => ({ b, want: wantOf(b, root, box), h: settledHeight(b) }));
  const ys: number[] = items.map((i) => i.want);
  const anchor = items.findIndex((i) => i.b.hasAttribute("data-margin-anchor"));

  let bottom = -Infinity;
  for (let i = Math.max(anchor, 0); i < items.length; i++) {
    const { want, h } = items[i];
    if (h === 0) continue;
    ys[i] = i === anchor ? want : Math.max(want, bottom + STACK);
    bottom = ys[i] + h;
  }
  let top = anchor >= 0 ? ys[anchor] : 0;
  for (let i = anchor - 1; i >= 0; i--) {
    const { want, h } = items[i];
    if (h === 0) continue;
    ys[i] = Math.min(want, top - STACK - h);
    top = ys[i];
  }

  items.forEach(({ b }, i) => {
    const y = `${Math.round(ys[i])}`;
    if (b.dataset.y === y) return;
    b.dataset.y = y;
    b.style.transform = `translateY(${y}px)`;
  });
  root.style.minHeight = bottom > 0 ? `${bottom}px` : "";
  return "margin";
}

function wantOf(b: HTMLElement, root: HTMLElement, box: DOMRect) {
  const status = b.closest("[data-slot=correction-header]")?.firstElementChild;
  if (b.dataset.marginBlock === "aside") return status && status !== b ? besideFirstLine(b, status) - box.top : 0;
  const id = b.dataset.anchorFor;
  const word = id ? root.querySelector(`[data-anchor="${id}"]`) : null;
  if (word) {
    // The note's header row centered on the word's first line.
    const line = word.getClientRects()[0] ?? word.getBoundingClientRect();
    const head = b.querySelector<HTMLElement>("[data-note-head]");
    return line.top + line.height / 2 - (head?.offsetHeight ?? 40) / 2 - box.top;
  }
  const paragraph = b
    .closest("[data-slot=correction-row]")
    ?.querySelector<HTMLElement>("[data-slot=correction-paragraph]");
  return paragraph ? paragraph.getBoundingClientRect().top - box.top : 0;
}

/** A block's height once its collapsible part (if any) finishes opening or closing. */
function settledHeight(b: HTMLElement) {
  const grid = b.querySelector<HTMLElement>(":scope > [data-collapse]");
  const body = grid?.firstElementChild?.firstElementChild as HTMLElement | null | undefined;
  if (!grid || !body) return b.offsetHeight;
  return b.offsetHeight - grid.offsetHeight + (grid.dataset.collapse === "open" ? body.offsetHeight : 0);
}

/**
 * Where `aside` goes so its first row (a row of chips, a line of the trace)
 * is centered on the first line of `status` text, a 28px chip beside an 18px
 * line. Its offset inside the aside is relative, so a translate doesn't skew it.
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

/** One paragraph and its notes; the notes go to the margin, or under the paragraph without room. */
function Row({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="correction-row"
      className={cn("flex flex-col gap-3 group-data-[layout=margin]/margin:block", className)}
      {...props}
    />
  );
}

/** A paragraph of the essay with its mistakes marked. */
function Paragraph({
  blockId,
  text,
  className,
  ...props
}: React.ComponentProps<"p"> & { blockId: string; text: string }) {
  const { mistakes, activeId, shown } = useCorrection();
  const here = mistakes.filter((m) => m.blockId === blockId);

  const parts: React.ReactNode[] = [];
  let at = 0;
  for (const m of here) {
    parts.push(text.slice(at, m.start));
    const phrase = text.slice(m.start, m.end);
    if (resolved(m.status)) parts.push(<Done key={m.id} mistake={m} phrase={phrase} />);
    else if (m.id === activeId) parts.push(<FixInput key={m.id} mistake={m} />);
    else if (shown(m)) parts.push(<Mark key={m.id} mistake={m} />);
    else parts.push(phrase);
    at = m.end;
  }
  parts.push(text.slice(at));

  return (
    <p
      data-slot="correction-paragraph"
      lang="fr"
      // An empty paragraph keeps its line, as it does in the editor.
      className={cn("min-h-[1lh] max-w-prose min-w-0 font-serif text-essay text-text", className)}
      {...props}
    >
      {parts}
    </p>
  );
}

function Mark({ mistake: m }: { mistake: CorrectionMistake }) {
  const { select, open, claimFocus } = useCorrection();
  const tone = TONE[m.category];
  const ref = useRef<HTMLButtonElement>(null);
  // Set while focus comes back here from a closed fix, so that focus doesn't
  // reopen it.
  const returning = useRef(false);

  useLayoutEffect(() => {
    if (!claimFocus(m.id)) return;
    returning.current = true;
    ref.current?.focus();
    returning.current = false;
  });

  return (
    <button
      ref={ref}
      type="button"
      id={markId(m.id)}
      data-anchor={m.id}
      onClick={() => select(m.id)}
      // Tabbing onto a mistake opens it, the way a click does. Keyboard focus
      // only (:focus-visible): a mouse press focuses too, and its click toggles.
      onFocus={(e) => {
        if (!returning.current && e.currentTarget.matches(":focus-visible")) open(m.id);
      }}
      aria-label={`${CATEGORY_LABEL[m.category]} mistake ${m.number}: ${m.wrong}${m.status === "skipped" ? ", skipped" : ""}`}
      // Same metrics as plain text, so marking a phrase moves no words: the
      // padding is cancelled by an equal negative margin, and the number is a
      // superscript that takes no width: raised past the phrase's last letter.
      className={cn(
        // ::before stretches the hit area to the full line height; any taller
        // and marks on neighboring lines would overlap. On phones the note
        // under the paragraph is the 44px target for the same mistake.
        "relative -mx-0.5 inline cursor-pointer rounded-row px-0.5 underline outline-none before:absolute before:inset-x-0 before:-inset-y-0.5 decoration-[1.5px] underline-offset-4 decoration-skip-ink-none transition-colors duration-150 ease-out",
        m.status === "skipped" ? cn("decoration-dashed", tone.skipped) : tone.mark,
      )}
    >
      <span
        className={cn(
          "pointer-events-none absolute -right-0.5 bottom-4 font-sans text-sup font-medium tabular-nums select-none",
          tone.text,
        )}
        aria-hidden
      >
        {m.number}
      </span>
      {m.wrong}
    </button>
  );
}

function Done({ mistake: m, phrase }: { mistake: CorrectionMistake; phrase: string }) {
  return (
    <span
      data-anchor={m.id}
      title={m.status === "fixed" ? `Was “${m.wrong}”` : `Shown. Was “${m.wrong}”`}
      className={cn(
        "underline decoration-1 underline-offset-4",
        m.status === "fixed" ? "decoration-ok" : "decoration-text-3 decoration-dotted",
      )}
    >
      {phrase}
    </span>
  );
}

// The phrase, rewritable where it stands. Grows with its text; browsers
// without CSS field-sizing get a measured width.
function FixInput({ mistake: m }: { mistake: CorrectionMistake }) {
  const { values, setValue, check, close, pendingId, inputs } = useCorrection();
  const ref = useRef<HTMLInputElement>(null);
  const value = values[m.id] ?? m.wrong;

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || CSS.supports("field-sizing", "content")) return;
    const style = getComputedStyle(el);
    const ctx = document.createElement("canvas").getContext("2d");
    if (!ctx) return;
    ctx.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    el.style.width = `${Math.ceil(Math.max(ctx.measureText(value).width, 8) + 4)}px`;
  }, [value]);

  // Focus on open, caret at the end, and bring it into view if it's off screen.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    inputs.current.set(m.id, el);
    el.focus({ preventScroll: true });
    el.setSelectionRange(el.value.length, el.value.length);
    const r = el.getBoundingClientRect();
    if (r.top < 72 || r.bottom > innerHeight - 96) {
      const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
      el.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
    }
    const map = inputs.current;
    return () => void map.delete(m.id);
    // Only when this mistake's input mounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [m.id]);

  return (
    <input
      ref={ref}
      data-anchor={m.id}
      value={value}
      onChange={(e) => setValue(m.id, e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          check(m.id);
        } else if (e.key === "Escape") {
          e.preventDefault();
          close(m.id);
        } else if (e.key === "Tab" && !e.shiftKey) {
          // Straight to this mistake's Check, Hint and Skip, not the
          // paragraph's other marks.
          const first = document.getElementById(noteBodyId(m.id))?.querySelector("button");
          if (first) {
            e.preventDefault();
            first.focus();
          }
        }
      }}
      readOnly={pendingId === m.id}
      aria-busy={pendingId === m.id}
      aria-label={`Rewrite “${m.wrong}”`}
      aria-describedby={noteBodyId(m.id)}
      lang="fr"
      spellCheck={false}
      autoComplete="off"
      autoCorrect="off"
      autoCapitalize="off"
      enterKeyHint="done"
      data-gramm="false"
      data-lt-active="false"
      // The mark's exact box, so opening it moves no words: one line box
      // (top-aligned, 1lh tall), the same 2px side padding cancelled by a
      // negative margin, the same underline. Focus shows as the stronger
      // tint and the caret, not a ring that would paint over the neighbors.
      className={cn(
        "field-sizing-content -mx-0.5 inline-block h-[1lh] min-w-2 rounded-row border-0 px-0.5 align-top text-text underline outline-none decoration-[1.5px] underline-offset-4 decoration-skip-ink-none",
        TONE[m.category].field,
      )}
    />
  );
}

/** The notes for one paragraph's mistakes, in reading order. */
function Notes({ blockId, className, ...props }: React.ComponentProps<"div"> & { blockId: string }) {
  const { mistakes, shown, noteStyle, activeId } = useCorrection();
  const layout = use(LayoutContext);
  const here = mistakes.filter((m) => m.blockId === blockId && shown(m));

  if (noteStyle === "current") {
    return (
      <div
        data-margin-block="notes"
        className={cn("grid grid-cols-1 gap-1.5 font-sans empty:hidden", IN_MARGIN, className)}
        {...props}
      >
        {here.map((m) => (
          <Note key={m.id} mistake={m} />
        ))}
      </div>
    );
  }

  // Under the paragraph (no room beside it), the open note comes first, so
  // it sits right under the text instead of after every other note.
  const active = here.find((m) => m.id === activeId && m.status === "open");
  const stackedFirst = <T,>(list: T[], isActive: (x: T) => boolean) =>
    layout === "stacked" ? [...list.filter(isActive), ...list.filter((x) => !isActive(x))] : list;

  let children: React.ReactNode;
  if (noteStyle === "aligned") {
    children = stackedFirst(here, (m) => m === active).map((m) => <Note key={m.id} mistake={m} item />);
  } else if (noteStyle === "folded") {
    const done = here.filter((m) => m.status !== "open");
    const todo = here.filter((m) => m.status === "open");
    const parts = [
      ...(done.length > 0 ? [{ key: "fold", node: <Fold key="fold" done={done} /> }] : []),
      ...todo.map((m) => ({ key: m.id, node: <Note key={m.id} mistake={m} item /> })),
    ];
    children = stackedFirst(parts, (p) => p.key === active?.id).map((p) => p.node);
  } else {
    children = (
      <>
        <Chips list={here} />
        {active && <Note key={active.id} mistake={active} item />}
      </>
    );
  }

  return (
    <div className={cn("grid grid-cols-1 gap-1.5 font-sans empty:hidden", className)} {...props}>
      {children}
    </div>
  );
}

/** Folded: a paragraph's resolved and skipped notes as one quiet line that opens into a list. */
function Fold({ done }: { done: CorrectionMistake[] }) {
  const { select } = useCorrection();
  const [open, setOpen] = useState(false);
  // Counted as the app bar counts ("10 of 17 done"): skipped isn't done.
  const skipped = done.filter((m) => m.status === "skipped").length;

  return (
    <div
      data-margin-block="fold"
      className={cn("[--head:2.5rem] pointer-coarse:[--head:2.75rem]", OPENS_IN_MARGIN, open ? REVEAL.open : REVEAL.closed)}
    >
      <button
        type="button"
        data-note-head
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className={cn(
          "flex min-h-10 w-full cursor-pointer items-center gap-2 rounded-card px-3 py-1.5 text-start text-label text-text-3 transition-colors duration-150 ease-out hover:bg-sunken hover:text-text-2 pointer-coarse:min-h-11",
          FOCUS,
        )}
      >
        <CheckIcon className="size-3.5 shrink-0 text-ok" aria-hidden />
        <span className="flex-1 tabular-nums">
          {[done.length > skipped && `${done.length - skipped} done`, skipped > 0 && `${skipped} skipped`]
            .filter(Boolean)
            .join(" · ")}
        </span>
        <ChevronDownIcon
          aria-hidden
          className={cn("size-4 shrink-0 transition-transform duration-200 ease-in-out", open && "rotate-180")}
        />
      </button>
      <div
        data-collapse={open ? "open" : "closed"}
        inert={!open}
        className={cn(
          "grid transition-[grid-template-rows]",
          open ? "grid-rows-[1fr] duration-200 ease-out" : "grid-rows-[0fr] duration-150 ease-in",
          open ? SNAP.open : SNAP.closed,
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <ul className="grid pb-1">
            {done.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  tabIndex={-1}
                  disabled={m.status !== "skipped"}
                  onClick={() => select(m.id)}
                  aria-label={`Note ${m.number}: ${m.rule}, ${STATUS_LABEL[m.status].toLowerCase()}`}
                  className={cn(
                    "flex min-h-8 w-full items-center gap-2 rounded-row px-3 text-start pointer-coarse:min-h-11 transition-colors duration-150 ease-out not-disabled:cursor-pointer not-disabled:hover:bg-sunken",
                    FOCUS,
                  )}
                >
                  <span className={cn("w-5 shrink-0 text-caption font-semibold tabular-nums", TONE[m.category].text)}>
                    {m.number}
                  </span>
                  <TruncateWords
                    text={m.rule}
                    className={cn(
                      "text-label",
                      m.status === "skipped" ? "text-text-2" : "text-text-3 line-through decoration-border-strong",
                    )}
                  />
                  <StatusLabel status={m.status} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

/** Chips: every mistake in the paragraph as a numbered chip; the open one is also a card beside its word. */
function Chips({ list }: { list: CorrectionMistake[] }) {
  const { activeId, select } = useCorrection();
  if (list.length === 0) return null;
  return (
    <div data-margin-block="chips" className={cn("flex flex-wrap gap-1 pointer-coarse:gap-2", IN_MARGIN)}>
      {list.map((m) => {
        const active = m.id === activeId && m.status === "open";
        const done = resolved(m.status);
        return (
          <Tooltip key={m.id}>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  tabIndex={-1}
                  aria-disabled={done}
                  aria-pressed={active}
                  onClick={() => !done && select(m.id)}
                  aria-label={`Note ${m.number}: ${m.rule}${m.status === "open" ? "" : `, ${STATUS_LABEL[m.status].toLowerCase()}`}`}
                  className={cn(
                    "flex h-7 min-w-7 items-center justify-center rounded-full border px-1.5 text-caption font-semibold tabular-nums transition-colors duration-150 ease-out pointer-coarse:h-11 pointer-coarse:min-w-11",
                    FOCUS,
                    done
                      ? cn(
                          "cursor-default border-transparent text-text-3 underline underline-offset-3 decoration-[1.5px]",
                          m.status === "fixed" ? "decoration-ok" : "decoration-text-3 decoration-dotted",
                        )
                      : cn(
                          "cursor-pointer hover:bg-sunken",
                          TONE[m.category].text,
                          m.status === "skipped" ? "border-dashed border-border-strong" : "bg-surface",
                          active && "border-border-strong bg-sunken",
                        ),
                  )}
                />
              }
            >
              {m.number}
            </TooltipTrigger>
            <TooltipContent>
              {m.rule}
              {m.status !== "open" && ` · ${STATUS_LABEL[m.status]}`}
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}

function StatusLabel({ status }: { status: MarkStatus }) {
  if (status === "open") return null;
  return (
    <span className={cn("shrink-0 text-caption", status === "fixed" ? "text-ok" : "text-text-3")}>
      {status === "fixed" && "✓ "}
      {STATUS_LABEL[status]}
    </span>
  );
}

const STATUS_LABEL: Record<MarkStatus, string> = { open: "", fixed: "Fixed", revealed: "Shown", skipped: "Skipped" };

function Note({ mistake: m, item = false }: { mistake: CorrectionMistake; item?: boolean }) {
  const { activeId, select, check, answer, skip, hint, pendingId, close, inputs, focusNext } = useCorrection();
  const open = activeId === m.id && m.status === "open";
  const done = resolved(m.status);
  const tone = TONE[m.category];
  const pending = pendingId === m.id;

  return (
    <div
      data-state={m.status}
      // Placed on its own in the margin (every style but `current`).
      data-margin-block={item ? "note" : undefined}
      data-anchor-for={item ? m.id : undefined}
      data-margin-anchor={item && open ? "" : undefined}
      className={cn(
        "rounded-card border transition-colors duration-150",
        done ? "bg-transparent" : "bg-surface",
        open && "border-border-strong",
        // The header plus the card's top and bottom border.
        item &&
          cn(
            "[--head:calc(2.5rem+2px)] pointer-coarse:[--head:calc(2.75rem+2px)]",
            OPENS_IN_MARGIN,
            open ? REVEAL.open : REVEAL.closed,
          ),
      )}
    >
      {/* Out of the Tab order: each mistake's Tab stop is its mark in the text,
          which opens this same note. */}
      <button
        type="button"
        data-note-head
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
        data-collapse={open ? "open" : "closed"}
        inert={!open}
        className={cn(
          "grid transition-[grid-template-rows]",
          open ? "grid-rows-[1fr] duration-200 ease-out" : "grid-rows-[0fr] duration-150 ease-in",
          item && (open ? SNAP.open : SNAP.closed),
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div
            id={noteBodyId(m.id)}
            onKeyDown={(e) => {
              const buttons = e.currentTarget.querySelectorAll("button");
              if (e.key === "Escape") {
                e.preventDefault();
                close(m.id);
              } else if (e.key === "Tab" && e.shiftKey && e.target === buttons[0]) {
                // Back to the phrase being fixed.
                e.preventDefault();
                inputs.current.get(m.id)?.focus();
              } else if (e.key === "Tab" && !e.shiftKey && e.target === buttons[buttons.length - 1]) {
                // On to the next mistake in reading order, which opens on
                // focus. The page order would skip later marks in this
                // paragraph, since its notes come after its text.
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
            {/* Touch keyboards have no Enter key to name; their Done key checks too. */}
            <p className="mt-3 text-caption text-text-3 pointer-coarse:hidden">
              <Kbd>Enter</Kbd> to check
            </p>
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

export const Correction = Object.assign(CorrectionRoot, { Layout, Header, Aside, Filters, Row, Paragraph, Notes });
