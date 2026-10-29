// What each plan allows: client-safe, so the app can say what's left.
// A pass is paid once and lasts its days (Stripe comes later); the free
// tier's allowance resets each calendar month (UTC), a pass's every 30 days
// from its start.

export type PlanId = "free" | "pass_1m" | "pass_3m";

export type Plan = {
  id: PlanId;
  /** Reviews per period; Check on a fix is free. */
  reviews: number;
  /** "/" questions per period. */
  asks: number;
  /** A pass's length; the free plan has none. */
  days?: number;
};

export const PLANS: Record<PlanId, Plan> = {
  free: { id: "free", reviews: 3, asks: 20 },
  pass_1m: { id: "pass_1m", reviews: 60, asks: 600, days: 30 },
  pass_3m: { id: "pass_3m", reviews: 60, asks: 600, days: 90 },
};

export type Allowance = {
  plan: PlanId;
  /** When the current pass ends, ISO; null on the free plan. */
  passEndsAt: string | null;
  reviewsLeft: number;
  asksLeft: number;
  /** When the counts start again, ISO. */
  resetsAt: string;
};
