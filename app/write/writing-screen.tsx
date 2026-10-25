"use client";

import { CheckIcon, ClockIcon, PauseIcon, PlayIcon } from "lucide-react";
import { useState } from "react";

import { AppBar } from "@/components/app-bar";
import { TruncateWords } from "@/components/truncate-words";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { countWords, type Block } from "./blocks";
import { useDraft } from "./draft-store";
import { EssayEditor } from "./essay-editor";
import { ReviewProgress, ReviewView, useReviewFlow, useReviewProgress, useViewMode, type ViewMode } from "./review";
import {
  EXAM_MINUTES,
  WARN_AT_MS,
  formatClock,
  remaining,
  speakClock,
  status,
  type TimerStatus,
} from "./timer";
import { endTimer, pauseTimer, resumeTimer, startTimer, useNow, useTimerState } from "./timer-store";

export type Prompt = {
  id: string;
  section: "A" | "B";
  run: "practice" | "mock";
  title: string;
  instructions: string;
  /** Section A: the start of the article the essay continues. */
  excerpt?: string;
  minWords: number;
};

const RUN_LABEL = { practice: "Practice run", mock: "Mock run" } as const;

export function WritingScreen({ prompt, view = "write" }: { prompt: Prompt; view?: ViewMode }) {
  // Practice and mock runs of the same prompt keep separate drafts and clocks.
  const runId = `${prompt.id}:${prompt.run}`;
  const [blocks, setBlocks] = useDraft(runId);
  const [timer] = useTimerState(runId);
  const now = useNow();

  const minutes = EXAM_MINUTES[prompt.section];
  const durationMs = minutes * 60_000;
  const clock =
    timer && now !== null
      ? { status: status(timer, durationMs, now), left: remaining(timer, durationMs, now) }
      : null;
  const mock = prompt.run === "mock";
  const locked = clock?.status === "paused" || (mock && clock?.status === "over");

  const [confirmEnd, setConfirmEnd] = useState(false);
  const promptText = [prompt.title, prompt.instructions, prompt.excerpt].filter(Boolean).join("\n\n");
  const flow = useReviewFlow(runId, blocks, promptText, { onFailed: () => setMode("write"), onRetry: review });
  const [mode, setMode] = useViewMode(view, flow, blocks);
  const progress = useReviewProgress(flow, blocks);
  const words = blocks ? countWords(blocks) : 0;

  function review() {
    flow.open();
    setMode("review");
    window.scrollTo({ top: 0 });
  }

  // In a mock run, feedback before the end would break exam conditions, so
  // reviewing hands the essay in.
  function onReview() {
    if (mock && clock?.status !== "over") setConfirmEnd(true);
    else review();
  }

  function onValueChange(next: Block[]) {
    // A practice run's clock starts with the first keystroke.
    if (!mock && clock?.status === "idle") startTimer(runId);
    setBlocks(next);
  }

  return (
    <TooltipProvider>
      <AppBar>
        {/* Only the prompt shrinks, ending on a whole word. */}
        <p className="flex min-w-0 flex-1 items-baseline gap-1 text-label text-text-3">
          <span className="shrink-0">Essays</span>
          <span aria-hidden>/</span>
          <TruncateWords text={prompt.title} lang="fr" className="text-text" />
        </p>
        <div className="flex shrink-0 items-center gap-3">
          <div className="flex h-4 items-center gap-3 text-label text-text-3">
            {mode === "review" && progress && (
              <>
                <ReviewProgress {...progress} />
                <Separator orientation="vertical" className="max-sm:hidden" />
              </>
            )}
            <span className="max-sm:hidden">Section {prompt.section}</span>
            <Separator orientation="vertical" className="max-sm:hidden" />
            <span className="max-sm:hidden">{RUN_LABEL[prompt.run]}</span>
            <Separator orientation="vertical" className="max-sm:hidden" />
            <span className={cn(mode === "review" && "max-sm:hidden")}>
              <ExamClock
                clock={clock}
                durationMs={durationMs}
                canPause={!mock}
                onPause={() => pauseTimer(runId)}
                onResume={() => resumeTimer(runId)}
              />
            </span>
            <Separator orientation="vertical" className={cn(mode === "review" && "max-sm:hidden")} />
            <span className={cn(mode === "review" && "max-sm:hidden")}>
              <WordCount count={blocks ? words : null} min={prompt.minWords} />
            </span>
          </div>
          {mode === "write" ? (
            <Button
              variant="outline"
              size="sm"
              onClick={onReview}
              disabled={words === 0 || (mock && clock?.status === "idle")}
            >
              Review
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setMode("write")}>
              Back to essay
            </Button>
          )}
        </div>
      </AppBar>

      <AlertDialog open={confirmEnd} onOpenChange={setConfirmEnd}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hand in your mock run?</AlertDialogTitle>
            <AlertDialogDescription>
              The clock stops and your essay locks as it is, like handing it in at the exam. Then Ink reviews it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep writing</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                endTimer(runId);
                setConfirmEnd(false);
                review();
              }}
            >
              Hand in and review
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {mode === "review" && blocks && clock ? (
        // The same column and everything above the editor, so the text doesn't move.
        <main className="mx-auto w-full max-w-3xl px-4 pb-40 sm:px-10">
          <ReviewView
            draftId={runId}
            flow={flow}
            blocks={blocks}
            onBlocksChange={setBlocks}
            heading={
              <>
                <PromptHeader prompt={prompt} />
                <RunNote
                  status={clock.status}
                  mock={mock}
                  handedIn={clock.status === "over" && clock.left > 0}
                  minutes={minutes}
                  onResume={() => resumeTimer(runId)}
                />
              </>
            }
          />
        </main>
      ) : (
        // sm:px-10 leaves room in the left margin for the paragraph handles.
        <main className="mx-auto w-full max-w-3xl px-4 sm:px-10">
          <TimeAnnouncer clock={clock} mock={mock} />
          <PromptHeader prompt={prompt} />

          {!blocks || !clock ? (
            <EditorSkeleton />
          ) : mock && clock.status === "idle" ? (
            <MockStart minutes={minutes} onStart={() => startTimer(runId)} />
          ) : (
            <>
              <RunNote
                status={clock.status}
                mock={mock}
                handedIn={clock.status === "over" && clock.left > 0}
                minutes={minutes}
                onResume={() => resumeTimer(runId)}
              />
              <EssayEditor
                value={blocks}
                onValueChange={onValueChange}
                readOnly={locked}
                aria-label="Your essay"
                placeholder="Écrivez votre réponse ici…"
                autoFocus
                className="max-w-prose min-h-96 pb-40"
              />
            </>
          )}
        </main>
      )}
    </TooltipProvider>
  );
}

