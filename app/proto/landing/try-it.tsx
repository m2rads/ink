"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

import {
  DictionaryShot,
  ESSAY,
  LABEL,
  Mark,
  Memory,
  MISTAKES,
  NoteText,
  Picture,
  TimerShot,
  TITLE,
  TONE,
  TranslateShot,
  Window,
  type Mistake,
} from "./mocks";
import { Cta, Footer, Nav, useIntro } from "./parts";

// Try it: the hero is the product, live. Click a mistake, rewrite it, press
// Enter; the fix is checked against accepted answers the way the real loop
// checks one before calling the model. Everything else is one quiet row.

type State = { status: "open" | "fixed"; tries: number; feedback: string };

const fold = (s: string) => s.normalize("NFC").trim().toLocaleLowerCase("fr").replace(/[’']/g, "'");

export function TryIt() {
  const intro = useIntro();
  const [states, setStates] = useState<Record<number, State>>(() =>
    Object.fromEntries(MISTAKES.map((m) => [m.n, { status: "open", tries: 0, feedback: "" }])),
  );
  // Mistake 1 starts open to show the note, but nothing takes focus until the
  // visitor opens a mistake: focusing on load would pop a phone's keyboard.
  const [active, setActive] = useState<number | null>(1);
  const [byVisitor, setByVisitor] = useState(false);
  const open = (n: number | null) => {
    setActive(n);
    setByVisitor(true);
  };
  const fixed = MISTAKES.filter((m) => states[m.n].status === "fixed").length;

  function check(m: Mistake, attempt: string) {
    const right = m.accept.some((a) => fold(a) === fold(attempt));
    setStates((s) => ({
      ...s,
      [m.n]: right
        ? { status: "fixed", tries: s[m.n].tries + 1, feedback: "" }
        : { status: "open", tries: s[m.n].tries + 1, feedback: s[m.n].tries >= 1 ? `Answer: ${m.accept[0]}` : `Not quite. ${m.hint}` },
    }));
    if (right) open(MISTAKES.find((n) => n.n > m.n && states[n.n].status === "open")?.n ?? null);
  }

  return (
    <div className="lp min-h-dvh overflow-x-clip bg-bg text-text">
      <Nav />

      <section className={cn("mx-auto max-w-3xl px-6 pt-16 text-center sm:pt-24", intro && "lp-intro")}>
        <h1 className="lp-hero">
          Make the mistake.
          <br />
          Fix it yourself.
        </h1>
        <p className="lp-sub mx-auto mt-5 max-w-lg">The French writing editor for the TEF. Try it: rewrite the marked words below.</p>
      </section>

      <section className={cn("lp-glow mt-14 px-4 pt-px sm:px-6", intro && "lp-intro-late")} aria-label="Try the correction loop">
        <div className="mx-auto max-w-5xl">
          <Window timer={null} progress={fixed === MISTAKES.length ? "All 4 resolved" : `${fixed} of ${MISTAKES.length} resolved`}>
            <div className="grid gap-8 px-5 pt-8 pb-10 sm:px-10 md:grid-cols-[minmax(0,1fr)_16rem]">
              <div className="max-w-prose">
                <h2 lang="fr" className="font-serif text-essay-title">
                  {TITLE}
                </h2>
                <div className="mt-6 grid gap-y-[1lh] font-serif text-essay" lang="fr">
                  {ESSAY.map((para, i) => (
                    <p key={i}>
                      {para.map((part, j) => {
                        if (typeof part === "string") return part;
                        const m = MISTAKES.find((x) => x.n === part)!;
                        const st = states[m.n];
                        if (st.status === "fixed") return <Mark key={j} m={m} fixed={m.accept[0]} />;
                        return active === m.n ? (
                          <FixField key={j} m={m} focus={byVisitor} onCheck={(v) => check(m, v)} onClose={() => open(null)} />
                        ) : (
                          <button
                            key={j}
                            type="button"
                            onClick={() => open(m.n)}
                            aria-label={`${LABEL[m.cat]} mistake ${m.n}: ${m.wrong}`}
                            className="cursor-pointer rounded-row outline-none focus-visible:outline-2 focus-visible:outline-focus-ring"
                          >
                            <Mark m={m} />
                          </button>
                        );
                      })}
                    </p>
                  ))}
                </div>
              </div>

              <div className="grid content-start gap-2" aria-live="polite">
                {MISTAKES.map((m) => (
                  <NoteCard key={m.n} m={m} state={states[m.n]} open={active === m.n} onOpen={() => open(m.n)} />
                ))}
              </div>
            </div>
          </Window>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 pt-10 text-center">
        {fixed === MISTAKES.length ? (
          <p className="lp-sub">That’s the loop. Now do it with your own essay.</p>
        ) : (
          <p className="lp-sub">Two wrong tries show the answer. Ink keeps count of what you get wrong.</p>
        )}
        <div className="mt-6">
          <Cta />
        </div>
      </section>

      <section className="mx-auto mt-28 max-w-5xl px-6">
        <div className="lp-rule-x grid border-y sm:grid-cols-3">
          <Panel fig="Fig 0.1" title="Dictionary, one ⌘K away" label="The dictionary translating commute into trajet">
            <DictionaryShot />
          </Panel>
          <Panel fig="Fig 0.2" title="Select French to translate" label="A selected French phrase with its English meaning">
            <TranslateShot />
          </Panel>
          <Panel fig="Fig 0.3" title="A timer you set yourself" label="The essay timer counting down">
            <TimerShot />
          </Panel>
        </div>
      </section>

      <Footer className="mt-20" />
    </div>
  );
}

function FixField({ m, focus, onCheck, onClose }: { m: Mistake; focus: boolean; onCheck: (value: string) => void; onClose: () => void }) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (focus) ref.current?.focus({ preventScroll: true });
  }, [focus]);
  return (
    <span className={cn("relative -mx-0.5 rounded-row px-0.5 underline decoration-[1.5px] underline-offset-4", TONE[m.cat].field)}>
      <span className={cn("absolute -right-0.5 bottom-4 font-sans text-sup font-medium tabular-nums", TONE[m.cat].text)}>{m.n}</span>
      <input
        ref={ref}
        defaultValue={m.wrong}
        aria-label={`Rewrite “${m.wrong}”`}
        spellCheck={false}
        autoComplete="off"
        autoCapitalize="off"
        onFocus={(e) => e.currentTarget.select()}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onCheck(e.currentTarget.value);
          } else if (e.key === "Escape") onClose();
        }}
        size={Math.max(3, m.wrong.length)}
        className="bg-transparent font-serif text-essay text-text outline-none [field-sizing:content]"
      />
    </span>
  );
}

