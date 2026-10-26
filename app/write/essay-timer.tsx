"use client";

import { PauseIcon, PlayIcon, SquareIcon, TimerIcon, XIcon } from "lucide-react";
import { useEffect, useId, useLayoutEffect, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import {
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

// The essay's timer, in the app bar: off until the writer starts it, with
// minutes to count down or none to count up (timer.ts). It stops itself at
// 0:00, or after 4 hours counting up. It lives in this component only:
// closing the window or leaving the essay ends it, and nothing is saved, so
// no clock is ever left running in storage. (Leaving doesn't unmount it:
// with Cache Components, Next hides the route in <Activity> and keeps its
// state, so the timer clears itself when hidden.)

const MAX_MINUTES = 600;

export function EssayTimer() {
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

  if (!timer) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <Tooltip>
          <TooltipTrigger
            render={<PopoverTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Timer" />} />}
          >
            <TimerIcon />
          </TooltipTrigger>
          <TooltipContent>Timer</TooltipContent>
        </Tooltip>
        <PopoverContent align="end" className="w-64">
          <StartForm
            onStart={(minutes) => {
              setTimer(startTimer(minutes === null ? null : minutes * 60_000, Date.now()));
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
    );
  }

  const countingDown = timer.limitMs !== null;
  const shown = now === null ? (timer.limitMs ?? 0) : reading(timer, now);
  const paused = timer.pausedAt !== null;

  return (
    <span className="flex items-center gap-1">
      <span
        role="timer"
        aria-label={paused ? `${speakClock(shown, countingDown)}, paused` : speakClock(shown, countingDown)}
        className={cn(
          "mr-1 text-label tabular-nums",
          paused ? "text-text-3" : "text-text-2",
          now !== null && (isWarning(timer, now) || (done && countingDown)) && "text-warn",
        )}
      >
        {formatClock(shown, countingDown)}
      </span>
      {!done && (
        <IconAction
          label={paused ? "Resume timer" : "Pause timer"}
          tip={paused ? "Resume" : "Pause"}
          onClick={() => setTimer((t) => t && (paused ? resume(t, Date.now()) : pause(t, Date.now())))}
        >
          {paused ? <PlayIcon /> : <PauseIcon />}
        </IconAction>
      )}
      <IconAction label={done ? "Clear timer" : "Stop timer"} tip={done ? "Clear" : "Stop"} onClick={() => setTimer(null)}>
        {done ? <XIcon /> : <SquareIcon />}
      </IconAction>
      <Announcer timer={timer} now={now} />
    </span>
  );
}

function StartForm({ onStart }: { onStart: (minutes: number | null) => void }) {
  const id = useId();
  const [value, setValue] = useState("");
  const minutes = value.trim() === "" ? null : Number(value);
  const valid = minutes === null || (Number.isInteger(minutes) && minutes >= 1 && minutes <= MAX_MINUTES);

  return (
    <form
      className="grid gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) onStart(minutes);
      }}
    >
      <PopoverHeader>
        <PopoverTitle>Timer</PopoverTitle>
        <PopoverDescription>Set minutes to count down, or leave it empty to count up</PopoverDescription>
      </PopoverHeader>
      <div className="grid gap-1.5">
        <label htmlFor={id} className="text-label text-text-2">
          Minutes
        </label>
        <Input
          id={id}
          type="number"
          inputMode="numeric"
          min={1}
          max={MAX_MINUTES}
          step={1}
          placeholder="No limit"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          aria-invalid={!valid || undefined}
          aria-describedby={valid ? undefined : `${id}-error`}
        />
        {!valid && (
          <p id={`${id}-error`} className="text-caption text-warn">
            Whole minutes, 1 to {MAX_MINUTES}
          </p>
        )}
      </div>
      <Button type="submit" size="sm" disabled={!valid}>
        Start
      </Button>
    </form>
  );
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

// One shared clock, ticking just after each second boundary so the display
// changes in step with real seconds, and only while a timer is running.
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
