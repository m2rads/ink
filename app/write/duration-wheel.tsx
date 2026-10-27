"use client";

import "./duration-wheel.css";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";

import { cn } from "@/lib/utils";

import { tick, wake } from "./wheel-tick";

// The essay timer's start form (essay-timer.tsx), a minimal take on the iOS
// timer's wheels: hours, minutes and seconds, each a column that scrolls and
// snaps, read on one shared band in the middle. No 3D drum: rows fade and
// shrink away from the band (duration-wheel.css). Each value that crosses
// the band ticks (wheel-tick.ts). Scroll, swipe, drag with the mouse (it
// flings), click a value, or focus a column and type its value or use ↑/↓
// (Page Up/Down by 5, Home/End); Enter submits. Nothing per frame goes
// through React: scrolling and dragging write scrollTop, and state changes
// only when a new value reaches the band.

const ROW = 32; // h-8
const PAD = ROW * 2; // two rows above and below the band: five in view

/** A duration on three wheels, in whole seconds. */
export function DurationWheel({
  value,
  onValueChange,
  onEnter,
  className,
}: {
  value: number;
  onValueChange: (seconds: number) => void;
  onEnter?: () => void;
  className?: string;
}) {
  const h = Math.floor(value / 3600);
  const m = Math.floor((value % 3600) / 60);
  const s = value % 60;

  // The click that opened the popover lets most browsers start audio now;
  // the rest start on the first press inside.
  useEffect(wake, []);

  return (
    <div
      className={cn("relative flex justify-center", className)}
      onPointerDown={wake}
      onKeyDown={wake}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-1/2 h-8 -translate-y-1/2 rounded-row bg-sunken"
      />
      <Wheel count={24} value={h} unit="h" label="Hours" onEnter={onEnter} onValueChange={(x) => onValueChange(x * 3600 + m * 60 + s)} />
      <Wheel count={60} value={m} unit="min" label="Minutes" onEnter={onEnter} onValueChange={(x) => onValueChange(h * 3600 + x * 60 + s)} />
      <Wheel count={60} value={s} unit="s" label="Seconds" onEnter={onEnter} onValueChange={(x) => onValueChange(h * 3600 + m * 60 + x)} />
    </div>
  );
}

