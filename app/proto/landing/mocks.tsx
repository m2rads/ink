"use client";

import {
  ArrowRightLeftIcon,
  BookOpenTextIcon,
  LanguagesIcon,
  PauseIcon,
  RepeatIcon,
  SquareIcon,
  Volume2Icon,
} from "lucide-react";

import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { cn } from "@/lib/utils";

// Throwaway: /proto/landing. Ink's screens, built from the same tokens and
// classes as the product (correction.tsx, dictionary.tsx, essay-timer.tsx),
// as still pictures: each mock is one role="img" with a label, unselectable
// and out of the pointer's way. The essay is real learner French with real
// learner mistakes.

export type Category = "prep" | "spell" | "conj" | "accord";

export const LABEL: Record<Category, string> = {
  prep: "Prepositions",
  spell: "Spelling",
  conj: "Conjugation",
  accord: "Agreement",
};

export const TONE: Record<Category, { text: string; dot: string; mark: string; field: string }> = {
  prep: { text: "text-c-prep", dot: "bg-c-prep", mark: "bg-c-prep/8 decoration-c-prep/60", field: "bg-c-prep/24 decoration-c-prep" },
  spell: { text: "text-c-ortho", dot: "bg-c-ortho", mark: "bg-c-ortho/8 decoration-c-ortho/60", field: "bg-c-ortho/24 decoration-c-ortho" },
  conj: { text: "text-c-conj", dot: "bg-c-conj", mark: "bg-c-conj/8 decoration-c-conj/60", field: "bg-c-conj/24 decoration-c-conj" },
  accord: { text: "text-c-accord", dot: "bg-c-accord", mark: "bg-c-accord/8 decoration-c-accord/60", field: "bg-c-accord/24 decoration-c-accord" },
};

export type Mistake = {
  n: number;
  cat: Category;
  wrong: string;
  /** Accepted rewrites; the first is the answer. */
  accept: string[];
  rule: string;
  /** Notes are English with French in *asterisks*. */
  why: string;
  hint: string;
  /** "You've made this N times before". */
  before: number;
};

export const MISTAKES: Mistake[] = [
  {
    n: 1,
    cat: "prep",
    wrong: "à les",
    accept: ["aux"],
    rule: "À + les becomes aux",
    why: "*À* and *les* always contract: *faire attention aux risques*.",
    hint: "One word, three letters",
    before: 3,
  },
  {
    n: 2,
    cat: "spell",
    wrong: "embouteilages",
    accept: ["embouteillages"],
    rule: "Double l in -eillage",
    why: "*Embouteillage*, like *bouteille*: two l's.",
    hint: "Think of bouteille",
    before: 1,
  },
  {
    n: 3,
    cat: "conj",
    wrong: "aurais",
    accept: ["avais"],
    rule: "Si + imparfait, never conditional",
    why: "After *si*, use the imparfait: *si j’avais deux heures*.",
    hint: "Imparfait of avoir",
    before: 5,
  },
  {
    n: 4,
    cat: "accord",
    wrong: "il",
    accept: ["ils"],
    rule: "The pronoun agrees with les salariés",
    why: "*Ils*, plural: it stands for *les salariés*.",
    hint: "Plural",
    before: 2,
  },
];

export const TITLE = "Le télétravail devrait-il devenir la norme ?";

/** Paragraphs as text and mistake numbers. */
export const ESSAY: (string | number)[][] = [
  [
    "Depuis la pandémie, beaucoup d’entreprises ont découvert le télétravail. Je pense que c’est une bonne chose, mais il faut faire attention ",
    1,
    " risques.",
  ],
  [
    "Premièrement, on perd moins de temps dans les ",
    2,
    ". Si j’",
    3,
    " deux heures de plus par jour, je ferais du sport. Les salariés sont plus heureux quand ",
    4,
    " travaillent de chez eux.",
  ],
];

const byN = (n: number) => MISTAKES.find((m) => m.n === n)!;

/** French inside a note, set in Literata italic. */
export function NoteText({ text }: { text: string }) {
  return (
    <>
      {text.split(/\*([^*]+)\*/).map((part, i) =>
        i % 2 ? (
          <em key={i} lang="fr" className="font-serif">
            {part}
          </em>
        ) : (
          part
        ),
      )}
    </>
  );
}

/** A still picture of Ink: an image to assistive tech, inert to the pointer. */
export function Picture({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <div role="img" aria-label={label} className={cn("pointer-events-none select-none", className)}>
      <div aria-hidden>{children}</div>
    </div>
  );
}

