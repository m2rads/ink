"use client";

import { PauseIcon, PlayIcon, SquareIcon, TimerIcon, XIcon } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { DurationWheel } from "./duration-wheel";
import {
  elapsed,
  formatClock,
  isDone,
  isWarning,
  pause,
  reading,
  resume,
  speakClock,
  startTimer,
  type Timer,
} from "./timer";

// The essay's timer, Edge (AGENTS.md, Timer): off until the writer starts
// it, from wheels for hours, minutes and seconds (all zero counts up). It
// shows as a line, not numbers: running, the app bar's bottom edge is a fuse
// that burns down toward 0:00 (counting up, it fills over the first hour).
// The numbers are on the timer icon's tooltip and in its popover; Pause/
// Resume sits beside the icon, Stop is in the popover. Coffee mode (`quiet`)
// fades the buttons and leaves the line.
//
// It stops itself at 0:00, or after 4 hours counting up. It lives in this
// component only: closing the window or leaving the essay ends it, and
// nothing is saved, so no clock is ever left running in storage. (Leaving
// doesn't unmount it: with Cache Components, Next hides the route in
// <Activity> and keeps its state, so the timer clears itself when hidden.)
//
// Render it in the AppBar: the line is positioned against the bar's sticky
// <header>, so nothing between them may be positioned.

const HOUR = 60 * 60_000;

/** The duration last started, so the wheels open where they were left. */
let lastSeconds = 0;

export function EssayTimer({ quiet = false }: { quiet?: boolean }) {
  const [timer, setTimer] = useState<Timer | null>(null);
  const [open, setOpen] = useState(false);
  const now = useNow(timer !== null && timer.pausedAt === null);
  const done = timer !== null && now !== null && isDone(timer, now);

  // Leaving the essay hides this route rather than unmounting it; end the timer then.
  useLayoutEffect(
    () => () => {
      setTimer(null);
      setOpen(false);
    },
    [],
  );

  // Said once when it stops by itself.
  useEffect(() => {
    if (!done || !timer) return;
    toast(timer.limitMs === null ? "Timer stopped after 4 hours" : "Time’s up");
  }, [done, timer]);

  const toggle = () => setTimer((t) => t && (t.pausedAt === null ? pause(t, Date.now()) : resume(t, Date.now())));
  const stop = () => {
    setTimer(null);
    setOpen(false);
  };

  const view = timer && now !== null ? describe(timer, now) : null;
  const tip = !view
    ? "Timer"
    : view.done
      ? view.countingDown
        ? "Time’s up"
        : "Stopped at 4 h"
      : `${view.clock} ${view.paused ? "paused" : view.countingDown ? "left" : "so far"}`;

  return (
    <>
      <div
        className={cn(
          "flex items-center gap-2 transition-[opacity,visibility] duration-200 ease-out",
          quiet && "invisible opacity-0",
        )}
      >
        {view && !view.done && (
          <IconAction label={view.paused ? "Resume timer" : "Pause timer"} tip={view.paused ? "Resume" : "Pause"} onClick={toggle}>
            {view.paused ? <PlayIcon /> : <PauseIcon />}
          </IconAction>
        )}
        <Popover open={open} onOpenChange={setOpen}>
          <Tooltip>
            <TooltipTrigger
              render={
                <PopoverTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={view ? `Timer, ${view.spoken}` : "Timer"}
                      className={cn(view?.warn && "text-warn hover:text-warn")}
                    />
                  }
                />
              }
            >
              <TimerIcon />
            </TooltipTrigger>
            <TooltipContent>{tip}</TooltipContent>
          </Tooltip>
          <PopoverContent align="end" className="w-60">
            {view ? (
              <RunPanel view={view} onToggle={toggle} onStop={stop} />
            ) : (
              <>
                <PopoverTitle>Timer</PopoverTitle>
                <StartForm
                  onStart={(seconds) => {
                    setTimer(startTimer(seconds === 0 ? null : seconds * 1000, Date.now()));
                    setOpen(false);
                  }}
                />
              </>
            )}
          </PopoverContent>
        </Popover>
      </div>
      {timer && view && <Fuse timer={timer} paused={view.paused} warn={view.warn} />}
      {timer && <Announcer timer={timer} now={now} />}
    </>
  );
}

/** What the buttons and popover need from a running timer. */
function describe(timer: Timer, now: number) {
  const countingDown = timer.limitMs !== null;
  const shown = reading(timer, now);
  const done = isDone(timer, now);
  const paused = timer.pausedAt !== null;
  return {
    countingDown,
    done,
    paused,
    limitMs: timer.limitMs,
    warn: isWarning(timer, now) || (done && countingDown),
    clock: formatClock(shown, countingDown),
    spoken: paused ? `${speakClock(shown, countingDown)}, paused` : speakClock(shown, countingDown),
  };
}

type View = ReturnType<typeof describe>;

function StartForm({ onStart }: { onStart: (seconds: number) => void }) {
  const form = useRef<HTMLFormElement>(null);
  const [seconds, setSeconds] = useState(lastSeconds);

  return (
    <form
      ref={form}
      className="grid gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        lastSeconds = seconds;
        onStart(seconds);
      }}
    >
      <DurationWheel value={seconds} onValueChange={setSeconds} onEnter={() => form.current?.requestSubmit()} />
      <Button type="submit" size="xs" className="justify-self-end">
        {seconds === 0 ? "Count up" : "Start"}
      </Button>
    </form>
  );
}

