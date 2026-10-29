import { sql } from "drizzle-orm";

import { db } from "./db";
import { rateLimit } from "./db/schema";

// Fixed-window request counts in Postgres, shared by every server instance.
// `key` names who and what ("u:<user>:lookup").
// Old windows are cleared now and then by the hits themselves (prune()).

export type Hit = { ok: true } | { ok: false; retryAfter: number };

export async function hit(key: string, max: number, windowSeconds: number): Promise<Hit> {
  const now = Date.now();
  const start = new Date(now - (now % (windowSeconds * 1000)));
  const [row] = await db
    .insert(rateLimit)
    .values({ key, windowStart: start, count: 1 })
    .onConflictDoUpdate({ target: [rateLimit.key, rateLimit.windowStart], set: { count: sql`${rateLimit.count} + 1` } })
    .returning({ count: rateLimit.count });
  // About one hit in a hundred clears old windows, so the table stays small without a scheduled job.
  if (Math.random() < 0.01) void prune().catch((error) => console.error("rate-limit prune", error));
  if (row.count <= max) return { ok: true };
  return { ok: false, retryAfter: Math.ceil((start.getTime() + windowSeconds * 1000 - now) / 1000) };
}

/** Drop windows that ended more than a day ago. */
export async function prune() {
  await db.delete(rateLimit).where(sql`${rateLimit.windowStart} < now() - interval '1 day'`);
}
