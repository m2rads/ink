"use client";

import "./landing.css";

import Link from "next/link";

import { formatPrice, PASSES, PLANS } from "@/lib/plans";
import { SITE } from "@/lib/site";
import { cn } from "@/lib/utils";

import { DictionaryShot, Essay, Mark, MarginShot, MemoryShot, MISTAKES, Note, Picture, TimerShot, TranslateShot, Typed, Window } from "./mocks";
import { Cta, Footer, Nav, SecondaryCta } from "./parts";

// The landing page at / (AGENTS.md, Landing page): Linear's own structure.
// Hero, the app itself in a window, one statement, three feature rows, the
// plans with their prices, a closing line. Public, so it also carries what
// a buyer or a payments review needs to see before paying: what's sold, at
// what price and in what currency, who sells it, and the policies (Footer).

export function Landing() {
  return (
    <div className="lp min-h-dvh overflow-x-clip bg-bg text-text">
      <Nav />

      <section className="mx-auto max-w-6xl px-6 pt-20 sm:pt-28">
        <h1 className="lp-hero max-w-4xl">The French editor that won’t fix it for you</h1>
        <p className="lp-sub mt-5 max-w-xl">
          Built for the TEF writing exam. Write, look words up, then correct every mistake yourself. {SITE.name} remembers the ones you keep
          making.
        </p>
        <div className="mt-8">
          <Cta />
        </div>
      </section>

      <div className="lp-glow mt-16 px-6 pt-px sm:mt-20">
        <Picture
          label={`${SITE.name}’s correction view: a French essay with four numbered mistakes, one being rewritten in place, and teacher-style notes beside it`}
          className="lp-fade mx-auto max-w-6xl"
        >
          <Window>
            <div className="lp-frame-inner">
              <MarginShot />
            </div>
          </Window>
        </Picture>
      </div>

      <section className="mx-auto max-w-6xl px-6 pt-16 pb-24 sm:pt-24">
        <p className="lp-statement max-w-4xl">
          A writing desk for one exam.{" "}
          <span className="text-text-3">
            Write your Expression écrite, look words up without leaving the page, and fix every mistake by hand. The exam won’t do it for
            you either.
          </span>
        </p>
      </section>

      <Feature
        title={["Fix it", "yourself"]}
        body={`Every mistake is marked in your own text, with a note beside it. Rewrite it in place and ${SITE.name} checks your fix, not its own.`}
        label="Rewriting a marked mistake in place, with the note confirming the fix"
      >
        <div className="grid gap-8 p-5 md:grid-cols-[minmax(0,1fr)_16rem] md:p-8">
          <Essay render={(m) => (m.n === 1 ? <Typed m={m} text="aux" caret={false} /> : m.n === 2 ? <Mark m={m} fixed="embouteillages" /> : <Mark m={m} />)} />
          <div className="grid content-start gap-2">
            <Note m={MISTAKES[1]} status="fixed" />
            <div className="rounded-card border border-border-strong bg-surface px-3 py-2.5">
              <p className="text-label text-ok">✓ Correct</p>
              <p className="mt-1 text-ui text-text-2">
                <em lang="fr" className="font-serif">
                  Faire attention aux risques.
                </em>
              </p>
            </div>
          </div>
        </div>
      </Feature>

      <Feature
        title={["It remembers", "what you repeat"]}
        body="Mistakes are counted by category across your essays, so the ones you keep making can’t hide."
        label="Mistakes per category over the last five essays, falling, beside a note saying this mistake was made five times before"
      >
        <div className="grid gap-10 p-5 md:grid-cols-2 md:p-8">
          <MemoryShot />
          <div className="max-w-sm">
            <Note m={MISTAKES[2]} open />
          </div>
        </div>
      </Feature>

      <Feature
        title={["Look it up", "without leaving"]}
        body="A dictionary beside the page, one ⌘K away. Select any French to see what it means, and hear it said."
        label="The dictionary beside the essay translating commute into trajet, a translated selection, and the essay timer"
      >
        <div className="grid gap-10 p-5 md:grid-cols-[16rem_minmax(0,1fr)_12rem] md:p-8">
          <DictionaryShot />
          <TranslateShot />
          <TimerShot />
        </div>
      </Feature>

      <Plans />

      <section className="mx-auto max-w-6xl px-6 py-32 text-center">
        <h2 className="lp-cta mx-auto max-w-3xl">
          Write French like
          <br />
          it’s exam day.
        </h2>
        <div className="mt-10">
          <SecondaryCta />
        </div>
      </section>

      <Footer className="border-t" />
    </div>
  );
}

function Feature({ title, body, label, children }: { title: [string, string]; body: string; label: string; children: React.ReactNode }) {
  return (
    <section className="mx-auto max-w-6xl border-t px-6 pt-20 pb-8">
      <div className="grid gap-6 md:grid-cols-2">
        <h2 className="lp-h2">
          {title[0]}
          <br />
          <span className="text-text-3">{title[1]}</span>
        </h2>
        <p className="lp-sub max-w-md self-end">{body}</p>
      </div>
      <Picture label={label} className="mt-12 overflow-hidden rounded-card border bg-surface">
        <div className="lp-frame-inner-sm">{children}</div>
      </Picture>
    </section>
  );
}

/**
 * The plans, from lib/plans.ts so the page never disagrees with checkout:
 * the free plan and the two Exam Passes, in the flat card of /plans. The
 * price, its currency and what is paid for are stated here, in public.
 */
function Plans() {
  const free = PLANS.free;
  return (
    <section id="plans" className="mx-auto max-w-6xl border-t px-6 pt-20 pb-8">
      <div className="grid gap-6 md:grid-cols-2">
        <h2 className="lp-h2">
          Free to write.
          <br />
          <span className="text-text-3">Paid once for the exam.</span>
        </h2>
        <p className="lp-sub max-w-md self-end">
          Writing, the dictionary and the grammar underlines are free. An Exam Pass adds reviews and questions for the weeks before your
          exam. Paid once, with no renewal.
        </p>
      </div>
      <div className="mt-12 grid gap-4 md:grid-cols-3">
        <PlanCard name="Free" price="$0" per="forever" gives={`${free.reviews} reviews and ${free.asks} questions a month`} />
        {PASSES.map((id) => {
          const pass = PLANS[id];
          return (
            <PlanCard
              key={id}
              name={`${pass.name} Exam Pass`}
              price={formatPrice(pass.price!)}
              per="paid once"
              gives={`${pass.reviews} reviews and ${pass.asks} questions every 30 days`}
              primary={id === "pass_3m"}
            />
          );
        })}
      </div>
      <p className="mt-6 text-label text-text-3">
        Prices in Canadian dollars, plus tax where it applies. Payments are processed by Stripe; your card details never reach us. Passes
        are sold by {SITE.legalName} and covered by our{" "}
        <Link href="/refunds" className="underline decoration-border-strong underline-offset-4 transition-colors duration-150 hover:text-text">
          refund policy
        </Link>
        .
      </p>
    </section>
  );
}

function PlanCard({ name, price, per, gives, primary }: { name: string; price: string; per: string; gives: string; primary?: boolean }) {
  return (
    <div className={cn("rounded-card border bg-surface p-5", primary && "border-border-strong")}>
      <p className="text-title">{name}</p>
      <p className="mt-3 text-display tabular-nums">
        {price} <span className="text-label text-text-3">CAD, {per}</span>
      </p>
      <p className="mt-3 text-ui text-text-2">{gives}</p>
    </div>
  );
}
