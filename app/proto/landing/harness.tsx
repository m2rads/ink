"use client";

import "./landing.css";
import "./picker.css";

import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";

import { TooltipProvider } from "@/components/ui/tooltip";

import { EssayPage } from "./essay";
import { OneScreen } from "./one-screen";
import { forgetIntro } from "./parts";
import { Product } from "./product";
import { TryIt } from "./try-it";

// Throwaway: /proto/landing, mounted at / (app/page.tsx, PROTO:landing).
// Four marketing pages for Ink behind the prototype picker (1–4, ←/→, R
// replays the intro). Nothing outside this folder imports it but that mount;
// delete the folder and restore the redirect once one is picked.

const VARIANTS = [
  { name: "Product", Component: Product },
  { name: "Try it", Component: TryIt },
  { name: "Essay", Component: EssayPage },
  { name: "One screen", Component: OneScreen },
];

const noop = () => () => {};

export function Harness() {
  // Client only: ?v= picks the variant, and the intro reads sessionStorage.
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
  const [take, setTake] = useState(0);

  function select(i: number) {
    if (i < 0 || i >= VARIANTS.length) return;
    setCurrent(i);
    const url = new URL(location.href);
    url.searchParams.set("v", String(i + 1));
    history.replaceState(null, "", url);
    window.scrollTo({ top: 0 });
  }

  function replay() {
    forgetIntro();
    window.scrollTo({ top: 0 });
    setTake((t) => t + 1);
  }

  if (!mounted) return null;
  const { Component } = VARIANTS[current];

  return (
    <TooltipProvider>
      <Component key={`${current}:${take}`} />
      <Picker
        names={VARIANTS.map((v) => v.name)}
        current={current}
        onSelect={select}
        onReplay={replay}
        // One screen fills the bottom of the window; the picker moves up out of its way.
        top={VARIANTS[current].name === "One screen"}
      />
    </TooltipProvider>
  );
}

function Picker({
  names,
  current,
  onSelect,
  onReplay,
  top,
}: {
  top: boolean;
  names: string[];
  current: number;
  onSelect: (i: number) => void;
  onReplay: () => void;
}) {
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
      else if (e.key === "r" || e.key === "R") onReplay();
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  });

  return (
    <nav ref={nav} className="proto-picker" data-position={top ? "top" : undefined} aria-label="Prototype variants">
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
      <span className="proto-picker-divider" aria-hidden="true" />
      <button className="proto-picker-item proto-picker-replay" aria-label="Replay animation (R)" onClick={onReplay}>
        ↻
      </button>
    </nav>
  );
}
