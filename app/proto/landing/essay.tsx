"use client";

import { cn } from "@/lib/utils";

import { Memory, MemoryShot, MISTAKES, NoteText, Picture, TONE, Typed, type Category } from "./mocks";
import { Cta, Footer, Nav, SecondaryCta, useIntro } from "./parts";

// Essay: the page is an essay corrected in Margin. Its prose is set in
// Literata, the features are its marked phrases, and their notes sit in the
// margin, so reading the pitch is using the product.

type Feature = { n: number; cat: Category; title: string; note: string };

const FEATURES: Feature[] = [
  { n: 1, cat: "prep", title: "The editor", note: "Plain paragraphs and French spellcheck. Drag a paragraph to move it." },
  { n: 2, cat: "conj", title: "Timer", note: "Your own minutes, counting down, or no limit, counting up. It stops itself." },
  { n: 3, cat: "accord", title: "Dictionary", note: "Your language ⇄ Français, in the margin. No tabs." },
  { n: 4, cat: "spell", title: "Select to translate", note: "A small pill above the words. The meaning only when you ask, read aloud if you like." },
];

const f = (n: number) => FEATURES.find((x) => x.n === n)!;

export function EssayPage() {
  const intro = useIntro();
  const si = MISTAKES[2];

  return (
    <div className="lp min-h-dvh overflow-x-clip bg-bg text-text">
      <Nav />

      <section className={cn("mx-auto max-w-6xl px-6 pt-20 sm:pt-28", intro && "lp-intro")}>
        <p className="lp-mono">Expression écrite · TEF</p>
        <h1 lang="fr" className="lp-hero-serif mt-5 max-w-4xl">
          Écrire, c’est se corriger.
        </h1>
        <p className="lp-sub mt-6 max-w-xl">To write is to correct yourself. Ink is the writing editor for French learners, built around that one idea.</p>
        <div className="mt-8">
          <Cta>Start your first essay</Cta>
        </div>
      </section>

      <article className={cn("mx-auto mt-20 max-w-6xl px-6 pb-24 sm:mt-28", intro && "lp-intro-late")}>
        <Row notes={[f(1), f(2)]}>
          You write the way the exam asks: <Phrase f={f(1)}>one plain page</Phrase>, French spellcheck on, nothing else in the way. Set{" "}
          <Phrase f={f(2)}>a timer</Phrase> when you want the pressure.
        </Row>
        <Row notes={[f(3), f(4)]}>
          Stuck on a word? <Phrase f={f(3)}>The dictionary</Phrase> sits beside the page, one ⌘K away. <Phrase f={f(4)}>Select any French</Phrase>{" "}
          to see what it means, and hear it said.
        </Row>
        <Row
          aside={
            <div className="rounded-card border border-border-strong bg-surface px-3 pt-1.5 pb-3">
              <div className="flex min-h-9 items-center gap-2">
                <span className={cn("w-5 text-caption font-semibold tabular-nums", TONE[si.cat].text)}>5</span>
                <span className="text-label text-text">{si.rule}</span>
              </div>
              <p className="text-ui text-pretty text-text-2">
                <NoteText text={si.why} />
              </p>
              <Memory m={si} />
            </div>
          }
        >
          Then Ink reads it the way a teacher would. It marks{" "}
          <span lang="fr">
            « Si j’<Typed m={{ ...si, n: 5 }} text="avais" caret={false} /> deux heures… »
          </span>{" "}
          and waits. You rewrite it. Ink checks your fix, never its own.
        </Row>
        <Row
          aside={
            <Picture label="Mistakes per category over the last five essays, falling" className="rounded-card border bg-surface p-4">
              <MemoryShot />
            </Picture>
          }
        >
          And it keeps count. The mistakes you make again and again are tallied by category, essay after essay, until they stop.
        </Row>
        <Row>
          <span className="text-text-3">No dictionary tabs, no pasting into a chatbot, no corrections you didn’t make. On exam day, it’s just you and the page.</span>
        </Row>

        <div className="mt-20 max-w-prose">
          <p className="font-serif text-essay-title">Start with a prompt of your own.</p>
          <div className="mt-6">
            <SecondaryCta />
          </div>
        </div>
      </article>

      <Footer className="border-t" />
    </div>
  );
}

/** A paragraph and its notes, the way Margin lays them out. */
function Row({ notes, aside, children }: { notes?: Feature[]; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="grid gap-x-12 gap-y-4 pb-[1.7lh] md:grid-cols-[minmax(0,65ch)_17rem]">
      <p className="font-serif text-essay text-pretty">{children}</p>
      <div className="grid content-start gap-2">
        {notes?.map((n) => (
          <div key={n.n} className="rounded-card border bg-surface px-3 pt-1.5 pb-3">
            <div className="flex min-h-9 items-center gap-2">
              <span className={cn("w-5 text-caption font-semibold tabular-nums", TONE[n.cat].text)}>{n.n}</span>
              <span className="text-label text-text">{n.title}</span>
            </div>
            <p className="text-ui text-pretty text-text-2">{n.note}</p>
          </div>
        ))}
        {aside}
      </div>
    </div>
  );
}

/** A phrase of the pitch, marked like a mistake in Margin. */
function Phrase({ f: feature, children }: { f: Feature; children: React.ReactNode }) {
  const tone = TONE[feature.cat];
  return (
    <span className={cn("relative -mx-0.5 rounded-row px-0.5 underline decoration-[1.5px] underline-offset-4 decoration-skip-ink-none", tone.mark)}>
      <span className={cn("absolute -right-0.5 bottom-4 font-sans text-sup font-medium tabular-nums", tone.text)} aria-hidden>
        {feature.n}
      </span>
      {children}
    </span>
  );
}
