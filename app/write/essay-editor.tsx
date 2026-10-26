"use client";

import type { BaseUIEvent } from "@base-ui/react/types";
import { ArrowDownIcon, ArrowUpIcon, GripVerticalIcon } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import {
  createBlock,
  insertText,
  isBefore,
  mergeWithNext,
  mergeWithPrevious,
  moveBlock,
  replaceRange,
  splitBlock,
  textBetween,
  type Block,
  type Caret,
  type Edit,
} from "./blocks";
import { caretTop, caretX, isOnFirstLine, isOnLastLine, offsetAtX } from "./caret";

// Block-based essay editor: one auto-growing <textarea> per paragraph. Plain
// text only, so the browser handles typing, accents, IME and selection inside
// a paragraph; this component handles everything that crosses paragraphs
// (Enter, Backspace/Delete at the edges, arrows, paste, reordering) and undo.
//
// A selection can't span textareas, so one that crosses paragraphs (⌘A,
// Shift+arrows past an edge, Shift+click, dragging out of a paragraph) swaps
// the textareas for plain <p>s with the same text metrics and uses the
// browser's own selection on them: it looks and copies like any page text.
// Typing, deleting or pasting replaces it (replaceRange) and the textareas
// come back; a selection that shrinks back into one paragraph, or a click,
// lands in that paragraph's textarea. Never contenteditable.

type Snapshot = { blocks: Block[]; caret: Caret };

type History = {
  undo: Snapshot[];
  redo: Snapshot[];
  // The block and time of the current typing run, coalesced into one step.
  typing: { blockId: string; at: number } | null;
};

/** A paragraph being dragged: where it started, where it would land, how far it has moved. */
type Drag = { id: string; from: number; to: number; dy: number; shift: number };

const HISTORY_LIMIT = 200;
// A pause this long starts a new undo step even mid-word.
const TYPING_PAUSE_MS = 1000;
// Pointer travel before a press on the handle becomes a drag instead of a click.
const DRAG_THRESHOLD_PX = 4;
// Distance from the viewport edges where dragging scrolls the page. The top
// one clears the sticky header.
const SCROLL_EDGE_TOP_PX = 120;
const SCROLL_EDGE_BOTTOM_PX = 64;

/** Entering the cross-paragraph selection: where it starts, and how to reach its other end. */
type SpanSetup = {
  anchor: Caret;
  focus?: Caret;
  /** Extend to the text under this point (Shift+click, a drag). */
  pointer?: { x: number; y: number };
  /** Then move the end like Shift+arrow would. */
  extend?: { direction: "forward" | "backward"; granularity: "character" | "word" | "line" };
};

/** A selection to restore inside one paragraph's textarea. */
type Landing = { blockId: string; start: number; end: number; backward: boolean };

/**
 * Save `before` as an undo step. Keystrokes in the same paragraph without a
 * pause extend the current step instead (`typingIn` is that paragraph).
 */
function recordStep(h: History, before: Snapshot, typingIn?: string) {
  const now = Date.now();
  if (typingIn && h.typing?.blockId === typingIn && now - h.typing.at < TYPING_PAUSE_MS) {
    h.typing.at = now;
    return;
  }
  h.undo.push(before);
  if (h.undo.length > HISTORY_LIMIT) h.undo.shift();
  h.redo = [];
  h.typing = typingIn ? { blockId: typingIn, at: now } : null;
}

// Writing help Ink leaves off: autocorrect (a word changed for the writer
// isn't a mistake they fixed) and the Grammarly and LanguageTool extensions.
// Spellcheck is the `spellCheck` prop.
const NO_WRITING_HELP = {
  autoCorrect: "off",
  autoCapitalize: "off",
  autoComplete: "off",
  "data-gramm": "false",
  "data-gramm_editor": "false",
  "data-enable-grammarly": "false",
  "data-lt-active": "false",
} as const;

type EssayEditorProps = Omit<React.ComponentProps<"div">, "defaultValue" | "onChange"> & {
  value?: Block[];
  defaultValue?: Block[];
  onValueChange?: (blocks: Block[]) => void;
  /** Shown in the first paragraph while the essay is empty. */
  placeholder?: string;
  /**
   * On mount (fine pointers only), put the caret back where the writer left
   * it (`defaultCaret`), scrolling it to the middle of the window if it's off
   * screen. Without one, nothing takes focus: never a place the writer
   * never was, like the end of the essay.
   */
  autoFocus?: boolean;
  /** Where the writer left the caret: what `onLeave` reported, saved with the draft. */
  defaultCaret?: Caret | null;
  /** Focus left the essay; `caret` is where the writer was, to restore with `defaultCaret`. */
  onLeave?: (caret: Caret) => void;
  /** Locks the text and its order (time's up, paused). The caret can still move and select. */
  readOnly?: boolean;
  /** The browser's spellcheck, in the editor's `lang` (French). */
  spellCheck?: boolean;
  /**
   * ↑ on the first line or ← at the very start of the first paragraph: move
   * focus to whatever sits above the essay (the title). `x` is the caret's
   * horizontal position for ↑, so the caret can land under it; null for ←.
   */
  onExitTop?: (x: number | null) => void;
};

