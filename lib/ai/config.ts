import { get } from "@vercel/edge-config";
import { z } from "zod";

// Which model runs each AI task, read on every request so an A/B split can
// change without a build. Models are AI Gateway ids ("openai/gpt-6-sol"), so
// trying a new provider is a config change, not a new package.
//
// Where the config comes from, first match wins:
//   1. Edge Config, key "ai", when EDGE_CONFIG is set. Edits reach running
//      deployments within about a minute, with no redeploy.
//   2. INK_AI, the same JSON in an env var. Read at request time, so a
//      restart picks it up; on Vercel an env change still needs a redeploy.
//   3. DEFAULT_CONFIG below.
//
// {
//   "check": [{ "id": "sol", "model": "openai/gpt-6-sol", "reasoning": "medium", "weight": 50 },
//             { "id": "sonnet", "model": "anthropic/claude-sonnet-5.5", "reasoning": "medium", "weight": 50 }],
//   "fix":   [{ "id": "sol-low", "model": "openai/gpt-6-sol", "reasoning": "low" }],
//   "ask":   [{ "id": "sol-none", "model": "openai/gpt-6-sol", "reasoning": "none" }]
// }
//
// Each review lands in one arm per task and stays there (see pickArm), so
// every re-check of its fixes comes from the same arm.

export type Task = "check" | "fix" | "ask";

const armSchema = z.object({
  /** Short, stable name for the arm; it's what results are logged and compared by. */
  id: z.string().min(1),
  model: z.string().regex(/^[\w.-]+\/[\w.:-]+$/, "an AI Gateway id like provider/model"),
  /** Relative share of traffic; arms don't need to add up to 100. 0 pauses an arm. */
  weight: z.number().min(0).default(1),
  /** The AI SDK's portable reasoning effort; omitted means the provider's default. */
  reasoning: z.enum(["none", "minimal", "low", "medium", "high", "xhigh", "max"]).optional(),
});

export type Arm = z.infer<typeof armSchema>;

// The slash command's suggestions are waited on mid-sentence: no reasoning.
const DEFAULT_ASK: Arm[] = [{ id: "sol-none", model: "openai/gpt-6-sol", reasoning: "none", weight: 1 }];

const configSchema = z.object({
  check: z.array(armSchema).min(1),
  fix: z.array(armSchema).min(1),
  // Optional, so configs written before it existed stay valid.
  ask: z.array(armSchema).min(1).default(DEFAULT_ASK),
});

export type AiConfig = z.infer<typeof configSchema>;

export const DEFAULT_CONFIG: AiConfig = {
  check: [{ id: "sol-medium", model: "openai/gpt-6-sol", reasoning: "medium", weight: 1 }],
  // A fix is one short judgment the learner waits on, so less reasoning.
  fix: [{ id: "sol-low", model: "openai/gpt-6-sol", reasoning: "low", weight: 1 }],
  ask: DEFAULT_ASK,
};

export async function loadConfig(): Promise<AiConfig> {
  if (process.env.EDGE_CONFIG) {
    try {
      const value = await get("ai");
      if (value !== undefined) return parseConfig(value, "Edge Config");
    } catch (error) {
      console.error("[ai] Couldn't read Edge Config; using INK_AI or the default.", error);
    }
  }
  if (process.env.INK_AI) {
    try {
      return parseConfig(JSON.parse(process.env.INK_AI), "INK_AI");
    } catch {
      console.error("[ai] INK_AI isn't valid JSON; using the default.");
    }
  }
  return DEFAULT_CONFIG;
}

/** A bad config never stops checks: it's logged and the default runs instead. */
export function parseConfig(value: unknown, source: string): AiConfig {
  const result = configSchema.safeParse(value);
  if (result.success) return result.data;
  console.error(`[ai] Invalid config in ${source}; using the default.`, z.prettifyError(result.error));
  return DEFAULT_CONFIG;
}

/**
 * The arm for one unit (a review id), weighted and deterministic: the same
 * unit gets the same arm until the arms or weights change.
 */
export function pickArm(arms: Arm[], unit: string, task: Task): Arm {
  const live = arms.filter((a) => a.weight > 0);
  if (live.length === 0) return arms[0];
  const total = live.reduce((n, a) => n + a.weight, 0);
  let point = bucket(`${task}:${unit}`) * total;
  for (const arm of live) {
    point -= arm.weight;
    if (point < 0) return arm;
  }
  return live[live.length - 1];
}

/** FNV-1a, mapped to [0, 1). Stable across runtimes, unlike Math.random. */
function bucket(key: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0) / 2 ** 32;
}

export async function armFor(task: Task, unit: string): Promise<Arm> {
  const config = await loadConfig();
  return pickArm(config[task], unit, task);
}
