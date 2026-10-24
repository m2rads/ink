"use client";

import { CheckIcon, ClockIcon, PauseIcon, PlayIcon } from "lucide-react";

import { AppBar } from "@/components/app-bar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { countWords, type Block } from "./blocks";
import { useDraft } from "./draft-store";
import { EssayEditor } from "./essay-editor";
import {
  EXAM_MINUTES,
  WARN_AT_MS,
  formatClock,
  remaining,
  speakClock,
  status,
  type TimerStatus,
} from "./timer";
import { pauseTimer, resumeTimer, startTimer, useNow, useTimerState } from "./timer-store";

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

export function WritingScreen({ prompt }: { prompt: Prompt }) {
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

  function onValueChange(next: Block[]) {
    // A practice run's clock starts with the first keystroke.
    if (!mock && clock?.status === "idle") startTimer(runId);
    setBlocks(next);
  }

  return (
    <TooltipProvider>
      <AppBar>
        <p className="min-w-0 truncate text-label text-text-3">
          Essays <span aria-hidden>/</span>{" "}
          <span className="text-text" lang="fr">
            {prompt.title}
          </span>
        </p>
        <div className="flex h-4 shrink-0 items-center gap-3 text-label text-text-3">
          <span className="max-sm:hidden">Section {prompt.section}</span>
          <Separator orientation="vertical" className="max-sm:hidden" />
          <span className="max-sm:hidden">{RUN_LABEL[prompt.run]}</span>
          <Separator orientation="vertical" className="max-sm:hidden" />
          <ExamClock
            clock={clock}
            durationMs={durationMs}
            canPause={!mock}
            onPause={() => pauseTimer(runId)}
            onResume={() => resumeTimer(runId)}
          />
          <Separator orientation="vertical" />
          <WordCount count={blocks ? countWords(blocks) : null} min={prompt.minWords} />
        </div>
      </AppBar>

      {/* sm:px-10 leaves room in the left margin for the paragraph handles. */}
      <main className="mx-auto w-full max-w-3xl px-4 sm:px-10">
        <TimeAnnouncer clock={clock} mock={mock} />

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

        {!blocks || !clock ? (
          <EditorSkeleton />
        ) : mock && clock.status === "idle" ? (
          <MockStart minutes={minutes} onStart={() => startTimer(runId)} />
        ) : (
          <>
            <RunNote status={clock.status} mock={mock} minutes={minutes} onResume={() => resumeTimer(runId)} />
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
    </TooltipProvider>
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
    if (clock.left <= 0) message = mock ? "Time’s up. Your essay is locked." : "Time’s up. You can keep writing.";
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
  minutes,
  onResume,
}: {
  status: TimerStatus;
  mock: boolean;
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
        {mock
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
