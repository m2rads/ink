"use client";

import { CoffeeIcon } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { AppBar, AppBarSkeleton } from "@/components/app-bar";
import { TruncateWords } from "@/components/truncate-words";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { essayTitle, flushEssays, hasWriting, isSaved, removeEssay, saveEssay, TITLE_MAX, useEssays } from "@/lib/essays";
import { cn } from "@/lib/utils";

import { countWords, type Block, type Caret } from "./blocks";
import { caretX, isOnLastLine, offsetAtX } from "./caret";
import { Correction, useCorrectionText } from "./correction";
import { Dictionary } from "./dictionary";
import { flushDraft, readDraft, removeDraft, useCaret, useDraft } from "./draft-store";
import { EssayEditor, type EssayEditorHandle } from "./essay-editor";
import { EssayTimer } from "./essay-timer";
import { GrammarMarks, GrammarTip, useGrammar } from "./grammar";
import { removeSampleRuns } from "./legacy-storage";
import { EssayReview, ReviewAside, ReviewProgress, useReviewFlow, useReviewProgress } from "./review";
import { trackEdit } from "./review-store";

// The user's own essay: a title (their prompt, or any name) and the text.
// An empty title and body are the empty state. The app bar holds the timer
// (essay-timer.tsx), coffee mode and Review; the word count sits at the
// bottom left. There's one view: a review adds its marks and notes to the
// essay, which stays editable, and fixes are typed into it.
//
// The essay saves itself as it's written. ⌘S / Ctrl+S saves it at once
// (the browser's "Save page" never opens here) and says so in a toast.
//
// Coffee mode leaves only the writing and its word count: the app bar and
// the review's marks and notes fade out, with nothing moving. Its own button
// stays where it was, to bring them back. The dictionary stays (the writer
// can hide it) but drops its recent words, and the timer keeps running.
//
// Nothing is saved until something is written (lib/essays.ts): a new essay
// (`fresh`, from New essay) opens on an id the list doesn't have yet.

const BODY_ID = "essay-body";
const TITLE_ID = "essay-title";