// The prompt above the essay, shared by writing and review so the essay
// starts at the same height in both.
function PromptHeader({ prompt }: { prompt: Prompt }) {
  return (
    <>
      <section className="pt-10">
        <h1 className="font-serif text-essay-title" lang="fr">
          {prompt.title}
        </h1>
        <p className="mt-3 max-w-prose text-body text-text-2" lang="fr">
          {prompt.instructions}
        </p>
        {prompt.excerpt && (
          <blockquote className="mt-6 max-w-prose border-l-2 pl-4 font-serif text-essay text-text-2" lang="fr">
            {prompt.excerpt}
          </blockquote>
        )}
      </section>
      <Separator className="my-8" />
    </>
  );
}

type Clock = { status: TimerStatus; left: number } | null;

function ExamClock({
  clock,
  durationMs,
  canPause,
  onPause,
  onResume,
}: {
  clock: Clock;
  durationMs: number;
  canPause: boolean;
  onPause: () => void;
  onResume: () => void;
}) {
  // Overtime only means something when you can keep writing (practice); a
  // mock run stops at 0:00.
  const left = canPause ? (clock?.left ?? durationMs) : Math.max(0, clock?.left ?? durationMs);
  const started = clock !== null && clock.status !== "idle";
  const warn = started && left <= WARN_AT_MS;

  return (
    <span className="flex items-center gap-1.5">
      <span
        role="timer"
        aria-label={started ? speakClock(left) : `${speakClock(durationMs)}, not started`}
        className={cn(started ? "text-text-2" : "text-text-3", warn && "text-warn")}
      >
        {formatClock(left)}
      </span>
      {canPause && (clock?.status === "running" || clock?.status === "paused") && (
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label={clock.status === "paused" ? "Resume clock" : "Pause clock"}
                onClick={clock.status === "paused" ? onResume : onPause}
              />
            }
          >
            {clock.status === "paused" ? <PlayIcon /> : <PauseIcon />}
          </TooltipTrigger>
          <TooltipContent>{clock.status === "paused" ? "Resume clock" : "Pause clock"}</TooltipContent>
        </Tooltip>
      )}
    </span>
  );
}

