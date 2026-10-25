"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CircleCheckIcon, CircleDashedIcon, LoaderCircleIcon } from "lucide-react";
import { toast } from "sonner";

import { Progress } from "@/components/ui/progress";
import type { EssayCheck } from "@/lib/ai/check";
import { locate, matchesAccepted, sentenceAround } from "@/lib/ai/correction";
import { cn } from "@/lib/utils";

import { checkFix, reviewEssay } from "./actions";
import type { Block } from "./blocks";
import { Correction, type CorrectionMistake } from "./correction";
import {
  applyFix,
  isStale,
  newReview,
  saveReview,
  updateMistake,
  useEarlierCounts,
  useReview,
  type Review,
} from "./review-store";

// On-demand AI review, shared by the essay and exam-run screens. Review can
// be pressed any time: Ink can't know when writing is done. Pressing it
// again on unchanged text reopens the last review instead of paying for a
// new one; on changed text, a new review replaces the old.
//
// A failed review never takes the essay's place on screen: it's a toast with
// Retry, and the screen goes back to the writing view (onFailed).

export type ReviewFlow = {
  review: Review | null | undefined;
  status: "idle" | "checking";
  /** While checking: how many mistakes the model has written out so far. */
  found: number;
  /** Review the essay, or reopen the last review if the text hasn't changed. */
  open: () => void;
};

type FlowOptions = {
  /** Leave the review view: there's nothing to show. */
  onFailed: () => void;
  /** The toast's Retry: reopen the review view and run it again. */
  onRetry: () => void;
};

export function useReviewFlow(
  draftId: string,
  blocks: Block[] | null,
  prompt: string,
  { onFailed, onRetry }: FlowOptions,
): ReviewFlow {
  const review = useReview(draftId);
  const [status, setStatus] = useState<ReviewFlow["status"]>("idle");
  const [found, setFound] = useState(0);

  // The toast outlives this render; Retry must review the text as it is
  // when pressed, not as it was when the review failed.
  const latest = useRef({ onFailed, onRetry });
  useEffect(() => {
    latest.current = { onFailed, onRetry };
  });

  async function run() {
    if (!blocks) return;
    setStatus("checking");
    setFound(0);
    const id = crypto.randomUUID();
    try {
      const events = await reviewEssay({ reviewId: id, prompt, paragraphs: blocks.map((b) => b.text) });
      const reader = events.getReader();
      let result: EssayCheck | undefined;
      for (let read = await reader.read(); !read.done; read = await reader.read()) {
        if (read.value.type === "found") setFound(read.value.count);
        else result = read.value.check;
      }
      if (!result) throw new Error("Review ended without a result");
      saveReview(draftId, newReview(blocks, result, id));
      setStatus("idle");
    } catch (error) {
      console.error(error);
      setStatus("idle");
      latest.current.onFailed();
      toast.error("Review failed", {
        id: `review-failed:${draftId}`,
        description: "Your essay is unchanged.",
        action: { label: "Retry", onClick: () => latest.current.onRetry() },
      });
    }
  }

  return {
    review,
    status,
    found,
    open() {
      if (!blocks || status === "checking") return;
      toast.dismiss(`review-failed:${draftId}`);
      if (!review || isStale(review, blocks)) void run();
    },
  };
}

export type ViewMode = "write" | "review";

/**
 * Which view the screen shows, kept in the URL (`view=review`) so a reload
 * comes back to the review. Review shows only while one is running or the
 * saved one still matches the text; otherwise the screen falls back to writing.
 */
export function useViewMode(initial: ViewMode, flow: ReviewFlow, blocks: Block[] | null) {
  const [mode, setModeState] = useState(initial);
  const current = flow.status === "checking" || (!!flow.review && !!blocks && !isStale(flow.review, blocks));
  const shown: ViewMode = mode === "review" && current ? "review" : "write";

  function setMode(next: ViewMode) {
    setModeState(next);
    const url = new URL(window.location.href);
    if (next === "review") url.searchParams.set("view", "review");
    else url.searchParams.delete("view");
    window.history.replaceState(null, "", url);
  }

  return [shown, setMode] as const;
}

/** Where the marks are now, numbered in reading order. Phrases edited away drop out. */
function placeMistakes(review: Review, blocks: Block[], seen: Record<string, number>): CorrectionMistake[] {
  const order = new Map(blocks.map((b, i) => [b.id, i]));
  const placed: CorrectionMistake[] = [];
  for (const m of review.mistakes) {
    const block = blocks.find((b) => b.id === m.blockId);
    const needle = m.status === "fixed" || m.status === "revealed" ? (m.final ?? m.fix) : m.wrong;
    const at = block && locate(block.text, needle, m.start, m.before);
    if (!at) continue;
    const overlaps = placed.some((p) => p.blockId === m.blockId && at.start < p.end && p.start < at.end);
    if (overlaps) continue;
    placed.push({ ...m, ...at, number: 0, seen: seen[m.category] ?? 0 });
  }
  placed.sort((a, b) => order.get(a.blockId)! - order.get(b.blockId)! || a.start - b.start);
  return placed.map((m, i) => ({ ...m, number: i + 1 }));
}

export function useReviewProgress(flow: ReviewFlow, blocks: Block[] | null) {
  return useMemo(() => {
    if (!flow.review || !blocks || flow.status !== "idle") return null;
    const placed = placeMistakes(flow.review, blocks, {});
    const done = placed.filter((m) => m.status === "fixed" || m.status === "revealed").length;
    return { done, total: placed.length };
  }, [flow.review, flow.status, blocks]);
}

