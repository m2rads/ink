import { openai } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";

// Turns a config model id ("openai/gpt-6-sol") into something generateText
// can call. A provider's own key wins for that provider: the call goes
// straight to it, billed on that account. Every other provider goes through
// AI Gateway (its key, or a Vercel deployment's OIDC token), so the A/B can
// still mix providers. To send a provider through the Gateway instead,
// leave its key unset. Only providers listed in DIRECT can run direct; add
// one with its @ai-sdk package and env var.

type Env = Record<string, string | undefined>;

const DIRECT: Record<string, { key: string; model: (id: string) => LanguageModel }> = {
  openai: { key: "OPENAI_API_KEY", model: (id) => openai(id) },
};

export function resolveModel(id: string, env: Env = process.env): LanguageModel {
  const slash = id.indexOf("/");
  const provider = id.slice(0, slash);
  const direct = DIRECT[provider];
  if (direct && env[direct.key]) return direct.model(id.slice(slash + 1));

  if (env.AI_GATEWAY_API_KEY || env.VERCEL_OIDC_TOKEN) return id;

  throw new Error(
    `No key for ${id}: set AI_GATEWAY_API_KEY` +
      (direct ? ` or ${direct.key}` : `, or add "${provider}" to DIRECT in lib/ai/models.ts`) +
      " in .env.local.",
  );
}
