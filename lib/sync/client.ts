"use client";

import { useSyncExternalStore } from "react";

import { authClient, goToSignIn } from "@/lib/auth-client";

import { ADAPTERS, clearLocalData } from "./adapters";
import { KINDS, type Kind, type Mutation, type PullOutput, type PushOutput } from "./kinds";
import { listen } from "./registry";

// Sync, in the browser (AGENTS.md, Sync). Everything is read and written
// locally first, so nothing waits on the network; this sends changes up
// and brings other devices' changes down.
//
// - The stores report each change (lib/sync/registry.ts); it's marked dirty
//   and pushed 1.5s after the last one, a batch at a time.
// - Pulls ask for everything after the cursor: on start, when the window
//   comes back, every minute, and after a push the server answered with
//   something else (another device's version kept as a copy).
// - A record still dirty here isn't overwritten by a pull: the push that
//   follows tells the server which version this device last saw (`base`),
//   and the server keeps both texts if they differ (lib/sync/server.ts).
//
// The state (cursor, each record's last seen seq, what's dirty) lives in
// localStorage, read fresh for every step, and every step holds a lock
// across tabs, so two tabs never push the same essay against each other.

type State = {
  /** Whose records this browser holds; null before the first sign-in. */
  userId: string | null;
  cursor: number;
  /** Each record's seq when this browser last saw it, by `kind:id`. */
  bases: Record<string, number>;
  /** Records changed here and not sent yet, by `kind:id`: a count, so a change during a push isn't lost. */
  dirty: Record<string, number>;
};

const STATE_KEY = "ink:sync";
const PUSH_DELAY_MS = 1_500;
const PULL_EVERY_MS = 60_000;
const BATCH = 100;

const key = (kind: Kind, id: string) => `${kind}:${id}`;
const split = (k: string) => {
  const at = k.indexOf(":");
  return [k.slice(0, at) as Kind, k.slice(at + 1)] as const;
};

function load(): State {
  try {
    const s = JSON.parse(localStorage.getItem(STATE_KEY) ?? "null") as Partial<State> | null;
    if (s && typeof s.cursor === "number") {
      return { userId: s.userId ?? null, cursor: s.cursor, bases: s.bases ?? {}, dirty: s.dirty ?? {} };
    }
  } catch {
    // Unreadable: start over, which pushes everything again (harmless).
  }
  return { userId: null, cursor: 0, bases: {}, dirty: {} };
}

/** Change the stored state: read fresh, so another tab's changes in between are kept. */
function update(change: (s: State) => void): State {
  const s = load();
  change(s);
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(s));
  } catch {
    // Storage full or blocked: sync starts over next time.
  }
  return s;
}

if (typeof window !== "undefined") {
  listen((kind, id) => {
    update((s) => {
      s.dirty[key(kind, id)] = (s.dirty[key(kind, id)] ?? 0) + 1;
    });
    schedulePush();
  });
}

// ---------- Running ----------

let running: { userId: string; ready: Promise<void> } | null = null;
let pushTimer: ReturnType<typeof setTimeout> | undefined;
let pullTimer: ReturnType<typeof setInterval> | undefined;
let lastPull = 0;

/** One step at a time, across tabs (Web Locks), and in order within this one. */
let chain: Promise<unknown> = Promise.resolve();
function step<T>(run: () => Promise<T>): Promise<T> {
  const locked = (): Promise<T> => (navigator.locks ? (navigator.locks.request("ink-sync", run) as Promise<T>) : run());
  const next = chain.then(locked, locked);
  chain = next.catch(() => {});
  return next;
}

/**
 * Keep this browser in step with `userId`'s account. The first time for an
 * account, everything written here before signing in goes up to it. Returns
 * when the first push and pull are done.
 */
export function startSync(userId: string): Promise<void> {
  if (running?.userId === userId) return running.ready;
  stopTimers();
  const s = load();
  if (s.userId !== userId) {
    // Another account's records are never sent to this one.
    if (s.userId !== null) clearLocalData();
    update((next) => {
      Object.assign(next, { userId, cursor: 0, bases: {}, dirty: {} });
      if (s.userId === null) for (const kind of KINDS) for (const id of ADAPTERS[kind].ids()) next.dirty[key(kind, id)] = 1;
    });
  }
  const ready = step(async () => {
    await pushAll();
    await pullAll();
  });
  running = { userId, ready };
  startTimers();
  return ready.catch((error) => console.error(error)).finally(() => setSynced(true));
}

// Whether this page has finished its first sync (or given up on it), so a
// screen can wait for an essay that's on its way from another device.
let synced = false;
const syncedListeners = new Set<() => void>();
function setSynced(next: boolean) {
  synced = next;
  syncedListeners.forEach((l) => l());
}

export function useSynced(): boolean {
  return useSyncExternalStore(
    (l) => {
      syncedListeners.add(l);
      return () => syncedListeners.delete(l);
    },
    () => synced,
    () => false,
  );
}