function NoteCard({ m, state, open, onOpen }: { m: Mistake; state: State; open: boolean; onOpen: () => void }) {
  const done = state.status === "fixed";
  return (
    <div className={cn("rounded-card border text-start", done ? "bg-transparent" : "bg-surface", open && !done && "border-border-strong")}>
      <button
        type="button"
        tabIndex={-1}
        disabled={done}
        onClick={onOpen}
        className="flex min-h-10 w-full items-center gap-2 rounded-card px-3 py-1.5 text-start not-disabled:cursor-pointer not-disabled:hover:bg-sunken"
      >
        <span className={cn("w-5 shrink-0 text-caption font-semibold tabular-nums", TONE[m.cat].text)}>{m.n}</span>
        <span className={cn("flex-1 text-label", done ? "text-text-3 line-through decoration-border-strong" : "text-text")}>{m.rule}</span>
        {done && <span className="text-caption text-ok">✓ Fixed</span>}
      </button>
      {open && !done && (
        <div className="px-3 pb-3">
          <span className={cn("inline-flex items-center gap-1.5 text-caption font-semibold", TONE[m.cat].text)}>
            <span className={cn("size-2 rounded-full", TONE[m.cat].dot)} />
            {LABEL[m.cat]}
          </span>
          <p className="mt-1.5 text-ui text-pretty text-text-2">
            <NoteText text={m.why} />
          </p>
          {state.feedback ? (
            <p className="mt-3 rounded-r-row border-l-2 border-warn bg-warn/10 px-2.5 py-2 text-ui text-text">{state.feedback}</p>
          ) : (
            <Memory m={m} />
          )}
          <p className="mt-3 text-caption text-text-3">Enter checks your fix</p>
        </div>
      )}
    </div>
  );
}

function Panel({ fig, title, label, children }: { fig: string; title: string; label: string; children: React.ReactNode }) {
  return (
    <div className="grid content-start gap-5 px-6 py-8 max-sm:border-t first:max-sm:border-t-0">
      <p className="lp-mono">{fig}</p>
      <Picture label={label} className="min-h-44 overflow-hidden">
        {children}
      </Picture>
      <p className="text-ui text-text-2">{title}</p>
    </div>
  );
}
