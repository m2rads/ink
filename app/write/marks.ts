import { contextBefore, locate } from "@/lib/ai/correction";

import type { Block, Caret } from "./blocks";

// A review's marks follow the essay as it's edited: the essay stays editable
// under a review, and the writer fixes a phrase by typing over it. Each edit
// to a paragraph is reduced to one replaced span (diffText), and every mark
// in that paragraph shifts, grows or shrinks with it (mapRange). Typing at a
// mark's end that continues its word ("grand" → "grands") grows the mark;
// a space or punctuation there doesn't. An edit that takes a mark's words
// out of their paragraph (a split, a merge, a cut) loses it; a lost mark is
// looked for again, by its words and the text before them, after every edit,
// so a paste or an undo brings it back.

export type MarkPosition = {
  blockId: string;
  start: number;
  end: number;
  /** The words before the mark, to find it again once lost. */
  before: string;
  /** Its words while an edit has taken them out of the essay. */
  lost?: string | null;
};

/** One paragraph's edit: [at, at + removed) of the old text became `inserted`. */
export type Change = { at: number; removed: number; inserted: string };

/**
 * The single span that changed between two versions of a paragraph. Repeated
 * letters make it ambiguous ("aa" → "aaa"); `caret`, where the caret is in
 * the new text, settles it: the changed span ends at or after it.
 */
export function diffText(prev: string, next: string, caret?: number): Change {
  const room = Math.min(prev.length, next.length);
  const maxSuffix = caret === undefined ? room : Math.max(0, Math.min(room, next.length - caret));
  let suffix = 0;
  while (suffix < maxSuffix && prev[prev.length - 1 - suffix] === next[next.length - 1 - suffix]) suffix++;
  let prefix = 0;
  while (prefix < room - suffix && prev[prefix] === next[prefix]) prefix++;
  return { at: prefix, removed: prev.length - prefix - suffix, inserted: next.slice(prefix, next.length - suffix) };
}

// What typing at a mark's end adds to the mark: a few letters continuing its
// word. Longer insertions there (a paste, a merged paragraph) don't.
const WORD_END = /^[\p{L}\p{M}\p{N}'’-]{1,4}$/u;

/** Where [start, end) is after `change`, or null if the change took the whole mark and more. */
export function mapRange(start: number, end: number, { at, removed, inserted }: Change): { start: number; end: number } | null {
  const delta = inserted.length - removed;
  const cut = at + removed;

  if (removed === 0) {
    if (at < start || (at === start && start < end)) return { start: start + delta, end: end + delta };
    if (at < end || (at === end && (start === end || WORD_END.test(inserted)))) return { start, end: end + delta };
    return { start, end };
  }
  if (cut <= start) return { start: start + delta, end: end + delta };
  if (at >= end) return { start, end };
  if (at >= start && cut <= end) return { start, end: end + delta };
  // Partly overlapping: keep the part of the mark that's left.
  if (at < start && cut < end) return { start: at, end: end + delta };
  if (at > start && cut > end) return { start, end: at + inserted.length };
  return null;
}

/**
 * The marks after an edit from `prev` to `next`. `caret` is where the caret
 * landed, which settles ambiguous edits in its paragraph. Returns `marks`
 * itself when nothing moved.
 */
export function remapMarks<T extends MarkPosition>(marks: T[], prev: Block[], next: Block[], caret?: Caret | null): T[] {
  const before = new Map(prev.map((b) => [b.id, b.text]));
  const after = new Map(next.map((b) => [b.id, b.text]));
  const changes = new Map<string, Change>();
  for (const [id, text] of after) {
    const old = before.get(id);
    if (old !== undefined && old !== text) {
      changes.set(id, diffText(old, text, caret?.blockId === id ? caret.offset : undefined));
    }
  }

  let moved = false;
  const result = marks.map((m) => {
    let placed: T = m;
    if (!m.lost) {
      const change = changes.get(m.blockId);
      if (after.has(m.blockId) && !change) return m;
      const range = change && mapRange(m.start, m.end, change);
      placed = range
        ? { ...m, ...range, before: contextBefore(after.get(m.blockId)!, range.start) }
        : { ...m, lost: before.get(m.blockId)?.slice(m.start, m.end) ?? "" };
    }
    if (placed.lost) placed = relocate(placed, next) ?? placed;
    if (placed !== m) moved = true;
    return placed;
  });
  return moved ? result : marks;
}

/** A lost mark's words, back in the essay after the same words they followed: its own paragraph first. */
function relocate<T extends MarkPosition>(m: T, blocks: Block[]): T | null {
  const needle = m.lost;
  if (!needle) return null;
  const lead = m.before.slice(-8);
  const ordered = [...blocks.filter((b) => b.id === m.blockId), ...blocks.filter((b) => b.id !== m.blockId)];
  for (const b of ordered) {
    const at = locate(b.text, needle, m.start, m.before);
    // The same words before it, or as many as there are: a split leaves it
    // nearer its paragraph's start.
    const led = at && contextBefore(b.text, at.start);
    if (at && (led!.endsWith(lead) || lead.endsWith(led!))) {
      return { ...m, blockId: b.id, start: at.start, end: at.end, before: contextBefore(b.text, at.start), lost: null };
    }
  }
  return null;
}
