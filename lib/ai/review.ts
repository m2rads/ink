import { z } from "zod";

// What a review returns, and the pure work around it (AGENTS.md, Review).
// No AI calls here, so the review's UI can import it on the client.
//
// A review coaches: the writer's estimated level, the one thing holding
// them there, each skill against the next level, a few changes that take
// this essay up one level, and what to work on across essays. Grammar and
// spelling a rule can catch are the editor's (Grammalecte), not the review's.

/** CEFR levels with the halves examiners use (B2+ is B2 with C1 signs). */
export const LEVELS = ["A2", "B1", "B1+", "B2", "B2+", "C1", "C1+"] as const;
export type Level = (typeof LEVELS)[number];

/**
 * NCLC range for a level. From France Éducation international's TCF scale
 * (score → CEFR) and IRCC's table (score → NCLC), so approximate: the TEF has
 * no official CEFR table. Shown as a range because that's all an estimate
 * can honestly claim.
 */
export const NCLC: Record<Level, string> = {
  A2: "4",
  B1: "5–6",
  "B1+": "6",
  B2: "7–8",
  "B2+": "8",
  C1: "9–10",
  "C1+": "10",
};

/** One level at a time: the next full level. */
export function nextLevel(level: Level): Level | null {
  const order: Level[] = ["A2", "B1", "B2", "C1"];
  const base = level.replace("+", "") as Level;
  return order[order.indexOf(base) + 1] ?? null;
}

/** Where a level sits on A2–C1+, for the skills' scale (0 = A2). */
export function levelValue(level: Level): number {
  return { A2: 0, B1: 1, "B1+": 1.5, B2: 2, "B2+": 2.5, C1: 3, "C1+": 3.5 }[level];
}

export const SKILLS = ["task", "organisation", "sentences", "vocabulary", "accuracy"] as const;
export type Skill = (typeof SKILLS)[number];

export const SKILL_LABEL: Record<Skill, string> = {
  task: "Task",
  organisation: "Organisation",
  sentences: "Sentences",
  vocabulary: "Vocabulary",
  accuracy: "Accuracy",
};

export const KINDS = ["fix", "better", "clarify", "keep"] as const;
export type Kind = (typeof KINDS)[number];

export const TASKS = ["TEF A", "TEF B", "TCF 1", "TCF 2", "TCF 3", "unknown"] as const;
export type Task = (typeof TASKS)[number];

export const TASK_LABEL: Record<Exclude<Task, "unknown">, string> = {
  "TEF A": "TEF Canada · Section A",
  "TEF B": "TEF Canada · Section B",
  "TCF 1": "TCF Canada · Tâche 1",
  "TCF 2": "TCF Canada · Tâche 2",
  "TCF 3": "TCF Canada · Tâche 3",
};

// Model-facing: no optional fields or numeric bounds (OpenAI's strict
// structured outputs reject some); anchorItems and the server cap instead.

const reportedItemSchema = z.object({
  paragraph: z.number().describe("Number of the paragraph the item is in, as given in brackets."),
  quote: z
    .string()
    .describe("The writer's words it's about, copied exactly from that paragraph: the shortest span that shows it."),
  kind: z
    .enum(KINDS)
    .describe(
      "fix: an error that keeps the essay below the next level. better: correct, but a next-level writer would word it differently (register, precision, a calque). clarify: the reader can't follow the content or logic. keep: something already at the next level, worth repeating.",
    ),
  title: z.string().describe("The point in under 45 characters, in English, no final period. French in *asterisks*."),
  why: z
    .string()
    .describe(
      "One or two short sentences in English: what's wrong or right and why it matters for the next level, tied to this writer. French in *asterisks*. Never the answer itself.",
    ),
  answer: z
    .string()
    .describe("What a next-level writer writes in place of the quote. Empty for clarify and keep."),
  accept: z.array(z.string()).describe("Every rewrite of the quote a teacher would accept, including answer. Empty when answer is."),
});

