"use client";

import { CheckIcon, CircleCheckIcon, CircleDashedIcon, LoaderCircleIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { createContext, use, useEffect, useLayoutEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Popover, PopoverContent } from "@/components/ui/popover";
import { planReview } from "@/lib/ai/budget";
import { sentenceAround } from "@/lib/ai/correction";
import { levelValue, nextLevel, NCLC, SKILL_LABEL, TASK_LABEL, type Kind, type Level } from "@/lib/ai/review";
import { ApiError, checkItem, reviewEssay } from "@/lib/api/client";
import { cn } from "@/lib/utils";

import type { Block } from "./blocks";
import { readDraft } from "./draft-store";
import type { EssayEditorHandle } from "./essay-editor";
import {
  mergeReview,
  readEarlierFocus,
  readReview,
  resolveItem,
  unreviewed,
  updateItem,
  useFocusCounts,
  useReview,
  type Review,
  type ReviewItem,
} from "./review-store";

// The AI review, as a coach (AGENTS.md, Review): where the writer stands,
// the one thing holding them there, and the few changes that take this essay
// up one level. On the essay itself, which stays editable: in the text only
// underlines, and a card at the words when the caret or a click lands in
// one; everything else in the column on the right (above the essay when
// there's no room).
//
// Review can be pressed any time: Ink can't know when writing is done. The
// first review covers the whole essay; after that only paragraphs new or
// changed since (a dot in the gutter marks them), and with nothing new a
// toast offers Review again. Writing goes on while it runs: its items land
// wherever their words are by then. A failed review is a toast with Retry;
// the last review, if any, stays.

export type ReviewFlow = {
  review: Review | null | undefined;
  status: "idle" | "checking";
  /** While checking: how many items the model has written out so far. */
  found: number;
  /** How many paragraphs the running review covers. */
  covering: number;
  /** Review what's new since the last review; `again` reviews everything. */
  run: (again?: boolean) => void;
};

export function useReviewFlow(draftId: string, prompt: string): ReviewFlow {
  const router = useRouter();
  const review = useReview(draftId);
  const [status, setStatus] = useState<ReviewFlow["status"]>("idle");
  const [found, setFound] = useState(0);
  const [covering, setCovering] = useState(0);

  // The toast outlives this render; Retry and Review again must use the text
  // as it is when pressed.
  const latest = useRef<(again?: boolean, rest?: string[]) => void>(() => {});

  /** `rest`: the paragraphs a long review left for next time (by block id), reviewed even if unchanged. */
  async function check(again: boolean, rest?: string[]) {
    const blocks = readDraft(draftId);
    const old = readReview(draftId);
    const todo = rest
      ? blocks.filter((b) => b.text.trim() && rest.includes(b.id))
      : again || !old
        ? blocks.filter((b) => b.text.trim())
        : unreviewed(old, blocks);
    if (!todo.length) {
      toast("Nothing new to review", {
        id: `review-same:${draftId}`,
        action: { label: "Review again", onClick: () => latest.current(true) },
      });
      return;
    }
    // A long essay is reviewed a part at a time (lib/ai/budget.ts); what's left keeps its dot.
    const plan = planReview(
      blocks.map((b) => b.text),
      todo.map((t) => blocks.indexOf(t)),
    );
    const covered = new Set(plan.review.map((i) => blocks[i].id));
    setStatus("checking");
    setFound(0);
    setCovering(plan.review.length);
    toast.dismiss(`review-failed:${draftId}`);
    toast.dismiss(`review-rest:${draftId}`);
    const id = crypto.randomUUID();
    try {
      const events = await reviewEssay({
        reviewId: id,
        prompt,
        paragraphs: plan.paragraphs,
        review: plan.review,
        omitted: plan.omitted,
        shown: (old?.items ?? [])
          .filter((it) => it.status === "open" && !covered.has(it.blockId))
          .flatMap((it): [number, string][] => {
            const i = blocks.findIndex((b) => b.id === it.blockId);
            return i < 0 ? [] : [[i, it.title.slice(0, 200)]];
          }),
        earlier: readEarlierFocus(draftId),
      });
      const reader = events.getReader();
      let result;
      for (let read = await reader.read(); !read.done; read = await reader.read()) {
        if (read.value.type === "found") setFound(read.value.count);
        else result = read.value.result;
      }
      if (!result) throw new Error("Review ended without a result");
      mergeReview(draftId, blocks, covered, result, id, readDraft(draftId));
      if (plan.left) {
        toast(`Reviewed ${plan.review.length} of ${todo.length} paragraphs`, {
          id: `review-rest:${draftId}`,
          action: {
            label: "Review the rest",
            onClick: () => latest.current(false, todo.flatMap((b) => (covered.has(b.id) ? [] : [b.id]))),
          },
        });
      }
    } catch (error) {
      const code = error instanceof ApiError ? error.code : null;
      if (code === "quota") {
        const when = (error as ApiError).resetsAt;
        toast("No reviews left", {
          id: `review-failed:${draftId}`,
          description: when
            ? `More on ${new Date(when).toLocaleDateString("en", { month: "short", day: "numeric", ...(when.endsWith("T00:00:00.000Z") && { timeZone: "UTC" }) })}`
            : undefined,
          action: { label: "Get a pass", onClick: () => router.push("/plans") },
        });
      } else if (code === "rate") {
        toast("Too many reviews at once", { id: `review-failed:${draftId}`, description: "Try again in a minute." });
      } else {
        console.error(error);
        toast.error("Review failed", {
          id: `review-failed:${draftId}`,
          description: "Your essay is unchanged.",
          action: { label: "Retry", onClick: () => latest.current(again, rest) },
        });
      }
    } finally {
      setStatus("idle");
    }
  }

  useEffect(() => {
    latest.current = (again = false, rest) => void check(again, rest);
  });

  return {
    review,
    status,
    found,
    covering,
    run(again = false) {
      if (status !== "checking") void check(again);
    },
  };
}

// ---------- On the essay ----------

type ReviewContextValue = {
  draftId: string;
  flow: ReviewFlow;
  blocks: Block[];
  editor: React.RefObject<EssayEditorHandle | null>;
  /** The item whose card is open. */
  activeId: string | null;
  setActiveId: (id: string | null) => void;
};

const ReviewContext = createContext<ReviewContextValue | null>(null);

function useReviewContext() {
  const ctx = use(ReviewContext);
  if (!ctx) throw new Error("Review parts must be inside <EssayReview>");
  return ctx;
}

/** Open items with their words in the essay now, in reading order. */
function placed(review: Review | null | undefined, blocks: Block[]) {
  if (!review) return [];
  const order = new Map(blocks.map((b, i) => [b.id, i]));
  return review.items
    .filter((it) => !it.lost && order.has(it.blockId))
    .sort((a, b) => order.get(a.blockId)! - order.get(b.blockId)! || a.start - b.start);
}

/**
 * The review around the title and the editor: its state, the margin layout
 * that places `ReviewAside` beside the essay (or above it), and the item card.
 * Put `ReviewAside` between the title and the editor, `ReviewMarks` in the
 * editor's underlay, `ReviewPending` after each paragraph, and spread
 * `useReviewText()` on the editor.
 */
export function EssayReview({
  draftId,
  flow,
  blocks,
  editor,
  children,
}: {
  draftId: string;
  flow: ReviewFlow;
  blocks: Block[];
  editor: React.RefObject<EssayEditorHandle | null>;
  children: React.ReactNode;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  return (
    <ReviewContext value={{ draftId, flow, blocks, editor, activeId, setActiveId }}>
      <Layout>{children}</Layout>
      <ItemCard />
    </ReviewContext>
  );
}

/** For the editor: the caret in an item's words opens its card; Escape closes it until the caret leaves them. */
export function useReviewText() {
  const { flow, blocks, activeId, setActiveId } = useReviewContext();
  const dismissed = useRef<string | null>(null);
  return {
    onTextSelect(blockId: string, start: number, end: number) {
      const hit = placed(flow.review, blocks).find(
        (it) => it.status === "open" && it.blockId === blockId && start >= it.start && end <= it.end && start < it.end,
      );
      const id = hit?.id ?? null;
      if (id !== dismissed.current) dismissed.current = null;
      if (id !== activeId && id !== dismissed.current) setActiveId(id);
    },
    onTextKeyDown(_block: Block, e: React.KeyboardEvent<HTMLTextAreaElement>) {
      if (e.key === "Escape" && activeId) {
        dismissed.current = activeId;
        setActiveId(null);
      }
    },
  };
}

const MARK: Record<Kind, string> = {
  fix: "decoration-warn/70",
  better: "decoration-c-prep/70",
  clarify: "decoration-text-3 decoration-dashed",
  keep: "decoration-ok/60",
};

const ACTIVE: Record<Kind, string> = {
  fix: "bg-warn/12 decoration-warn",
  better: "bg-c-prep/12 decoration-c-prep",
  clarify: "bg-sunken decoration-text-3 decoration-dashed",
  keep: "bg-ok/12 decoration-ok",
};

/**
 * A paragraph's items, for the editor's underlay: its text, transparent
 * there, with each open item's words underlined in its kind's color and the
 * open card's words tinted. Padding is cancelled by negative margin, so no
 * letter moves.
 */
export function ReviewMarks({ block }: { block: Block }) {
  const { flow, blocks, activeId } = useReviewContext();
  const here = placed(flow.review, blocks).filter(
    (it) => it.blockId === block.id && it.status === "open" && it.end <= block.text.length,
  );
  const parts: React.ReactNode[] = [];
  let at = 0;
  for (const it of here) {
    if (it.start < at) continue;
    parts.push(block.text.slice(at, it.start));
    parts.push(
      <span
        key={it.id}
        data-item={it.id}
        className={cn(
          "-mx-0.5 rounded-row px-0.5 underline decoration-[1.5px] underline-offset-4 decoration-skip-ink-none transition-colors duration-150 ease-out",
          it.id === activeId ? ACTIVE[it.kind] : MARK[it.kind],
        )}
      >
        {block.text.slice(it.start, it.end)}
      </span>,
    );
    at = it.end;
  }
  parts.push(block.text.slice(at));
  return <div data-slot="review-marks">{parts}</div>;
}

/** After a paragraph: a dot in the gutter while it has text the review hasn't seen. */
export function ReviewPending({ block }: { block: Block }) {
  const { flow } = useReviewContext();
  if (!flow.review || !block.text.trim() || flow.review.reviewed[block.id] === block.text) return null;
  return (
    <span
      role="img"
      aria-label="Not reviewed yet"
      className="absolute top-3 -left-4 size-1.5 rounded-full bg-border-strong sm:-left-5"
    />
  );
}

// ---------- The card at the words ----------

const KIND_LABEL: Record<Kind, string> = {
  fix: "Holds you below",
  better: "Wording",
  clarify: "Content",
  keep: "Keep doing this",
};

const KIND_DOT: Record<Kind, string> = {
  fix: "bg-warn",
  better: "bg-c-prep",
  clarify: "bg-text-3",
  keep: "bg-ok",
};

/** An action in a card: text, no padding, bottom right; its mousedown keeps the caret in the essay. */
const TEXT_ACTION =
  "relative justify-self-end text-caption text-text-3 transition-colors duration-150 ease-out before:absolute before:-inset-x-2 before:-inset-y-3 hover:text-text disabled:pointer-events-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring";

/**
 * The open item's card, above its words (below when there's no room, the app
 * bar included: DESIGN.md rule 10). Nothing in it takes focus, so the caret
 * stays in the essay.
 */
function ItemCard() {
  const { flow, blocks, activeId, setActiveId } = useReviewContext();
  const item = placed(flow.review, blocks).find((it) => it.id === activeId && it.status === "open") ?? null;
  const next = flow.review ? nextLevel(flow.review.level) : null;
  return (
    <Popover open={!!item} onOpenChange={(open) => !open && setActiveId(null)}>
      <PopoverContent
        // Read when it opens: the words are in the editor's underlay.
        anchor={() => (item ? document.querySelector(`[data-item="${item.id}"]`) : null)}
        side="top"
        sideOffset={6}
        collisionPadding={{ top: 64, right: 8, bottom: 8, left: 8 }}
        initialFocus={false}
        finalFocus={false}
        className="w-80 gap-2 p-3 text-label"
      >
        {item && (
          <>
            <p className="flex items-center gap-2 text-caption text-text-3">
              <span aria-hidden className={cn("size-2 rounded-full", KIND_DOT[item.kind])} />
              {item.kind === "fix" ? `${KIND_LABEL.fix} ${next ?? "the next level"}` : KIND_LABEL[item.kind]}
            </p>
            <p className="text-ui text-text">
              <Rich text={item.title} />
            </p>
            <p className="text-text-2">
              <Rich text={item.why} />
            </p>
            {item.feedback && (
              <p className="text-text">
                <Rich text={item.feedback} />
              </p>
            )}
            <ItemAction item={item} />
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}

/**
 * The card's action. Changed words, or a changed paragraph for an item with
 * no answer, can be checked by the AI again; otherwise the answer on request
 * (the writer still types it). Words that match an answer close the item on
 * their own (review-store's settle).
 */
function ItemAction({ item }: { item: ReviewItem }) {
  const { draftId, flow, blocks } = useReviewContext();
  const [checking, setChecking] = useState(false);
  const text = blocks.find((b) => b.id === item.blockId)?.text ?? "";
  const words = text.slice(item.start, item.end);
  const changed = item.kind !== "keep" && (words !== item.quote || (!item.answer && flow.review?.reviewed[item.blockId] !== text));

  if (changed) {
    return (
      <button
        type="button"
        disabled={checking}
        onMouseDown={(e) => e.preventDefault()}
        onClick={async () => {
          setChecking(true);
          try {
            const verdict = await checkItem({
              reviewId: flow.review!.id,
              passage: item.answer ? sentenceAround(text, item.start, item.end) : text,
              quote: item.quote,
              title: item.title,
              why: item.why,
              words,
              accept: item.accept,
            });
            if (verdict.resolved) resolveItem(draftId, readDraft(draftId), item.id);
            else updateItem(draftId, item.id, { feedback: verdict.feedback });
          } catch (error) {
            if (error instanceof ApiError && error.code === "rate") {
              toast("Too many checks at once", { description: "Try again in a minute." });
            } else {
              console.error(error);
              toast.error("Check failed", { description: "Try again in a moment." });
            }
          } finally {
            setChecking(false);
          }
        }}
        className={TEXT_ACTION}
      >
        {checking ? "Checking…" : "Check"}
      </button>
    );
  }
  if (!item.answer) return null;
  return item.answered ? (
    <p lang="fr" className="font-serif text-ui text-text">
      {item.answer}
    </p>
  ) : (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => updateItem(draftId, item.id, { answered: true })}
      className={TEXT_ACTION}
    >
      Answer
    </button>
  );
}

// ---------- The column ----------

/**
 * Everything the review says besides the underlines: while it runs, what it's
 * doing; then the estimated level, each skill, this essay's changes and what
 * to work on across essays. Nothing before a first review.
 */
export function ReviewAside() {
  const { flow, blocks } = useReviewContext();
  const checking = flow.status === "checking";
  if (!checking && !flow.review) return null;
  return (
    <div data-review-aside className={cn(ASIDE, "font-sans")}>
      <div className="grid gap-5 group-data-[layout=margin]/review:sticky group-data-[layout=margin]/review:top-20">
        {checking && <Trace paragraphs={flow.covering} found={flow.found} />}
        {flow.review && (
          <div className={cn("grid gap-5 transition-opacity duration-200", checking && "opacity-50")}>
            <LevelSection review={flow.review} />
            <Changes review={flow.review} blocks={blocks} />
            <Focus review={flow.review} />
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * The estimate, said as one: a band and an NCLC range, never a point score,
 * with what it rests on and any caveat the AI gave.
 */
function LevelSection({ review }: { review: Review }) {
  const next = nextLevel(review.level);
  return (
    <section aria-label="Estimated level" className="grid gap-3">
      <p className="text-label text-text-3 tabular-nums">
        {review.task !== "unknown" && `${TASK_LABEL[review.task]} · `}estimate from {review.words} words
      </p>
      <table className="w-full table-fixed border-collapse text-label tabular-nums">
        <caption className="sr-only">Your level now and the next one</caption>
        <colgroup>
          <col className="w-14" />
          <col className="w-12" />
          <col />
        </colgroup>
        <tbody>
          <LevelRow label="Now" level={review.level} />
          {next && <LevelRow label="Next" level={next} quiet />}
        </tbody>
      </table>
      {review.caveat && <p className="text-label text-text-2">{review.caveat}</p>}
      <p className="text-ui text-text-2 text-pretty">
        <Rich text={review.diagnosis} />
      </p>
      <Skills review={review} target={next} />
    </section>
  );
}

function LevelRow({ label, level, quiet }: { label: string; level: Level; quiet?: boolean }) {
  return (
    <tr>
      <th scope="row" className="py-0.5 text-start font-normal text-text-3">
        {label}
      </th>
      <td className={cn("py-0.5 text-title", quiet && "text-text-2")}>{level}</td>
      <td className="py-0.5 text-text-3">NCLC {NCLC[level]}</td>
    </tr>
  );
}

/** Each skill: its level in its own column, then where it sits on A2–C1+ against the next level's line. */
function Skills({ review, target }: { review: Review; target: Level | null }) {
  const max = levelValue("C1+");
  const at = (v: number) => `${(v / max) * 100}%`;
  const goal = target ? levelValue(target) : null;
  return (
    <table className="w-full table-fixed border-collapse text-label tabular-nums">
      <caption className="sr-only">Each skill’s level</caption>
      <colgroup>
        <col className="w-24" />
        <col className="w-12" />
        <col />
      </colgroup>
      <thead className="sr-only">
        <tr>
          <th scope="col">Skill</th>
          <th scope="col">Level</th>
          <th scope="col">On the scale</th>
        </tr>
      </thead>
      <tbody>
        {review.skills.map(({ skill, level }) => {
          const v = level === "unclear" ? null : levelValue(level);
          const below = v !== null && goal !== null && v < goal;
          return (
            <tr key={skill}>
              <th scope="row" className="py-1 text-start font-normal text-text-2">
                {SKILL_LABEL[skill]}
              </th>
              <td className={cn("py-1", v === null ? "text-text-3" : below ? "text-warn" : "text-text")}>
                {level === "unclear" ? "—" : level}
                {level === "unclear" && <span className="sr-only">not enough to judge</span>}
              </td>
              <td className="py-1" aria-hidden>
                <span className="relative block h-1 rounded-full bg-sunken">
                  {goal !== null && <span className="absolute -inset-y-1 w-px bg-text-3" style={{ left: at(goal) }} />}
                  {v !== null && (
                    <span
                      className={cn("absolute top-1/2 size-2 -translate-1/2 rounded-full", below ? "bg-warn" : "bg-text")}
                      style={{ left: at(v) }}
                    />
                  )}
                </span>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/** This essay's changes, most important first, then what to keep; a row selects its words, which opens its card. */
function Changes({ review, blocks }: { review: Review; blocks: Block[] }) {
  const { editor, setActiveId, activeId } = useReviewContext();
  const all = placed(review, blocks);
  const changes = all.filter((it) => it.kind !== "keep");
  const keeps = all.filter((it) => it.kind === "keep");
  const left = changes.filter((it) => it.status === "open").length;
  const next = nextLevel(review.level) ?? review.level;
  const order = new Map(review.items.map((it, i) => [it.id, i]));
  const byImportance = (a: ReviewItem, b: ReviewItem) => order.get(a.id)! - order.get(b.id)!;

  return (
    <section aria-label="Changes" className="grid gap-1.5">
      <h3 className="text-label text-text-3 tabular-nums">
        {changes.length === 0
          ? `No changes to ${next}`
          : left === 0
            ? `All ${changes.length} changes done`
            : `${left} of ${changes.length} changes to ${next}`}
      </h3>
      <ul className="-mx-2 grid">
        {[...changes.sort(byImportance), ...keeps.sort(byImportance)].map((it) => {
          const done = it.status === "done";
          return (
            <li key={it.id}>
              <button
                type="button"
                disabled={done}
                aria-current={activeId === it.id || undefined}
                onClick={() => {
                  editor.current?.select(it.blockId, it.start, it.end);
                  setActiveId(it.id);
                }}
                className="flex min-h-8 w-full items-center gap-2.5 rounded-row px-2 text-start text-label transition-colors duration-150 ease-out not-disabled:hover:bg-sunken aria-current:bg-sunken focus-visible:outline-2 focus-visible:outline-focus-ring pointer-coarse:min-h-11"
              >
                <span className="flex w-3.5 shrink-0 justify-center">
                  {done ? (
                    <CheckIcon aria-hidden className="size-3.5 text-ok" />
                  ) : (
                    <span aria-hidden className={cn("size-2 rounded-full", KIND_DOT[it.kind])} />
                  )}
                </span>
                <span
                  className={cn(
                    done ? "text-text-3 line-through decoration-border-strong" : it.kind === "keep" ? "text-text-2" : "text-text",
                  )}
                >
                  <Rich text={it.title} />
                  {done && <span className="sr-only">, done</span>}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** What to work on across essays; ×N once a pattern has come up in more than one. */
function Focus({ review }: { review: Review }) {
  const count = useFocusCounts();
  const next = nextLevel(review.level);
  if (!review.focus.length) return null;
  return (
    <section aria-label="Across your essays" className="grid gap-2">
      <h3 className="text-label text-text-3">{next ? `To reach ${next}, across your essays` : "Across your essays"}</h3>
      <table className="w-full table-fixed border-collapse text-label tabular-nums">
        <colgroup>
          <col className="w-5" />
          <col />
          <col className="w-8" />
        </colgroup>
        <tbody>
          {review.focus.map((f, i) => {
            const n = count(f.title);
            return (
              <tr key={f.title} className="align-baseline">
                <td className="py-1 text-text-3">{i + 1}</td>
                <td className="py-1 text-text">
                  {f.title}
                  <span className="block text-text-3">
                    <Rich text={f.detail} />
                  </span>
                </td>
                <td className="py-1 text-end text-text-3">
                  {n > 1 && (
                    <>
                      ×{n}
                      <span className="sr-only"> essays</span>
                    </>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

/** What the review is really doing: the model reads first, then writes its items out one by one. */
function Trace({ paragraphs, found }: { paragraphs: number; found: number }) {
  const reading = found === 0;
  return (
    <ol aria-label="Review progress" aria-live="polite" className="grid gap-1.5">
      <TraceStep state={reading ? "running" : "done"}>
        {reading ? "Reading" : "Read"} {paragraphs} {paragraphs === 1 ? "paragraph" : "paragraphs"}
      </TraceStep>
      <TraceStep state={reading ? "pending" : "running"}>
        {reading ? "Choosing changes" : `Found ${found} ${found === 1 ? "item" : "items"}`}
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

/** The AI marks French with *asterisks*; it's set in Literata italic. */
function Rich({ text }: { text: string }) {
  return text.split(/\*([^*]+)\*/g).map((part, i) =>
    i % 2 ? (
      <em key={i} lang="fr" className="font-serif text-text italic">
        {part}
      </em>
    ) : (
      part
    ),
  );
}

// ---------- Layout ----------

// The column beside the essay: from the text's right edge plus GAP to the
// window's edge minus EDGE, at least NOTES_MIN wide (else the aside stacks
// above the essay) and at most NOTES_MAX.
const GAP = 32;
const EDGE = 16;
const NOTES_MIN = 200;
const NOTES_MAX = 288;

/** In the column: absolute, the layout's full height, so its content can stick while the essay scrolls. */
const ASIDE =
  "mb-7 group-data-[layout=margin]/review:absolute group-data-[layout=margin]/review:inset-y-0 group-data-[layout=margin]/review:left-(--aside-left) group-data-[layout=margin]/review:mb-0 group-data-[layout=margin]/review:w-(--aside-width)";

/**
 * The essay's column with room for the aside. Measures where the text ends
 * and writes the column's place as CSS variables, so placing it never
 * re-renders anything; the essay never moves for it.
 */
function Layout({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    const place = () => {
      const text = root.querySelector<HTMLElement>("[data-slot=review-marks]");
      const box = root.getBoundingClientRect();
      const right = text ? text.getBoundingClientRect().right : box.right;
      const room = document.documentElement.clientWidth - right - GAP - EDGE;
      if (room < NOTES_MIN) {
        root.dataset.layout = "stacked";
        return;
      }
      root.dataset.layout = "margin";
      root.style.setProperty("--aside-left", `${right - box.left + GAP}px`);
      root.style.setProperty("--aside-width", `${Math.min(room, NOTES_MAX)}px`);
    };
    place();
    const observer = new ResizeObserver(place);
    observer.observe(root);
    window.addEventListener("resize", place);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", place);
    };
  });

  return (
    <div ref={ref} data-slot="review-layout" data-layout="stacked" className="group/review relative">
      {children}
    </div>
  );
}
