"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CircleCheckIcon, CircleDashedIcon, LoaderCircleIcon } from "lucide-react";
import { toast } from "sonner";

import { Progress } from "@/components/ui/progress";
import type { EssayCheck } from "@/lib/ai/check";
import { matchesAccepted, sentenceAround } from "@/lib/ai/correction";
import { cn } from "@/lib/utils";

import { checkFix, reviewEssay } from "./actions";
import type { Block } from "./blocks";
import { Correction, type CorrectionMistake } from "./correction";
import { readDraft } from "./draft-store";
import type { EssayEditorHandle } from "./essay-editor";
import {
  isStale,
  newReview,
  readReview,
  resolveMistake,
  saveReview,
  updateMistake,
  useEarlierCounts,
  useReview,
  type Review,
} from "./review-store";

// On-demand AI review, on the essay itself: the essay stays editable, and a
// review only adds its marks and notes to it. Review can be pressed any time:
// Ink can't know when writing is done. Pressing it on text unchanged since
// the last review (fixes made in it don't count) does nothing new; on changed
// text, a new review replaces the old. Writing goes on while it runs: its
// marks land wherever their words are by then.
//
// A failed review is a toast with Retry; the last review, if any, stays.

export type ReviewFlow = {
  review: Review | null | undefined;
  status: "idle" | "checking";
  /** While checking: how many mistakes the model has written out so far. */
  found: number;
  /** Review the essay, unless it hasn't changed since the last review. */
  run: () => void;
};

export function useReviewFlow(draftId: string, prompt: string): ReviewFlow {
  const review = useReview(draftId);
  const [status, setStatus] = useState<ReviewFlow["status"]>("idle");
  const [found, setFound] = useState(0);

  // The toast outlives this render; Retry must review the text as it is
  // when pressed, not as it was when the review failed.
  const retry = useRef(() => {});

  async function check() {
    const blocks = readDraft(draftId);
    setStatus("checking");
    setFound(0);
    toast.dismiss(`review-failed:${draftId}`);
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
      saveReview(draftId, newReview(blocks, result, id, readDraft(draftId)));
    } catch (error) {
      console.error(error);
      toast.error("Review failed", {
        id: `review-failed:${draftId}`,
        description: "Your essay is unchanged.",
        action: { label: "Retry", onClick: () => retry.current() },
      });
    } finally {
      setStatus("idle");
    }
  }

  useEffect(() => {
    retry.current = () => void check();
  });

  return {
    review,
    status,
    found,
    run() {
      if (status === "checking") return;
      const current = readReview(draftId);
      if (current && !isStale(current, readDraft(draftId))) {
        toast("Nothing new to review", { id: `review-same:${draftId}`, description: "The essay hasn’t changed since its last review." });
        return;
      }
      void check();
    },
  };
}

/** Where the marks are now, numbered in reading order. Lost marks and ones overlapping an earlier mark sit out. */
function placeMistakes(review: Review, blocks: Block[], seen: Record<string, number>): CorrectionMistake[] {
  const order = new Map(blocks.map((b, i) => [b.id, i]));
  const placed: CorrectionMistake[] = [];
  for (const m of review.mistakes) {
    const block = blocks.find((b) => b.id === m.blockId);
    if (m.lost || !block || m.end > block.text.length) continue;
    const overlaps = placed.some((p) => p.blockId === m.blockId && m.start < p.end && p.start < m.end);
    if (overlaps) continue;
    placed.push({
      ...m,
      current: block.text.slice(m.start, m.end),
      answered: m.answered ?? false,
      number: 0,
      seen: seen[m.category] ?? 0,
    });
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
 * The review on the essay: `<Correction>` and its Layout around the screen's
 * title and editor. The editor draws `Correction.Marks` and `Correction.Notes`
 * per paragraph and takes `useCorrectionText()`; `ReviewAside` goes between
 * the title and the editor. Without a review it's the plain essay.
 */
export function EssayReview({
  draftId,
  flow,
  blocks,
  onBlocksChange,
  editor,
  children,
}: {
  draftId: string;
  flow: ReviewFlow;
  blocks: Block[];
  onBlocksChange: (next: Block[]) => void;
  editor: React.RefObject<EssayEditorHandle | null>;
  children: React.ReactNode;
}) {
  const seen = useEarlierCounts(draftId);
  const review = flow.review;
  // A running review is about to replace these marks.
  const mistakes = useMemo(
    () => (review && flow.status === "idle" ? placeMistakes(review, blocks, seen) : []),
    [review, flow.status, blocks, seen],
  );

  return (
    <Correction
      mistakes={mistakes}
      onCheck={async (id, attempt) => {
        const m = mistakes.find((x) => x.id === id)!;
        const { accept } = review!.mistakes.find((x) => x.id === id)!;
        if (matchesAccepted(attempt, accept)) return { correct: true, feedback: "" };
        const block = blocks.find((b) => b.id === m.blockId)!;
        const { correct, feedback } = await checkFix({
          reviewId: review!.id,
          sentence: sentenceAround(block.text, m.start, m.end),
          wrong: m.wrong,
          attempt,
          rule: m.rule,
          accept,
        });
        return { correct, feedback };
      }}
      onResolve={(id, how, replacement) => {
        let now = readDraft(draftId);
        const m = readReview(draftId)?.mistakes.find((x) => x.id === id);
        if (replacement !== undefined && m && !m.lost) {
          now = now.map((b) =>
            b.id === m.blockId ? { ...b, text: b.text.slice(0, m.start) + replacement + b.text.slice(m.end) } : b,
          );
          onBlocksChange(now);
        }
        resolveMistake(draftId, now, id, how);
      }}
      onChange={(id, patch) => updateMistake(draftId, id, patch)}
      onFocusMark={(id) => {
        // After this event's render: a fix put in the essay rewrites the
        // textarea's value, which would send the caret to its end.
        requestAnimationFrame(() => {
          const m = readReview(draftId)?.mistakes.find((x) => x.id === id);
          if (m && !m.lost) editor.current?.select(m.blockId, m.end);
        });
      }}
    >
      <Correction.Layout aria-busy={flow.status === "checking" || undefined}>{children}</Correction.Layout>
    </Correction>
  );
}

/**
 * The review's own copy, kept out of the essay's column: while it runs, its
 * trace; then the summary and the filters. At the head of the notes column
 * when there's room, above the essay otherwise. Nothing before a first review.
 */
export function ReviewAside({ flow, blocks }: { flow: ReviewFlow; blocks: Block[] }) {
  const checking = flow.status === "checking";
  const mistakes = useMemo(() => (flow.review ? placeMistakes(flow.review, blocks, {}) : []), [flow.review, blocks]);
  if (!checking && !flow.review) return null;
  return (
    <Correction.Header className="mt-6 group-data-[layout=margin]/margin:mt-0">
      <Correction.Aside className="grid gap-3">
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
      </Correction.Aside>
    </Correction.Header>
  );
}

/**
 * What the check is doing, in the filter chips' place (and, above the essay,
 * their height), so the essay doesn't shift when they arrive. Only what really happens: the
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
  if (open > 0) return null;
  return (
    <div className="w-full rounded-card border bg-surface p-4">
      <h2 className="text-title">All {mistakes.length} done</h2>
      <p className="mt-1.5 text-ui text-text-2 tabular-nums">
        {count("fixed")} fixed by you · {count("revealed")} {count("revealed") === 1 ? "answer" : "answers"} shown
      </p>
    </div>
  );
}