export function EssayEditor({
  value,
  defaultValue,
  onValueChange,
  placeholder,
  autoFocus = false,
  defaultCaret,
  onLeave,
  readOnly = false,
  spellCheck = true,
  onExitTop,
  lang = "fr",
  className,
  ...props
}: EssayEditorProps) {
  const [uncontrolled, setUncontrolled] = useState<Block[]>(() => defaultValue ?? [createBlock()]);
  const blocks = value ?? uncontrolled;

  const rootRef = useRef<HTMLDivElement>(null);
  const textareas = useRef(new Map<string, HTMLTextAreaElement>());
  const wrappers = useRef(new Map<string, HTMLDivElement>());
  const pendingCaret = useRef<Caret | null>(null);
  const history = useRef<History>({ undo: [], redo: [], typing: null });
  // Where each paragraph was on screen just before a reorder, so the layout
  // effect can slide them from there to their new places.
  const flipFrom = useRef<{ tops: Map<string, number>; settle: "slide" | "drop" } | null>(null);

  const [drag, setDrag] = useState<Drag | null>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  // The paragraph with focus now (shows its handle on touch screens), and the
  // last one that had it: the essay's single Tab stop, so Tab enters and
  // leaves the essay in one press and arrows move between paragraphs.
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [tabStopId, setTabStopId] = useState<string | null>(null);
  const tabStop = blocks.some((b) => b.id === tabStopId) ? tabStopId : blocks[0]?.id;

  // The cross-paragraph selection (see the top of the file): the <p>s that
  // stand in for the textareas, its fixed end, and what to do on entering
  // and leaving it.
  const [spanning, setSpanning] = useState(false);
  const spanningNow = useRef(false);
  const paragraphs = useRef(new Map<string, HTMLParagraphElement>());
  const spanSetup = useRef<SpanSetup | null>(null);
  const spanAnchor = useRef<Caret | null>(null);
  const landing = useRef<Landing | null>(null);
  const dragSelecting = useRef(false);

  function commit(next: Block[], caret: Caret | null) {
    // Any edit puts the textareas back to type in.
    setSpanning(false);
    pendingCaret.current = caret;
    if (value === undefined) setUncontrolled(next);
    onValueChange?.(next);
  }

  function apply(edit: Edit | null, before: Caret) {
    if (!edit) return;
    remember(before);
    commit(edit.blocks, edit.caret);
  }

  function remember(caret: Caret, typingIn?: string) {
    recordStep(history.current, { blocks, caret }, typingIn);
  }

  function travel(from: "undo" | "redo") {
    const h = history.current;
    const snapshot = h[from].pop();
    if (!snapshot) return;
    const to = from === "undo" ? "redo" : "undo";
    h[to].push({ blocks, caret: focusedCaret() ?? snapshot.caret });
    h.typing = null;
    commit(snapshot.blocks, snapshot.caret);
  }

  /**
   * Move a paragraph to index `to`, as one undo step. The caret stays where it
   * was, or lands at the start of the moved paragraph if nothing had focus.
   */
  function reorder(id: string, to: number, settle: "slide" | "drop") {
    const next = moveBlock(blocks, id, to);
    if (next === blocks) return;
    const caret = focusedCaret() ?? { blockId: id, offset: 0 };
    flipFrom.current = { tops: measureTops(), settle };
    remember(caret);
    commit(next, caret);
    const index = next.findIndex((b) => b.id === id);
    setAnnouncement(`Paragraph moved to position ${index + 1} of ${next.length}.`);
  }

  function measureTops() {
    const tops = new Map<string, number>();
    wrappers.current.forEach((el, id) => tops.set(id, el.getBoundingClientRect().top));
    return tops;
  }

  function focusedCaret(): Caret | null {
    for (const [blockId, el] of textareas.current) {
      if (el === document.activeElement) return { blockId, offset: el.selectionStart };
    }
    return null;
  }

  function focusAt({ blockId, offset }: Caret) {
    const el = textareas.current.get(blockId);
    if (!el) return;
    el.focus({ preventScroll: false });
    el.setSelectionRange(offset, offset);
  }

  // Place the caret once the DOM reflects an edit.
  useLayoutEffect(() => {
    if (!pendingCaret.current) return;
    focusAt(pendingCaret.current);
    pendingCaret.current = null;
  });

  // Entering the cross-paragraph selection: once the <p>s are in, select
  // from the anchor to its other end and take focus, so keys and copy come here.
  useLayoutEffect(() => {
    spanningNow.current = spanning;
    const setup = spanSetup.current;
    if (!spanning || !setup) return;
    spanSetup.current = null;
    rootRef.current?.focus({ preventScroll: true });
    const focus = (setup.pointer && caretAtPoint(setup.pointer.x, setup.pointer.y)) || setup.focus || setup.anchor;
    select(setup.anchor, focus);
    if (setup.extend) {
      getSelection()?.modify("extend", setup.extend.direction, setup.extend.granularity);
      settleSpan();
    }
  });

  // Leaving it for one paragraph: restore the selection in its textarea.
  useLayoutEffect(() => {
    const to = landing.current;
    if (spanning || !to) return;
    landing.current = null;
    const el = textareas.current.get(to.blockId);
    if (!el) return;
    el.focus({ preventScroll: true });
    el.setSelectionRange(to.start, to.end, to.backward ? "backward" : "forward");
  });

  function beginSpan(setup: SpanSetup) {
    spanSetup.current = setup;
    spanAnchor.current = setup.anchor;
    history.current.typing = null;
    setSpanning(true);
  }

  function land(to: Landing) {
    landing.current = to;
    setSpanning(false);
  }

  function selectAll() {
    const last = blocks[blocks.length - 1];
    const anchor = { blockId: blocks[0].id, offset: 0 };
    const focus = { blockId: last.id, offset: last.text.length };
    if (spanningNow.current) {
      spanAnchor.current = anchor;
      select(anchor, focus);
    } else {
      beginSpan({ anchor, focus });
    }
  }

  /** Select between two carets on the <p>s. */
  function select(anchor: Caret, focus: Caret) {
    const a = domPoint(anchor);
    const f = domPoint(focus);
    if (a && f) getSelection()?.setBaseAndExtent(a.node, a.offset, f.node, f.offset);
  }

  function domPoint({ blockId, offset }: Caret) {
    const p = paragraphs.current.get(blockId);
    if (!p) return null;
    const text = p.firstChild;
    return text?.nodeType === Node.TEXT_NODE
      ? { node: text, offset: Math.min(offset, text.textContent?.length ?? 0) }
      : { node: p as Node, offset: 0 };
  }

  /** A DOM selection point as a caret in the essay; points outside it clamp to its start or end. */
  function toCaret(node: Node | null, offset: number): Caret | null {
    const root = rootRef.current;
    if (!root || !node) return null;
    const last = blocks[blocks.length - 1];
    const start = { blockId: blocks[0].id, offset: 0 };
    const end = { blockId: last.id, offset: last.text.length };
    if (!root.contains(node)) {
      return root.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_PRECEDING ? start : end;
    }
    const el = node instanceof Element ? node : node.parentElement;
    const p = el?.closest<HTMLElement>("[data-block]");
    if (p) {
      const id = p.dataset.block!;
      const length = blocks.find((b) => b.id === id)?.text.length ?? 0;
      const at = node.nodeType === Node.TEXT_NODE ? Math.min(offset, length) : offset === 0 ? 0 : length;
      return { blockId: id, offset: at };
    }
    // Between paragraphs: the start of the paragraph whose wrapper it's in,
    // or of the next one when it's on the root.
    const wrapper = el?.closest<HTMLElement>("[data-wrapper]");
    if (wrapper) return { blockId: wrapper.dataset.wrapper!, offset: 0 };
    const next = blocks[offset];
    return node === root && next ? { blockId: next.id, offset: 0 } : end;
  }

  /** The caret under a point on screen; above or below the essay, its start or end. */
  function caretAtPoint(x: number, y: number): Caret | null {
    const box = rootRef.current?.getBoundingClientRect();
    if (!box) return null;
    const last = blocks[blocks.length - 1];
    if (y < box.top) return { blockId: blocks[0].id, offset: 0 };
    if (y > box.bottom) return { blockId: last.id, offset: last.text.length };
    const point = pointAt(x, y);
    return point ? toCaret(point.node, point.offset) : null;
  }

  /** The browser's selection as essay carets, in reading order. */
  function spanRange() {
    const sel = getSelection();
    if (!sel?.anchorNode) return null;
    const anchor = toCaret(sel.anchorNode, sel.anchorOffset);
    const focus = toCaret(sel.focusNode, sel.focusOffset);
    if (!anchor || !focus) return null;
    const forward = !isBefore(blocks, focus, anchor);
    return { anchor, focus, forward, start: forward ? anchor : focus, end: forward ? focus : anchor };
  }

  /** A selection back inside one paragraph (or a click) goes back to its textarea. */
  function settleSpan() {
    const r = spanRange();
    if (r && r.start.blockId === r.end.blockId) {
      land({ blockId: r.start.blockId, start: r.start.offset, end: r.end.offset, backward: !r.forward });
    }
  }

  /** Type over, delete or paste onto the cross-paragraph selection. */
  function replaceSpan(text: string, thenSplit = false) {
    const r = spanRange();
    if (!r || readOnly) return;
    let edit = replaceRange(blocks, r.start, r.end, text);
    if (thenSplit) edit = splitBlock(edit.blocks, edit.caret.blockId, edit.caret.offset, edit.caret.offset);
    remember(r.start);
    commit(edit.blocks, edit.caret);
  }

  function onSpanKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (!spanning || e.target !== e.currentTarget || e.nativeEvent.isComposing) return;
    const r = spanRange();
    if (!r) return;
    const mod = e.metaKey || e.ctrlKey;
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;

    if (mod && !e.altKey && key === "a") {
      e.preventDefault();
      selectAll();
      return;
    }
    if (mod && !e.altKey && (key === "z" || (key === "y" && e.ctrlKey && !e.metaKey))) {
      e.preventDefault();
      if (!readOnly) travel(key === "z" && !e.shiftKey ? "undo" : "redo");
      return;
    }

    if (key.startsWith("Arrow")) {
      e.preventDefault();
      const back = key === "ArrowLeft" || key === "ArrowUp";
      if (e.shiftKey) {
        const vertical = key === "ArrowUp" || key === "ArrowDown";
        const granularity = mod ? (vertical ? "documentboundary" : "lineboundary") : e.altKey ? "word" : vertical ? "line" : "character";
        getSelection()?.modify("extend", back ? "backward" : "forward", granularity);
        settleSpan();
      } else {
        const at = back ? r.start : r.end;
        land({ blockId: at.blockId, start: at.offset, end: at.offset, backward: false });
      }
      return;
    }
    if (key === "Escape") {
      e.preventDefault();
      land({ blockId: r.focus.blockId, start: r.focus.offset, end: r.focus.offset, backward: false });
      return;
    }
    // ⌘C, ⌘X and ⌘V arrive as copy, cut and paste; other shortcuts pass.
    if (mod) return;

    if (key === "Backspace" || key === "Delete" || key === "Dead") {
      // A dead key (an accent about to be typed) can't compose over a
      // selection here, so it only clears it; the next letter types normally.
      e.preventDefault();
      replaceSpan("");
    } else if (key === "Enter") {
      if (e.altKey) return;
      e.preventDefault();
      replaceSpan("", true);
    } else if (e.key.length === 1) {
      e.preventDefault();
      replaceSpan(e.key);
    }
  }

  function onSpanCopy(e: React.ClipboardEvent<HTMLDivElement>, cut: boolean) {
    if (!spanning) return;
    const r = spanRange();
    if (!r) return;
    e.preventDefault();
    e.clipboardData.setData("text/plain", textBetween(blocks, r.start, r.end));
    if (cut) replaceSpan("");
  }

  function onSpanPaste(e: React.ClipboardEvent<HTMLDivElement>) {
    if (!spanning) return;
    const text = e.clipboardData.getData("text/plain");
    if (!text) return;
    e.preventDefault();
    replaceSpan(text);
  }

  /** The fixed end of the textarea selection that has focus. */
  function selectionAnchor(): Caret | null {
    for (const [blockId, el] of textareas.current) {
      if (el === document.activeElement) {
        return { blockId, offset: el.selectionDirection === "backward" ? el.selectionEnd : el.selectionStart };
      }
    }
    return null;
  }

  // Shift+click in another paragraph selects from the caret to there.
  function onTextMouseDown(block: Block, e: React.MouseEvent<HTMLTextAreaElement>) {
    if (e.button !== 0 || !e.shiftKey) return;
    const anchor = selectionAnchor();
    if (!anchor || anchor.blockId === block.id) return;
    e.preventDefault();
    beginSpan({ anchor, pointer: { x: e.clientX, y: e.clientY } });
  }

  // Selecting with the mouse is the textarea's own until the pointer leaves
  // its paragraph; from then the selection follows the pointer across them.
  function onTextPointerDown(block: Block, e: React.PointerEvent<HTMLTextAreaElement>) {
    if (e.button !== 0 || e.pointerType === "touch" || e.shiftKey) return;
    const onMove = (ev: PointerEvent) => {
      if (!(ev.buttons & 1)) return stop();
      const box = wrappers.current.get(block.id)?.getBoundingClientRect();
      if (!box || (ev.clientY >= box.top && ev.clientY <= box.bottom)) return;
      const el = textareas.current.get(block.id);
      stop();
      if (!el) return;
      const anchor = { blockId: block.id, offset: el.selectionDirection === "backward" ? el.selectionEnd : el.selectionStart };
      dragSelect(anchor, ev.clientX, ev.clientY);
    };
    const stop = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", stop);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", stop);
  }

  function dragSelect(anchor: Caret, x: number, y: number) {
    dragSelecting.current = true;
    beginSpan({ anchor, pointer: { x, y } });
    let pointer = { x, y };
    // Each frame, after the browser's own handling of the move: scroll near
    // the edges, then select from the anchor to the text under the pointer.
    const follow = () => {
      const speed =
        pointer.y < SCROLL_EDGE_TOP_PX
          ? -(SCROLL_EDGE_TOP_PX - pointer.y) / 4
          : pointer.y > window.innerHeight - SCROLL_EDGE_BOTTOM_PX
            ? (pointer.y - (window.innerHeight - SCROLL_EDGE_BOTTOM_PX)) / 4
            : 0;
      if (speed) window.scrollBy(0, speed);
      const focus = caretAtPoint(pointer.x, pointer.y);
      if (focus && spanAnchor.current && spanningNow.current) select(spanAnchor.current, focus);
      frame = requestAnimationFrame(follow);
    };
    let frame = requestAnimationFrame(follow);
    const onMove = (ev: PointerEvent) => {
      pointer = { x: ev.clientX, y: ev.clientY };
    };
    const onUp = () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      dragSelecting.current = false;
      settleSpan();
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  }

  // After a reorder, slide every paragraph from where it was to where it is
  // now (FLIP). A drop settles the dragged paragraph into its slot; moves from
  // the keyboard or menu slide both paragraphs that swap.
  useLayoutEffect(() => {
    const flip = flipFrom.current;
    if (!flip) return;
    flipFrom.current = null;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const easing = cssVar(flip.settle === "drop" ? "--ease-out" : "--ease-in-out");
    const duration = flip.settle === "drop" ? 150 : 200;
    wrappers.current.forEach((el, id) => {
      const before = flip.tops.get(id);
      if (before === undefined) return;
      const delta = before - el.getBoundingClientRect().top;
      if (Math.abs(delta) < 1) return;
      el.animate([{ translate: `0 ${delta}px` }, { translate: "0 0" }], { duration, easing });
    });
  });

  // Edit > Undo in the menu bar and other non-keyboard undo arrives as
  // beforeinput; route it to our history so it can cross paragraphs.
  const travelRef = useRef(travel);
  const readOnlyRef = useRef(readOnly);
  useLayoutEffect(() => {
    travelRef.current = travel;
    readOnlyRef.current = readOnly;
  });
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const onBeforeInput = (e: InputEvent) => {
      if (e.inputType === "historyUndo" || e.inputType === "historyRedo") {
        e.preventDefault();
        if (!readOnlyRef.current) travelRef.current(e.inputType === "historyUndo" ? "undo" : "redo");
      }
    };
    root.addEventListener("beforeinput", onBeforeInput);
    return () => root.removeEventListener("beforeinput", onBeforeInput);
  }, []);

  // Without CSS field-sizing, size each textarea to its content, and again
  // whenever the editor's width changes the wrapping.
  useLayoutEffect(() => {
    if (supportsFieldSizing()) return;
    textareas.current.forEach(fitHeight);
  }, [blocks]);
  useEffect(() => {
    const root = rootRef.current;
    if (!root || supportsFieldSizing()) return;
    const observer = new ResizeObserver(() => textareas.current.forEach(fitHeight));
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!autoFocus || !matchMedia("(pointer: fine)").matches) return;
    // Only where the writer left it; with no saved caret, nothing takes focus
    // (never a guess like the end of the essay).
    const caret = defaultCaret && blocks.some((b) => b.id === defaultCaret.blockId) ? defaultCaret : null;
    if (!caret) return;
    const el = textareas.current.get(caret.blockId);
    if (!el) return;
    const offset = Math.min(caret.offset, el.value.length);
    const lineHeight = parseFloat(getComputedStyle(el).lineHeight);
    const line = el.getBoundingClientRect().top + caretTop(el, offset);
    if (line < 0 || line + lineHeight > innerHeight) {
      // Off screen: bring back the place the writer left.
      window.scrollTo({ top: scrollY + line + lineHeight / 2 - innerHeight / 2 });
    }
    el.focus({ preventScroll: true });
    el.setSelectionRange(offset, offset);
    // Only on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onChange(block: Block, e: React.ChangeEvent<HTMLTextAreaElement>) {
    const el = e.currentTarget;
    const next = el.value;
    const caretBefore = { blockId: block.id, offset: Math.max(0, el.selectionStart - (next.length - block.text.length)) };

    // A line break that got past keydown (drag-and-drop, an autocorrect
    // newline, a mobile keyboard) splits the paragraph like a paste.
    if (next.includes("\n")) {
      apply(insertText(blocks, block.id, 0, block.text.length, next), caretBefore);
      return;
    }

    remember(caretBefore, block.id);
    // End the undo step after each word, so undo removes words, not lines.
    if (/\s/.test(next.charAt(el.selectionStart - 1))) history.current.typing = null;
    commit(
      blocks.map((b) => (b.id === block.id ? { ...b, text: next } : b)),
      null,
    );
  }

  function onKeyDown(block: Block, index: number, e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Mid-composition keys (dead keys for é, IME) belong to the input method.
    if (e.nativeEvent.isComposing || e.keyCode === 229) return;

    const el = e.currentTarget;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const collapsed = start === end;
    const mod = e.metaKey || e.ctrlKey;
    const here = { blockId: block.id, offset: start };
    const prev = blocks[index - 1];
    const next = blocks[index + 1];

    // Locked: arrows and selection still work; nothing that changes text does.
    if (readOnly && ["Enter", "Backspace", "Delete"].includes(e.key)) return;

    // ⌘A / Ctrl+A selects the whole essay, not just this paragraph.
    if (mod && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "a" && blocks.length > 1) {
      e.preventDefault();
      selectAll();
      return;
    }

    // Shift+arrow past a paragraph's edge carries the selection into the next one.
    if (e.shiftKey && !mod && e.key.startsWith("Arrow")) {
      const backward = el.selectionDirection === "backward";
      const anchor = { blockId: block.id, offset: backward ? end : start };
      const focus = { blockId: block.id, offset: backward ? start : end };
      const crosses =
        (e.key === "ArrowDown" && next && isOnLastLine(el, focus.offset)) ||
        (e.key === "ArrowUp" && prev && isOnFirstLine(el, focus.offset)) ||
        (e.key === "ArrowRight" && next && focus.offset === block.text.length) ||
        (e.key === "ArrowLeft" && prev && focus.offset === 0);
      if (crosses) {
        e.preventDefault();
        const vertical = e.key === "ArrowDown" || e.key === "ArrowUp";
        beginSpan({
          anchor,
          focus,
          extend: {
            direction: e.key === "ArrowDown" || e.key === "ArrowRight" ? "forward" : "backward",
            granularity: vertical ? "line" : e.altKey ? "word" : "character",
          },
        });
        return;
      }
    }

    // ⌘⇧↑ / ⌘⇧↓ (Ctrl+Shift on Windows) move the paragraph.
    if (mod && e.shiftKey && !e.altKey && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
      e.preventDefault();
      if (!readOnly) reorder(block.id, index + (e.key === "ArrowUp" ? -1 : 1), "slide");
      return;
    }

    if (mod && !e.altKey && e.key.toLowerCase() === "z") {
      e.preventDefault();
      if (readOnly) return;
      travel(e.shiftKey ? "redo" : "undo");
      return;
    }
    if (e.ctrlKey && !e.metaKey && e.key.toLowerCase() === "y") {
      e.preventDefault();
      if (readOnly) return;
      travel("redo");
      return;
    }

    switch (e.key) {
      case "Enter":
        // Cmd/Ctrl+Enter and Alt+Enter are left for the screen (submit).
        if (mod || e.altKey) return;
        e.preventDefault();
        apply(splitBlock(blocks, block.id, start, end), here);
        return;

      case "Backspace":
        if (collapsed && start === 0 && prev) {
          e.preventDefault();
          apply(mergeWithPrevious(blocks, block.id), here);
        }
        return;

      case "Delete":
        if (collapsed && start === block.text.length && next) {
          e.preventDefault();
          apply(mergeWithNext(blocks, block.id), here);
        }
        return;

      case "ArrowUp":
        if (collapsed && !e.shiftKey && !mod && !e.altKey && isOnFirstLine(el, start)) {
          if (!prev) {
            if (onExitTop) {
              e.preventDefault();
              onExitTop(caretX(el, start));
            }
            return;
          }
          e.preventDefault();
          const target = textareas.current.get(prev.id);
          if (target) focusAt({ blockId: prev.id, offset: offsetAtX(target, caretX(el, start), "last") });
        }
        return;

      case "ArrowDown":
        if (collapsed && !e.shiftKey && !mod && !e.altKey && next && isOnLastLine(el, start)) {
          e.preventDefault();
          const target = textareas.current.get(next.id);
          if (target) focusAt({ blockId: next.id, offset: offsetAtX(target, caretX(el, start), "first") });
        }
        return;

      case "ArrowLeft":
        if (collapsed && !e.shiftKey && !mod && start === 0) {
          if (!prev) {
            if (onExitTop) {
              e.preventDefault();
              onExitTop(null);
            }
            return;
          }
          e.preventDefault();
          focusAt({ blockId: prev.id, offset: prev.text.length });
        }
        return;

      case "ArrowRight":
        if (collapsed && !e.shiftKey && !mod && start === block.text.length && next) {
          e.preventDefault();
          focusAt({ blockId: next.id, offset: 0 });
        }
        return;
    }
  }

  function onPaste(block: Block, e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const text = e.clipboardData.getData("text/plain");
    if (!text || readOnly) return;
    e.preventDefault();
    const el = e.currentTarget;
    apply(insertText(blocks, block.id, el.selectionStart, el.selectionEnd, text), {
      blockId: block.id,
      offset: el.selectionStart,
    });
  }

  // A press on a handle: a click opens the paragraph's menu; moving past the
  // threshold drags the paragraph instead. Pointer capture keeps the drag
  // going outside the handle; Escape puts the paragraph back.
  function onHandlePointerDown(block: Block, index: number, e: React.PointerEvent<HTMLButtonElement>) {
    if (readOnly || e.button !== 0) return;
    // Keep the caret where it is, and don't select text while dragging.
    e.preventDefault();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Already released or synthetic: window listeners still track the drag.
    }

    const origin = { x: e.clientX, y: e.clientY, scrollY: window.scrollY };
    const rects = blocks.map((b) => {
      const r = wrappers.current.get(b.id)!.getBoundingClientRect();
      return { top: r.top + window.scrollY, height: r.height };
    });
    const gap = parseFloat(getComputedStyle(rootRef.current!).rowGap) || 0;
    let clientY = e.clientY;
    let dragging = false;
    let current: Drag | null = null;
    let scrollFrame = 0;

    const update = () => {
      const dy = clientY + window.scrollY - (origin.y + origin.scrollY);
      const center = rects[index].top + rects[index].height / 2 + dy;
      // Where it lands: after every other paragraph whose middle it has passed.
      const to = rects.filter((r, i) => i !== index && r.top + r.height / 2 < center).length;
      current = { id: block.id, from: index, to, dy, shift: rects[index].height + gap };
      setDrag(current);
    };

    const autoScroll = () => {
      const speed =
        clientY < SCROLL_EDGE_TOP_PX
          ? -(SCROLL_EDGE_TOP_PX - clientY) / 4
          : clientY > window.innerHeight - SCROLL_EDGE_BOTTOM_PX
            ? (clientY - (window.innerHeight - SCROLL_EDGE_BOTTOM_PX)) / 4
            : 0;
      if (speed) window.scrollBy(0, speed);
      scrollFrame = requestAnimationFrame(autoScroll);
    };

    const onMove = (ev: PointerEvent) => {
      clientY = ev.clientY;
      if (!dragging) {
        if (Math.hypot(ev.clientX - origin.x, ev.clientY - origin.y) < DRAG_THRESHOLD_PX) return;
        dragging = true;
        document.documentElement.style.cursor = "grabbing";
        scrollFrame = requestAnimationFrame(autoScroll);
      }
      update();
    };
    const onScroll = () => {
      if (dragging) update();
    };

    const finish = (drop: boolean) => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(scrollFrame);
      document.documentElement.style.cursor = "";

      if (!dragging) {
        if (drop) setMenuFor(block.id);
        return;
      }
      const landed = current as Drag | null;
      if (drop && landed && landed.to !== landed.from) {
        reorder(block.id, landed.to, "drop");
      } else {
        // Cancelled or dropped where it started: settle back into place.
        flipFrom.current = { tops: measureTops(), settle: "drop" };
      }
      setDrag(null);
    };
    const onUp = () => finish(true);
    const onCancel = () => finish(false);
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key !== "Escape") return;
      ev.preventDefault();
      ev.stopPropagation();
      finish(false);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  // While dragging: the dragged paragraph follows the pointer; the ones it
  // has passed slide out of the way by its height plus the paragraph gap.
  function dragStyle(block: Block, index: number): React.CSSProperties | undefined {
    if (!drag) return undefined;
    if (block.id === drag.id) return { translate: `0 ${drag.dy}px`, zIndex: 10 };
    let offset = 0;
    if (drag.from < drag.to && index > drag.from && index <= drag.to) offset = -drag.shift;
    if (drag.to < drag.from && index >= drag.to && index < drag.from) offset = drag.shift;
    return { translate: `0 ${offset}px`, transition: "translate 200ms var(--ease-in-out)" };
  }

  // Clicking the gap between two paragraphs puts the caret in the nearer one,
  // on its closest line at the clicked x. Any other empty space (below the
  // essay, its padding) leaves focus and caret where they were: a click never
  // sends the caret to the end of the essay.
  function onRootMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target !== e.currentTarget) return;
    e.preventDefault();
    const caret = caretInGap(e.clientX, e.clientY);
    if (!caret) return;
    if (spanning) land({ blockId: caret.blockId, start: caret.offset, end: caret.offset, backward: false });
    else focusAt(caret);
  }

  function caretInGap(x: number, y: number): Caret | null {
    for (let i = 0; i < blocks.length - 1; i++) {
      const above = wrappers.current.get(blocks[i].id)?.getBoundingClientRect();
      const below = wrappers.current.get(blocks[i + 1].id)?.getBoundingClientRect();
      if (!above || !below || y < above.bottom || y > below.top) continue;
      const up = y - above.bottom < below.top - y;
      const block = blocks[up ? i : i + 1];
      const el = textareas.current.get(block.id);
      if (el) return { blockId: block.id, offset: offsetAtX(el, x - el.getBoundingClientRect().left, up ? "last" : "first") };
      // Across paragraphs the <p>s stand in: the text just inside the nearer edge.
      return caretAtPoint(x, up ? above.bottom - 2 : below.top + 2) ?? { blockId: block.id, offset: up ? block.text.length : 0 };
    }
    return null;
  }

  const showPlaceholder = blocks.length === 1 && blocks[0].text === "";
  const canReorder = !readOnly && blocks.length > 1;
  const keys = shortcutKeys();

  return (
    <div
      ref={rootRef}
      role="group"
      lang={lang}
      // Focusable only while it holds a selection across paragraphs.
      tabIndex={spanning ? -1 : undefined}
      onMouseDown={onRootMouseDown}
      // A click or a drag inside the <p>s is the browser's own selection;
      // once it ends inside one paragraph, that paragraph takes over.
      onMouseUp={() => {
        if (spanningNow.current && !dragSelecting.current) settleSpan();
      }}
      onKeyDown={onSpanKeyDown}
      onCopy={(e) => onSpanCopy(e, false)}
      onCut={(e) => onSpanCopy(e, !readOnly)}
      onPaste={onSpanPaste}
      onBlur={(e) => {
        if (e.currentTarget.contains(e.relatedTarget)) return;
        if (spanning && e.target === e.currentTarget) setSpanning(false);
        if (onLeave && e.target instanceof HTMLTextAreaElement) {
          for (const [blockId, el] of textareas.current) {
            if (el === e.target) onLeave({ blockId, offset: el.selectionStart });
          }
        }
      }}
      className={cn("flex cursor-text flex-col gap-y-[1lh] font-serif text-essay text-text outline-none", className)}
      {...props}
    >
      {blocks.map((block, index) => (
        <div
          key={block.id}
          ref={(el) => {
            if (!el) return;
            wrappers.current.set(block.id, el);
            return () => {
              wrappers.current.delete(block.id);
            };
          }}
          data-wrapper={block.id}
          data-dragging={drag?.id === block.id ? "" : undefined}
          style={dragStyle(block, index)}
          // Lifted while dragged: a raised card drawn outside the text, so
          // the words don't move when it appears.
          className="group/block relative isolate before:pointer-events-none before:absolute before:-inset-x-3 before:-inset-y-2 before:-z-10 before:rounded-card before:bg-raised before:opacity-0 before:shadow-overlay before:transition-opacity before:duration-150 data-dragging:before:opacity-100"
        >
          {canReorder && (
            <BlockHandle
              index={index}
              count={blocks.length}
              keys={keys}
              dragging={drag?.id === block.id}
              focused={focusedId === block.id}
              menuOpen={menuFor === block.id}
              onMenuOpenChange={(open) => setMenuFor(open ? block.id : null)}
              onPointerDown={(e) => onHandlePointerDown(block, index, e)}
              onMove={(to) => reorder(block.id, to, "slide")}
              returnFocus={() => textareas.current.get(block.id) ?? null}
            />
          )}
          {spanning ? (
            // Same box and text metrics as the textarea, so nothing moves.
            <p
              ref={(el) => {
                if (!el) return;
                paragraphs.current.set(block.id, el);
                return () => {
                  paragraphs.current.delete(block.id);
                };
              }}
              data-block={block.id}
              className="block w-full p-0 break-words whitespace-pre-wrap"
            >
              {block.text || <br />}
            </p>
          ) : (
            <textarea
              ref={(el) => {
                if (!el) return;
                textareas.current.set(block.id, el);
                return () => {
                  textareas.current.delete(block.id);
                };
              }}
              value={block.text}
              rows={1}
              readOnly={readOnly}
              tabIndex={block.id === tabStop ? 0 : -1}
              onFocus={() => {
                setFocusedId(block.id);
                setTabStopId(block.id);
              }}
              onBlur={() => setFocusedId((id) => (id === block.id ? null : id))}
              aria-label={`Paragraph ${index + 1} of ${blocks.length}`}
              aria-keyshortcuts={canReorder ? "Meta+Shift+ArrowUp Meta+Shift+ArrowDown Control+Shift+ArrowUp Control+Shift+ArrowDown" : undefined}
              placeholder={showPlaceholder ? placeholder : undefined}
              enterKeyHint="enter"
              {...NO_WRITING_HELP}
              spellCheck={spellCheck}
              onChange={(e) => onChange(block, e)}
              onKeyDown={(e) => onKeyDown(block, index, e)}
              onPaste={(e) => onPaste(block, e)}
              onMouseDown={(e) => onTextMouseDown(block, e)}
              onPointerDown={(e) => onTextPointerDown(block, e)}
              // The writing surface's focus indicator is the caret; an outline
              // around each paragraph would frame the essay like a form.
              className="field-sizing-content block w-full resize-none overflow-hidden bg-transparent p-0 text-inherit outline-none placeholder:text-text-3"
            />
          )}
        </div>
      ))}
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
    </div>
  );
}

