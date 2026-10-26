"use client";

import "./collins.css";

import { ArrowUpRightIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import type { CollinsError, CollinsPayload } from "./collins/route";

// Throwaway: /proto/dictionary. Real entries from Collins through our route,
// with the time each one took, so quality and speed can be judged. Nothing
// is kept between lookups: Collins' terms forbid caching their content.

type Direction = "to-fr" | "from-fr";
type Result = (CollinsPayload & { roundTripMs: number }) | CollinsError;

/** Collins' terms require this line wherever their content is used. */
const COLLINS_COPYRIGHT = "www.collinsdictionary.com © HarperCollins Publishers Ltd 2025";

export function useCollins(term: string, direction: Direction) {
  const key = term ? `${direction}:${term.toLocaleLowerCase("fr")}` : "";
  const [fetched, setFetched] = useState<{ key: string; result: Result } | null>(null);

  useEffect(() => {
    if (!key) return;
    const controller = new AbortController();
    const started = performance.now();
    fetch(`/proto/dictionary/collins?${new URLSearchParams({ q: term, dir: direction })}`, { signal: controller.signal })
      .then(async (res) => {
        const body = (await res.json()) as CollinsPayload | CollinsError;
        const result: Result = "error" in body ? body : { ...body, roundTripMs: Math.round(performance.now() - started) };
        setFetched({ key, result });
      })
      .catch((error: unknown) => {
        if ((error as Error).name !== "AbortError") setFetched({ key, result: { error: "upstream" } });
      });
    // Typing on cancels the request for the word left behind.
    return () => controller.abort();
  }, [key, term, direction]);

  if (!key) return { status: "idle" as const };
  const result = fetched?.key === key ? fetched.result : undefined;
  return result ? { status: "done" as const, result } : { status: "loading" as const };
}

export function CollinsResult({
  term,
  direction,
  onPick,
  onFound,
}: {
  term: string;
  direction: Direction;
  onPick: (word: string) => void;
  /** A word that found an entry counts as looked up. */
  onFound: (word: string) => void;
}) {
  const lookup = useCollins(term, direction);
  const found = lookup.status === "done" && "entry" in lookup.result && !!lookup.result.entry;

  useEffect(() => {
    if (!found) return;
    const t = setTimeout(() => onFound(term), 900);
    return () => clearTimeout(t);
  }, [found, term, onFound]);

  if (lookup.status === "idle") return null;
  if (lookup.status === "loading") {
    return <p className="px-1 py-4 text-label text-text-3">Looking up “{term}” in Collins…</p>;
  }
  const { result } = lookup;
  if ("error" in result) return <ErrorNote error={result} />;

  const wr = `https://www.wordreference.com/${direction === "to-fr" ? "enfr" : "fren"}/${encodeURIComponent(term)}`;
  const timing = `${result.roundTripMs} ms (Collins ${result.upstreamMs} ms)`;

  return (
    <div className="px-1 py-3">
      <p className="text-caption text-text-3 tabular-nums" aria-live="polite">
        <span className="sr-only">{result.entry ? `${result.entry.label}. ` : "No entry. "}</span>
        {timing}
      </p>
      {result.entry ? (
        <>
          <EntryHtml html={result.entry.html} lang={direction === "to-fr" ? "en" : "fr"} />
          <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-label">
            <OutLink href={result.entry.url}>Collins</OutLink>
            <OutLink href={wr}>WordReference</OutLink>
          </p>
          <p className="mt-2 text-caption text-text-3">{COLLINS_COPYRIGHT}</p>
        </>
      ) : (
        <div className="py-3">
          <p className="text-ui text-text-3">Collins has nothing for “{term}”.</p>
          {result.suggestions.length > 0 && (
            <p className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-ui text-text-3">
              Did you mean
              {result.suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => onPick(s)}
                  className="relative text-text-2 underline decoration-border-strong underline-offset-4 transition-colors duration-150 before:absolute before:-inset-x-1 before:-inset-y-2 hover:text-text hover:decoration-current"
                >
                  {s}
                </button>
              ))}
            </p>
          )}
          <p className="mt-3 text-label">
            <OutLink href={wr}>Try WordReference</OutLink>
          </p>
        </div>
      )}
    </div>
  );
}

function ErrorNote({ error }: { error: CollinsError }) {
  const text =
    error.error === "missing-key"
      ? "No Collins key yet. Add COLLINS_API_KEY to .env.local; next dev picks it up."
      : error.error === "bad-key"
        ? `Collins refused the key (${error.status}). Check COLLINS_API_KEY in .env.local.`
        : `Collins didn’t answer${error.status ? ` (${error.status})` : ""}. Try again in a moment.`;
  return <p className="mt-3 rounded-row bg-sunken px-2.5 py-2 text-label text-text-2">{text}</p>;
}

function OutLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="relative inline-flex items-center gap-0.5 text-text-2 underline decoration-border-strong underline-offset-4 transition-colors duration-150 before:absolute before:-inset-x-1 before:-inset-y-2 hover:text-text hover:decoration-current"
    >
      {children}
      <ArrowUpRightIcon className="size-3" aria-hidden />
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

/** Collins' entry markup, rebuilt from a whitelist: structure and classes only. */
function EntryHtml({ html, lang }: { html: string; lang: string }) {
  const clean = useMemo(() => sanitize(html), [html]);
  return <div className="collins-entry mt-2" lang={lang} dangerouslySetInnerHTML={{ __html: clean }} />;
}

const KEEP = new Set(["div", "span", "p", "ol", "ul", "li", "em", "i", "strong", "b", "h1", "h2", "h3", "h4", "sup", "sub", "br"]);
const DROP = new Set(["script", "style", "audio", "video", "img", "iframe", "object", "embed", "link", "meta", "button", "input", "form", "svg", "noscript", "template"]);

function sanitize(html: string) {
  const source = new DOMParser().parseFromString(html, "text/html").body;
  const out = document.createElement("div");
  const copy = (from: Node, to: Node) => {
    for (const node of from.childNodes) {
      if (node.nodeType === Node.TEXT_NODE) {
        to.appendChild(document.createTextNode(node.textContent ?? ""));
      } else if (node instanceof Element) {
        const tag = node.tagName.toLowerCase();
        if (DROP.has(tag)) continue;
        // Links and unknown tags keep their text but lose the element.
        const el = KEEP.has(tag) ? document.createElement(tag) : document.createElement("span");
        const cls = node.getAttribute("class");
        if (cls) el.setAttribute("class", cls);
        copy(node, el);
        to.appendChild(el);
      }
    }
  };
  copy(source, out);
  return out.innerHTML;
}
