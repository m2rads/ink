import { and, asc, eq, gt } from "drizzle-orm";

import { db, type Tx } from "@/lib/db";
import { syncRecord, syncState } from "@/lib/db/schema";

import { DATA, MAX_BYTES, type EssayData, type Mutation, type PullOutput, type PushResult } from "./kinds";

// Sync, server side (AGENTS.md, Sync): each user's records with a change
// number. A push writes under a lock on the user's counter, so their
// changes are numbered in the order they commit and a pull ("everything
// after N") never skips one that commits late.
//
// Conflicts: two devices that both changed an essay since they last synced
// both keep their text. The one pushing now wins the essay; the other's
// version becomes a new essay, "… (other version)". Everything else is last
// write wins. A delete of an essay another device changed since is refused.

export class InvalidRecord extends Error {}

export async function push(userId: string, mutations: Mutation[]): Promise<PushResult[]> {
  for (const m of mutations) {
    if (m.data === null) continue;
    if (!DATA[m.kind].safeParse(m.data).success) throw new InvalidRecord(`Invalid ${m.kind} ${m.id}`);
    if (JSON.stringify(m.data).length > MAX_BYTES) throw new InvalidRecord(`${m.kind} ${m.id} is too large`);
  }

  return db.transaction(async (tx) => {
    await tx.insert(syncState).values({ userId, seq: 0 }).onConflictDoNothing();
    const [state] = await tx.select().from(syncState).where(eq(syncState.userId, userId)).for("update");
    let seq = state.seq;
    const results: PushResult[] = [];

    for (const m of mutations) {
      const data = m.data === null ? null : DATA[m.kind].parse(m.data);
      const [current] = await tx
        .select()
        .from(syncRecord)
        .where(and(eq(syncRecord.userId, userId), eq(syncRecord.kind, m.kind), eq(syncRecord.id, m.id)));
      const stale = current && current.seq !== m.base;

      if (m.kind === "essay" && stale && !current.deleted) {
        const theirs = current.data as EssayData;
        if (data === null) {
          // Deleting what another device has changed since would lose it.
          if (!sameText(theirs, null)) {
            results.push({ kind: m.kind, id: m.id, seq: current.seq, outcome: "kept" });
            continue;
          }
        } else if (!sameText(theirs, data as EssayData)) {
          const copyId = crypto.randomUUID();
          const copy: EssayData = { ...theirs, title: `${theirs.title.trim() || "Untitled"} (other version)` };
          await write(tx, userId, "essay", copyId, copy, ++seq);
          await write(tx, userId, m.kind, m.id, data, ++seq);
          results.push({ kind: m.kind, id: m.id, seq, outcome: "copy", copyId });
          continue;
        }
      }

      await write(tx, userId, m.kind, m.id, data, ++seq);
      results.push({ kind: m.kind, id: m.id, seq, outcome: "saved" });
    }

    await tx.update(syncState).set({ seq }).where(eq(syncState.userId, userId));
    return results;
  });
}

async function write(tx: Tx, userId: string, kind: string, id: string, data: unknown, seq: number) {
  const values = { data: data ?? null, deleted: data === null, seq, updatedAt: new Date() };
  await tx
    .insert(syncRecord)
    .values({ userId, kind, id, ...values })
    .onConflictDoUpdate({ target: [syncRecord.userId, syncRecord.kind, syncRecord.id], set: values });
}

/** Whether two versions of an essay have the same title and text (word counts and times aside). */
function sameText(a: EssayData, b: EssayData | null) {
  if (!b) return !a.title.trim() && a.blocks.every((x) => !x.text.trim());
  return a.title === b.title && a.blocks.map((x) => x.text).join("\n\n") === b.blocks.map((x) => x.text).join("\n\n");
}

const PAGE = 500;

/** The user's records changed after `cursor`, oldest first, a page at a time. */
export async function pull(userId: string, cursor: number): Promise<PullOutput> {
  const rows = await db
    .select({ kind: syncRecord.kind, id: syncRecord.id, data: syncRecord.data, deleted: syncRecord.deleted, seq: syncRecord.seq })
    .from(syncRecord)
    .where(and(eq(syncRecord.userId, userId), gt(syncRecord.seq, cursor)))
    .orderBy(asc(syncRecord.seq))
    .limit(PAGE + 1);
  const more = rows.length > PAGE;
  const records = (more ? rows.slice(0, PAGE) : rows).map((r) => ({ ...r, kind: r.kind as PullOutput["records"][number]["kind"] }));
  return { records, cursor: records.at(-1)?.seq ?? cursor, more };
}

