// The pre-paint theme script (see lib/theme.ts). Not a client module, so the
// server layout gets the string itself rather than a client reference.

/** localStorage key of the writer's choice: "light", "dark" or "system". */
export const THEME_KEY = "ink:theme:choice";

/** Runs before anything paints, and before React: self-contained. */
export const THEME_SCRIPT = `(() => {
  const root = document.documentElement;
  const dark = matchMedia("(prefers-color-scheme: dark)");
  const choice = () => { try { return localStorage.getItem(${JSON.stringify(THEME_KEY)}); } catch { return null; } };
  const apply = () => {
    const c = choice();
    root.dataset.theme = c === "dark" || (c !== "light" && dark.matches) ? "dark" : "light";
  };
  apply();
  dark.addEventListener("change", apply);
  addEventListener("storage", (e) => { if (e.key === ${JSON.stringify(THEME_KEY)}) apply(); });
})();`;
