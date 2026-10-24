"use client";

import { useSyncExternalStore } from "react";

import { createLocalStore } from "./local-store";
import { IDLE, parseTimer, pause, resume, start, type TimerState } from "./timer";

// The run's timer, saved the moment it changes: a mock run's clock must keep
// running from its real start time if the page is closed and reopened.
const timers = createLocalStore<TimerState>({
  prefix: "ink:timer",
  parse: parseTimer,
  serialize: (s) => JSON.stringify(s),
  fallback: () => IDLE,
  saveDelayMs: 0,
});

/** The run's timer state, or `null` until the client has hydrated. */
export const useTimerState = timers.useValue;

// Actions read the clock here, outside components, so renders stay pure.
export const startTimer = (id: string) => timers.write(id, start(timers.read(id), Date.now()));
export const pauseTimer = (id: string) => timers.write(id, pause(timers.read(id), Date.now()));
export const resumeTimer = (id: string) => timers.write(id, resume(timers.read(id), Date.now()));

// One shared clock for every subscriber, ticking just after each second
// boundary so the display changes in step with real seconds.
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

/** The current time, updated every second; `null` during server render. */
export function useNow(): number | null {
  return useSyncExternalStore(
    subscribeToClock,
    () => current,
    () => null,
  );
}
