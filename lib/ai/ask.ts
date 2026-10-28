import { z } from "zod";

// The essay's slash command (AGENTS.md, Ask): what the writer typed after
// "/" (an English phrase, a question, or broken French) and the sentence it
// goes in, answered with French to put in its place. Client-safe: types and
// the model-facing schema only.

export const TAGS = ["", "Formal", "Spoken"] as const;

// Model-facing: no optional fields or numeric bounds (OpenAI's strict
// structured outputs reject some); the server caps instead.
export const askReportSchema = z.object({
  readAs: z
    .string()
    .describe(
      "Empty unless the query was ambiguous or had a slip; then one short English line on how it was read, e.g. “Read *employees* as employers (*employeurs*).”",
    ),
  suggestions: z
    .array(
      z.object({
        fr: z.string().describe("The French to put in place of the query, fitted to the sentence around it (agreement, articles, elision)."),
        note: z
          .string()
          .describe("One short English sentence: why it fits, or how it differs from the others. French in *asterisks*."),
        tag: z.enum(TAGS).describe("Formal or Spoken only when the register matters for the exam; else empty."),
      }),
    )
    .describe("Three or four suggestions, always French, best first. Empty if the query can't be understood."),
});

export type AskReport = z.infer<typeof askReportSchema>;
export type Suggestion = AskReport["suggestions"][number];

export const MAX_SUGGESTIONS = 4;
