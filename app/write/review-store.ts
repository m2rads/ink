"use client";

import { useMemo } from "react";

import type { ReviewResult } from "@/lib/ai/check";
import { contextBefore, matchesAccepted } from "@/lib/ai/correction";
import type { Item, Level, Skill, Task } from "@/lib/ai/review";
import { createLocalStore } from "@/lib/local-store";
import { changed } from "@/lib/sync/registry";

import type { Block, Caret } from "./blocks";
import { remapMarks } from "./marks";

// The latest review of each draft, and the memory of focus patterns across
// essays. Both live in localStorage, keyed by draft id (the essay's id), and
// sync keeps them with the account: a record per review, and one per
// essay's focus titles.
//
// One review per draft, built up incrementally: the first covers the whole
// essay; after that, Review covers only paragraphs changed since they were
// last reviewed, and merges: their items are replaced, the others kept, and
// the level, diagnosis, skills and focus are the latest (they always cover
// the whole essay). The essay stays editable under a review, so items follow
// every edit (trackEdit, marks.ts).

export type ItemStatus = "open" | "done";

export type ReviewItem = Omit<Item, "block"> & {
  blockId: string;
  // start and end are where the item's words are now: trackEdit moves them
  // with every edit.
  /** The words before them, to find them again once an edit has lost them. */
  before: string;
  /** Its words, while an edit has taken them out of the essay; an undo or paste brings them back. */
  lost?: string | null;
  status: ItemStatus;
  /** The answer was shown; a fix after it counts as shown. */
  answered: boolean;
  /** The AI's word on the last Check that didn't resolve it. */
  feedback: string;
};

export type Review = {
  version: 2;
  /** Also the A/B unit, so this review's item checks use its arm. */
  id: string;
  createdAt: string;
  arm: string;
  model: string;
  task: Task;
  level: Level;
  caveat: string;
  diagnosis: string;
  skills: { skill: Skill; level: Level | "unclear" }[];
  focus: { title: string; detail: string }[];
  /** Words in the essay when the level was estimated. */
  words: number;
  /** Each paragraph's text when it was last reviewed; one that differs is new to the review. */
  reviewed: Record<string, string>;
  items: ReviewItem[];
};

type Stored = { review: Review | null };

const reviews = createLocalStore<Stored>({
  prefix: "ink:review",
  // Reviews from before the coaching review (version 1, mistakes) are dropped.
  parse: (raw) =>
    parseJson(raw, (v): v is Stored => typeof v === "object" && v !== null && "review" in v) ?? null,
  serialize: (v) => JSON.stringify(v),
  fallback: () => ({ review: null }),
  saveDelayMs: 0,
  onChange: (id) => changed("review", id),
});

const current = (stored: Stored | null) => (stored?.review?.version === 2 ? stored.review : null);

/** The draft's latest review: `undefined` until hydrated, `null` when there's none. */
export function useReview(draftId: string): Review | null | undefined {
  const [stored] = reviews.useValue(draftId);
  return stored === null ? undefined : current(stored);
}

export function readReview(draftId: string): Review | null {
  return current(reviews.read(draftId));
}

function write(draftId: string, review: Review) {
  reviews.write(draftId, { review });
}

/** Drop a draft's review and its focus from the memory across essays. */
export function forgetReview(draftId: string) {
  reviews.remove(draftId);
  const all = memory.read("all");
  if (!(draftId in all)) return;
  const rest = { ...all };
  delete rest[draftId];
  memory.write("all", rest);
}

/** Paragraphs with text the review hasn't seen: new, or changed since. */
export function unreviewed(review: Review | null | undefined, blocks: Block[]): Block[] {
  return blocks.filter((b) => b.text.trim() && review?.reviewed[b.id] !== b.text);
}

/**
 * Merge a review of `sent` (the text as it went to the AI) into the draft's
 * review: items in the paragraphs it covered (`covered`, block ids) are
 * replaced, the rest kept; everything about the whole essay is replaced.
 * Items are moved to `now`, since the essay stays editable while it runs.
 */
