"use client";

import { useCallback, useSyncExternalStore } from "react";

// A value per id, kept in memory and saved to localStorage, readable from
// React with useSyncExternalStore. The server render gets `null` (there's no
// storage on the server) and the client gets the saved value right after
// hydration, with no mismatch and no effect to load it. Writes notify
// subscribers at once and save after `saveDelayMs` (or when the page is
// hidden); another tab's writes come in through the `storage` event.

type Options<T> = {
  prefix: string;
  parse: (raw: string | null) => T | null;
  serialize: (value: T) => string;
  fallback: () => T;
  saveDelayMs: number;
};

export function createLocalStore<T>({ prefix, parse, serialize, fallback, saveDelayMs }: Options<T>) {
  const cache = new Map<string, T>();
  const listeners = new Map<string, Set<() => void>>();
  const pending = new Map<string, ReturnType<typeof setTimeout>>();
  const keyOf = (id: string) => `${prefix}:${id}`;

  function read(id: string): T {
    if (!cache.has(id)) cache.set(id, parse(safeGet(keyOf(id))) ?? fallback());
    return cache.get(id)!;
  }

  function persist(id: string) {
    clearTimeout(pending.get(id));
    pending.delete(id);
    if (!cache.has(id)) return;
    try {
      localStorage.setItem(keyOf(id), serialize(cache.get(id)!));
    } catch {
      // Storage full or blocked: the value stays in memory for this session.
    }
  }

  function write(id: string, value: T) {
    cache.set(id, value);
    listeners.get(id)?.forEach((l) => l());
    if (saveDelayMs === 0) {
      persist(id);
      return;
    }
    clearTimeout(pending.get(id));
    pending.set(id, setTimeout(() => persist(id), saveDelayMs));
  }

  function subscribe(id: string, listener: () => void) {
    let set = listeners.get(id);
    if (!set) listeners.set(id, (set = new Set()));
    set.add(listener);

    const onStorage = (e: StorageEvent) => {
      if (e.key !== keyOf(id)) return;
      cache.set(id, parse(e.newValue) ?? fallback());
      listener();
    };
    const onHide = () => {
      if (pending.has(id)) persist(id);
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("pagehide", onHide);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      set.delete(listener);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("pagehide", onHide);
      document.removeEventListener("visibilitychange", onHide);
    };
  }

  /** Forget `id`: drop it from storage, and subscribers get the fallback. */
  function remove(id: string) {
    clearTimeout(pending.get(id));
    pending.delete(id);
    cache.delete(id);
    try {
      localStorage.removeItem(keyOf(id));
    } catch {
      // Storage blocked: nothing was saved there either.
    }
    listeners.get(id)?.forEach((l) => l());
  }

  /** The stored value for `id`, or `null` until the client has hydrated. */
  function useValue(id: string): [T | null, (next: T) => void] {
    const value = useSyncExternalStore(
      useCallback((listener) => subscribe(id, listener), [id]),
      () => read(id),
      () => null,
    );
    const set = useCallback((next: T) => write(id, next), [id]);
    return [value, set];
  }

  /** Save `id` now instead of after the delay. */
  function flush(id: string) {
    persist(id);
  }

  return { useValue, read, write, remove, flush };
}

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