/** Stop syncing without touching what's here (the session ended). */
export function pauseSync() {
  stopTimers();
  running = null;
  setSynced(true);
}

/** For the sign-in page: sync the account that just signed in before going on. */
export async function claimLocalData() {
  const { data } = await authClient.getSession();
  if (data?.user) await startSync(data.user.id);
}

/**
 * Sign out: send what's left, then forget this account's records here.
 * Throws, and stays signed in, when changes couldn't be sent.
 */
export async function signOutAndClear() {
  await step(pushAll);
  if (Object.keys(load().dirty).length) throw new Error("Unsent changes");
  pauseSync();
  clearLocalData();
  update((s) => Object.assign(s, { userId: null, cursor: 0, bases: {}, dirty: {} }));
  await authClient.signOut();
}

function schedulePush() {
  if (!running) return;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(() => void step(pushAll).catch(logUnlessOffline), PUSH_DELAY_MS);
}

function pullSoon() {
  if (!running || Date.now() - lastPull < 5_000) return;
  void step(pullAll).catch(logUnlessOffline);
}

const onVisible = () => {
  if (document.visibilityState === "visible") pullSoon();
  else sendBeforeLeaving();
};

function startTimers() {
  pullTimer = setInterval(pullSoon, PULL_EVERY_MS);
  window.addEventListener("focus", pullSoon);
  window.addEventListener("online", pullSoon);
  document.addEventListener("visibilitychange", onVisible);
  window.addEventListener("pagehide", sendBeforeLeaving);
}

function stopTimers() {
  clearTimeout(pushTimer);
  clearInterval(pullTimer);
  window.removeEventListener("focus", pullSoon);
  window.removeEventListener("online", pullSoon);
  document.removeEventListener("visibilitychange", onVisible);
  window.removeEventListener("pagehide", sendBeforeLeaving);
}

// ---------- Push and pull ----------

/** What's dirty, as mutations, at most a batch; dirty records never synced and now gone are just dropped. */
function pending(): { mutations: Mutation[]; counts: Record<string, number> } {
  const s = load();
  const keys = Object.keys(s.dirty).slice(0, BATCH);
  const counts: Record<string, number> = {};
  const mutations: Mutation[] = [];
  const dropped: string[] = [];
  for (const k of keys) {
    const [kind, id] = split(k);
    if (!ADAPTERS[kind]) {
      dropped.push(k);
      continue;
    }
    const data = ADAPTERS[kind].read(id);
    const base = s.bases[k] ?? 0;
    counts[k] = s.dirty[k];
    if (data === null && !base) dropped.push(k);
    else mutations.push({ kind, id, data, base });
  }
  if (dropped.length) update((next) => dropped.forEach((k) => counts[k] === next.dirty[k] && delete next.dirty[k]));
  return { mutations, counts };
}

async function pushAll() {
  for (;;) {
    const { mutations, counts } = pending();
    if (!mutations.length) return;
    const { results } = await request<PushOutput>("/sync/push", { method: "POST", body: JSON.stringify({ mutations }) });
    let differs = false;
    update((s) => {
      for (const r of results) {
        const k = key(r.kind, r.id);
        // A refused delete leaves the base as it was, so the pull brings the essay back.
        if (r.outcome !== "kept") s.bases[k] = r.seq;
        if (r.outcome !== "saved") differs = true;
        // Changed again while this push was on its way: it goes in the next one.
        if (s.dirty[k] === counts[k]) delete s.dirty[k];
      }
    });
    if (differs) await pullAll();
  }
}

async function pullAll() {
  lastPull = Date.now();
  for (;;) {
    const page = await request<PullOutput>(`/sync/pull?cursor=${load().cursor}`);
    update((s) => {
      for (const r of page.records) {
        const k = key(r.kind, r.id);
        // Dirty here: the push after this tells the server, which keeps both if they differ.
        if (s.dirty[k] || (s.bases[k] ?? 0) >= r.seq || !ADAPTERS[r.kind]) continue;
        ADAPTERS[r.kind].apply(r.id, r.deleted ? null : r.data);
        s.bases[k] = r.seq;
      }
      s.cursor = Math.max(s.cursor, page.cursor);
    });
    if (!page.more) return;
  }
}

/** Leaving the page: send what's dirty without waiting for the answer. The next start sends it again, which is harmless. */
function sendBeforeLeaving() {
  if (!running) return;
  clearTimeout(pushTimer);
  const { mutations } = pending();
  if (!mutations.length) return;
  void fetch("/api/v1/sync/push", {
    method: "POST",
    keepalive: true,
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mutations }),
  }).catch(() => {});
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/v1${path}`, {
    ...init,
    credentials: "same-origin",
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
  });
  if (res.status === 401) {
    pauseSync();
    goToSignIn();
  }
  if (!res.ok) throw new Error(`Sync ${path} failed (${res.status})`);
  return res.json() as Promise<T>;
}

function logUnlessOffline(error: unknown) {
  if (navigator.onLine) console.error(error);
}