// Screen readers hear the clock at 5 minutes, 1 minute and time up, not
// every second.
function TimeAnnouncer({ clock, mock }: { clock: Clock; mock: boolean }) {
  let message = "";
  if (clock && clock.status !== "idle") {
    if (clock.status === "over" && clock.left > 0) message = "Mock run handed in. Your essay is locked.";
    else if (clock.left <= 0) message = mock ? "Time’s up. Your essay is locked." : "Time’s up. You can keep writing.";
    else if (clock.left <= 60_000) message = "1 minute left.";
    else if (clock.left <= WARN_AT_MS) message = "5 minutes left.";
  }
  return (
    <p className="sr-only" aria-live="polite">
      {message}
    </p>
  );
}

function MockStart({ minutes, onStart }: { minutes: number; onStart: () => void }) {
  return (
    <div className="max-w-prose rounded-card border bg-surface p-5">
      <h2 className="text-title">Mock run</h2>
      <p className="mt-2 text-ui text-text-2">
        {minutes} minutes with no pause and no dictionary. The clock starts when you press Start and keeps running if
        you leave this page. At 0:00 your essay locks as it is.
      </p>
      <Button className="mt-4" onClick={onStart}>
        Start mock run
      </Button>
    </div>
  );
}

function RunNote({
  status,
  mock,
  handedIn,
  minutes,
  onResume,
}: {
  status: TimerStatus;
  mock: boolean;
  /** A mock run ended with Review before time was up. */
  handedIn: boolean;
  minutes: number;
  onResume: () => void;
}) {
  if (status === "running") return null;

  if (status === "idle") {
    return <p className="mb-6 text-caption text-text-3">The {minutes}-minute clock starts when you start typing.</p>;
  }

  if (status === "paused") {
    return (
      <Note>
        <span>Paused. Resume the clock to keep writing.</span>
        <Button variant="secondary" size="xs" onClick={onResume} className="ml-auto">
          Resume
        </Button>
      </Note>
    );
  }

  return (
    <Note>
      <ClockIcon className="size-4 shrink-0 text-warn" aria-hidden />
      <span>
        {handedIn
          ? "You handed in this mock run. Your essay is locked as you left it."
          : mock
            ? "Time’s up. Your essay is locked as you left it."
            : "Time’s up. In the exam your essay would be collected now; keep writing to finish this practice."}
      </span>
    </Note>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-6 flex max-w-prose items-center gap-2 rounded-card border bg-surface px-4 py-3 text-ui text-text-2">
      {children}
    </div>
  );
}

function WordCount({ count, min }: { count: number | null; min: number }) {
  if (count === null) return <span>– words</span>;
  if (count < min) {
    return (
      <span>
        {count} / {min} words
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-text-2">
      <CheckIcon className="size-3.5 text-ok" aria-hidden />
      {count} words
      <span className="sr-only">, minimum of {min} reached</span>
    </span>
  );
}

// Holds the editor's place for the frame before the saved draft loads.
function EditorSkeleton() {
  return (
    <div className="grid max-w-prose gap-3" aria-hidden>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-11/12" />
      <Skeleton className="h-4 w-3/5" />
    </div>
  );
}
