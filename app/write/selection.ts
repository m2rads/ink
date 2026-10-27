"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { rangeRects } from "./caret";

// What the writer has selected in the French they're writing (the essay or
// its title), for the dictionary's selection lookup (AGENTS.md, Selection
// lookup). A selection counts once it settles: at once on mouse up and
// double-click, after a pause for Shift+arrows and touch handles. Only one
// paragraph's textarea: a selection across paragraphs is the editor's <p>s,
// and too long to look up anyway.

/** A selection worth looking up: a word or a short phrase. */
export type Selected = {
  /** The selected text, widened to whole words. */
  term: string;
  el: HTMLTextAreaElement;
  start: number;
  end: number;
  /** The words just before it, to read a verb form by its subject (wordsBefore). */
  before: string;
  /** One box per line of what's highlighted, relative to the textarea. */
  rects: { x: number; y: number; width: number; height: number }[];
};

const MAX_WORDS = 8;
const MAX_CHARS = 80;
const BEFORE_WORDS = 6;
const BEFORE_CHARS = 100;
const SETTLE_MS = 350;
const WORD = /[\p{L}\p{M}\p{N}'’-]/u;

/**
 * The term to look up for `value` selected from `start` to `end`: trimmed of
 * spaces and punctuation, widened to whole words, and null when there's no
 * word or it's longer than a phrase.
 */
export function lookupTerm(value: string, start: number, end: number): { term: string; start: number; end: number } | null {
  while (start < end && !WORD.test(value[start])) start++;
  while (end > start && !WORD.test(value[end - 1])) end--;
  if (start === end) return null;
  while (start > 0 && WORD.test(value[start - 1])) start--;
  while (end < value.length && WORD.test(value[end])) end++;
  const term = value.slice(start, end).replace(/\s+/g, " ");
  if (term.length > MAX_CHARS || term.split(" ").length > MAX_WORDS) return null;
  return { term, start, end };
}

/**
 * The last few words of `value` before `start`, on the same line: enough to
 * find a verb's subject ("que nous" allions, "je me suis" levé) and what
 * comes before a noun (cet été), short enough for the lookup's input cap.
 */
export function wordsBefore(value: string, start: number) {
  const line = value.slice(0, start).split("\n").pop()!;
  let words = line.trim().split(/\s+/).filter(Boolean).slice(-BEFORE_WORDS);
  while (words.join(" ").length > BEFORE_CHARS) words = words.slice(1);
  return words.join(" ");
}

function read(): Selected | null {
  const el = document.activeElement;
  if (!(el instanceof HTMLTextAreaElement)) return null;
  if (el.closest("[data-dictionary]") || el.closest("[lang]")?.getAttribute("lang") !== "fr") return null;
  const { selectionStart, selectionEnd } = el;
  if (selectionStart === selectionEnd) return null;
  const found = lookupTerm(el.value, selectionStart, selectionEnd);
  if (!found) return null;
  // The box is what's highlighted, not the widened term.
  return { ...found, el, before: wordsBefore(el.value, found.start), rects: rangeRects(el, selectionStart, selectionEnd) };
}

const keyOf = (s: Selected | null) => (s ? `${s.el.selectionStart}:${s.el.selectionEnd}:${s.term}` : "");

/** Inside the selection's popover: pressing there keeps the selection. */
export const SELECTION_UI = "data-selection-lookup";

/**
 * The settled selection, or null. `readNow()` takes the selection without
 * waiting (for ⌘K); `dismiss()` hides it until the selection changes.
 */
export function useSelection(enabled: boolean) {
  const [selected, setSelected] = useState<Selected | null>(null);
  const shown = useRef("");
  const dismissed = useRef("");

  useEffect(() => {
    if (!enabled) return;
    let down = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const show = () => {
      const s = read();
      const k = keyOf(s);
      if (k && k === dismissed.current) return;
      dismissed.current = "";
      shown.current = k;
      setSelected(s);
    };
    const hide = () => {
      clearTimeout(timer);
      shown.current = "";
      setSelected(null);
    };

    const onDown = (e: PointerEvent) => {
      if ((e.target as Element).closest(`[${SELECTION_UI}]`)) return;
      down = true;
      hide();
    };
    const onUp = () => {
      if (!down) return;
      down = false;
      clearTimeout(timer);
      // Once the browser has placed the selection.
      timer = setTimeout(show, 0);
    };
    const onChange = () => {
      if (down) return;
      const s = read();
      if (!s) return hide();
      if (keyOf(s) === shown.current) return;
      clearTimeout(timer);
      shown.current = "";
      setSelected(null);
      timer = setTimeout(show, SETTLE_MS);
    };
    const onDouble = () => {
      clearTimeout(timer);
      show();
    };
    const onFocusOut = (e: FocusEvent) => {
      if ((e.relatedTarget as Element | null)?.closest(`[${SELECTION_UI}]`)) return;
      hide();
    };

    document.addEventListener("pointerdown", onDown, true);
    document.addEventListener("pointerup", onUp, true);
    document.addEventListener("selectionchange", onChange);
    document.addEventListener("dblclick", onDouble);
    document.addEventListener("focusout", onFocusOut);
    return () => {
      hide();
      document.removeEventListener("pointerdown", onDown, true);
      document.removeEventListener("pointerup", onUp, true);
      document.removeEventListener("selectionchange", onChange);
      document.removeEventListener("dblclick", onDouble);
      document.removeEventListener("focusout", onFocusOut);
    };
  }, [enabled]);

  const readNow = useCallback(() => {
    const s = enabled ? read() : null;
    shown.current = keyOf(s);
    dismissed.current = "";
    setSelected(s);
    return s;
  }, [enabled]);

  const dismiss = useCallback(() => {
    dismissed.current = shown.current;
    shown.current = "";
    setSelected(null);
  }, []);

  return { selected, readNow, dismiss };
}

/** A Base UI anchor on the selection's first line that follows the page as it scrolls. */
export function selectionAnchor(s: Selected) {
  const r = s.rects[0];
  return {
    contextElement: s.el,
    getBoundingClientRect() {
      const box = s.el.getBoundingClientRect();
      return r ? new DOMRect(box.left + r.x, box.top + r.y, r.width, r.height) : new DOMRect(box.left, box.top, 0, 0);
    },
  };
}
