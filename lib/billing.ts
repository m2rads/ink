import { and, desc, eq, gt, isNull, sql } from "drizzle-orm";
import Stripe from "stripe";

import { db } from "./db";
import { entitlement, purchase, stripeCustomer, stripeEvent } from "./db/schema";
import { CURRENCY, isPass, passStart, PLANS, type PassId } from "./plans";

// Selling passes through Stripe Checkout (AGENTS.md, Plans and payments).
// Server only. Stripe holds the payment and the card; Ink records what it
// bought (lib/db/schema.ts, Payments).
//
// A pass is granted by `fulfill`, from two places: Stripe's webhook, and the
// plans page when the buyer comes back from checkout (so the pass is there
// at once, even before the webhook arrives). The purchase's unique checkout
// session id makes the second one a no-op. Never on the return URL alone:
// `fulfill` asks Stripe whether the session was paid.
//
// STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET turn it on; STRIPE_TAX=on adds
// Stripe Tax once it's set up in the dashboard.

const DAY = 24 * 60 * 60 * 1000;

export const paymentsEnabled = () => Boolean(process.env.STRIPE_SECRET_KEY);

let client: Stripe | undefined;
function stripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY isn't set");
  return (client ??= new Stripe(key));
}

/** The session belongs to someone else, or isn't one of Ink's. */
export class NotYours extends Error {}

/** A Checkout page for `plan`, coming back to `origin`/plans. */
export async function startCheckout(user: { id: string; email: string }, plan: PassId, origin: string): Promise<string> {
  const pass = PLANS[plan];
  const tax = process.env.STRIPE_TAX === "on";
  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    customer: await customerFor(user),
    client_reference_id: user.id,
    metadata: { userId: user.id, plan },
    payment_intent_data: { metadata: { userId: user.id, plan } },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: CURRENCY,
          unit_amount: pass.price!,
          tax_behavior: "exclusive",
          // Electronically supplied services.
          product_data: { name: `Exam Pass · ${pass.name}`, tax_code: "txcd_10000000" },
        },
      },
    ],
    automatic_tax: { enabled: tax },
    // Stripe Tax needs the buyer's address; keep it on their customer.
    ...(tax ? { customer_update: { address: "auto" as const } } : {}),
    allow_promotion_codes: true,
    success_url: `${origin}/plans?session={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/plans`,
  });
  return session.url!;
}

async function customerFor(user: { id: string; email: string }) {
  const [known] = await db.select().from(stripeCustomer).where(eq(stripeCustomer.userId, user.id));
  if (known) return known.customerId;
  const customer = await stripe().customers.create({ email: user.email, metadata: { userId: user.id } });
  // Two checkouts started at once: the first one saved wins.
  await db.insert(stripeCustomer).values({ userId: user.id, customerId: customer.id }).onConflictDoNothing();
  const [saved] = await db.select().from(stripeCustomer).where(eq(stripeCustomer.userId, user.id));
  return saved.customerId;
}

export type Fulfilled = "granted" | "already" | "pending";

/**
 * Grant the pass a checkout session paid for, once. `userId` (from the
 * return page) must be the session's buyer. "pending": paid by a method
 * that confirms later; the webhook grants it then.
 */
export async function fulfill(sessionId: string, userId?: string): Promise<Fulfilled> {
  const session = await stripe().checkout.sessions.retrieve(sessionId);
  const buyer = session.client_reference_id;
  const plan = session.metadata?.plan;
  if (!buyer || !isPass(plan) || (userId && buyer !== userId)) throw new NotYours();
  if (session.status !== "complete" || session.payment_status === "unpaid") return "pending";

  return db.transaction(async (tx) => {
    // The same lock as counting usage (lib/usage.ts): one pass at a time per user.
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${buyer}))`);
    const [bought] = await tx
      .insert(purchase)
      .values({
        userId: buyer,
        checkoutSessionId: session.id,
        paymentIntentId: idOf(session.payment_intent),
        plan,
        amount: session.amount_total ?? 0,
        tax: session.total_details?.amount_tax ?? 0,
        currency: session.currency ?? CURRENCY,
        country: session.customer_details?.address?.country ?? null,
        status: "paid",
      })
      .onConflictDoNothing({ target: purchase.checkoutSessionId })
      .returning({ id: purchase.id });
    if (!bought) return "already";

    const now = new Date();
    const [running] = await tx
      .select({ endsAt: entitlement.endsAt })
      .from(entitlement)
      .where(and(eq(entitlement.userId, buyer), isNull(entitlement.revokedAt), gt(entitlement.endsAt, now)))
      .orderBy(desc(entitlement.endsAt))
      .limit(1);
    const startsAt = passStart(now, running?.endsAt);
    await tx.insert(entitlement).values({
      userId: buyer,
      purchaseId: bought.id,
      plan,
      startsAt,
      endsAt: new Date(startsAt.getTime() + PLANS[plan].days! * DAY),
    });
    return "granted";
  });
}

/** Check a webhook's signature and read its event; throws when it isn't Stripe's. */
export function readEvent(body: string, signature: string) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET isn't set");
  return stripe().webhooks.constructEventAsync(body, signature, secret);
}

/**
 * Act on one of Stripe's events, once: a paid checkout grants its pass, a
 * full refund or a dispute takes it away (the rows stay). Anything else is
 * noted and ignored. A failure forgets the event, so Stripe's retry runs it.
 */
export async function handleEvent(event: Stripe.Event) {
  const [fresh] = await db
    .insert(stripeEvent)
    .values({ id: event.id, type: event.type })
    .onConflictDoNothing()
    .returning({ id: stripeEvent.id });
  if (!fresh) return;
  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded":
        // Sessions that aren't Ink's passes (made by hand in the dashboard) are left alone.
        await fulfill(event.data.object.id).catch((error) => {
          if (!(error instanceof NotYours)) throw error;
        });
        break;
      case "charge.refunded": {
        const charge = event.data.object;
        await settlePurchase(idOf(charge.payment_intent), charge.refunded ? "refunded" : "partially_refunded");
        break;
      }
      case "charge.dispute.created":
        await settlePurchase(idOf(event.data.object.payment_intent), "disputed");
        break;
    }
  } catch (error) {
    await db.delete(stripeEvent).where(eq(stripeEvent.id, event.id));
    throw error;
  }
}

/** A refund or dispute: note it on the purchase, and end its pass unless only part was refunded. */
async function settlePurchase(paymentIntentId: string | null, status: "refunded" | "partially_refunded" | "disputed") {
  if (!paymentIntentId) return;
  await db.transaction(async (tx) => {
    const now = new Date();
    const [bought] = await tx
      .update(purchase)
      .set({ status, ...(status === "disputed" ? {} : { refundedAt: now }) })
      .where(eq(purchase.paymentIntentId, paymentIntentId))
      .returning({ id: purchase.id });
    if (!bought || status === "partially_refunded") return;
    await tx
      .update(entitlement)
      .set({ revokedAt: now })
      .where(and(eq(entitlement.purchaseId, bought.id), isNull(entitlement.revokedAt)));
  });
}

function idOf(ref: string | { id: string } | null | undefined) {
  return ref == null ? null : typeof ref === "string" ? ref : ref.id;
}
