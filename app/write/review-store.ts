"use client";

import { useMemo } from "react";

import { CATEGORIES, contextBefore, locate, type Category, type Mistake } from "@/lib/ai/correction";
import { createLocalStore } from "@/lib/local-store";

import type { Block } from "./blocks";

// The latest review of each draft, and the memory of mistakes across essays.
// Both live in localStorage until there's a server, keyed by draft id (an
// essay id, or a sample prompt and run).
//
// One review per draft: reviewing again replaces it, because edits move the
// text and old marks would point at the wrong words. For the same reason the
// memory counts each draft once, from its latest review, so reviewing three
// times doesn't triple "N times before".

export type MarkStatus = "open" | "fixed" | "revealed" | "skipped";

export type ReviewMistake = Omit<Mistake, "block"> & {
  blockId: string;
  // start and end are offsets when last seen; marks are re-found with
  // locate() before use.
  /** The words before the mark, which locate() uses to find it after edits. */
  before: string;
  status: MarkStatus;
  attempts: number;
  hinted: boolean;
  /** What replaced `wrong` in the essay once fixed or revealed. */
  final: string | null;
};

export type Review = {
  /** Also the A/B unit, so this review's fix checks use its arm. */
  id: string;
  createdAt: string;
  arm: string;
  model: string;
  /** The essay's text as reviewed, plus fixes made since; any other edit means a new review. */
  text: string[];
  mistakes: ReviewMistake[];
};

type Stored = { review: Review | null };

const reviews = createLocalStore<Stored>({
  prefix: "ink:review",
  parse: (raw) => parseJson(raw, (v): v is Stored => typeof v === "object" && v !== null && "review" in v),
  serialize: (v) => JSON.stringify(v),
  fallback: () => ({ review: null }),
  saveDelayMs: 0,
});

/** The draft's latest review: `undefined` until hydrated, `null` when there's none. */
export function useReview(draftId: string): Review | null | undefined {
  const [stored] = reviews.useValue(draftId);
  return stored === null ? undefined : stored.review;
}

export function readReview(draftId: string): Review | null {
  return reviews.read(draftId).review;
}

export function saveReview(draftId: string, review: Review) {
  reviews.write(draftId, { review });
  remember(draftId, review.mistakes);
}

/** Has the essay changed since it was reviewed, other than through the review's own fixes? */
export function isStale(review: Review, blocks: Block[]): boolean {
  return review.text.length !== blocks.length || review.text.some((t, i) => t !== blocks[i].text);
}

export function newReview(
  blocks: Block[],
  result: { arm: string; model: string; mistakes: Mistake[] },
  id = crypto.randomUUID(),
): Review {
  return {
    id,
    createdAt: new Date().toISOString(),
    arm: result.arm,
    model: result.model,
    text: blocks.map((b) => b.text),
    mistakes: result.mistakes.map(({ block, ...m }) => ({
      ...m,
      blockId: blocks[block].id,
      before: contextBefore(blocks[block].text, m.start),
      status: "open",
      attempts: 0,
      hinted: false,
      final: null,
    })),
  };
}

/** Change a mistake's state without touching the essay. */
export function updateMistake(draftId: string, id: string, patch: Partial<ReviewMistake>) {
  const review = readReview(draftId);
  if (!review) return;
  reviews.write(draftId, {
    review: { ...review, mistakes: review.mistakes.map((m) => (m.id === id ? { ...m, ...patch } : m)) },
  });
}

/**
 * Write a fix into the essay, in place: the marked words become `final` in
 * the draft, and the review records it. Returns the new blocks, or null if
 * the marked words aren't in the essay any more.
 */
export function applyFix(
  draftId: string,
  blocks: Block[],
  id: string,
  final: string,
  status: "fixed" | "revealed",
): Block[] | null {
  const review = readReview(draftId);
  const mistake = review?.mistakes.find((m) => m.id === id);
  const block = blocks.find((b) => b.id === mistake?.blockId);
  if (!review || !mistake || !block) return null;
  const at = locate(block.text, mistake.wrong, mistake.start, mistake.before);
  if (!at) return null;

  const text = block.text.slice(0, at.start) + final + block.text.slice(at.end);
  const delta = final.length - (at.end - at.start);
  const next = blocks.map((b) => (b.id === block.id ? { ...b, text } : b));
  const mistakes = review.mistakes.map((m) => {
    if (m.id === id) return { ...m, status, final, start: at.start, end: at.start + final.length };
    if (m.blockId !== block.id || m.start < at.end) return m;
    return { ...m, start: m.start + delta, end: m.end + delta };
  });
  reviews.write(draftId, { review: { ...review, mistakes, text: next.map((b) => b.text) } });
  return next;
}

// ---------- Memory across essays ----------

type Memory = Record<string, { at: string; counts: Partial<Record<Category, number>> }>;

const memory = createLocalStore<Memory>({
  prefix: "ink:memory",
  parse: (raw) => parseJson(raw, (v): v is Memory => typeof v === "object" && v !== null),
  serialize: (v) => JSON.stringify(v),
  fallback: () => ({}),
  saveDelayMs: 0,
});

function remember(draftId: string, mistakes: { category: Category }[]) {
  const counts: Partial<Record<Category, number>> = {};
  for (const m of mistakes) counts[m.category] = (counts[m.category] ?? 0) + 1;
  memory.write("all", { ...memory.read("all"), [draftId]: { at: new Date().toISOString(), counts } });
}

/** How many mistakes of each category the other essays' latest reviews found. */
export function useEarlierCounts(draftId: string): Record<Category, number> {
  const [all] = memory.useValue("all");
  return useMemo(() => {
    const totals = Object.fromEntries(CATEGORIES.map((c) => [c, 0])) as Record<Category, number>;
    for (const [id, entry] of Object.entries(all ?? {})) {
      if (id === draftId) continue;
      for (const c of CATEGORIES) totals[c] += entry.counts[c] ?? 0;
    }
    return totals;
  }, [all, draftId]);
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
