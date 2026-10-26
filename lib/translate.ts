import { language } from "./languages";

// Google Cloud Translation (Basic, v2), behind the dictionary. Server only:
// it spends GOOGLE_TRANSLATE_API_KEY, a Google Cloud API key with the Cloud
// Translation API enabled. It returns one translation per text: no gender,
// senses or examples (AGENTS.md, Dictionary). Each call logs one JSON line
// (`dict.google`: direction, ms).

const ENDPOINT = "https://translation.googleapis.com/language/translate/v2";

type Env = Record<string, string | undefined>;

/** `from`/`to` are LANGUAGES codes or "fr". */
export async function translate(
  { text, from, to }: { text: string; from: string; to: string },
  env: Env = process.env,
): Promise<string> {
  const key = env.GOOGLE_TRANSLATE_API_KEY;
  if (!key) {
    throw new Error(
      "No key for Google Translate: set GOOGLE_TRANSLATE_API_KEY in .env.local (a Google Cloud API key with the Cloud Translation API enabled).",
    );
  }

  const started = performance.now();
  const res = await fetch(`${ENDPOINT}?key=${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // format "text": plain text back, not HTML entities.
    body: JSON.stringify({ q: text, source: googleCode(from), target: googleCode(to), format: "text" }),
    signal: AbortSignal.timeout(8000),
  });
  const ms = Math.round(performance.now() - started);

  if (!res.ok) {
    console.error(JSON.stringify({ event: "dict.google.error", from, to, status: res.status, ms }));
    throw new Error(`Google Translate answered ${res.status}`);
  }
  const body = (await res.json()) as { data?: { translations?: { translatedText?: string }[] } };
  const translated = body.data?.translations?.[0]?.translatedText?.trim() ?? "";
  console.info(JSON.stringify({ event: "dict.google", from, to, ms }));
  return translated;
}

function googleCode(code: string) {
  return code === "fr" ? "fr" : (language(code).google ?? code);
}
