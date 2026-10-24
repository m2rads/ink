"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";

import { createLocalStore } from "@/lib/local-store";

// The user's essays: one index of metadata in localStorage until there's a
// server. Each essay's text lives separately in the draft store
// (app/write/draft-store.ts), keyed by the essay's id.

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

/** Start a blank essay and return its id. */
export function createEssay(): string {
  const now = new Date().toISOString();
  const essay: EssayMeta = { id: crypto.randomUUID(), title: "", words: 0, createdAt: now, updatedAt: now };
  store.write(INDEX, [essay, ...store.read(INDEX)]);
  return essay.id;
}

/** Create a blank essay and open it in the editor. */
export function useStartEssay() {
  const router = useRouter();
  return useCallback(() => router.push(essayHref(createEssay())), [router]);
}

export function essayHref(id: string) {
  return `/write?essay=${id}`;
}

/** Record an edit: new title or word count, and move the essay to the top. */
export function updateEssay(id: string, patch: Partial<Pick<EssayMeta, "title" | "words">>) {
  const essays = store.read(INDEX);
  const current = essays.find((e) => e.id === id);
  if (!current) return;
  if (Object.entries(patch).every(([k, v]) => current[k as keyof EssayMeta] === v)) return;
  const updated = { ...current, ...patch, updatedAt: new Date().toISOString() };
  store.write(INDEX, [updated, ...essays.filter((e) => e.id !== id)]);
}

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
        typeof e?.updatedAt === "string",
    );
  } catch {
    return null;
  }
}
