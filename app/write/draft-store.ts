"use client";

import { createLocalStore } from "@/lib/local-store";

import { blocksFromText, type Block } from "./blocks";

// Drafts live in localStorage, one per essay (or per sample prompt and run), until essays are
// saved to a server.

type Stored = { version: 1; blocks: Block[]; savedAt: string };

const drafts = createLocalStore<Block[]>({
  prefix: "ink:draft",
  parse,
  serialize: (blocks) => JSON.stringify({ version: 1, blocks, savedAt: new Date().toISOString() } satisfies Stored),
  fallback: () => blocksFromText(""),
  saveDelayMs: 400,
});

/** The saved draft, or `null` until the client has hydrated. */
export const useDraft = drafts.useValue;

function parse(raw: string | null): Block[] | null {
  if (!raw) return null;
  try {
    const blocks = (JSON.parse(raw) as Partial<Stored>).blocks;
    if (
      Array.isArray(blocks) &&
      blocks.length > 0 &&
      blocks.every((b) => typeof b?.id === "string" && typeof b?.text === "string")
    ) {
      return blocks.map((b) => ({ id: b.id, text: b.text }));
    }
  } catch {
    // Corrupt JSON falls through to a fresh draft.
  }
  return null;
}