export function EssayScreen({
  id,
  fresh = false,
}: {
  id: string;
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

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.altKey || e.shiftKey || e.key.toLowerCase() !== "s") return;
      e.preventDefault();
      if (!isSaved(id)) {
        toast("Nothing to save", { id: "save" });
        return;
      }
      flushDraft(id);
      flushEssays();
      toast("Content saved", { id: "save" });
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [id]);

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
  const flow = useReviewFlow(id, essay?.title ?? "");
  // Where the writer left the caret, to put it back when the essay reopens.
  const [caret, setCaret] = useCaret(id);
  const progress = useReviewProgress(flow, blocks);
  const editor = useRef<EssayEditorHandle>(null);
  const [coffee, setCoffee] = useState(false);
  // Words in the selection, while the essay has one.
  const [selected, setSelected] = useState(0);

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

  function onBodyChange(next: Block[], landed: Caret | null = null) {
    // The review's marks move with the text.
    trackEdit(id, readDraft(id), next, landed);
    setBlocks(next);
    record({ title, words: countWords(next) });
  }

  const checking = flow.status === "checking";
  // What coffee mode hides fades out, then turns invisible: out of the Tab
  // order and the accessibility tree, still holding its place.
  const fade = cn("transition-[opacity,visibility] duration-200 ease-out", coffee && "invisible opacity-0");

  return (
    <Dictionary quiet={coffee}>
      <AppBar
        className={cn(
          "transition-[background-color,border-color] duration-200 ease-out",
          coffee && "border-transparent bg-transparent",
        )}
      >
        <Dictionary.Trigger className="-ml-2" />
        {/* Only the title shrinks, ending on a whole word. py-3.5 gives Home's
            hit area room to reach 44px tall. */}
        <p className={cn("flex min-w-0 flex-1 items-baseline gap-1 py-3.5 text-label text-text-3", fade)}>
          <Link
            href="/home"
            className="relative shrink-0 transition-colors before:absolute before:-inset-y-3.5 before:-right-2 before:left-0 hover:text-text"
          >
            Home
          </Link>
          <span aria-hidden>/</span>
          <TruncateWords text={essayTitle({ title })} keepLastWord lang="fr" className="text-text" />
        </p>
        <div className="flex shrink-0 items-center gap-3">
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Coffee mode"
                  aria-pressed={coffee}
                  onClick={() => setCoffee((on) => !on)}
                  className={cn(coffee && "text-text-3 hover:text-text")}
                />
              }
            >
              <CoffeeIcon />
            </TooltipTrigger>
            <TooltipContent>Coffee mode</TooltipContent>
          </Tooltip>
          {/* Outside the fade: coffee mode keeps the timer's line (EssayTimer's quiet). */}
          <EssayTimer quiet={coffee} />
          <div className={cn("flex items-center gap-3", fade)}>
            {progress && (
              <span className="flex h-4 items-center gap-3 text-label text-text-3">
                <ReviewProgress {...progress} />
              </span>
            )}
            <Button variant="outline" size="sm" onClick={flow.run} disabled={words === 0 || checking}>
              {checking ? "Reviewing…" : "Review"}
            </Button>
          </div>
        </div>
      </AppBar>

      <main className="relative mx-auto w-full max-w-3xl px-4 sm:px-10">
        <Dictionary.Margin />
        <EssayReview draftId={id} flow={flow} blocks={blocks} onBlocksChange={onBodyChange} editor={editor}>
          <TitleField
            value={title}
            autoFocus={isNew}
            onChange={(next) => record({ title: next, words })}
          />
          {!coffee && <ReviewAside flow={flow} blocks={blocks} />}
          <EssayBody
            review={!coffee}
            onSelectedText={(text) => setSelected(text.trim() ? countWords([{ id: "", text }]) : 0)}
            handle={editor}
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
        </EssayReview>
      </main>

      {/* The text scrolls under it, so it has the page's own background. */}
      <p className="fixed bottom-4 left-4 z-10 bg-bg text-label text-text-3 tabular-nums sm:left-6">
        {selected > 0 && `${selected.toLocaleString("en")} of `}
        {words.toLocaleString("en")} {words === 1 ? "word" : "words"}
      </p>
    </Dictionary>
  );
}

const NO_BLOCKS: Block[] = [];

/**
 * The editor with Grammalecte's underlines and the review's marks under each
 * paragraph, and the review's notes beside it; `review` off (coffee mode)
 * leaves only the text. Grammalecte does the spelling too, so the browser's
 * own spellcheck stays off.
 */
function EssayBody({ review, ...props }: React.ComponentProps<typeof EssayEditor> & { review: boolean }) {
  const text = useCorrectionText();
  const grammar = useGrammar(props.value ?? NO_BLOCKS, review);
  if (!review) return <EssayEditor {...props} spellCheck={false} />;
  return (
    <>
      <EssayEditor
        {...props}
        {...text}
        spellCheck={false}
        renderUnderlay={(b) => (
          <>
            <Correction.Marks blockId={b.id} text={b.text} />
            <GrammarMarks text={b.text} issues={grammar(b)} />
          </>
        )}
        renderAfter={(b) => <Correction.Notes blockId={b.id} />}
      />
      <GrammarTip root={BODY_ID} />
    </>
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

// One line of title that wraps as it grows, up to TITLE_MAX characters. Enter,
// ↓ on its last line or → at its end moves into the essay (↓ keeps the
// caret's horizontal place); pasted line breaks become spaces. Literata's descenders and
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
      maxLength={TITLE_MAX}
      onChange={(e) => onChange(e.target.value.replace(/\s*\n\s*/g, " ").slice(0, TITLE_MAX))}
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
