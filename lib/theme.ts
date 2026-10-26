"use client";

import { useSyncExternalStore } from "react";

import { createLocalStore } from "./local-store";

// Light, dark, or the OS's (System, the default). The theme itself is html's
// data-theme, "light" or "dark", which app/globals.css reads. THEME_SCRIPT
// sets it before first paint, so a reload never flashes the other theme, and
// keeps it in step with the OS and with other tabs; setTheme sets it at once.
// The script lives in ./theme-script.ts, which the server layout can import.

export type ThemeChoice = "light" | "dark" | "system";
export type Theme = "light" | "dark";

const store = createLocalStore<ThemeChoice>({
  prefix: "ink:theme",
  parse: (raw) => (raw === "light" || raw === "dark" || raw === "system" ? raw : null),
  serialize: (choice) => choice,
  fallback: () => "system",
  saveDelayMs: 0,
});

/** The writer's choice: null on the server and until hydration. */
export function useThemeChoice() {
  return store.useValue("choice")[0];
}

export function setTheme(choice: ThemeChoice) {
  const dark = choice === "dark" || (choice === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  // Every color transition would otherwise run at once, each on its own
  // timing: switch in one frame instead.
  const style = document.createElement("style");
  style.textContent = "*,*::before,*::after{transition:none!important}";
  document.head.appendChild(style);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  store.write("choice", choice);
  requestAnimationFrame(() => requestAnimationFrame(() => style.remove()));
}

function subscribeTheme(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

/** The theme on screen: null on the server. */
export function useTheme(): Theme | null {
  return useSyncExternalStore(
    subscribeTheme,
    () => (document.documentElement.dataset.theme === "dark" ? "dark" : "light"),
    () => null,
  );
}
