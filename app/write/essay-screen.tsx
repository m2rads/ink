"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { AppBar, AppBarSkeleton } from "@/components/app-bar";
import { TruncateWords } from "@/components/truncate-words";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { essayTitle, hasWriting, isSaved, removeEssay, saveEssay, useEssays } from "@/lib/essays";
import { cn } from "@/lib/utils";

import { countWords, type Block } from "./blocks";
import { caretX, isOnLastLine, offsetAtX } from "./caret";
import { Dictionary } from "./dictionary";
import { removeDraft, useCaret, useDraft } from "./draft-store";
import { EssayEditor } from "./essay-editor";
import { EssayTimer } from "./essay-timer";
import { removeSampleRuns } from "./legacy-storage";
import { ReviewProgress, ReviewView, useReviewFlow, useReviewProgress, useViewMode, type ViewMode } from "./review";

// The user's own essay: a title (their prompt, or any name) and the text.
// An empty title and body are the empty state. The app bar holds the timer
// (essay-timer.tsx), and Review, which swaps the editor for the correction
// view and back.
//
// Nothing is saved until something is written (lib/essays.ts): a new essay
// (`fresh`, from New essay) opens on an id the list doesn't have yet.

const BODY_ID = "essay-body";
const TITLE_ID = "essay-title";

export function EssayScreen({
  id,
  view = "write",
  fresh = false,
}: {
  id: string;
  view?: ViewMode;
  /** Opened from New essay: an unknown id is a blank page, not a missing essay. */
  fresh?: boolean;
}) {
  const essays = useEssays();
  const [blocks, setBlocks] = useDraft(id);
  const essay = essays?.find((e) => e.id === id);
  // Once open, the page stays editable even while clearing it unsaves the essay.
  const [editable, setEditable] = useState(fresh);
  if (essay && !editable) setEditable(true);

  useEffect(removeSampleRuns, []);

  // An unsaved essay leaves no draft behind: on leaving the page in the app
  // (unmount), and on reload or close, which skip unmounting.
  useEffect(() => {
    const discard = () => {
      if (!isSaved(id)) removeDraft(id);
    };
    window.addEventListener("pagehide", discard);
    return () => {
      window.removeEventListener("pagehide", discard);
      discard();
    };
  }, [id]);
  const flow = useReviewFlow(id, blocks, essay?.title ?? "", { onFailed: () => setMode("write"), onRetry: review });
  const [mode, setMode] = useViewMode(view, flow, blocks);
  // Where the writer left the caret, to put it back when the editor returns.
  const [caret, setCaret] = useCaret(id);
  const progress = useReviewProgress(flow, blocks);

  if (essays === null || blocks === null) return <ScreenSkeleton />;

  if (!essay && !editable) {
    return (
      <main className="mx-auto grid max-w-prose gap-2 px-4 pt-24 text-center">
        <h1 className="text-title">Not on this device</h1>
        <p className="text-ui text-text-2">
          Essays are saved in this browser for now.{" "}
          <Link href="/home" className="text-text underline decoration-border-strong underline-offset-4 hover:decoration-current">
            Home
          </Link>
        </p>
      </main>
    );
  }

  const title = essay?.title ?? "";
  const words = essay?.words ?? 0;
  const isNew = !hasWriting({ title, words });

  // Saved as soon as something is written; cleared back to nothing, it's unsaved again.
  function record(next: { title: string; words: number }) {
    if (hasWriting(next)) saveEssay(id, next);
    else removeEssay(id);
  }

  function onBodyChange(next: Block[]) {
    setBlocks(next);
    record({ title, words: countWords(next) });
  }

  function review() {
    flow.open();
    setMode("review");
    window.scrollTo({ top: 0 });
  }

  return (
    <Dictionary enabled={mode === "write"}>
      <AppBar>
        <Dictionary.Trigger className="-ml-2" />
        {/* Only the title shrinks, ending on a whole word. py-3.5 gives Home's
            hit area room to reach 44px tall. */}
        <p className="flex min-w-0 flex-1 items-baseline gap-1 py-3.5 text-label text-text-3">
          <Link
            href="/home"
            className="relative shrink-0 transition-colors before:absolute before:-inset-y-3.5 before:-right-2 before:left-0 hover:text-text"
          >
            Home
          </Link>
          <span aria-hidden>/</span>
          <TruncateWords text={essayTitle({ title })} lang="fr" className="text-text" />
        </p>
        <div className="flex shrink-0 items-center gap-3">
          <EssayTimer />
          <div className="flex h-4 items-center gap-3 text-label text-text-3">
            {mode === "review" && progress && (
              <>
                <ReviewProgress {...progress} />
                <Separator orientation="vertical" className="max-sm:hidden" />
              </>
            )}
            <span className={cn(mode === "review" && "max-sm:hidden")}>
              {words.toLocaleString("en")} {words === 1 ? "word" : "words"}
            </span>
          </div>
          {mode === "write" ? (
            <Button variant="outline" size="sm" onClick={review} disabled={words === 0}>
              Review
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setMode("write")}>
              Edit
            </Button>
          )}
        </div>
      </AppBar>

      {mode === "review" ? (
        // The same column and spacing as the editor below, so the text doesn't move.
        <main className="mx-auto w-full max-w-3xl px-4 pb-40 sm:px-10">
          <ReviewView
            draftId={id}
            flow={flow}
            blocks={blocks}
            onBlocksChange={onBodyChange}
            heading={
              <h1
                lang="fr"
                className={cn(
                  "mt-9 mb-6 block w-full max-w-prose py-1 font-serif text-essay-title text-wrap",
                  !title.trim() && "text-text-3",
                )}
              >
                {essayTitle({ title })}
              </h1>
            }
          />
        </main>
      ) : (
        <main className="relative mx-auto w-full max-w-3xl px-4 sm:px-10">
          <Dictionary.Margin />
          <TitleField
            value={title}
            autoFocus={isNew}
            onChange={(next) => record({ title: next, words })}
          />

          <EssayEditor
            id={BODY_ID}
            value={blocks}
            onValueChange={onBodyChange}
            aria-label="Your essay"
            placeholder="Écrivez ici…"
            autoFocus={!isNew}
            defaultCaret={caret}
            onLeave={setCaret}
            onExitTop={focusTitle}
            className="mt-6 max-w-prose min-h-96 pb-40"
          />
        </main>
      )}
    </Dictionary>
  );
}

