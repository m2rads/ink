"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";

import { createLocalStore } from "@/lib/local-store";

// The user's essays: one index of metadata in localStorage until there's a
// server. Each essay's text lives separately in the draft store
// (app/write/draft-store.ts), keyed by the essay's id.
//
// An essay is saved only once something is written in it. New essay opens a
// blank editor without saving anything; the first character of title or text
// saves it (saveEssay), and a new essay cleared back to nothing is removed
// again (removeEssay), so blank essays never reach the list, Recent or the
// streak.

export type EssayMeta = {
  id: string;
  /** The user's prompt or title; empty until they write one. */
  title: string;
  words: number;
  /** ISO timestamps. */
  createdAt: string;
  updatedAt: string;
};

const INDEX = "all";

const store = createLocalStore<EssayMeta[]>({
  prefix: "ink:essays",
  parse,
  serialize: (essays) => JSON.stringify({ version: 1, essays }),
  fallback: () => [],
  saveDelayMs: 300,
});

/** Every essay, most recently edited first; `null` until the client has hydrated. */
export function useEssays(): EssayMeta[] | null {
  return store.useValue(INDEX)[0];
}

/** Open the editor on a new, unsaved essay. Nothing is stored until something is written. */
export function useStartEssay() {
  const router = useRouter();
  return useCallback(() => router.push(newEssayHref(crypto.randomUUID())), [router]);
}

export function essayHref(id: string) {
  return `/write?essay=${id}`;
}

/** An essay that isn't saved yet: `new` tells the editor an unknown id is a blank page, not a missing essay. */
export function newEssayHref(id: string) {
  return `/write?essay=${id}&new=1`;
}

/**
 * Record an edit: new title or word count, and move the essay to the top.
 * Saves the essay first if it isn't saved yet.
 */
export function saveEssay(id: string, patch: Partial<Pick<EssayMeta, "title" | "words">>) {
  const essays = store.read(INDEX);
  const current = essays.find((e) => e.id === id);
  const now = new Date().toISOString();
  if (!current) {
    const essay: EssayMeta = { id, title: "", words: 0, ...patch, createdAt: now, updatedAt: now };
    store.write(INDEX, [essay, ...essays]);
    return;
  }
  if (Object.entries(patch).every(([k, v]) => current[k as keyof EssayMeta] === v)) return;
  const updated = { ...current, ...patch, updatedAt: now };
  store.write(INDEX, [updated, ...essays.filter((e) => e.id !== id)]);
}

/** Whether something has been written: what it takes for an essay to be saved. */
export function hasWriting(e: Pick<EssayMeta, "title" | "words">) {
  return e.title.trim() !== "" || e.words > 0;
}

export function isSaved(id: string) {
  return store.read(INDEX).some((e) => e.id === id);
}

/** Take an essay out of the list. Its text is the caller's to remove (draft store). */
export function removeEssay(id: string) {
  const essays = store.read(INDEX);
  if (essays.some((e) => e.id === id)) store.write(INDEX, essays.filter((e) => e.id !== id));
}

/** The longest title, in characters. */
export const TITLE_MAX = 80;

export function essayTitle(e: Pick<EssayMeta, "title">): string {
  return e.title.trim() || "Untitled";
}

/** The local calendar day of a timestamp, as YYYY-MM-DD. */
export function localDay(iso: string | Date): string {
  return new Date(iso).toLocaleDateString("en-CA");
}

function parse(raw: string | null): EssayMeta[] | null {
  if (!raw) return null;
  try {
    const essays = (JSON.parse(raw) as { essays?: unknown }).essays;
    if (!Array.isArray(essays)) return null;
    return essays.filter(
      (e): e is EssayMeta =>
        typeof e?.id === "string" &&
        typeof e?.title === "string" &&
        typeof e?.words === "number" &&
        typeof e?.createdAt === "string" &&
        typeof e?.updatedAt === "string" &&
        // Blank essays saved before essays were saved lazily.
        hasWriting(e),
    );
  } catch {
    return null;
  }
}
