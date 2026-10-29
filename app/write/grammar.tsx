"use client";

import { useEffect, useRef, useState } from "react";

import { Popover, PopoverContent } from "@/components/ui/popover";
import type { GrammarIssue } from "@/lib/grammar";
import { cn } from "@/lib/utils";

import { findGrammar } from "@/lib/api/client";
import type { Block } from "./blocks";
import { diffText } from "./marks";

// The essay's grammar and spelling underlines (AGENTS.md, Grammar): what
// Grammalecte finds (lib/grammar.ts), underlined in the text with its
// explanation on hover, or while the caret is inside the words. Never in
// the margin; the answer only when asked for. The writer types the fix, and
// the underline goes once the paragraph is checked again.
//
// - useGrammar checks each paragraph 600ms after it stops changing; only
//   paragraphs it hasn't seen go to the server, and results are kept for the
//   session by text, so undo or retyping a sentence costs nothing.
// - GrammarMarks draws them in the editor's underlay (renderUnderlay), the
//   layer under the transparent textarea that the review's marks use.
// - GrammarTip shows the explanation, and the answer on request. The underlay never gets pointer
//   events (the textarea sits on it), so hover is found by comparing the
//   pointer with each underline's boxes, which have the text's own layout.

/** Issues by paragraph text, for the session. */
const checked = new Map<string, GrammarIssue[]>();
const pending = new Set<string>();
/** The last checked text and issues drawn for each paragraph, to keep while it's edited. */
const drawn = new Map<string, { text: string; issues: GrammarIssue[] }>();

const WAIT_MS = 600;

/** Checks the essay's paragraphs as they settle; returns each paragraph's issues. */
export function useGrammar(blocks: Block[], enabled = true) {
  const [, setVersion] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    const todo = [...new Set(blocks.map((b) => b.text))].filter((t) => t.trim() && !checked.has(t) && !pending.has(t));
    if (!todo.length) return;
    const wait = setTimeout(async () => {
      todo.forEach((t) => pending.add(t));
      try {
        const found = await findGrammar(todo);
        todo.forEach((t, i) => checked.set(t, found[i]));
        setVersion((v) => v + 1);
      } catch (error) {
        console.error(error);
      } finally {
        todo.forEach((t) => pending.delete(t));
      }
    }, WAIT_MS);
    return () => clearTimeout(wait);
  }, [blocks, enabled]);

  return issuesOf;
}

/**
 * A paragraph's issues: its own once checked; until then, the last ones
 * drawn for it, moved with the edit, minus any the edit touched, so
 * underlines don't flicker away while the writer types elsewhere in it.
 */
function issuesOf(block: Block): GrammarIssue[] {
  const fresh = checked.get(block.text);
  if (fresh) {
    drawn.set(block.id, { text: block.text, issues: fresh });
    return fresh;
  }
  const last = drawn.get(block.id);
  if (!last) return [];
  const { at, removed, inserted } = diffText(last.text, block.text);
  const delta = inserted.length - removed;
  return last.issues.flatMap((i) =>
    i.end < at ? [i] : i.start > at + removed ? [{ ...i, start: i.start + delta, end: i.end + delta }] : [],
  );
}

/** A paragraph's underlines, in the editor's underlay. */
export function GrammarMarks({ text, issues, className }: { text: string; issues: GrammarIssue[]; className?: string }) {
  const parts: React.ReactNode[] = [];
  let at = 0;
  for (const issue of issues) {
    if (issue.start < at || issue.end > text.length) continue;
    parts.push(text.slice(at, issue.start));
    parts.push(
      <span
        key={issue.start}
        data-grammar=""
        data-start={issue.start}
        data-end={issue.end}
        data-message={issue.message}
        data-answers={JSON.stringify(issue.answers)}
        className="underline decoration-warn/70 decoration-wavy decoration-1 underline-offset-[5px] decoration-skip-ink-none"
      >
        {text.slice(issue.start, issue.end)}
      </span>,
    );
    at = issue.end;
  }
  parts.push(text.slice(at));
  return (
    <div data-slot="grammar-marks" className={cn("absolute inset-0", className)}>
      {parts}
    </div>
  );
}

const DWELL_MS = 250;
/** The sticky app bar is 56px: a card that would sit under it goes below the words instead. */
const ABOVE_THE_BAR = { top: 64, right: 8, bottom: 8, left: 8 };
/** Time to cross from the words to the card before it closes. */
const LEAVE_MS = 200;

