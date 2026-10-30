import { Hono, type Context } from "hono";
import { createMiddleware } from "hono/factory";
import type { z } from "zod";

import { judgeItem, runReview, suggestFrench } from "@/lib/ai/check";
import { matchesAccepted } from "@/lib/ai/correction";
import { auth, userFrom, type User } from "@/lib/auth";
import { fulfill, handleEvent, NotYours, paymentsEnabled, readEvent, startCheckout } from "@/lib/billing";
import { createConnectCode, redeemConnectCode } from "@/lib/connect";
import { checkGrammar } from "@/lib/grammar";
import { lookUp } from "@/lib/lookup";
import { hit } from "@/lib/rate-limit";
import { pushInput, type PullOutput, type PushOutput } from "@/lib/sync/kinds";
import { InvalidRecord, pull, push } from "@/lib/sync/server";
import { allowance, refund, settle, spend } from "@/lib/usage";

import {
  askInput,
  checkoutInput,
  confirmInput,
  connectMacInput,
  connectTokenInput,
  grammarInput,
  itemCheckInput,
  lookupInput,
  reviewInput,
  type ApiErrorBody,
  type ApiErrorCode,
  type AskOutput,
  type CheckoutOutput,
  type ConfirmOutput,
  type ConnectMacOutput,
  type ConnectTokenOutput,
  type GrammarOutput,
  type ItemCheckOutput,
  type LookupOutput,
  type MeOutput,
  type ReviewEvent,
} from "./schemas";

// Ink's API, mounted at /api by app/api/[[...route]]/route.ts. The web app
// and the Mac app call the same routes: signed in by the session cookie or
// `Authorization: Bearer <token>`. Shapes are in ./schemas.ts.
//
// Every route needs an account: there's no one's data to give, or budget to
// spend, without one. Each is rate-limited per user, and Review and "/"
// count against the plan (lib/usage.ts).

type Env = { Variables: { user: User } };

const app = new Hono<Env>().basePath("/api");

// Better Auth's own routes: sign-in, sign-out, the session.
app.on(["GET", "POST"], "/auth/*", (c) => auth.handler(c.req.raw));

// Stripe's events (lib/billing.ts): signed by Stripe, so no session. Any
// answer but 2xx makes Stripe retry, for up to three days.
app.post("/stripe/webhook", async (c) => {
  let event;
  try {
    event = await readEvent(await c.req.text(), c.req.header("stripe-signature") ?? "");
  } catch (error) {
    console.error("stripe webhook", error);
    return c.text("Bad signature", 400);
  }
  await handleEvent(event);
  return c.json({ received: true });
});