function Wheel({
  count,
  value,
  unit,
  label,
  onValueChange,
  onEnter,
}: {
  count: number;
  value: number;
  unit: string;
  label: string;
  onValueChange: (value: number) => void;
  onEnter?: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  /** The value on the band right now, ahead of React. */
  const shown = useRef(value);
  /** Where keys or a fling are taking it, while a smooth scroll is on its way. */
  const aim = useRef<number | null>(null);
  /** Digits typed so far, and when the last one came. */
  const typing = useRef<{ digits: string; at: number } | null>(null);
  /** A mouse drag in progress: where it started and its last few moves, for the fling. */
  const drag = useRef<{ id: number; y: number; top: number; moved: boolean; trail: { t: number; y: number }[] } | null>(null);

  // Opens on its value; after that the scroll position is the value.
  useLayoutEffect(() => {
    ref.current!.scrollTop = shown.current * ROW;
  }, []);

  // The rows never change, so the band's emphasis (duration-wheel.css) is
  // all that moves while scrolling, and a new value re-renders none of them.
  const rows = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          data-i={i}
          className="wheel-row flex h-8 snap-center items-center justify-end pr-1 text-body tabular-nums"
        >
          {i}
        </div>
      )),
    [count],
  );

  const clamp = (i: number) => Math.min(count - 1, Math.max(0, i));

  function go(i: number) {
    const el = ref.current!;
    if (Math.abs(el.scrollTop - clamp(i) * ROW) < 1) {
      // Already there: no scroll event will come to end the drag.
      aim.current = null;
      delete el.dataset.dragging;
      return;
    }
    aim.current = clamp(i);
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ top: aim.current * ROW, behavior: still ? "auto" : "smooth" });
  }

  function onScroll() {
    const el = ref.current!;
    const i = clamp(Math.round(el.scrollTop / ROW));
    // A fling keeps snapping off until it lands, so the browser doesn't snap it short.
    if (i === aim.current && Math.abs(el.scrollTop - i * ROW) < 1) {
      aim.current = null;
      delete el.dataset.dragging;
    }
    if (i === shown.current) return;
    shown.current = i;
    tick();
    onValueChange(i);
  }

  // Touch scrolls the column natively. A mouse drags it: scrollTop follows the
  // pointer with snapping off, and letting go flings on with the drag's speed
  // and lands on a row. A press that doesn't move picks the row under it.
  function onPointerDown(e: React.PointerEvent) {
    if (e.pointerType !== "mouse" || e.button !== 0) return;
    e.preventDefault(); // no text selection, no native drag
    const el = ref.current!;
    el.focus({ preventScroll: true });
    el.setPointerCapture(e.pointerId);
    drag.current = { id: e.pointerId, y: e.clientY, top: el.scrollTop, moved: false, trail: [{ t: e.timeStamp, y: e.clientY }] };
  }

  function onPointerMove(e: React.PointerEvent) {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dy = e.clientY - d.y;
    if (!d.moved && Math.abs(dy) < 3) return;
    const el = ref.current!;
    if (!d.moved) {
      d.moved = true;
      aim.current = null;
      el.dataset.dragging = "";
    }
    el.scrollTop = d.top - dy;
    d.trail.push({ t: e.timeStamp, y: e.clientY });
    if (d.trail.length > 5) d.trail.shift();
  }

  function onPointerUp(e: React.PointerEvent) {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    if (!d.moved) {
      const row = (e.target as HTMLElement).closest<HTMLElement>("[data-i]");
      if (row) go(Number(row.dataset.i));
      return;
    }
    // Speed over the last moves (px/ms), carried on for about 180ms of travel.
    const first = d.trail[0];
    const last = d.trail[d.trail.length - 1];
    const dt = Math.max(1, last.t - first.t);
    const speed = e.timeStamp - last.t > 80 ? 0 : (last.y - first.y) / dt;
    go(Math.round((ref.current!.scrollTop - speed * 180) / ROW));
  }

  function onKeyDown(e: React.KeyboardEvent) {
    const from = aim.current ?? shown.current;
    const to = { ArrowDown: from + 1, ArrowUp: from - 1, PageDown: from + 5, PageUp: from - 5, Home: 0, End: count - 1 }[e.key];
    if (to !== undefined) {
      e.preventDefault();
      go(to);
    } else if (/^[0-9]$/.test(e.key) && !e.metaKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      go(typed(e.key, e.timeStamp));
    } else if (e.key === "Enter") {
      e.preventDefault();
      onEnter?.();
    }
  }

  /**
   * Digits typed into a focused column set it, whatever it shows: "1" then
   * "5" within a second is 15. A digit that would go past the column's last
   * value starts over ("3" after "2" in hours is 23, but "4" is 4).
   */
  function typed(digit: string, at: number) {
    const t = typing.current;
    const joined = t && at - t.at < 1000 ? Number(t.digits + digit) : NaN;
    const next = joined < count ? t!.digits + digit : digit;
    typing.current = { digits: next, at };
    return Number(next);
  }

  return (
    <div className="group relative flex items-center">
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-1/2 h-8 -translate-y-1/2 rounded-row outline-2 outline-focus-ring opacity-0 group-has-focus-visible:opacity-100"
      />
      <div
        ref={ref}
        role="spinbutton"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={count - 1}
        aria-valuenow={value}
        aria-valuetext={`${value} ${unit}`}
        onScroll={onScroll}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{ paddingBlock: PAD }}
        className="wheel-scroller h-40 w-10 cursor-grab snap-y snap-mandatory overflow-y-scroll overscroll-contain outline-none select-none [scrollbar-width:none] data-dragging:cursor-grabbing data-dragging:snap-none [&::-webkit-scrollbar]:hidden"
      >
        {rows}
      </div>
      <span aria-hidden className="w-9 pl-0.5 text-label text-text-3 select-none">
        {unit}
      </span>
    </div>
  );
}
