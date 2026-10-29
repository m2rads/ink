"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";

import { createLocalStore } from "@/lib/local-store";
import { changed } from "@/lib/sync/registry";

// The user's essays: one index of metadata in localStorage, kept in step
// with the account by sync (lib/sync). Each essay's text lives separately in
// the draft store (app/write/draft-store.ts), keyed by the essay's id.
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
  // Sync sends each essay whose entry was added, changed or removed.
  onChange(_, prev, next) {
    const before = new Map((prev ?? []).map((e) => [e.id, e]));
    const after = new Map((next ?? []).map((e) => [e.id, e]));
    for (const [id, e] of after) {
      const old = before.get(id);
      if (!old || old.title !== e.title || old.words !== e.words || old.updatedAt !== e.updatedAt) changed("essay", id);
    }
    for (const id of before.keys()) if (!after.has(id)) changed("essay", id);
  },
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
/** Write the essay list to storage now, not after its delay. */
export function flushEssays() {
  store.flush(INDEX);
}

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

/** Every saved essay, most recently edited first, outside React. */
export function readEssays(): EssayMeta[] {
  return store.read(INDEX);
}

/** The essay's entry, or null when it isn't saved. */
export function readEssay(id: string): EssayMeta | null {
  return store.read(INDEX).find((e) => e.id === id) ?? null;
}

/**
 * Put an essay from another device in the list (or take it out, `null`)
 * without sending it back: what sync pulls. The list stays most recently
 * edited first.
 */
export function applyEssay(id: string, essay: EssayMeta | null) {
  const rest = store.read(INDEX).filter((e) => e.id !== id);
  const next = essay ? [...rest, essay].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)) : rest;
  store.apply(INDEX, next);
}

/** Forget every essay in this browser (signing out). */
export function clearEssays() {
  store.applyRemove(INDEX);
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