export function mergeReview(
  draftId: string,
  sent: Block[],
  covered: Set<string>,
  result: ReviewResult,
  id: string,
  now: Block[],
) {
  const old = readReview(draftId);
  const fresh = result.items.map(({ block, ...item }): ReviewItem => ({
    ...item,
    blockId: sent[block].id,
    before: contextBefore(sent[block].text, item.start),
    status: "open",
    answered: false,
    feedback: "",
  }));
  const kept = (old?.items ?? []).filter((it) => !covered.has(it.blockId) && now.some((b) => b.id === it.blockId));
  const reviewed = { ...(old?.reviewed ?? {}) };
  for (const b of sent) if (covered.has(b.id)) reviewed[b.id] = b.text;

  const review: Review = {
    version: 2,
    id,
    createdAt: new Date().toISOString(),
    arm: result.arm,
    model: result.model,
    task: result.task,
    level: result.level,
    caveat: result.caveat,
    diagnosis: result.diagnosis,
    skills: result.skills,
    focus: result.focus.slice(0, 3),
    words: sent.reduce((n, b) => n + b.text.split(/\s+/).filter(Boolean).length, 0),
    reviewed,
    // Kept items have followed every edit, so they're already where `now`
    // has them; new ones were placed in `sent` and move to `now`.
    items: [...kept, ...remapMarks(fresh, sent, now)],
  };
  write(draftId, settle(review, now));
  remember(draftId, review.focus);
}

/** Move the review's items with an edit from `prev` to `next`; `caret` is where it landed. */
export function trackEdit(draftId: string, prev: Block[], next: Block[], caret?: Caret | null) {
  const review = readReview(draftId);
  if (!review) return;
  const items = remapMarks(review.items, prev, next, caret);
  const settled = settle(items === review.items ? review : { ...review, items }, next);
  if (settled !== review) write(draftId, settled);
}

/**
 * Close items whose words now match an accepted answer: no model call
 * needed. Returns the same review when nothing changed.
 */
function settle(review: Review, blocks: Block[]): Review {
  let reviewed = review.reviewed;
  let changed = false;
  const items = review.items.map((it) => {
    if (it.status !== "open" || !it.accept.length || it.lost) return it;
    const text = blocks.find((b) => b.id === it.blockId)?.text;
    if (text === undefined || !matchesAccepted(text.slice(it.start, it.end), it.accept)) return it;
    changed = true;
    reviewed = fixedOnly(reviewed, it, text);
    return { ...it, status: "done" as const, feedback: "" };
  });
  return changed ? { ...review, reviewed, items } : review;
}

/**
 * A fix made through the review isn't new writing: when a paragraph changed
 * only inside the item's words, it counts as reviewed with the fix in.
 */
function fixedOnly(reviewed: Record<string, string>, item: ReviewItem, text: string) {
  const unfixed = text.slice(0, item.start) + item.quote + text.slice(item.end);
  return reviewed[item.blockId] === unfixed ? { ...reviewed, [item.blockId]: text } : reviewed;
}

/** Change an item without touching the essay. */
export function updateItem(draftId: string, id: string, patch: Partial<ReviewItem>) {
  const review = readReview(draftId);
  if (!review) return;
  write(draftId, { ...review, items: review.items.map((it) => (it.id === id ? { ...it, ...patch } : it)) });
}

/**
 * A Check resolved an item. When its paragraph changed only inside the
 * item's words, the review counts the paragraph as reviewed again, so Review
 * has nothing new to check there.
 */
export function resolveItem(draftId: string, blocks: Block[], id: string) {
  const review = readReview(draftId);
  const item = review?.items.find((it) => it.id === id);
  const block = blocks.find((b) => b.id === item?.blockId);
  if (!review || !item || !block) return;
  write(draftId, {
    ...review,
    reviewed: fixedOnly(review.reviewed, item, block.text),
    items: review.items.map((it) => (it.id === id ? { ...it, status: "done" as const, feedback: "" } : it)),
  });
}

