import { and, count, desc, eq, gt, gte, isNull, lte, sql } from "drizzle-orm";

import { db, type Db, type Tx } from "./db";
import { aiUsage, entitlement } from "./db/schema";
import { PLANS, type Allowance, type PlanId } from "./plans";

// What a user has used of their plan, from ai_usage. A call is counted
// before it runs (count, then refund if it fails), under a lock on the user,
// so two reviews started at once can't both take the last one left.

export type Task = "review" | "check" | "ask";

const DAY = 24 * 60 * 60 * 1000;

/** The user's plan now and the period its counts cover. */
async function period(q: Db | Tx, userId: string, now = new Date()) {
  const [pass] = await q
    .select()
    .from(entitlement)
    .where(and(eq(entitlement.userId, userId), isNull(entitlement.revokedAt), lte(entitlement.startsAt, now), gt(entitlement.endsAt, now)))
    .orderBy(desc(entitlement.endsAt))
    .limit(1);
  if (pass && pass.plan in PLANS) {
    // Every 30 days from the pass's start.
    const n = Math.floor((now.getTime() - pass.startsAt.getTime()) / (30 * DAY));
    const from = new Date(pass.startsAt.getTime() + n * 30 * DAY);
    const to = new Date(Math.min(from.getTime() + 30 * DAY, pass.endsAt.getTime()));
    return { plan: PLANS[pass.plan as PlanId], passEndsAt: pass.endsAt, from, to };
  }
  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { plan: PLANS.free, passEndsAt: null, from, to };
}

async function used(q: Db | Tx, userId: string, task: Task, from: Date) {
  const [row] = await q
    .select({ n: count() })
    .from(aiUsage)
    .where(and(eq(aiUsage.userId, userId), eq(aiUsage.task, task), gte(aiUsage.at, from)));
  return row.n;
}

/** When the user's passes run out: a pass bought while another runs starts when it ends, so the last end. */
async function passesEnd(userId: string, now = new Date()) {
  const [last] = await db
    .select({ endsAt: entitlement.endsAt })
    .from(entitlement)
    .where(and(eq(entitlement.userId, userId), isNull(entitlement.revokedAt), gt(entitlement.endsAt, now)))
    .orderBy(desc(entitlement.endsAt))
    .limit(1);
  return last?.endsAt ?? null;
}

export async function allowance(userId: string): Promise<Allowance> {
  const p = await period(db, userId);
  const [reviews, asks, end] = await Promise.all([
    used(db, userId, "review", p.from),
    used(db, userId, "ask", p.from),
    p.passEndsAt ? passesEnd(userId) : null,
  ]);
  return {
    plan: p.plan.id,
    passEndsAt: (end ?? p.passEndsAt)?.toISOString() ?? null,
    reviewsLeft: Math.max(0, p.plan.reviews - reviews),
    asksLeft: Math.max(0, p.plan.asks - asks),
    resetsAt: p.to.toISOString(),
  };
}

/**
 * Count one call against the user's plan. Returns its row's id, to refund
 * if the call fails, or null when none are left. Checks aren't limited.
 */
export async function spend(userId: string, task: Task, reviewId?: string): Promise<number | null> {
  return db.transaction(async (tx) => {
    if (task !== "check") {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${userId}))`);
      const p = await period(tx, userId);
      const limit = task === "review" ? p.plan.reviews : p.plan.asks;
      if ((await used(tx, userId, task, p.from)) >= limit) return null;
    }
    const [row] = await tx.insert(aiUsage).values({ userId, task, model: "", reviewId }).returning({ id: aiUsage.id });
    return row.id;
  });
}

/** Record which model answered a counted call. */
export async function settle(id: number, model: string) {
  await db.update(aiUsage).set({ model }).where(eq(aiUsage.id, id));
}

/** A counted call failed: it doesn't count. */
export async function refund(id: number) {
  await db.delete(aiUsage).where(eq(aiUsage.id, id));
}
