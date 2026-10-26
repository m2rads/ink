"use client";

import { createLocalStore } from "@/lib/local-store";

import { blocksFromText, type Block, type Caret } from "./blocks";

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

/** For edits made outside the editor, such as a fix accepted in a review. */
export const readDraft = drafts.read;
export const writeDraft = drafts.write;

/** A draft and the caret saved with it. */
export function removeDraft(id: string) {
  drafts.remove(id);
  carets.remove(id);
}

// Where the writer left the caret in each draft, so coming back to it (from
// Home, a reload or the review) puts them there again.
const carets = createLocalStore<Caret | null>({
  prefix: "ink:caret",
  parse: (raw) => {
    try {
      const c = raw ? (JSON.parse(raw) as Partial<Caret>) : null;
      return c && typeof c.blockId === "string" && typeof c.offset === "number" ? { blockId: c.blockId, offset: c.offset } : null;
    } catch {
      return null;
    }
  },
  serialize: (caret) => JSON.stringify(caret),
  fallback: () => null,
  saveDelayMs: 0,
});

/** The draft's saved caret: `[caret, setCaret]`, null when there's none. */
export const useCaret = (id: string) => {
  const [caret, setCaret] = carets.useValue(id);
  return [caret ?? null, setCaret] as const;
};

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
