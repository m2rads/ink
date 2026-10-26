"use client";

import "./picker.css";

import { createContext, use, useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";

import { AppBar } from "@/components/app-bar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { countWords, type Block } from "@/app/write/blocks";
import { EssayEditor } from "@/app/write/essay-editor";
import { cn } from "@/lib/utils";

import { ESSAY_BLOCKS, ESSAY_TITLE } from "./data";
import { Pair } from "./pair";

// Throwaway: /proto/dictionary. Margin with the Pair language setting won
// (decision in AGENTS.md). This round compares sources: real Collins entries
// through ./collins/route.ts against the hand-written sample, behind the
// prototype picker (1–2, ←/→). Nothing outside this folder imports from it;
// delete the folder once the dictionary is built.

const VARIANTS = [
  { name: "Collins", Component: () => <Pair source="collins" /> },
  { name: "Sample data", Component: () => <Pair source="sample" /> },
];

type Proto = {
  blocks: Block[];
  setBlocks: (b: Block[]) => void;
  query: string;
  setQuery: (q: string) => void;
  recent: string[];
  remember: (word: string) => void;
  /** Back to where the writer was in the essay. */
  focusEssay: () => void;
  /** The learner's language (a LANGUAGES code), English until they choose. */
  lang: string;
  /** Whether they've chosen one yet. */
  langChosen: boolean;
  setLang: (code: string) => void;
};

const ProtoContext = createContext<Proto | null>(null);

const noop = () => () => {};

export function useProto() {
  const ctx = use(ProtoContext);
  if (!ctx) throw new Error("useProto outside the harness");
  return ctx;
}

export function Harness() {
  // Client only: the variants read the window, and ?v= picks the variant.
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
  const [blocks, setBlocks] = useState(ESSAY_BLOCKS);
  const [query, setQuery] = useState("");
  const [recent, setRecent] = useState<string[]>([]);
  // Shared by the variants, so switching keeps the choice. Not persisted, so
  // a reload shows Ask once's question again.
  const [chosen, setChosen] = useState<string | null>(null);
  const lastField = useRef<HTMLTextAreaElement | null>(null);

  // Remember the last essay paragraph that had focus.
  useEffect(() => {
    const track = (e: FocusEvent) => {
      if (e.target instanceof HTMLTextAreaElement && e.target.closest("#proto-essay")) lastField.current = e.target;
    };
    document.addEventListener("focusin", track);
    return () => document.removeEventListener("focusin", track);
  }, []);

  const remember = useCallback((word: string) => {
    if (!word) return;
    setRecent((r) => [word, ...r.filter((w) => w.toLowerCase() !== word.toLowerCase())].slice(0, 6));
  }, []);

  const focusEssay = useCallback(() => {
    const el = lastField.current?.isConnected
      ? lastField.current
      : document.querySelector<HTMLTextAreaElement>("#proto-essay textarea");
    el?.focus();
  }, []);

  function select(i: number) {
    if (i < 0 || i >= VARIANTS.length) return;
    setCurrent(i);
    const url = new URL(location.href);
    url.searchParams.set("v", String(i + 1));
    history.replaceState(null, "", url);
  }

  if (!mounted) return null;
  const { Component } = VARIANTS[current];

  return (
    <ProtoContext
      value={{
        blocks,
        setBlocks,
        query,
        setQuery,
        recent,
        remember,
        focusEssay,
        lang: chosen ?? "en",
        langChosen: chosen !== null,
        setLang: setChosen,
      }}
    >
      <TooltipProvider>
        <Component key={current} />
      </TooltipProvider>
      <Picker names={VARIANTS.map((v) => v.name)} current={current} onSelect={select} />
    </ProtoContext>
  );
}

/** The essay screen's bar: crumb on the left (after `lead`), word count on the right. */
export function ProtoAppBar({ lead }: { lead?: React.ReactNode }) {
  const { blocks } = useProto();
  const words = countWords(blocks);
  return (
    <AppBar>
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {lead}
        <p className="flex min-w-0 items-baseline gap-1 text-label text-text-3">
          <span className="shrink-0">Home</span>
          <span aria-hidden>/</span>
          <span lang="fr" className="truncate text-text">
            {ESSAY_TITLE}
          </span>
        </p>
      </div>
      <span className="shrink-0 text-label text-text-3">{words.toLocaleString("en")} words</span>
    </AppBar>
  );
}

/** The essay column exactly as the writing screen lays it out. `beside` is placed relative to the column. */
export function Essay({ beside, className }: { beside?: React.ReactNode; className?: string }) {
  const { blocks, setBlocks } = useProto();
  return (
    <main id="proto-essay" className={cn("relative mx-auto w-full max-w-3xl px-4 sm:px-10", className)}>
      {beside}
      <h1 lang="fr" className="mt-9 block w-full max-w-prose py-1 font-serif text-essay-title text-balance">
        {ESSAY_TITLE}
      </h1>
      <EssayEditor
        value={blocks}
        onValueChange={setBlocks}
        aria-label="Your essay"
        placeholder="Écrivez ici…"
        className="mt-6 max-w-prose min-h-96 pb-40"
      />
    </main>
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
