import type { z } from "zod";

import { goToSignIn } from "@/lib/auth-client";

import type {
  ApiErrorBody,
  ApiErrorCode,
  AskOutput,
  GrammarOutput,
  ItemCheckOutput,
  LookupOutput,
  MeOutput,
  ReviewEvent,
  askInput,
  itemCheckInput,
  lookupInput,
  reviewInput,
} from "./schemas";

// The web app's side of the API (lib/api/server.ts): the same requests the
// Mac app sends, signed in by the session cookie. A failed request throws
// ApiError with the API's code, so callers can tell "none left" from a
// failure; a session that ended goes to sign-in.

export class ApiError extends Error {
  constructor(
    readonly code: ApiErrorCode,
    message: string,
    readonly retryAfter?: number,
    readonly resetsAt?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request(path: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(`/api/v1${path}`, {
    ...init,
    credentials: "same-origin",
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
  });
  if (res.ok) return res;
  if (res.status === 401) goToSignIn();
  const body = (await res.json().catch(() => null)) as ApiErrorBody | null;
  const e = body?.error;
  throw new ApiError(e?.code ?? "failed", e?.message ?? `Request failed (${res.status})`, e?.retryAfter, e?.resetsAt);
}

async function post<T>(path: string, body: unknown): Promise<T> {
  return (await request(path, { method: "POST", body: JSON.stringify(body) })).json() as Promise<T>;
}

export async function me(): Promise<MeOutput> {
  return (await request("/me")).json() as Promise<MeOutput>;
}

/** Grammalecte's mistakes in each paragraph, for the essay's underlines. */
export async function findGrammar(paragraphs: string[]): Promise<GrammarOutput["issues"]> {
  return (await post<GrammarOutput>("/grammar", { paragraphs })).issues;
}

export function lookUp(input: z.input<typeof lookupInput>): Promise<LookupOutput> {
  return post("/lookup", input);
}

export function askFrench(input: z.input<typeof askInput>): Promise<AskOutput> {
  return post("/ask", input);
}

export function checkItem(input: z.input<typeof itemCheckInput>): Promise<ItemCheckOutput> {
  return post("/check-item", input);
}

type ReviewProgress = Exclude<ReviewEvent, { type: "error" }>;

/** A review's events as they come: `found` counts, then `done`. A review that fails partway errors the stream. */
export async function reviewEssay(input: z.input<typeof reviewInput>): Promise<ReadableStream<ReviewProgress>> {
  const res = await request("/review", { method: "POST", body: JSON.stringify(input) });
  let buffer = "";
  return res
    .body!.pipeThrough(new TextDecoderStream())
    .pipeThrough(
      new TransformStream<string, ReviewProgress>({
        transform(chunk, out) {
          buffer += chunk;
          const lines = buffer.split("\n");
          buffer = lines.pop()!;
          for (const line of lines) {
            if (!line.trim()) continue;
            const event = JSON.parse(line) as ReviewEvent;
            if (event.type === "error") out.error(new ApiError("failed", event.message));
            else out.enqueue(event);
          }
        },
      }),
    );
}