/** Ink's window: the app bar, then the screen. */
export function Window({
  children,
  timer = "24:12",
  mode = "review",
  progress = "0 of 4 resolved",
}: {
  children: React.ReactNode;
  timer?: string | null;
  mode?: "write" | "review";
  progress?: string;
}) {
  return (
    <div className="lp-frame">
      <div className="flex h-12 items-center gap-3 border-b px-4 text-label tabular-nums">
        <BookOpenTextIcon className="size-4 text-text-3" />
        <p className="flex min-w-0 flex-1 items-baseline gap-1 text-text-3">
          Home <span>/</span>
          <span lang="fr" className="truncate text-text">
            {TITLE}
          </span>
        </p>
        {timer && (
          <span className="flex items-center gap-2 text-text-2 max-sm:hidden">
            {timer}
            <PauseIcon className="size-3.5 text-text-3" />
            <SquareIcon className="size-3 text-text-3" />
          </span>
        )}
        {mode === "review" && <span className="text-text-3 max-sm:hidden">{progress}</span>}
        <span className="text-text-3 max-sm:hidden">214 words</span>
        <span className="rounded-full border border-border-strong px-3 py-1 text-ui font-medium text-text">
          {mode === "review" ? "Edit" : "Review"}
        </span>
      </div>
      {children}
    </div>
  );
}

/** A marked phrase, with its number raised past the last letter. */
export function Mark({ m, fixed, field, children }: { m: Mistake; fixed?: string; field?: React.ReactNode; children?: React.ReactNode }) {
  if (fixed !== undefined) {
    return <span className="underline decoration-ok decoration-1 underline-offset-4">{fixed}</span>;
  }
  const tone = TONE[m.cat];
  return (
    <span
      className={cn(
        "relative -mx-0.5 rounded-row px-0.5 underline decoration-[1.5px] underline-offset-4 decoration-skip-ink-none",
        field ? tone.field : tone.mark,
      )}
    >
      <span className={cn("absolute -right-0.5 bottom-4 font-sans text-sup font-medium tabular-nums", tone.text)}>{m.n}</span>
      {field ?? children ?? m.wrong}
    </span>
  );
}

/** The essay's paragraphs; `render` can replace any mark. */
export function Essay({
  render,
  className,
}: {
  render?: (m: Mistake) => React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-y-[1lh] font-serif text-essay text-text", className)} lang="fr">
      {ESSAY.map((para, i) => (
        <p key={i}>
          {para.map((part, j) =>
            typeof part === "string" ? part : <span key={j}>{render ? render(byN(part)) : <Mark m={byN(part)} />}</span>,
          )}
        </p>
      ))}
    </div>
  );
}

/** One margin note: closed (rule only) or open (rule, why, memory). */
export function Note({ m, open, status }: { m: Mistake; open?: boolean; status?: "fixed" }) {
  const done = status === "fixed";
  return (
    <div className={cn("rounded-card border", done ? "bg-transparent" : "bg-surface", open && "border-border-strong")}>
      <div className="flex min-h-10 items-center gap-2 px-3 py-1.5">
        <span className={cn("w-5 shrink-0 text-caption font-semibold tabular-nums", TONE[m.cat].text)}>{m.n}</span>
        <span className={cn("flex-1 text-label", done ? "text-text-3 line-through decoration-border-strong" : "text-text")}>{m.rule}</span>
        {done && <span className="text-caption text-ok">✓ Fixed</span>}
      </div>
      {open && (
        <div className="px-3 pb-3">
          <span className={cn("inline-flex items-center gap-1.5 text-caption font-semibold", TONE[m.cat].text)}>
            <span className={cn("size-2 rounded-full", TONE[m.cat].dot)} />
            {LABEL[m.cat]}
          </span>
          <p className="mt-1.5 text-ui text-pretty text-text-2">
            <NoteText text={m.why} />
          </p>
          <Memory m={m} />
        </div>
      )}
    </div>
  );
}

export function Memory({ m }: { m: Mistake }) {
  return (
    <p className="mt-3 flex items-baseline gap-1.5 text-label text-text-2">
      <RepeatIcon className="size-3.5 shrink-0 self-center" />
      <span>
        You’ve made this <span className="font-medium text-text">{m.before} times</span> before
      </span>
    </p>
  );
}

/** The category chips above the notes, with mistakes left in each. */
export function Chips() {
  return (
    <div className="flex flex-wrap gap-1.5">
      {MISTAKES.map((m) => (
        <span key={m.n} className="inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-label text-text-2">
          <span className={cn("size-2 rounded-full", TONE[m.cat].dot)} />
          {LABEL[m.cat]}
          <span className="text-text-3 tabular-nums">1</span>
        </span>
      ))}
    </div>
  );
}

/** The inline fix: the mark's own box holding what the writer types. */
export function Typed({ m, text, caret = true }: { m: Mistake; text: string; caret?: boolean }) {
  return (
    <Mark
      m={m}
      field={
        <>
          {text}
          {caret && <span className={cn("lp-caret", TONE[m.cat].text)} />}
        </>
      }
    />
  );
}

