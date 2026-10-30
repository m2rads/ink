"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AppBar } from "@/components/app-bar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError, confirmCheckout, me, startCheckout } from "@/lib/api/client";
import { formatPrice, PASSES, PLANS, type Allowance, type PassId } from "@/lib/plans";

// Plans (AGENTS.md, Plans and payments): what's left on the writer's plan
// and the two Exam Passes, each one button to Stripe's checkout. Coming back
// from a paid checkout (?session=), the pass is confirmed here at once; the
// webhook grants it too, whichever is first.

export function PlansScreen() {
  const router = useRouter();
  const session = useSearchParams().get("session");
  const [allowance, setAllowance] = useState<Allowance | null>(null);
  /** Whether Stripe is set up; null until the server says. */
  const [onSale, setOnSale] = useState<boolean | null>(null);
  const [buying, setBuying] = useState<PassId | null>(null);

  // Fresh each visit: a pass bought in another tab, or reviews used since.
  useEffect(() => {
    let gone = false;
    me()
      .then((r) => {
        if (gone) return;
        setAllowance(r.allowance);
        setOnSale(r.payments);
      })
      .catch(() => {});
    return () => {
      gone = true;
    };
  }, []);

  // Back from Stripe with the browser's Back button: the page may come back as it was left, mid-"Opening checkout…".
  useEffect(() => {
    const reset = (e: PageTransitionEvent) => e.persisted && setBuying(null);
    window.addEventListener("pageshow", reset);
    return () => window.removeEventListener("pageshow", reset);
  }, []);

  // Back from checkout: confirm once, then drop ?session= so a reload doesn't ask again.
  useEffect(() => {
    if (!session) return;
    confirmCheckout(session)
      .then(({ status, allowance }) => {
        setAllowance(allowance);
        if (status === "pending") toast("Payment processing", { id: "checkout", description: "Your pass starts once it clears" });
        else toast.success(allowance.passEndsAt ? `Exam Pass until ${day(allowance.passEndsAt)}` : "Payment received", { id: "checkout" });
      })
      .catch(() =>
        toast.error("Couldn’t confirm the payment", { id: "checkout", description: "If you paid, your pass arrives in a few minutes" }),
      )
      .finally(() => router.replace("/plans"));
  }, [session, router]);

  async function buy(plan: PassId) {
    setBuying(plan);
    try {
      leaveFor(await startCheckout(plan));
    } catch (error) {
      setBuying(null);
      toast.error("Couldn’t open checkout", {
        description: error instanceof ApiError && error.code === "rate" ? "Try again in a minute" : "Try again",
      });
    }
  }

  const onPass = allowance?.plan !== undefined && allowance.plan !== "free";

  return (
    <>
      <AppBar>
        <p className="flex min-w-0 flex-1 items-baseline gap-1 py-3.5 text-label text-text-3">
          <Link
            href="/home"
            className="relative shrink-0 transition-colors before:absolute before:-inset-y-3.5 before:-right-2 before:left-0 hover:text-text"
          >
            Home
          </Link>
          <span aria-hidden>/</span>
          <span className="text-text">Plans</span>
        </p>
      </AppBar>

      <main className="mx-auto w-full max-w-2xl px-4 py-12 sm:px-10">
        <h1 className="text-heading">Plans</h1>
        {allowance ? (
          <p className="mt-2 text-ui text-text-2 tabular-nums">{standing(allowance)}</p>
        ) : (
          <Skeleton className="mt-2 h-5 w-72" />
        )}

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {PASSES.map((id) => (
            <PassCard
              key={id}
              id={id}
              // The longer pass is the better buy, so it's the page's one primary.
              primary={id === "pass_3m"}
              extend={onPass}
              disabled={!onSale || buying !== null}
              busy={buying === id}
              onBuy={() => void buy(id)}
            />
          ))}
        </div>

        <div className="mt-5 grid gap-1 text-label text-text-3">
          {onSale === false && <p className="text-text-2">On sale soon</p>}
          <p>{onPass ? "Adds to the end of your pass. " : ""}Paid once, no renewal. Prices in CAD, plus tax where it applies</p>
          <p>
            Free: {PLANS.free.reviews} reviews and {PLANS.free.asks} questions a month
          </p>
        </div>
      </main>
    </>
  );
}

/** One pass: its length, price, what it gives, and its button. */
function PassCard({
  id,
  primary,
  extend,
  disabled,
  busy,
  onBuy,
}: {
  id: PassId;
  primary: boolean;
  extend: boolean;
  disabled: boolean;
  busy: boolean;
  onBuy: () => void;
}) {
  const pass = PLANS[id];
  const months = pass.days! / 30;
  return (
    <section className="flex flex-col rounded-card border bg-surface p-5">
      <h2 className="text-title">{pass.name}</h2>
      <p className="mt-3 flex items-baseline gap-2 tabular-nums">
        <span className="text-display">{formatPrice(pass.price!)}</span>
        {months > 1 && <span className="text-label text-text-3">{formatPrice(Math.round(pass.price! / months))} a month</span>}
      </p>
      <ul className="mt-4 grid gap-1 text-ui text-text-2">
        <li>{pass.reviews} reviews every 30 days</li>
        <li>{pass.asks} questions with /</li>
      </ul>
      <Button variant={primary ? undefined : "outline"} className="mt-6" disabled={disabled} onClick={onBuy}>
        {busy ? "Opening checkout…" : `${extend ? "Add" : "Get"} ${pass.name}`}
      </Button>
    </section>
  );
}

/** Stripe's checkout is another site: a full page load, not a route change. */
function leaveFor(url: string) {
  location.assign(url);
}

function standing(a: Allowance) {
  // Reviews that last as long as the pass don't need their own date.
  const until = a.resetsAt === a.passEndsAt ? "" : ` until ${day(a.resetsAt)}`;
  const reviews = `${a.reviewsLeft} review${a.reviewsLeft === 1 ? "" : "s"} left${until}`;
  return a.passEndsAt ? `Exam Pass until ${day(a.passEndsAt)} · ${reviews}` : `Free · ${reviews}`;
}

// The free allowance turns over at midnight UTC: show that day, not the
// evening before in the Americas. A pass ends at the time it was bought, so
// that one is the writer's own day.
function day(iso: string) {
  const midnightUtc = iso.endsWith("T00:00:00.000Z");
  return new Date(iso).toLocaleDateString("en", { month: "short", day: "numeric", ...(midnightUtc && { timeZone: "UTC" }) });
}
