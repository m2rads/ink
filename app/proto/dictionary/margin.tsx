"use client";

import { BookOpenTextIcon, XIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { Essay, ProtoAppBar, useProto } from "./harness";
import { Lookup, ShortcutHint, useLookupHotkey } from "./lookup";
import { DictionarySheet } from "./sheet";

// Margin, the placement picked in round 1: the dictionary lives in the empty
// space left of the essay, the mirror of the review's notes on the right. No
// panel, border or scrim; the essay doesn't move, open or hidden. Hidden, it
// folds to one quiet button in the same spot. Needs about 1312px of window;
// below that, ⌘K or the app bar's book opens the same thing in a sheet.
//
// Round 2's variants differ only in `setup`: how the learner's language and
// the lookup's direction are set.

const WIDE = "(min-width: 1312px)";

export type LookupSetup = {
  /** Above the field: a language control. */
  header?: React.ReactNode;
  /** Under the results. */
  footer?: React.ReactNode;
  /** Beside the Dictionary title: a compact control. */
  title?: React.ReactNode;
  lookup?: Omit<React.ComponentProps<typeof Lookup>, "inputRef" | "onEscape" | "className">;
};

export function MarginShell({ setup }: { setup: LookupSetup }) {
  const { focusEssay } = useProto();
  const [open, setOpen] = useState(true);
  const [moved, setMoved] = useState(false);
  const [wide, setWide] = useState(true);
  const [sheet, setSheet] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const mq = matchMedia(WIDE);
    const update = () => setWide(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  function show(next: boolean) {
    setMoved(true);
    setOpen(next);
    if (next) requestAnimationFrame(() => input.current?.focus());
    else requestAnimationFrame(() => toggle.current?.focus());
  }

  useLookupHotkey(() => {
    if (!wide) return;
    if (!open) show(true);
    else if (document.activeElement === input.current) focusEssay();
    else input.current?.focus();
  });

  const enter = moved && "transition-[opacity,translate] duration-200 ease-out starting:-translate-x-1 starting:opacity-0";

  const beside = wide && (
    // Fills the margin's height so the sticky inner part follows the reader down the essay.
    <div className="absolute top-0 right-full bottom-0 w-64 pr-6">
      <div className="sticky top-20 mt-12">
        {open ? (
          <section aria-label="Dictionary" className={cn("flex max-h-[calc(100dvh-8rem)] flex-col", enter)}>
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="eyebrow text-text-3">Dictionary</h2>
              <div className="-mr-1.5 flex items-center gap-1">
                {setup.title}
                <Tooltip>
                  <TooltipTrigger
                    render={<Button variant="ghost" size="icon-xs" aria-label="Hide dictionary" onClick={() => show(false)} />}
                  >
                    <XIcon />
                  </TooltipTrigger>
                  <TooltipContent>Hide</TooltipContent>
                </Tooltip>
              </div>
            </div>
            {setup.header && <div className="mb-3">{setup.header}</div>}
            <Lookup inputRef={input} {...setup.lookup} onEscape={focusEssay} className="flex-1" />
            {setup.footer}
          </section>
        ) : (
          <Button ref={toggle} variant="ghost" size="sm" onClick={() => show(true)} className={cn("-ml-3", enter || undefined)}>
            <BookOpenTextIcon data-icon="inline-start" />
            Dictionary
            <span className="ml-1">
              <ShortcutHint />
            </span>
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <>
      <ProtoAppBar
        lead={
          !wide && (
            <Button variant="ghost" size="icon-sm" aria-label="Dictionary" onClick={() => setSheet(true)} className="-ml-2">
              <BookOpenTextIcon />
            </Button>
          )
        }
      />
      <Essay beside={beside} />
      {!wide && <DictionarySheet open={sheet} onOpenChange={setSheet} setup={setup} />}
    </>
  );
}