/** Arrows out of the essay's top: ↑ lands under the caret on the title's last line, ← at its end. */
function focusTitle(x: number | null) {
  const el = document.getElementById(TITLE_ID);
  if (!(el instanceof HTMLTextAreaElement)) return;
  const offset = x === null ? el.value.length : offsetAtX(el, x, "last");
  el.focus();
  el.setSelectionRange(offset, offset);
}

// One line of title that wraps as it grows. Enter, ↓ on its last line or → at
// its end moves into the essay (↓ keeps the caret's horizontal place); pasted line breaks become spaces. Literata's descenders and
// accents reach past the 1.2 line-height, so py-1 gives them room inside the
// box (mt-9 instead of mt-10 keeps the text where it was) and nothing scrolls
// or clips.
function TitleField({
  value,
  autoFocus,
  onChange,
}: {
  value: string;
  autoFocus: boolean;
  onChange: (value: string) => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  // Grows with its text and never scrolls. CSS field-sizing does this where
  // supported; elsewhere, size it to its content after every change.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || CSS.supports("field-sizing", "content")) return;
    el.style.height = "0px";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  useEffect(() => {
    if (autoFocus && matchMedia("(pointer: fine)").matches) ref.current?.focus();
    // Only on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function focusBody(x?: number) {
    const first = document.getElementById(BODY_ID)?.querySelector("textarea");
    if (!first) return;
    const offset = x === undefined ? 0 : offsetAtX(first, x, "first");
    first.focus();
    first.setSelectionRange(offset, offset);
  }

  return (
    <textarea
      ref={ref}
      id={TITLE_ID}
      value={value}
      rows={1}
      lang="fr"
      aria-label="Title or prompt"
      placeholder="Untitled"
      spellCheck={false}
      autoCorrect="off"
      autoCapitalize="off"
      autoComplete="off"
      data-gramm="false"
      data-lt-active="false"
      onChange={(e) => onChange(e.target.value.replace(/\s*\n\s*/g, " "))}
      onKeyDown={(e) => {
        const el = e.currentTarget;
        const start = el.selectionStart;
        const collapsed = start === el.selectionEnd;
        const plain = !e.shiftKey && !e.metaKey && !e.ctrlKey && !e.altKey;
        if (e.key === "Enter") {
          e.preventDefault();
          focusBody();
        } else if (e.key === "ArrowDown" && plain && collapsed && isOnLastLine(el, start)) {
          e.preventDefault();
          focusBody(caretX(el, start));
        } else if (e.key === "ArrowRight" && plain && collapsed && start === el.value.length) {
          e.preventDefault();
          focusBody();
        }
      }}
      className="field-sizing-content mt-9 block w-full max-w-prose resize-none overflow-hidden bg-transparent py-1 font-serif text-essay-title text-text outline-none placeholder:text-text-3"
    />
  );
}

function ScreenSkeleton() {
  return (
    <>
      <AppBarSkeleton />
      <main className="mx-auto w-full max-w-3xl px-4 sm:px-10" aria-busy>
        <div className="grid max-w-prose gap-3 pt-10" aria-hidden>
          <Skeleton className="h-8 w-3/5" />
          <Skeleton className="mt-4 h-4 w-full" />
          <Skeleton className="h-4 w-11/12" />
        </div>
      </main>
    </>
  );
}