/** Margin: the essay with its notes beside it. The hero shot. */
export function MarginShot({ typed = "aux" }: { typed?: string }) {
  const first = MISTAKES[0];
  return (
    <div className="grid gap-8 px-5 pt-7 pb-16 md:grid-cols-[minmax(0,1fr)_17rem] md:px-10 md:pt-9">
      <div className="max-w-prose">
        <h3 lang="fr" className="font-serif text-essay-title">
          {TITLE}
        </h3>
        <Essay className="mt-6" render={(m) => (m.n === 1 ? <Typed m={m} text={typed} /> : <Mark m={m} />)} />
      </div>
      <div className="grid content-start gap-3">
        <Chips />
        <div className="mt-2 grid gap-2">
          <Note m={first} open />
          {MISTAKES.slice(1).map((m) => (
            <Note key={m.n} m={m} />
          ))}
        </div>
      </div>
    </div>
  );
}

/** The dictionary in the margin left of the essay. */
export function DictionaryShot({ word = "commute", answer = "trajet" }: { word?: string; answer?: string }) {
  return (
    <div className="grid w-64 content-start gap-3">
      <div className="flex items-center justify-between">
        <span className="eyebrow text-text-3">Dictionary</span>
        <KbdGroup>
          <Kbd>⌘</Kbd>
          <Kbd>K</Kbd>
        </KbdGroup>
      </div>
      <div className="flex items-center gap-2 text-label">
        <span className="font-medium text-text-2">English</span>
        <ArrowRightLeftIcon className="size-3.5 text-text-3" />
        <span lang="fr" className="font-medium text-text-2">
          Français
        </span>
      </div>
      <div className="flex h-9 items-center rounded-field border border-border-strong px-3 text-ui text-text">{word}</div>
      <div className="flex items-start justify-between gap-2 px-1 pt-2">
        <p lang="fr" className="font-serif text-title">
          {answer}
        </p>
        <Volume2Icon className="mt-0.5 size-4 text-text-3" />
      </div>
    </div>
  );
}

/** Select French in the essay: the pill, then the meaning card. */
export function TranslateShot({ asked = true }: { asked?: boolean }) {
  return (
    <div className="relative pt-24 font-serif text-essay text-text" lang="fr">
      <div className="absolute top-2 left-16 font-sans" lang="en">
        {asked ? (
          <div className="grid w-max gap-1 rounded-card bg-raised px-3 py-2.5 shadow-overlay">
            <div className="flex items-center justify-between gap-6">
              <span lang="fr" className="font-serif text-label text-text-3 italic">
                avoir le cafard
              </span>
              <Volume2Icon className="size-3.5 text-text-3" />
            </div>
            <span className="text-body font-medium text-text">to feel down</span>
          </div>
        ) : (
          <span className="inline-flex h-7 items-center gap-1 rounded-full bg-raised px-2.5 text-label font-medium text-text-2 shadow-overlay">
            <LanguagesIcon className="size-3" /> Translate
            <KbdGroup className="ml-1">
              <Kbd>⌘</Kbd>
              <Kbd>K</Kbd>
            </KbdGroup>
          </span>
        )}
      </div>
      <p>
        Certains finissent par <span className="rounded-tight bg-[color-mix(in_oklch,var(--text)_16%,transparent)]">avoir le cafard</span> à la maison.
      </p>
    </div>
  );
}

/** The timer in the app bar: count down or up. */
export function TimerShot() {
  return (
    <div className="grid gap-3">
      <div className="flex items-center gap-2 text-display tabular-nums">
        24:12
        <PauseIcon className="ml-2 size-5 text-text-3" />
        <SquareIcon className="size-4 text-text-3" />
      </div>
      <p className="text-label text-text-3">Count down from your own minutes, or count up. It stops itself.</p>
    </div>
  );
}

/** Memory across essays: mistakes per category, essay by essay. */
export function MemoryShot() {
  const rows: [Category, number[]][] = [
    ["conj", [6, 5, 5, 3, 2]],
    ["prep", [4, 4, 3, 3, 1]],
    ["accord", [3, 2, 3, 1, 1]],
    ["spell", [2, 2, 1, 1, 0]],
  ];
  return (
    <div className="grid gap-3">
      {rows.map(([cat, counts]) => (
        <div key={cat} className="grid grid-cols-[7.5rem_1fr] items-center gap-3">
          <span className="inline-flex items-center gap-1.5 text-label text-text-2">
            <span className={cn("size-2 rounded-full", TONE[cat].dot)} />
            {LABEL[cat]}
          </span>
          <span className="flex items-end gap-1">
            {counts.map((c, i) => (
              <span
                key={i}
                className={cn("w-6 rounded-tight", TONE[cat].dot, i === counts.length - 1 ? "opacity-100" : "opacity-35")}
                style={{ height: `${4 + c * 5}px` }}
              />
            ))}
          </span>
        </div>
      ))}
      <p className="mt-1 text-label text-text-3">Your last five essays. Conjugation: 6 → 2.</p>
    </div>
  );
}

/** The logo, as in the sidebar. */
export function Logo() {
  return (
    <span className="flex items-center gap-2 text-ui font-medium text-text">
      <span className="size-4 rounded-full bg-brand" aria-hidden />
      Ink
    </span>
  );
}
