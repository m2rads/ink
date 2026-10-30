import { z } from "zod";

import { CONTEXT_CHARS, FOCUS_CHARS, PARAGRAPH_CHARS } from "@/lib/ai/budget";
import type { AskResult, ItemVerdict, ReviewResult } from "@/lib/ai/check";
import type { GrammarIssue } from "@/lib/grammar";
import { LANGUAGE_CODES } from "@/lib/languages";
import type { Lookup } from "@/lib/lookup";
import type { Fulfilled } from "@/lib/billing";
import { PASSES, type Allowance, type PassId } from "@/lib/plans";

// What the API (lib/api/server.ts) takes and returns, version 1. The web app
// (lib/api/client.ts) and the Mac app send the same requests; change a shape
// in a way old clients can't read only under a new version. Client-safe:
// type imports only from server modules.

/**
 * A review sends at most CONTEXT_CHARS of text and looks closely at
 * FOCUS_CHARS of it (lib/ai/budget.ts plans that for a long essay): one
 * review's cost has a ceiling, however much is written.
 */
export const reviewInput = z
  .object({
    reviewId: z.string().min(1).max(100),
    prompt: z.string().max(2_000),
    paragraphs: z.array(z.string().max(PARAGRAPH_CHARS)).min(1).max(200),
    review: z.array(z.number().int().min(0).max(199)).max(200).optional(),
    omitted: z.array(z.tuple([z.number().int().min(0).max(199), z.number().int().min(0).max(1_000_000)])).max(200).optional(),
    shown: z.array(z.tuple([z.number().int().min(0).max(199), z.string().max(200)])).max(60).optional(),
    earlier: z.array(z.tuple([z.string().max(60), z.number().int().min(1).max(10_000)])).max(12).optional(),
  })
  .refine((r) => r.paragraphs.reduce((n, p) => n + p.length, 0) <= CONTEXT_CHARS, {
    message: `A review sends at most ${CONTEXT_CHARS} characters.`,
  })
  .refine((r) => (r.review ?? r.paragraphs.map((_, i) => i)).reduce((n, i) => n + (r.paragraphs[i]?.length ?? 0), 0) <= FOCUS_CHARS, {
    message: `A review looks closely at most ${FOCUS_CHARS} characters.`,
  });

/** A review streams as newline-delimited JSON: `found` each time the count of items goes up, then `done` or `error`. */
export type ReviewEvent =
  | { type: "found"; count: number }
  | { type: "done"; result: ReviewResult }
  | { type: "error"; message: string };

export const GRAMMAR_BATCH = 60;
export const GRAMMAR_CHARS = 5_000;
export const grammarInput = z.object({ paragraphs: z.array(z.string().max(GRAMMAR_CHARS)).max(GRAMMAR_BATCH) });
export type GrammarOutput = { issues: GrammarIssue[][] };

export const itemCheckInput = z.object({
  reviewId: z.string().min(1).max(100),
  passage: z.string().max(5_000),
  quote: z.string().max(500),
  title: z.string().max(200),
  why: z.string().max(1_000),
  /** The item's words now, and the answers that pass without a model call. */
  words: z.string().max(500),
  accept: z.array(z.string().max(500)).max(20),
});
export type ItemCheckOutput = ItemVerdict;

export const askInput = z.object({
  query: z.string().trim().min(1).max(200),
  before: z.string().max(600),
  after: z.string().max(300),
});
export type AskOutput = AskResult;

export const lookupInput = z.object({
  text: z.string().trim().min(1).max(100),
  /** The learner's language (LANGUAGES), the other side being French. */
  lang: z.enum(LANGUAGE_CODES),
  direction: z.enum(["to-fr", "from-fr"]),
  /** A selection's words before it in the essay (wordsBefore in selection.ts); absent in the panel. */
  before: z.string().max(100).optional(),
  /** The Mac app: a verb also carries its finished tables (`verb.view`, verbView in compose.ts), so it never composes them itself. */
  tables: z.boolean().optional(),
});
export type LookupOutput = Lookup;

export type MeOutput = {
  user: { id: string; email: string; name: string; image: string | null };
  allowance: Allowance;
  /** Whether passes are on sale (Stripe is set up). */
  payments: boolean;
};

// Buying a pass (lib/billing.ts): checkout returns Stripe's page to go to;
// coming back, confirm grants the pass at once if Stripe says it's paid.
export const checkoutInput = z.object({ plan: z.enum(PASSES as [PassId, ...PassId[]]) });
export type CheckoutOutput = { url: string };

export const confirmInput = z.object({ session: z.string().startsWith("cs_").max(255) });
export type ConfirmOutput = { status: Fulfilled; allowance: Allowance };

// Signing in the Mac app (AGENTS.md, Accounts and sync): the signed-in web
// page asks for a one-time code bound to the app's PKCE challenge; the app
// trades the code and its verifier for its own session token.
/** The app's random state, and the base64url SHA-256 of its verifier (no padding). */
export const connectMacInput = z.object({
  state: z.string().regex(/^[\w-]{16,128}$/, "state must be 16–128 characters of A–Z, a–z, 0–9, _ or -."),
  challenge: z.string().regex(/^[\w-]{43}$/, "challenge must be a base64url SHA-256."),
});
export type ConnectMacOutput = { code: string };

export const connectTokenInput = z.object({
  code: z.string().min(1).max(100),
  verifier: z.string().regex(/^[\w.~-]{43,128}$/, "verifier must be 43–128 characters of A–Z, a–z, 0–9, ., _, ~ or -."),
});
export type ConnectTokenOutput = { token: string; user: MeOutput["user"] };

/**
 * Errors are `{ error: { code, message } }`:
 * - `sign-in` (401): this needs an account.
 * - `quota` (402): none of this left on the plan until `resetsAt`.
 * - `rate` (429): too many requests; try again after `retryAfter` seconds.
 * - `invalid` (400): the request doesn't match its schema.
 * - `failed` (500): something went wrong on the way.
 */
export type ApiErrorCode = "sign-in" | "quota" | "rate" | "invalid" | "failed";
export type ApiErrorBody = { error: { code: ApiErrorCode; message: string; retryAfter?: number; resetsAt?: string } };
