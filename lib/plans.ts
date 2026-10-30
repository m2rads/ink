// What each plan allows and costs: client-safe, so the app can show it.
// A pass is paid once through Stripe (lib/billing.ts) and lasts its days,
// with no renewal; buying one while another runs starts it when that one
// ends. The free tier's allowance resets each calendar month (UTC), a pass's
// every 30 days from its start.

export type PlanId = "free" | "pass_1m" | "pass_3m";
export type PassId = Exclude<PlanId, "free">;
export const PASSES: PassId[] = ["pass_1m", "pass_3m"];

/** What passes are priced in. Tax is added at checkout where it applies. */
export const CURRENCY = "cad";

export type Plan = {
  id: PlanId;
  /** Reviews per period; Check on a fix is free. */
  reviews: number;
  /** "/" questions per period. */
  asks: number;
  /** A pass's length; the free plan has none. */
  days?: number;
  /** A pass's price before tax, in cents of CURRENCY. */
  price?: number;
  /** A pass's name in the app and at checkout ("1 month"). */
  name?: string;
};

export const PLANS: Record<PlanId, Plan> = {
  free: { id: "free", reviews: 3, asks: 20 },
  pass_1m: { id: "pass_1m", reviews: 60, asks: 600, days: 30, price: 1_900, name: "1 month" },
  pass_3m: { id: "pass_3m", reviews: 60, asks: 600, days: 90, price: 3_900, name: "3 months" },
};

export function isPass(id: unknown): id is PassId {
  return PASSES.includes(id as PassId);
}

/** When a pass bought `now` starts: right away, or when the pass still running ends. */
export function passStart(now: Date, runningUntil: Date | null | undefined): Date {
  return runningUntil && runningUntil > now ? runningUntil : now;
}

/** "$19", in the app's locale. */
export function formatPrice(cents: number) {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: CURRENCY, minimumFractionDigits: cents % 100 ? 2 : 0 }).format(cents / 100);
}

export type Allowance = {
  plan: PlanId;
  /** When the current pass ends (or the last of the passes bought after it), ISO; null on the free plan. */
  passEndsAt: string | null;
  reviewsLeft: number;
  asksLeft: number;
  /** When the counts start again, ISO. */
  resetsAt: string;
};