// ---------- Memory across essays ----------

type Memory = Record<string, { at: string; focus: string[] }>;

const memory = createLocalStore<Memory>({
  prefix: "ink:memory",
  // Counts by category from the old review are dropped: only focus titles now.
  parse: (raw) => {
    const all = parseJson(raw, (v): v is Record<string, unknown> => typeof v === "object" && v !== null);
    if (!all) return null;
    return Object.fromEntries(
      Object.entries(all).filter(
        (e): e is [string, Memory[string]] => typeof e[1] === "object" && e[1] !== null && Array.isArray((e[1] as Memory[string]).focus),
      ),
    );
  },
  serialize: (v) => JSON.stringify(v),
  fallback: () => ({}),
  saveDelayMs: 0,
  // Sync sends each essay's entry that was added, changed or removed.
  onChange(_, prev, next) {
    for (const id of new Set([...Object.keys(prev ?? {}), ...Object.keys(next ?? {})])) {
      if (prev?.[id]?.at !== next?.[id]?.at) changed("memory", id);
    }
  },
});

/** Each essay counts once, from its latest review, so reviewing again doesn't inflate a pattern. */
function remember(draftId: string, focus: { title: string }[]) {
  memory.write("all", { ...memory.read("all"), [draftId]: { at: new Date().toISOString(), focus: focus.map((f) => f.title) } });
}

const key = (title: string) => title.trim().toLowerCase();

/** Focus titles from the other essays, with how many essays each came up in, most first. */
export function readEarlierFocus(draftId: string): [string, number][] {
  return tally(memory.read("all"), draftId).slice(0, 12);
}

/** How many essays, this one included, each focus title came up in. */
export function useFocusCounts(): (title: string) => number {
  const [all] = memory.useValue("all");
  return useMemo(() => {
    const counts = new Map(tally(all ?? {}).map(([t, n]) => [key(t), n]));
    return (title: string) => counts.get(key(title)) ?? 1;
  }, [all]);
}

function tally(all: Memory, except?: string): [string, number][] {
  const counts = new Map<string, [string, number]>();
  for (const [id, entry] of Object.entries(all)) {
    if (id === except) continue;
    for (const title of entry.focus) {
      const k = key(title);
      const [name, n] = counts.get(k) ?? [title, 0];
      counts.set(k, [name, n + 1]);
    }
  }
  return [...counts.values()].sort((a, b) => b[1] - a[1]);
}

// ---------- Sync (lib/sync/adapters.ts) ----------

/** The review as sync sends it: null when there's none. */
export function readStoredReview(draftId: string): Stored | null {
  return reviews.has(draftId) && reviews.read(draftId).review ? reviews.read(draftId) : null;
}

/** Another device's review (or none, `null`), without sending it back. */
export function applyStoredReview(draftId: string, stored: Stored | null) {
  if (stored) reviews.apply(draftId, stored);
  else reviews.applyRemove(draftId);
}

export function storedReviewIds(): string[] {
  return reviews.ids().filter((id) => readStoredReview(id));
}

export function readMemoryEntry(draftId: string): Memory[string] | null {
  return memory.read("all")[draftId] ?? null;
}

export function applyMemoryEntry(draftId: string, entry: Memory[string] | null) {
  const rest = { ...memory.read("all") };
  if (entry) rest[draftId] = entry;
  else delete rest[draftId];
  memory.apply("all", rest);
}

export function memoryIds(): string[] {
  return Object.keys(memory.read("all"));
}

/** Forget every review and the memory across essays in this browser (signing out). */
export function clearReviews() {
  for (const id of reviews.ids()) reviews.applyRemove(id);
  memory.applyRemove("all");
}

function parseJson<T>(raw: string | null, valid: (v: unknown) => v is T): T | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    return valid(value) ? value : null;
  } catch {
    return null;
  }
}