/** "4 of 13 done" and a bar, for the app bar. */
export function ReviewProgress({ done, total }: { done: number; total: number }) {
  if (total === 0) return <span>No mistakes</span>;
  return (
    <span className="flex items-center gap-2">
      <span>
        {done} of {total} done
      </span>
      <Progress value={(done / total) * 100} aria-label="Mistakes resolved" className="w-16 max-sm:hidden" />
    </span>
  );
}

/**
 * The review in the editor's own column: `heading` is whatever the screen
 * shows above its editor, and every paragraph keeps its place, empty ones
 * included, so the text sits where it was while writing.
 */
export function ReviewView({
  draftId,
  flow,
  blocks,
  onBlocksChange,
  heading,
}: {
  draftId: string;
  flow: ReviewFlow;
  blocks: Block[];
  onBlocksChange: (next: Block[]) => void;
  heading: React.ReactNode;
}) {
  const seen = useEarlierCounts(draftId);
  const review = flow.review;
  const checking = flow.status === "checking" || !review;
  const mistakes = useMemo(
    () => (review && flow.status === "idle" ? placeMistakes(review, blocks, seen) : []),
    [review, flow.status, blocks, seen],
  );
  const block = (id: string) => blocks.find((b) => b.id === id)!;

  return (
    <Correction
      mistakes={mistakes}
      onCheck={async (id, attempt) => {
        const m = mistakes.find((x) => x.id === id)!;
        const original = review!.mistakes.find((x) => x.id === id)!;
        if (matchesAccepted(attempt, original.accept)) return { correct: true, feedback: "" };
        const { correct, feedback } = await checkFix({
          reviewId: review!.id,
          sentence: sentenceAround(block(m.blockId).text, m.start, m.end),
          wrong: m.wrong,
          attempt,
          rule: m.rule,
          accept: original.accept,
        });
        return { correct, feedback };
      }}
      onFix={(id, final, how) => {
        const next = applyFix(draftId, blocks, id, final, how);
        if (next) onBlocksChange(next);
      }}
      onChange={(id, patch) => updateMistake(draftId, id, patch)}
    >
      <Correction.Layout aria-busy={checking || undefined}>
        {heading}
        <Correction.Header>
          {checking ? (
            <>
              <p className="text-label text-text-3" aria-live="polite">
                Reviewing your essay…
              </p>
              <ReviewTrace paragraphs={blocks.filter((b) => b.text.trim()).length} found={flow.found} />
            </>
          ) : (
            <>
              <Summary mistakes={mistakes} />
              <Correction.Filters />
            </>
          )}
        </Correction.Header>
        <div className="flex flex-col gap-y-[1lh] font-serif text-essay">
          {blocks.map((b) => (
            <Correction.Row key={b.id}>
              <Correction.Paragraph blockId={b.id} text={b.text} />
              <Correction.Notes blockId={b.id} />
            </Correction.Row>
          ))}
        </div>
      </Correction.Layout>
    </Correction>
  );
}

/**
 * What the check is doing, in the filter chips' place and their height, so
 * the essay doesn't shift when they arrive. Only what really happens: the
 * model reads the whole essay first, then writes the mistakes out one by one.
 */
function ReviewTrace({ paragraphs, found }: { paragraphs: number; found: number }) {
  const reading = found === 0;
  return (
    <ol aria-label="Review progress" className="flex h-9 flex-col justify-between">
      <TraceStep state={reading ? "running" : "done"}>
        {reading ? "Reading" : "Read"} {paragraphs} {paragraphs === 1 ? "paragraph" : "paragraphs"}
      </TraceStep>
      <TraceStep state={reading ? "pending" : "running"}>
        {reading ? "Marking mistakes" : `Found ${found} ${found === 1 ? "mistake" : "mistakes"}`}
      </TraceStep>
    </ol>
  );
}

const STEP_ICON = { done: CircleCheckIcon, running: LoaderCircleIcon, pending: CircleDashedIcon };

function TraceStep({ state, children }: { state: keyof typeof STEP_ICON; children: React.ReactNode }) {
  const Icon = STEP_ICON[state];
  return (
    <li className={cn("flex items-center gap-2 text-label tabular-nums", state === "running" ? "text-text-2" : "text-text-3")}>
      <Icon aria-hidden className={cn("size-3.5 shrink-0", state === "running" && "animate-spin")} />
      {children}
    </li>
  );
}

function Summary({ mistakes }: { mistakes: CorrectionMistake[] }) {
  const count = (s: CorrectionMistake["status"]) => mistakes.filter((m) => m.status === s).length;
  const open = count("open") + count("skipped");

  if (mistakes.length === 0) {
    return (
      <div className="w-full rounded-card border bg-surface p-4">
        <h2 className="text-title">No mistakes</h2>
        <p className="mt-1.5 text-ui text-text-2">
          Ink checks prepositions, agreement, conjugation and spelling.
        </p>
      </div>
    );
  }
  if (open > 0) {
    return (
      <p className="text-label text-text-3">
        <span className="pointer-coarse:hidden">Click</span>
        <span className="hidden pointer-coarse:inline">Tap</span> a highlight to fix it.
      </p>
    );
  }
  return (
    <div className="w-full rounded-card border bg-surface p-4">
      <h2 className="text-title">All {mistakes.length} done</h2>
      <p className="mt-1.5 text-ui text-text-2 tabular-nums">
        {count("fixed")} fixed by you · {count("revealed")} {count("revealed") === 1 ? "answer" : "answers"} shown
      </p>
    </div>
  );
}
