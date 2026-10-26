"use client";

import { cn } from "@/lib/utils";

import { Essay, Mark, MISTAKES, Note, Picture, TITLE, Typed, Window } from "./mocks";
import { Cta, Nav, useIntro } from "./parts";

// One screen: everything above the fold. A headline, a sentence, one action,
// and one picture of the product's core: the essay and its notes. No
// sections to scroll through, no feature list.

export function OneScreen() {
  const intro = useIntro();
  return (
    <div className="lp grid min-h-dvh grid-rows-[auto_1fr_auto] overflow-x-clip bg-bg text-text">
      <Nav />

      <main className="mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-12 px-6 py-12 lg:grid-cols-[23rem_minmax(0,1fr)] lg:gap-12">
        <div className={cn(intro && "lp-intro")}>
          <h1 className="lp-hero">Your French, corrected by you</h1>
          <p className="lp-sub mt-5">
            The writing editor for TEF candidates. Ink marks your mistakes. You fix them, it checks, and it remembers.
          </p>
          <div className="mt-8">
            <Cta />
          </div>
        </div>

        <Picture
          label="Ink: a French essay with one mistake being rewritten in place, and its note in the margin"
          className={cn("lp-fade lp-bleed-right", intro && "lp-intro-late")}
        >
          <Window timer="18:40">
            <div className="lp-frame-inner-sm grid gap-8 px-5 pt-7 pb-24 md:grid-cols-[minmax(0,32rem)_15rem] md:px-8 md:pt-8">
              <div>
                <h3 lang="fr" className="font-serif text-essay-title">
                  {TITLE}
                </h3>
                <Essay className="mt-6" render={(m) => (m.n === 3 ? <Typed m={m} text="avais" /> : <Mark m={m} />)} />
              </div>
              <div className="grid content-start gap-2">
                <Note m={MISTAKES[2]} open />
                <Note m={MISTAKES[0]} />
                <Note m={MISTAKES[3]} />
              </div>
            </div>
          </Window>
        </Picture>
      </main>

      <footer className="mx-auto flex w-full max-w-6xl flex-wrap gap-x-6 gap-y-1 px-6 pt-4 pb-6 text-label text-text-3">
        <span>Fix it in place</span>
        <span>Remembers what you repeat</span>
        <span>Dictionary, ⌘K</span>
        <span>Your own timer</span>
      </footer>
    </div>
  );
}
