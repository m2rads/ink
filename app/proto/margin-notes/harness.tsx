"use client";

import "./picker.css";

import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";

import { AppBar } from "@/components/app-bar";
import { TruncateWords } from "@/components/truncate-words";
import { Separator } from "@/components/ui/separator";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ReviewProgress } from "@/app/write/review";
import { countWords } from "@/app/write/blocks";
import { matchesAccepted } from "@/lib/ai/correction";

import { Correction, type NoteStyle } from "./correction";
import { INITIAL, INITIAL_ACTIVE, TITLE, type ProtoMistake } from "./data";

// Throwaway: /proto/margin-notes. Where Margin's notes sit when one paragraph
// has many (decision pending, see AGENTS.md "Correction view"). The review
// screen as it renders in production, with a copy of the correction compound
// (./correction.tsx) whose `noteStyle` picks the direction. The picker
// switches it (1–4, ←/→); the essay's state is shared, so fixes carry across.
// Reload to get the worst case back. Nothing outside this folder imports it.

const VARIANTS: { name: string; style: NoteStyle }[] = [
  { name: "Current", style: "current" },
  { name: "Aligned", style: "aligned" },
  { name: "Folded", style: "folded" },
  { name: "Chips", style: "chips" },
];

const noop = () => () => {};

export function Harness() {
  const mounted = useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
  const [current, setCurrent] = useState(() => {
    if (typeof window === "undefined") return 0;
    const v = parseInt(new URLSearchParams(location.search).get("v") ?? "", 10);
    return v >= 1 && v <= VARIANTS.length ? v - 1 : 0;
  });
  const [blocks, setBlocks] = useState(INITIAL.blocks);
  const [mistakes, setMistakes] = useState<ProtoMistake[]>(INITIAL.mistakes);
  const [activeId, setActiveId] = useState<string | null>(INITIAL_ACTIVE);

  function select(i: number) {
    if (i < 0 || i >= VARIANTS.length) return;
    setCurrent(i);
    const url = new URL(location.href);
    url.searchParams.set("v", String(i + 1));
    history.replaceState(null, "", url);
  }

  function patch(id: string, p: Partial<ProtoMistake>) {
    setMistakes((list) => list.map((m) => (m.id === id ? { ...m, ...p } : m)));
  }

  // Writes the fix into its paragraph and shifts the marks after it.
  function fix(id: string, final: string, how: "fixed" | "revealed") {
    const m = mistakes.find((x) => x.id === id)!;
    const delta = final.length - (m.end - m.start);
    setBlocks((bs) =>
      bs.map((b) => (b.id === m.blockId ? { ...b, text: b.text.slice(0, m.start) + final + b.text.slice(m.end) } : b)),
    );
    setMistakes((list) =>
      list.map((x) => {
        if (x.id === id) return { ...x, end: x.start + final.length, status: how };
        if (x.blockId === m.blockId && x.start > m.start) return { ...x, start: x.start + delta, end: x.end + delta };
        return x;
      }),
    );
  }

  if (!mounted) return null;
  const { style } = VARIANTS[current];
  const done = mistakes.filter((m) => m.status === "fixed" || m.status === "revealed").length;
  const words = countWords(blocks);

  return (
    <TooltipProvider>
      <AppBar>
        <p className="flex min-w-0 flex-1 items-baseline gap-1 py-3.5 text-label text-text-3">
          <span className="shrink-0">Home</span>
          <span aria-hidden>/</span>
          <TruncateWords text={TITLE} lang="fr" className="text-text" />
        </p>
        <div className="flex h-4 shrink-0 items-center gap-3 text-label text-text-3">
          <ReviewProgress done={done} total={mistakes.length} />
          <Separator orientation="vertical" className="max-sm:hidden" />
          <span className="max-sm:hidden">{words} words</span>
        </div>
      </AppBar>

      <main className="mx-auto w-full max-w-3xl px-4 pb-40 sm:px-10">
        <Correction
          key={current}
          noteStyle={style}
          mistakes={mistakes}
          activeId={activeId}
          onActiveIdChange={setActiveId}
          onCheck={async (id, attempt) => {
            await new Promise((r) => setTimeout(r, 450));
            const m = mistakes.find((x) => x.id === id)!;
            return matchesAccepted(attempt, m.accept)
              ? { correct: true, feedback: "" }
              : { correct: false, feedback: "" };
          }}
          onFix={fix}
          onChange={patch}
        >
          <Correction.Layout>
            <h1 lang="fr" className="mt-9 mb-6 block w-full max-w-prose py-1 font-serif text-essay-title text-wrap">
              {TITLE}
            </h1>
            <Correction.Header>
              <Correction.Aside className="grid gap-3">
                <p className="text-label text-text-3">
                  <span className="pointer-coarse:hidden">Click</span>
                  <span className="hidden pointer-coarse:inline">Tap</span> a highlight to fix it.
                </p>
                <Correction.Filters />
              </Correction.Aside>
            </Correction.Header>
            <div className="flex flex-col gap-y-[1lh] font-serif text-essay">
              {blocks.map((b) => (
                <Correction.Row key={b.id}>
                  <Correction.Paragraph blockId={b.id} text={b.text} />
                  <Correction.Notes blockId={b.id} />
                </Correction.Row>
              ))}
            </div>
          </Correction.Layout>
        </Correction>
      </main>
      <Picker names={VARIANTS.map((v) => v.name)} current={current} onSelect={select} />
    </TooltipProvider>
  );
}

function Picker({ names, current, onSelect }: { names: string[]; current: number; onSelect: (i: number) => void }) {
  const nav = useRef<HTMLElement>(null);
  const highlight = useRef<HTMLSpanElement>(null);
  const items = useRef<(HTMLButtonElement | null)[]>([]);

  useLayoutEffect(() => {
    const move = () => {
      const el = items.current[current];
      if (!el || !highlight.current) return;
      highlight.current.style.width = `${el.offsetWidth}px`;
      highlight.current.style.transform = `translateX(${el.offsetLeft}px)`;
    };
    move();
    window.addEventListener("resize", move);
    return () => window.removeEventListener("resize", move);
  }, [current]);

  useEffect(() => {
    const id = requestAnimationFrame(() => requestAnimationFrame(() => nav.current?.setAttribute("data-ready", "")));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= names.length) onSelect(n - 1);
      else if (e.key === "ArrowRight") onSelect((current + 1) % names.length);
      else if (e.key === "ArrowLeft") onSelect((current - 1 + names.length) % names.length);
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  });

  return (
    <nav ref={nav} className="proto-picker" aria-label="Prototype variants">
      <span ref={highlight} className="proto-picker-highlight" aria-hidden="true" />
      {names.map((name, i) => (
        <button
          key={name}
          ref={(el) => {
            items.current[i] = el;
          }}
          className="proto-picker-item"
          data-active={i === current ? "" : undefined}
          aria-current={i === current ? "true" : undefined}
          onClick={() => onSelect(i)}
        >
          {name}
        </button>
      ))}
    </nav>
  );
}
