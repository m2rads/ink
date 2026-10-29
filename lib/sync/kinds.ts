import { z } from "zod";

// What sync carries (lib/sync/server.ts and client.ts): one record per
// essay, review, and essay's focus titles. Client-safe. The server
// checks each record's data against its kind before storing it; a record is
// at most MAX_BYTES of JSON.

export const KINDS = ["essay", "review", "memory"] as const;
export type Kind = (typeof KINDS)[number];

export const MAX_BYTES = 200_000;

const block = z.object({ id: z.string().max(100), text: z.string().max(20_000) });

/** An essay: its place in the list (lib/essays.ts) and its text (draft-store.ts). */
export const essayData = z.object({
  title: z.string().max(200),
  words: z.number().int().min(0),
  createdAt: z.string().max(40),
  updatedAt: z.string().max(40),
  blocks: z.array(block).min(1).max(500),
});
export type EssayData = z.infer<typeof essayData>;

/** An essay's latest review, as review-store.ts keeps it. Its shape is the review's own concern. */
export const reviewData = z.object({ review: z.unknown() });

/** One essay's focus titles, for the memory across essays (review-store.ts). `source` leaves room for text written outside Ink. */
export const memoryData = z.object({
  at: z.string().max(40),
  focus: z.array(z.string().max(200)).max(10),
  source: z.string().max(100).default("essay"),
});
export type MemoryData = z.infer<typeof memoryData>;

export const DATA: Record<Kind, z.ZodType> = {
  essay: essayData,
  review: reviewData,
  memory: memoryData,
};

/** A change sent up: new `data`, or `null` for deleted. `base` is the record's seq when this device last saw it (0 if never). */
export const mutation = z.object({
  kind: z.enum(KINDS),
  id: z.string().min(1).max(100),
  data: z.unknown().nullable(),
  base: z.number().int().min(0),
});
export type Mutation = z.infer<typeof mutation>;

export const pushInput = z.object({ mutations: z.array(mutation).min(1).max(100) });

export type PushResult = {
  kind: Kind;
  id: string;
  /** The record's seq now. */
  seq: number;
  /**
   * The server kept something else: `copy` when another device had changed
   * this essay too, and theirs was kept as a new essay with this id; `kept`
   * when a delete was refused because another device had changed it since.
   */
  outcome: "saved" | "copy" | "kept";
  copyId?: string;
};
export type PushOutput = { results: PushResult[] };

export type SyncRecord = { kind: Kind; id: string; data: unknown; deleted: boolean; seq: number };
export type PullOutput = { records: SyncRecord[]; cursor: number; more: boolean };