export const reviewReportSchema = z.object({
  task: z.enum(TASKS).describe("The exam task this essay answers, judged from the prompt and the text; unknown if unclear."),
  level: z.enum(LEVELS).describe("The essay's overall level, from evidence in it only. Round down when torn."),
  caveat: z
    .string()
    .describe(
      "Empty when the essay gives enough to judge. Otherwise one short sentence on what limits the estimate, e.g. “Only 60 words: too little to judge vocabulary.”",
    ),
  diagnosis: z
    .string()
    .describe("One sentence in English: what keeps the essay at its level, or what it already does well if that's the point."),
  skills: z
    .array(
      z.object({
        skill: z.enum(SKILLS),
        level: z.enum([...LEVELS, "unclear"]).describe("unclear when the essay doesn't show this skill enough to judge."),
      }),
    )
    .describe("Each of the five skills once."),
  items: z.array(reportedItemSchema).describe("The few changes that matter most for the next level, most important first."),
  focus: z
    .array(
      z.object({
        title: z.string().describe("A recurring pattern in under 30 characters, e.g. “Relative pronouns”. Reuse an earlier title for the same pattern."),
        detail: z.string().describe("A few words with examples, French in *asterisks*."),
      }),
    )
    .describe("Two or three patterns to work on across essays to reach the next level, most important first."),
});

export type ReviewReport = z.infer<typeof reviewReportSchema>;
export type ReportedItem = z.infer<typeof reportedItemSchema>;

/** An item pinned to its place in the essay. */
export type Item = Omit<ReportedItem, "paragraph"> & {
  id: string;
  /** Index into the essay's blocks. */
  block: number;
  /** UTF-16 offsets of `quote` in that block's text. */
  start: number;
  end: number;
};

export const MAX_CHANGES = 6;
export const MAX_KEEPS = 2;

/**
 * Pin reported items to offsets in the text, in paragraphs the review was
 * asked about (`allowed`, 0-based). A quote that isn't in its paragraph is
 * dropped rather than guessed at, and so is one that overlaps an item already
 * placed. At most MAX_CHANGES changes and MAX_KEEPS strengths, in the
 * model's order of importance.
 */
export function anchorItems(
  paragraphs: string[],
  reported: ReportedItem[],
  allowed?: Set<number>,
): { items: Item[]; dropped: ReportedItem[] } {
  const items: Item[] = [];
  const dropped: ReportedItem[] = [];
  let changes = 0;
  let keeps = 0;

  for (const { paragraph, ...rest } of reported) {
    const block = paragraph - 1;
    const text = Number.isInteger(block) && (!allowed || allowed.has(block)) ? paragraphs[block] : undefined;
    const keep = rest.kind === "keep";
    const full = keep ? keeps >= MAX_KEEPS : changes >= MAX_CHANGES;
    const span = full || !text || !rest.quote ? null : findFree(text, rest.quote, items.filter((m) => m.block === block));
    if (!span) {
      dropped.push({ paragraph, ...rest });
      continue;
    }
    const answer = rest.kind === "clarify" || keep ? "" : rest.answer.trim();
    const accept = !answer ? [] : rest.accept.includes(answer) ? rest.accept : [answer, ...rest.accept];
    items.push({ ...rest, answer, accept, id: `${block}:${span.start}`, block, ...span });
    if (keep) keeps++;
    else changes++;
  }
  return { items, dropped };
}

function findFree(text: string, quote: string, taken: Item[]) {
  for (let from = 0; ; ) {
    const start = text.indexOf(quote, from);
    if (start === -1) return null;
    const end = start + quote.length;
    if (!taken.some((m) => start < m.end && m.start < end)) return { start, end };
    from = start + 1;
  }
}

/** The report's levels, made safe: five skills in order, unknown ones "unclear". */
export function skillsOf(report: Pick<ReviewReport, "skills">): { skill: Skill; level: Level | "unclear" }[] {
  return SKILLS.map((skill) => ({ skill, level: report.skills.find((s) => s.skill === skill)?.level ?? "unclear" }));
}
