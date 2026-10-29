"use client";

import { applyDraft, clearDrafts, readDraft } from "@/app/write/draft-store";
import {
  applyMemoryEntry,
  applyStoredReview,
  clearReviews,
  memoryIds,
  readMemoryEntry,
  readStoredReview,
  storedReviewIds,
} from "@/app/write/review-store";
import { applyEssay, clearEssays, readEssay, readEssays } from "@/lib/essays";

import type { EssayData, Kind, MemoryData } from "./kinds";

// Each kind of record, read from and written to the store that keeps it in
// this browser. `read` returns null for one that doesn't exist (deleted);
// `apply` writes without telling sync, since the change came from it.

type Adapter = {
  read: (id: string) => unknown | null;
  apply: (id: string, data: unknown | null) => void;
  /** Every id this browser has, for the first sync after signing in. */
  ids: () => string[];
};

export const ADAPTERS: Record<Kind, Adapter> = {
  essay: {
    read(id) {
      const essay = readEssay(id);
      if (!essay) return null;
      const { title, words, createdAt, updatedAt } = essay;
      return { title, words, createdAt, updatedAt, blocks: readDraft(id) } satisfies EssayData;
    },
    apply(id, data) {
      if (!data) {
        applyEssay(id, null);
        applyDraft(id, null);
        return;
      }
      const { blocks, ...meta } = data as EssayData;
      applyDraft(id, blocks);
      applyEssay(id, { id, ...meta });
    },
    // The list is what's saved; a draft without an entry is an unsaved page.
    ids: () => readEssays().map((e) => e.id),
  },
  review: {
    read: (id) => readStoredReview(id),
    apply: (id, data) => applyStoredReview(id, data as Parameters<typeof applyStoredReview>[1]),
    ids: () => storedReviewIds(),
  },
  memory: {
    read(id) {
      const entry = readMemoryEntry(id);
      return entry ? ({ ...entry, source: "essay" } satisfies MemoryData) : null;
    },
    apply(id, data) {
      const entry = data as MemoryData | null;
      applyMemoryEntry(id, entry && { at: entry.at, focus: entry.focus });
    },
    ids: () => memoryIds(),
  },
};

/** Forget everything sync keeps in this browser: signing out, or another account's leftovers. */
export function clearLocalData() {
  clearEssays();
  clearDrafts();
  clearReviews();
}
