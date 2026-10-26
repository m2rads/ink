import type { NextRequest } from "next/server";

// Throwaway: /proto/dictionary/collins?q=commute&dir=to-fr. The Collins
// English-French API behind our own route, so the key stays on the server.
//
// Request format from Collins' v1 API (key in an `accessKey` header):
//   GET /dictionaries/{english-french|french-english}/search/first/?q=…&format=html
//   GET /dictionaries/{…}/search/didyoumean/?q=…&entrynumber=5
//
// No caching, anywhere: Collins' API terms (13 February 2025) forbid storing
// or caching content so that requests to them aren't made. Every lookup goes
// to Collins, so their response time is the lookup's speed. Results must
// show their copyright line (COLLINS_COPYRIGHT in ../collins.tsx).

const BASE = "https://api.collinsdictionary.com/api/v1/dictionaries";
const DICTIONARY = { "to-fr": "english-french", "from-fr": "french-english" } as const;

export type CollinsEntry = { id: string; label: string; url: string; html: string };
export type CollinsPayload = {
  entry: CollinsEntry | null;
  /** Did-you-mean spellings when nothing matched. */
  suggestions: string[];
  /** Time spent waiting on Collins for this answer. */
  upstreamMs: number;
};
export type CollinsError = { error: "missing-key" | "bad-key" | "upstream" | "bad-request"; status?: number };

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const q = (params.get("q") ?? "").trim().slice(0, 80);
  const dir = params.get("dir") === "from-fr" ? "from-fr" : "to-fr";
  if (!q) return Response.json({ error: "bad-request" } satisfies CollinsError, { status: 400 });

  const key = process.env.COLLINS_API_KEY;
  if (!key) return Response.json({ error: "missing-key" } satisfies CollinsError, { status: 503 });

  const dictionary = DICTIONARY[dir];
  const started = performance.now();
  try {
    const first = await collins(`${dictionary}/search/first/?${new URLSearchParams({ q, format: "html" })}`, key);
    if (first.status === 401 || first.status === 403) {
      return Response.json({ error: "bad-key", status: first.status } satisfies CollinsError, { status: 502 });
    }

    let payload: CollinsPayload;
    if (first.ok) {
      const body = (await first.json()) as { entryId: string; entryLabel: string; entryUrl: string; entryContent: string };
      payload = {
        entry: { id: body.entryId, label: body.entryLabel, url: body.entryUrl, html: body.entryContent },
        suggestions: [],
        upstreamMs: 0,
      };
    } else if (first.status === 404) {
      const dym = await collins(`${dictionary}/search/didyoumean/?${new URLSearchParams({ q, entrynumber: "5" })}`, key);
      const suggestions = dym.ok ? (((await dym.json()) as { suggestions?: string[] }).suggestions ?? []) : [];
      payload = { entry: null, suggestions, upstreamMs: 0 };
    } else {
      return Response.json({ error: "upstream", status: first.status } satisfies CollinsError, { status: 502 });
    }

    payload.upstreamMs = Math.round(performance.now() - started);
    console.info(JSON.stringify({ event: "dict.collins", dir, found: !!payload.entry, ms: payload.upstreamMs }));
    return Response.json(payload, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error(JSON.stringify({ event: "dict.collins.error", dir, ms: Math.round(performance.now() - started) }), error);
    return Response.json({ error: "upstream" } satisfies CollinsError, { status: 502 });
  }
}

function collins(path: string, key: string) {
  return fetch(`${BASE}/${path}`, {
    headers: { accessKey: key, Accept: "application/json" },
    signal: AbortSignal.timeout(8000),
    cache: "no-store",
  });
}
