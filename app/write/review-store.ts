"use client";

import { useMemo } from "react";

import { CATEGORIES, contextBefore, type Category, type Mistake } from "@/lib/ai/correction";
import { createLocalStore } from "@/lib/local-store";

import type { Block, Caret } from "./blocks";
import { remapMarks } from "./marks";

// The latest review of each draft, and the memory of mistakes across essays.
// Both live in localStorage until there's a server, keyed by draft id (the
// essay's id).
//
// One review per draft: reviewing again replaces it. The essay stays
// editable under a review, so its marks follow every edit (trackEdit,
// marks.ts) and a fix is typed straight into the essay. The memory counts
// each draft once, from its latest review, so reviewing three times doesn't
// triple "N times before".

export type MarkStatus = "open" | "fixed" | "revealed" | "skipped";

export type ReviewMistake = Omit<Mistake, "block"> & {
  blockId: string;
  // start and end are where the mark is in the essay now: trackEdit moves
  // them with every edit, so the words between them are the writer's
  // current attempt at the fix.
  /** The words before the mark, to find it again once an edit has lost it. */
  before: string;
  /** Its words, while an edit has taken them out of the essay; an undo or paste brings it back. */
  lost?: string | null;
  status: MarkStatus;
  attempts: number;
  hinted: boolean;
  /** The answer was shown in the note (absent on reviews saved before it existed). */
  answered?: boolean;
  /** The words that resolved it (fixed or revealed). */
  final: string | null;
};

export type Review = {
  /** Also the A/B unit, so this review's fix checks use its arm. */
  id: string;
  createdAt: string;
  arm: string;
  model: string;
  /** The essay's text as reviewed, plus fixes made since; any other edit makes Review check again. */
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

/** Drop a draft's review and its counts from the memory across essays. */
export function forgetReview(draftId: string) {
  reviews.remove(draftId);
  const all = memory.read("all");
  if (!(draftId in all)) return;
  const rest = { ...all };
  delete rest[draftId];
  memory.write("all", rest);
}

/** Has the essay changed since it was reviewed, other than through the review's own fixes? */
export function isStale(review: Review, blocks: Block[]): boolean {
  return review.text.length !== blocks.length || review.text.some((t, i) => t !== blocks[i].text);
}

/**
 * A review of `sent`, the text as it went to the check, with its marks moved
 * to `current`: the essay stays editable while the check runs.
 */
export function newReview(
  sent: Block[],
  result: { arm: string; model: string; mistakes: Mistake[] },
  id = crypto.randomUUID(),
  current = sent,
): Review {
  const mistakes = result.mistakes.map(({ block, ...m }): ReviewMistake => ({
    ...m,
    blockId: sent[block].id,
    before: contextBefore(sent[block].text, m.start),
    status: "open",
    attempts: 0,
    hinted: false,
    answered: false,
    final: null,
  }));
  return {
    id,
    createdAt: new Date().toISOString(),
    arm: result.arm,
    model: result.model,
    text: sent.map((b) => b.text),
    mistakes: remapMarks(mistakes, sent, current),
  };
}

/** Move the review's marks with an edit from `prev` to `next`; `caret` is where it landed. */
export function trackEdit(draftId: string, prev: Block[], next: Block[], caret?: Caret | null) {
  const review = readReview(draftId);
  if (!review) return;
  const mistakes = remapMarks(review.mistakes, prev, next, caret);
  if (mistakes !== review.mistakes) reviews.write(draftId, { review: { ...review, mistakes } });
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
 * Record a fix already in the essay: the words now in the mark resolve it.
 * When nothing else changed since the review, the reviewed text takes the
 * fix too, so Review has nothing new to check.
 */
export function resolveMistake(draftId: string, blocks: Block[], id: string, status: "fixed" | "revealed") {
  const review = readReview(draftId);
  const mistake = review?.mistakes.find((m) => m.id === id);
  const block = blocks.find((b) => b.id === mistake?.blockId);
  if (!review || !mistake || !block) return;
  const final = block.text.slice(mistake.start, mistake.end);
  const unfixed = block.text.slice(0, mistake.start) + mistake.wrong + block.text.slice(mistake.end);
  const onlyThis =
    review.text.length === blocks.length &&
    blocks.every((b, i) => (b.id === block.id ? unfixed : b.text) === review.text[i]);
  reviews.write(draftId, {
    review: {
      ...review,
      text: onlyThis ? blocks.map((b) => b.text) : review.text,
      mistakes: review.mistakes.map((m) => (m.id === id ? { ...m, status, final } : m)),
    },
  });
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