/**
 * The explanation of the underline under the pointer, or the one the caret
 * is inside (strictly: a caret at a word's end, where typing leaves it, shows
 * nothing), in a small card above the words (below when there's no room)
 * that stays open while the pointer is on it.
 * "Answer" puts Grammalecte's corrections under the explanation; the
 * writer still types the fix. Nothing in it takes focus, so the caret stays
 * in the essay. Typing hides it until the caret moves again. `root` is the
 * editor's element id.
 */
export function GrammarTip({ root }: { root: string }) {
  const [tip, setTip] = useState<HTMLElement | null>(null);
  const [answered, setAnswered] = useState<HTMLElement | null>(null);
  const card = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let hovered: HTMLElement | null = null;
    let atCaret: HTMLElement | null = null;
    let typedAt = 0;
    let frame = 0;
    let wait: ReturnType<typeof setTimeout> | undefined;
    const show = () => setTip(hovered ?? atCaret);

    const spans = () => [...(document.getElementById(root)?.querySelectorAll<HTMLElement>("[data-grammar]") ?? [])];

    function onPointerMove(e: PointerEvent) {
      if (e.pointerType !== "mouse") return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        // On the card: keep it, and whatever it's about.
        if (e.target instanceof Node && card.current?.contains(e.target)) {
          clearTimeout(wait);
          return;
        }
        const under =
          spans().find((s) =>
            [...s.getClientRects()].some((r) => e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top - 2 && e.clientY <= r.bottom + 4),
          ) ?? null;
        if (under === hovered) {
          clearTimeout(wait);
          return;
        }
        clearTimeout(wait);
        wait = setTimeout(
          () => {
            hovered = under;
            show();
          },
          under ? DWELL_MS : LEAVE_MS,
        );
      });
    }

    function onSelectionChange() {
      const el = document.activeElement;
      let next: HTMLElement | null = null;
      if (el instanceof HTMLTextAreaElement && el.selectionStart === el.selectionEnd && document.getElementById(root)?.contains(el)) {
        const caret = el.selectionStart;
        next =
          [...(el.parentElement?.querySelectorAll<HTMLElement>("[data-grammar]") ?? [])].find(
            (s) => Number(s.dataset.start) < caret && caret < Number(s.dataset.end),
          ) ?? null;
      }
      // The caret moving because of typing isn't the writer going to the words.
      if (performance.now() - typedAt < 50) next = null;
      if (next === atCaret) return;
      atCaret = next;
      show();
    }

    function onInput() {
      typedAt = performance.now();
      atCaret = null;
      show();
    }

    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("selectionchange", onSelectionChange);
    document.addEventListener("input", onInput, true);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(wait);
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("selectionchange", onSelectionChange);
      document.removeEventListener("input", onInput, true);
    };
  }, [root]);

  // A span replaced by a new check leaves the page; its card goes with it.
  const anchor = tip?.isConnected ? tip : null;
  const answers: string[] = anchor ? JSON.parse(anchor.dataset.answers ?? "[]") : [];
  return (
    <Popover open={anchor !== null} onOpenChange={(open) => !open && setTip(null)}>
      <PopoverContent
        ref={card}
        anchor={anchor}
        // Above the words, below when there's no room above (the app bar counts).
        side="top"
        sideOffset={6}
        collisionPadding={ABOVE_THE_BAR}
        initialFocus={false}
        finalFocus={false}
        lang="fr"
        className="w-auto max-w-72 gap-2 p-2.5 text-caption"
      >
        <p>{anchor?.dataset.message}</p>
        {answers.length > 0 &&
          (answered === anchor ? (
            <p className="font-serif text-ui">{answers.join(" · ")}</p>
          ) : (
            // Text only, in the corner: the explanation comes first. Its
            // ::before reaches a 40px hit area (44px on touch) without padding.
            <button
              type="button"
              lang="en"
              className="relative self-end text-caption text-text-3 transition-colors duration-150 ease-out before:absolute before:-inset-x-2 before:-inset-y-3 hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring pointer-coarse:before:-inset-y-3.5"
              // Keep the caret in the essay.
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setAnswered(anchor)}
            >
              Answer
            </button>
          ))}
      </PopoverContent>
    </Popover>
  );
}
