"use client";

import "./picker.css";

import { createContext, use, useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";

import { AppBar } from "@/components/app-bar";
import { TruncateWords } from "@/components/truncate-words";
import { TooltipProvider } from "@/components/ui/tooltip";
import { countWords, type Block } from "@/app/write/blocks";
import { EssayEditor } from "@/app/write/essay-editor";
import { cn } from "@/lib/utils";

import { label } from "./conjugate";
import { ESSAY, ESSAY_TITLE, SAMPLE_SELECTIONS, VERBS } from "./data";
import { Entry } from "./entry";
import { Pairs } from "./pairs";
import { ByPerson } from "./person";
import { Reference } from "./reference";
import { Selection } from "./selection";

// Throwaway: /proto/conjugation. Five directions for verb conjugation in the
// essay's writing view, on hand-written tables (data.ts) for seven verbs.
// The picker switches directions (1–5, ←/→ when no field has focus); the note
// at the top right picks a verb, or lists forms to select in the essay.
// Nothing outside this folder imports it; delete the folder once a direction
// is picked and written down in AGENTS.md.

const VARIANTS = [
  { name: "Entry", Component: Entry, selects: false },
  { name: "Reference", Component: Reference, selects: false },
  { name: "Selection", Component: Selection, selects: true },
  { name: "Person", Component: ByPerson, selects: false },
  { name: "Pairs", Component: Pairs, selects: false },
];

type Proto = {
  blocks: Block[];
  setBlocks: (b: Block[]) => void;
  query: string;
  setQuery: (q: string) => void;
  focusEssay: () => void;
};

const ProtoContext = createContext<Proto | null>(null);

export function useProto() {
  const ctx = use(ProtoContext);
  if (!ctx) throw new Error("useProto outside the harness");
  return ctx;
}

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
  const [blocks, setBlocks] = useState(ESSAY);
  const [query, setQuery] = useState("aller");
  const lastField = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const track = (e: FocusEvent) => {
      if (e.target instanceof HTMLTextAreaElement && e.target.closest("#proto-essay")) lastField.current = e.target;
    };
    document.addEventListener("focusin", track);
    return () => document.removeEventListener("focusin", track);
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
  const { Component, selects } = VARIANTS[current];

  return (
    <ProtoContext value={{ blocks, setBlocks, query, setQuery, focusEssay }}>
      <TooltipProvider>
        <Component key={current} />
      </TooltipProvider>
      <aside className="proto-note" aria-label="Prototype notes">
        {selects ? (
          <>
            <p className="proto-note-title">Select in the essay</p>
            <ul>
              {SAMPLE_SELECTIONS.map((s) => (
                <li key={s} lang="fr">
                  {s}
                </li>
              ))}
            </ul>
          </>
        ) : (
          <>
            <p className="proto-note-title">Verb</p>
            <div className="proto-note-row flex-wrap">
              {VERBS.map((v) => (
                <button
                  key={v.inf}
                  lang="fr"
                  className="proto-picker-item"
                  data-active={query === label(v) ? "" : undefined}
                  onClick={() => setQuery(label(v))}
                >
                  {label(v)}
                </button>
              ))}
            </div>
            <p className="proto-note-title mt-3">Or type a form</p>
            <div className="proto-note-row flex-wrap">
              {["allions", "j’irais", "paie", "suis allé", "nous levions"].map((f) => (
                <button key={f} lang="fr" className="proto-picker-item" onClick={() => setQuery(f)}>
                  {f}
                </button>
              ))}
            </div>
          </>
        )}
      </aside>
      <Picker names={VARIANTS.map((v) => v.name)} current={current} onSelect={select} />
    </ProtoContext>
  );
}

/** The essay screen's bar: crumb on the left (after `lead`), word count on the right. */
export function ProtoAppBar({ lead }: { lead?: React.ReactNode }) {
  const { blocks } = useProto();
  return (
    <AppBar>
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {lead}
        <p className="flex min-w-0 flex-1 items-baseline gap-1 text-label text-text-3">
          <span className="shrink-0">Home</span>
          <span aria-hidden>/</span>
          <TruncateWords text={ESSAY_TITLE} lang="fr" keepLastWord className="text-text" />
        </p>
      </div>
      <span className="shrink-0 text-label text-text-3">{countWords(blocks).toLocaleString("en")} words</span>
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
      // Arrow keys belong to the tabs, toggles and menus of the variants.
      if (t.closest('[role="tablist"],[role="group"],[role="menu"],[data-slot="toggle-group"]')) return;
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