// The grip that moves a paragraph: drag it, or tap/click it for Move up /
// Move down (the single-pointer alternative to dragging); ⌘⇧↑/↓ works too.
// With a mouse it sits in the left margin and shows on hovering the paragraph
// (wide screens only). On touch screens only the focused paragraph has one,
// so no invisible handle catches a tap: in the left margin on tablets, and in
// the gap above the paragraph, at the right, on phones, which have no margin.
function BlockHandle({
  index,
  count,
  keys,
  dragging,
  focused,
  menuOpen,
  onMenuOpenChange,
  onPointerDown,
  onMove,
  returnFocus,
}: {
  index: number;
  count: number;
  keys: { mod: string; shift: string };
  dragging: boolean;
  focused: boolean;
  menuOpen: boolean;
  onMenuOpenChange: (open: boolean) => void;
  onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => void;
  onMove: (to: number) => void;
  returnFocus: () => HTMLElement | null;
}) {
  return (
    // pr-2 bridges the gap to the text, so the handle stays visible while the
    // pointer travels to it. Vertically centered on the first line.
    <div
      data-visible={dragging || menuOpen ? "" : undefined}
      data-focused={focused ? "" : undefined}
      className={cn(
        "absolute top-[calc((1lh-1.75rem)/2)] right-full pr-2 opacity-0 transition-opacity duration-150 group-hover/block:opacity-100 data-visible:opacity-100 pointer-fine:max-sm:hidden",
        "pointer-coarse:invisible pointer-coarse:data-focused:visible pointer-coarse:data-focused:opacity-100 pointer-coarse:data-visible:visible",
        "pointer-coarse:max-sm:top-auto pointer-coarse:max-sm:right-0 pointer-coarse:max-sm:bottom-full pointer-coarse:max-sm:pr-0",
      )}
    >
      <DropdownMenu open={menuOpen} onOpenChange={onMenuOpenChange}>
        <Tooltip>
          <TooltipTrigger
            render={
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    tabIndex={-1}
                    aria-label={`Move paragraph ${index + 1}`}
                    onPointerDown={onPointerDown}
                    // Opening is decided on release (click vs drag), not on press.
                    onMouseDown={(e: BaseUIEvent<React.MouseEvent>) => e.preventBaseUIHandler()}
                    // Its own gesture: a touch drag moves the paragraph, not the page.
                    className="cursor-grab touch-none active:cursor-grabbing"
                  />
                }
              />
            }
          >
            <GripVerticalIcon />
          </TooltipTrigger>
          {!dragging && !menuOpen && (
            <TooltipContent side="left">
              Drag to move
              <KbdGroup>
                <Kbd>{keys.mod}</Kbd>
                <Kbd>{keys.shift}</Kbd>
                <Kbd>↑↓</Kbd>
              </KbdGroup>
            </TooltipContent>
          )}
        </Tooltip>
        <DropdownMenuContent align="start" finalFocus={returnFocus}>
          <DropdownMenuItem disabled={index === 0} onClick={() => onMove(index - 1)}>
            <ArrowUpIcon />
            Move up
            <DropdownMenuShortcut>
              {keys.mod}
              {keys.shift}↑
            </DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem disabled={index === count - 1} onClick={() => onMove(index + 1)}>
            <ArrowDownIcon />
            Move down
            <DropdownMenuShortcut>
              {keys.mod}
              {keys.shift}↓
            </DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function shortcutKeys() {
  const mac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
  return mac ? { mod: "⌘", shift: "⇧" } : { mod: "Ctrl", shift: "Shift" };
}

function cssVar(name: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || "ease";
}

let fieldSizing: boolean | undefined;
function supportsFieldSizing() {
  fieldSizing ??= CSS.supports("field-sizing", "content");
  return fieldSizing;
}

// Fallback for browsers without field-sizing. Collapsing to 0 first lets the
// textarea shrink; keeping the scroll position stops the page jumping when
// the document briefly gets shorter.
function fitHeight(el: HTMLTextAreaElement) {
  const scrollY = window.scrollY;
  el.style.height = "0px";
  el.style.height = `${el.scrollHeight}px`;
  if (window.scrollY !== scrollY) window.scrollTo({ top: scrollY });
}

/** The text position under a point: the standard API, or WebKit's older one. */
function pointAt(x: number, y: number): { node: Node; offset: number } | null {
  if (typeof document.caretPositionFromPoint === "function") {
    const p = document.caretPositionFromPoint(x, y);
    return p ? { node: p.offsetNode, offset: p.offset } : null;
  }
  const r = document.caretRangeFromPoint?.(x, y);
  return r ? { node: r.startContainer, offset: r.startOffset } : null;
}