/** The running timer: its time and limit, then Pause/Resume and Stop. */
function RunPanel({ view, onToggle, onStop }: { view: View; onToggle: () => void; onStop: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="grid">
        <span
          role="timer"
          aria-label={view.spoken}
          className={cn("text-title tabular-nums", view.paused && "text-text-3", view.warn && "text-warn")}
        >
          {view.clock}
        </span>
        <span className="text-caption text-text-3">{state(view)}</span>
      </div>
      <div className="flex gap-2">
        {!view.done && (
          <IconAction label={view.paused ? "Resume timer" : "Pause timer"} tip={view.paused ? "Resume" : "Pause"} onClick={onToggle}>
            {view.paused ? <PlayIcon /> : <PauseIcon />}
          </IconAction>
        )}
        <IconAction label={view.done ? "Clear timer" : "Stop timer"} tip={view.done ? "Clear" : "Stop"} onClick={onStop}>
          {view.done ? <XIcon /> : <SquareIcon />}
        </IconAction>
      </div>
    </div>
  );
}

/** Under the time: the limit, or what state it's in. */
function state(view: View) {
  if (view.done) return view.countingDown ? "Time’s up" : "Stopped at 4 h";
  if (view.paused) return "Paused";
  return view.limitMs === null ? "No limit" : `of ${formatLimit(view.limitMs)}`;
}

/** 25 min, 1 h 30 min, 45 s. */
function formatLimit(ms: number) {
  const t = Math.round(ms / 1000);
  const parts = [
    [Math.floor(t / 3600), "h"],
    [Math.floor((t % 3600) / 60), "min"],
    [t % 60, "s"],
  ] as const;
  return parts
    .filter(([n]) => n > 0)
    .map(([n, unit]) => `${n} ${unit}`)
    .join(" ");
}

/**
 * The line over the app bar's bottom hairline; decorative, the icon carries
 * the numbers. One linear animation from now to its end, set up again only
 * when the timer starts, pauses, resumes or stops: no per-second updates, so
 * it moves continuously on the compositor instead of stepping with each tick.
 */
function Fuse({ timer, paused, warn }: { timer: Timer; paused: boolean; warn: boolean }) {
  const line = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const el = line.current!;
    const now = Date.now();
    // Spent at the limit (countdown), or full after an hour (count-up).
    const end = timer.startedAt + timer.pausedMs + (timer.limitMs ?? HOUR);
    if (timer.pausedAt !== null || now >= end) {
      el.style.scale = `${fuseAt(timer, now)} 1`;
      return;
    }
    const run = el.animate([{ scale: `${fuseAt(timer, now)} 1` }, { scale: `${fuseAt(timer, end)} 1` }], {
      duration: end - now,
      easing: "linear",
      fill: "forwards",
    });
    return () => run.cancel();
  }, [timer]);

  return (
    <span aria-hidden className="pointer-events-none absolute inset-x-0 -bottom-px h-0.5">
      <span
        ref={line}
        className={cn(
          "block h-full origin-left transition-[background-color] duration-300 ease-out",
          paused ? "bg-border-strong" : warn ? "bg-warn" : "bg-text-3",
        )}
      />
    </span>
  );
}

/** How much of the line shows at `t`: the time left of the limit, or the first hour used. */
function fuseAt(timer: Timer, t: number) {
  const used = elapsed(timer, t);
  return timer.limitMs === null ? Math.min(used / HOUR, 1) : 1 - used / timer.limitMs;
}

function IconAction({
  label,
  tip,
  onClick,
  children,
}: {
  label: string;
  tip: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger render={<Button variant="ghost" size="icon-xs" aria-label={label} onClick={onClick} />}>
        {children}
      </TooltipTrigger>
      <TooltipContent>{tip}</TooltipContent>
    </Tooltip>
  );
}

// Screen readers hear a countdown at 5 minutes and 1 minute left, not every
// second. Stopping by itself is a toast, which they hear too.
function Announcer({ timer, now }: { timer: Timer; now: number | null }) {
  let message = "";
  if (timer.limitMs !== null && now !== null && !isDone(timer, now)) {
    const left = reading(timer, now);
    if (left <= 60_000 && timer.limitMs > 60_000) message = "1 minute left.";
    else if (isWarning(timer, now)) message = "5 minutes left.";
  }
  return (
    <span className="sr-only" aria-live="polite">
      {message}
    </span>
  );
}

// One shared clock, ticking just after each second boundary so the tooltip
// and popover change in step with real seconds, and only while a timer runs.
let current = Date.now();
let tickTimeout: ReturnType<typeof setTimeout> | undefined;
const tickListeners = new Set<() => void>();

function tick() {
  current = Date.now();
  tickListeners.forEach((l) => l());
  tickTimeout = setTimeout(tick, 1000 - (current % 1000) + 5);
}

function subscribeToClock(listener: () => void) {
  tickListeners.add(listener);
  if (tickListeners.size === 1) tick();
  return () => {
    tickListeners.delete(listener);
    if (tickListeners.size === 0) clearTimeout(tickTimeout);
  };
}

const noSubscribe = () => () => {};

/** The current time, updated every second while `ticking`; null during server render. */
function useNow(ticking: boolean): number | null {
  return useSyncExternalStore(
    ticking ? subscribeToClock : noSubscribe,
    () => current,
    () => null,
  );
}
