import { bigint, bigserial, boolean, index, integer, jsonb, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";

// Ink's database. Columns are snake_case in Postgres (drizzle.config.ts and
// lib/db/index.ts set `casing`), camelCase here.
//
// Only the server reaches it, through the API (app/api) and the server
// actions; the web and Mac apps never hold its credentials.

// ---------- Auth (Better Auth's core tables, lib/auth.ts) ----------

export const user = pgTable("user", {
  id: text().primaryKey(),
  name: text().notNull(),
  email: text().notNull().unique(),
  emailVerified: boolean().notNull().default(false),
  image: text(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export const session = pgTable(
  "session",
  {
    id: text().primaryKey(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    token: text().notNull().unique(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    ipAddress: text(),
    userAgent: text(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (t) => [index().on(t.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text().primaryKey(),
    accountId: text().notNull(),
    providerId: text().notNull(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text(),
    refreshToken: text(),
    idToken: text(),
    accessTokenExpiresAt: timestamp({ withTimezone: true }),
    refreshTokenExpiresAt: timestamp({ withTimezone: true }),
    scope: text(),
    password: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index().on(t.userId)],
);

/** Magic links and email codes waiting to be used. */
export const verification = pgTable(
  "verification",
  {
    id: text().primaryKey(),
    identifier: text().notNull(),
    value: text().notNull(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index().on(t.identifier)],
);

/** Better Auth's own rate limits (sending codes, verifying them), shared by every server instance. */
export const authRateLimit = pgTable("auth_rate_limit", {
  id: text().primaryKey(),
  key: text().notNull().unique(),
  count: integer().notNull(),
  lastRequest: bigint({ mode: "number" }).notNull(),
});

// ---------- Sync (lib/sync) ----------

/**
 * Each user's change counter. A push takes this row's lock, so one user's
 * writes get their numbers in commit order and a pull never skips one that
 * commits late.
 */
export const syncState = pgTable("sync_state", {
  userId: text()
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  seq: bigint({ mode: "number" }).notNull().default(0),
});

/**
 * Everything a user's apps keep in step, one row per record: an essay, its
 * review, an essay's focus titles for the memory across essays, a setting.
 * `kind` and `data` are checked by lib/sync/kinds.ts. `seq` is the user's
 * counter at the last write; a pull asks for rows after the highest it has
 * seen. A deleted record stays as a tombstone so other devices learn of it.
 */
export const syncRecord = pgTable(
  "sync_record",
  {
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    kind: text().notNull(),
    id: text().notNull(),
    data: jsonb(),
    deleted: boolean().notNull().default(false),
    seq: bigint({ mode: "number" }).notNull(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.kind, t.id] }), index().on(t.userId, t.seq)],
);

// ---------- AI usage, passes, limits ----------

/** Every AI call: what quotas count, and the cost per user. */
export const aiUsage = pgTable(
  "ai_usage",
  {
    id: bigserial({ mode: "number" }).primaryKey(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** review | check | ask */
    task: text().notNull(),
    model: text().notNull(),
    reviewId: text(),
    inputTokens: integer(),
    outputTokens: integer(),
    at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index().on(t.userId, t.task, t.at)],
);

/**
 * What a user may use beyond the free tier: a pass from a purchase, or one
 * granted by hand (testers, support; `purchaseId` null). Revoked, not
 * deleted, on a refund or dispute.
 */
export const entitlement = pgTable(
  "entitlement",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    purchaseId: uuid().references(() => purchase.id),
    plan: text().notNull(),
    startsAt: timestamp({ withTimezone: true }).notNull(),
    endsAt: timestamp({ withTimezone: true }).notNull(),
    revokedAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index().on(t.userId, t.endsAt), index().on(t.purchaseId)],
);

// ---------- Payments (Stripe, lib/billing.ts) ----------
//
// Stripe holds the payment itself (card details never reach Ink); these
// rows hold who the buyer is there, what each payment bought, and which of
// Stripe's events were already handled.

/** A user's customer in Stripe, made at their first checkout. */
export const stripeCustomer = pgTable("stripe_customer", {
  userId: text()
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  customerId: text().notNull().unique(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

/**
 * One completed checkout: the record of what was paid, kept when the
 * account goes. The checkout session id is unique, so a session is granted
 * once however many times it's confirmed (the webhook and the return page).
 */
export const purchase = pgTable(
  "purchase",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: text().references(() => user.id, { onDelete: "set null" }),
    checkoutSessionId: text().notNull().unique(),
    /** What refunds and disputes refer to; none when a promotion code made it free. */
    paymentIntentId: text().unique(),
    plan: text().notNull(),
    /** Paid, tax included, in the currency's smallest unit. */
    amount: integer().notNull(),
    tax: integer().notNull(),
    currency: text().notNull(),
    country: text(),
    /** paid | partially_refunded | refunded | disputed */
    status: text().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    refundedAt: timestamp({ withTimezone: true }),
  },
  (t) => [index().on(t.userId)],
);

/** Stripe events already handled: a retried one is skipped. */
export const stripeEvent = pgTable("stripe_event", {
  id: text().primaryKey(),
  type: text().notNull(),
  processedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

/** Fixed-window request counts per user and route, lib/rate-limit.ts. */
export const rateLimit = pgTable(
  "rate_limit",
  {
    key: text().notNull(),
    windowStart: timestamp({ withTimezone: true }).notNull(),
    count: integer().notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.key, t.windowStart] })],
);