// The Mac app trades a one-time code from /connect/mac and its PKCE verifier
// for a session token (lib/connect.ts). It has no session yet, so this is
// outside v1, limited by address instead.
app.post("/connect/token", async (c) => {
  const ip = c.req.header("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const result = await hit(`ip:${ip}:connect-token`, 20, 60);
  if (!result.ok) return fail(c, "rate", "Too many requests. Try again in a moment.", { retryAfter: result.retryAfter });
  const input = await parse(c, connectTokenInput);
  if (!input.ok) return input.response;
  const signedIn = await redeemConnectCode(input.data.code, input.data.verifier, ip);
  if (!signedIn) return fail(c, "invalid", "This sign-in link has expired. Try again from Encre.");
  return c.json<ConnectTokenOutput>(signedIn);
});

const v1 = new Hono<Env>();

v1.use(async (c, next) => {
  const user = await userFrom(c.req.raw.headers);
  if (!user) return fail(c, "sign-in", "Sign in to use this.");
  c.set("user", user);
  await next();
});

/** At most `max` requests per `seconds` for each user. */
function limit(name: string, max: number, seconds: number) {
  return createMiddleware<Env>(async (c, next) => {
    const result = await hit(`u:${c.get("user").id}:${name}`, max, seconds);
    if (!result.ok) return fail(c, "rate", "Too many requests. Try again in a moment.", { retryAfter: result.retryAfter });
    await next();
  });
}

v1.get("/me", async (c) => {
  const user = c.get("user");
  return c.json<MeOutput>({
    user: { id: user.id, email: user.email, name: user.name, image: user.image ?? null },
    allowance: await allowance(user.id),
    payments: paymentsEnabled(),
  });
});

// Connecting the Mac app: a one-time code for its callback, bound to its PKCE challenge.
v1.post("/connect/mac", limit("connect", 10, 60), async (c) => {
  const input = await parse(c, connectMacInput);
  if (!input.ok) return input.response;
  return c.json<ConnectMacOutput>({ code: await createConnectCode(c.get("user").id, input.data.challenge) });
});

// Buying a pass: Stripe's checkout page to go to, then, back from it, the
// pass granted at once (the webhook grants it too; whichever comes first).
v1.post("/billing/checkout", limit("checkout", 10, 60), async (c) => {
  const input = await parse(c, checkoutInput);
  if (!input.ok) return input.response;
  if (!paymentsEnabled()) return fail(c, "failed", "Passes aren't on sale yet.");
  const url = await startCheckout(c.get("user"), input.data.plan, new URL(c.req.url).origin);
  return c.json<CheckoutOutput>({ url });
});

v1.post("/billing/confirm", limit("confirm", 30, 60), async (c) => {
  const input = await parse(c, confirmInput);
  if (!input.ok) return input.response;
  const user = c.get("user");
  try {
    const status = await fulfill(input.data.session, user.id);
    return c.json<ConfirmOutput>({ status, allowance: await allowance(user.id) });
  } catch (error) {
    if (error instanceof NotYours) return fail(c, "invalid", "Not your checkout.");
    throw error;
  }
});

v1.post("/grammar", limit("grammar", 240, 60), async (c) => {
  const input = await parse(c, grammarInput);
  if (!input.ok) return input.response;
  return c.json<GrammarOutput>({ issues: input.data.paragraphs.map(checkGrammar) });
});

// The selection pill prefetches a lookup per settled selection, so the
// per-minute cap is generous; the daily one (well past a heavy writer's
// 100–200) bounds what one account can cost in Google Translate.
v1.post("/lookup", limit("lookup", 120, 60), limit("lookup-day", 500, 86_400), async (c) => {
  const input = await parse(c, lookupInput);
  if (!input.ok) return input.response;
  return c.json<LookupOutput>(await lookUp(input.data));
});

v1.post("/ask", limit("ask", 20, 60), async (c) => {
  const input = await parse(c, askInput);
  if (!input.ok) return input.response;
  const { query, before, after } = input.data;
  const user = c.get("user");
  const usage = await spend(user.id, "ask");
  if (usage === null) return noneLeft(c, user.id, "You've used this month's questions.");
  try {
    // The sentence it goes in is enough context; the rest of the essay isn't sent.
    const result = await suggestFrench({ query, before: before.slice(-300), after: after.slice(0, 150) });
    await settle(usage, result.model);
    return c.json<AskOutput>(result);
  } catch (error) {
    await refund(usage);
    throw error;
  }
});

/**
 * Ask the AI about one item again, after the writer changed it. An accepted
 * answer passes without a call. Free on every plan, so it has a daily cap
 * instead: far past what fixing even 60 reviews' items takes.
 */
v1.post("/check-item", limit("check", 30, 60), limit("check-day", 200, 86_400), async (c) => {
  const input = await parse(c, itemCheckInput);
  if (!input.ok) return input.response;
  const { words, accept, ...item } = input.data;
  if (accept.length && matchesAccepted(words, accept)) {
    return c.json<ItemCheckOutput>({ resolved: true, feedback: "", arm: "accepted", model: "none" });
  }
  const usage = (await spend(c.get("user").id, "check", item.reviewId))!;
  try {
    const verdict = await judgeItem(item);
    await settle(usage, verdict.model);
    return c.json<ItemCheckOutput>(verdict);
  } catch (error) {
    await refund(usage);
    throw error;
  }
});

/**
 * Review an essay, streamed as newline-delimited JSON (ReviewEvent). `review`
 * limits items to those paragraphs (an incremental review); the level always
 * covers the whole essay. Empty paragraphs are kept so block indices match
 * the editor's.
 */
v1.post("/review", limit("review", 5, 60), async (c) => {
  const input = await parse(c, reviewInput);
  if (!input.ok) return input.response;
  const essay = input.data;
  const user = c.get("user");
  const usage = await spend(user.id, "review", essay.reviewId);
  if (usage === null) return noneLeft(c, user.id, "You've used this month's reviews.");

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(out) {
      const send = (event: ReviewEvent) => out.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      try {
        const underlined = essay.paragraphs.map(checkGrammar);
        const result = await runReview({ ...essay, underlined }, { onFound: (count) => send({ type: "found", count }) });
        await settle(usage, result.model);
        send({ type: "done", result });
      } catch (error) {
        console.error(error);
        await refund(usage);
        send({ type: "error", message: "The review failed." });
      }
      out.close();
    },
  });
  return c.body(stream, 200, { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" });
});

// Sync (lib/sync): the user's records changed after a cursor, and changes sent up.
v1.get("/sync/pull", limit("pull", 120, 60), async (c) => {
  const cursor = Number(c.req.query("cursor") ?? 0);
  if (!Number.isSafeInteger(cursor) || cursor < 0) return fail(c, "invalid", "cursor must be a whole number.");
  return c.json<PullOutput>(await pull(c.get("user").id, cursor));
});

v1.post("/sync/push", limit("push", 120, 60), async (c) => {
  const input = await parse(c, pushInput);
  if (!input.ok) return input.response;
  try {
    return c.json<PushOutput>({ results: await push(c.get("user").id, input.data.mutations) });
  } catch (error) {
    if (error instanceof InvalidRecord) return fail(c, "invalid", error.message);
    throw error;
  }
});

app.route("/v1", v1);

app.notFound((c) => fail(c, "invalid", "No such route."));
app.onError((error, c) => {
  console.error(error);
  return fail(c, "failed", "Something went wrong.");
});

export { app };

const STATUS: Record<ApiErrorCode, 400 | 401 | 402 | 429 | 500> = {
  invalid: 400,
  "sign-in": 401,
  quota: 402,
  rate: 429,
  failed: 500,
};

function fail(c: Context, code: ApiErrorCode, message: string, extra: Partial<ApiErrorBody["error"]> = {}) {
  const headers: Record<string, string> = extra.retryAfter ? { "Retry-After": String(extra.retryAfter) } : {};
  return c.json<ApiErrorBody>({ error: { code, message, ...extra } }, STATUS[code], headers);
}

async function noneLeft(c: Context, userId: string, message: string) {
  const { resetsAt } = await allowance(userId);
  return fail(c, "quota", message, { resetsAt });
}

async function parse<S extends z.ZodType>(
  c: Context,
  schema: S,
): Promise<{ ok: true; data: z.output<S> } | { ok: false; response: Response }> {
  const body: unknown = await c.req.json().catch(() => undefined);
  const result = schema.safeParse(body);
  if (result.success) return { ok: true, data: result.data };
  return { ok: false, response: fail(c, "invalid", result.error.issues[0]?.message ?? "Invalid request.") };
}
