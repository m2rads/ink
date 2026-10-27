"use client";

import { useLayoutEffect, useRef } from "react";

import { cn } from "@/lib/utils";

// One line of text that, when it's too long, ends on a whole word and an
// ellipsis ("Le télétravail devrait-il…"), never mid-word ("…devrait-il dev…")
// as CSS text-overflow does. Use it instead of `truncate` for any text a
// person wrote or reads: titles, prompts, rules. `keepLastWord` keeps the
// text's last word after the ellipsis ("Toutes les étudiants… diplôme"), for
// titles, whose end often says what they're about.
//
// The visible line is fitted by measuring it in place, again whenever its
// width changes. Until then (server render, before hydration) it falls back
// to CSS's character ellipsis, so nothing flashes. Screen readers always get
// the full text, and hovering a shortened line shows it.

export function TruncateWords({
  text,
  keepLastWord = false,
  className,
  ...props
}: Omit<React.ComponentProps<"span">, "children"> & { text: string; keepLastWord?: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => {
      el.textContent = fitWords(
        text,
        (candidate) => {
          el.textContent = candidate;
          return el.scrollWidth <= el.clientWidth;
        },
        keepLastWord,
      );
      el.title = el.textContent === text ? "" : text;
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(el);
    document.fonts?.ready.then(fit);
    return () => observer.disconnect();
  }, [text, keepLastWord]);

  return (
    // Takes all the room it's given (flex-1 in a row), never its text's width:
    // sized by its text, it would shrink to the shortened line and never
    // notice when more room frees up.
    <span className={cn("block min-w-0 flex-1", className)} {...props}>
      {/* React never touches this line's text after the first render (it's
          set as HTML, which React only replaces when `text` changes), so the
          fitting above can rewrite it freely. */}
      <span
        ref={ref}
        aria-hidden
        className="block overflow-hidden text-ellipsis whitespace-nowrap"
        dangerouslySetInnerHTML={{ __html: escapeHtml(text) }}
      />
      <span className="sr-only">{text}</span>
    </span>
  );
}

/**
 * The longest whole-word start of `text` that `fits`, ending in "…"; `text`
 * itself if it fits whole. Punctuation and dashes left before the ellipsis are
 * dropped ("la norme,…" → "la norme…"). With `keepLastWord`, the last word
 * follows the ellipsis ("la norme… diplôme"), until even one word before it
 * doesn't fit; then it's left off. If not even the first word fits, returns
 * `text` and lets CSS cut that word: there's no boundary to end on.
 */
export function fitWords(text: string, fits: (candidate: string) => boolean, keepLastWord = false): string {
  if (fits(text)) return text;
  const words = text.trim().split(/\s+/);
  // A last "word" that's only punctuation (French's spaced "?") keeps the word before it.
  const tail = /[\p{L}\p{N}]/u.test(words[words.length - 1]) ? 1 : 2;
  if (keepLastWord && words.length > tail + 1) {
    const last = words.slice(-tail).join(" ");
    const kept = longestFit(words.length - tail - 1, (n) => `${clip(words, n)} ${last}`, fits);
    if (kept) return kept;
  }
  return longestFit(words.length - 1, (n) => clip(words, n), fits) || text;
}

/** The candidate for the most words (1 to `max`) that fits, or "". */
function longestFit(max: number, candidateFor: (n: number) => string, fits: (candidate: string) => boolean) {
  let lo = 1;
  let hi = max;
  let best = "";
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    const candidate = candidateFor(mid);
    if (fits(candidate)) {
      best = candidate;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return best;
}

function clip(words: string[], count: number) {
  return `${words.slice(0, count).join(" ").replace(/[\s,;:.!?\-–—/]+$/u, "")}…`;
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
