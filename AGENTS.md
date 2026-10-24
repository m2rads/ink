<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Ink

A web writing editor for people preparing for the TEF writing exam (Expression écrite, sections A and B). Stack: Next.js 16, React 19, Tailwind v4, bun.

## Product

**The one good idea:** you fix your own mistakes, in place, in your own text, and Ink remembers which ones you keep making across essays.

- **User:** TEF candidates who today write against a phone timer, look words up in 3–4 dictionary tabs, then paste the essay into ChatGPT and switch back and forth between their draft and its list of corrections.
- **Goal is the exam score, not faster practice.** The real exam has no dictionary or AI.
- **Planned flow:** practice run (timed, lookups allowed) → mock run (timed, no help) → correction → essay history.
- **Why not ChatGPT or LanguageTool:** (1) the writer rewrites each mistake in place and Ink re-checks the fix instead of applying its own; (2) mistakes are remembered by category across essays. Both are required from v1. Without them Ink is a tidier LanguageTool.

### Correction view: Margin (decided 2026-10-24)

Reference: `docs/prototypes/correction-loop.html`. Open it in a browser; `?v=3` is Margin, the other versions are the rejected ones. Its AI checks are faked by matching against accepted answers.

- All mistakes visible at once: numbered highlights in the text, teacher-style notes in a margin column next to each paragraph, filter chips per category (Prepositions, Agreement, Conjugation, Spelling).
- Clicking a highlight or note turns the phrase into an inline input and expands the note: rule, short explanation, "you've made this N times before".
- Enter checks the fix. Wrong → feedback and a hint; two wrong → "Show answer". Skip is always available, never a hard stop.
- Rejected:
  - **Guided** (v1): one category at a time with a side panel. Hides the rest of the essay.
  - **Spotlight** (v2): one mistake at a time. Too slow with 13+ mistakes.
  - **Patterns** (v4): drills sentences pulled out of the essay. Loses in-place context, but its cross-essay memory belongs in Margin.
- Not building: user-customizable correction modes (pick one way and ship it), drag-and-drop sentence reordering (parked until users ask for it unprompted).

### Open questions

- How often AI grammar feedback flags correct French as wrong. Measure on real essays before trusting the loop.
- Whether a tired learner finishes the correction loop or skips to the answer.
- Whether AI score estimates track real TEF results.

## Design system

We are building our own design system, held to shadcn's standard. Do not install shadcn or another styled component library.

- **Behavior from unstyled primitives** (`@radix-ui/react-*` or Base UI) for anything with focus, keyboard or overlay behavior: Tooltip, Popover, Dialog, Toggle Group. Styles, variants, tokens and motion are ours.
- **Build order:** tokens → only the components Margin needs (Button, Chip/ToggleGroup, Tooltip, inline fix Input, Note) → motion pass → `DESIGN.md`.
- **Tokens:** semantic OKLCH CSS variables, light and dark, starting from the prototype's (`--bg`, `--surface`, `--sunken`, `--text`, `--text-2`, `--text-3`, `--border`, `--ok`, `--warn`, category colors `--c-prep`, `--c-accord`, `--c-conj`, `--c-ortho`). No raw hex in components.
- **Type:** serif for essay text (Iowan Old Style / Charter stack), system sans for UI. Essay text at least 16px on mobile, measure capped near 65ch.
- **Component APIs:** composition over configuration; compound components sharing state through context (e.g. `<Correction>`, `Correction.Filters`, `Correction.Row`, `Correction.Paragraph`, `Correction.Notes`); `variant`/`size` plus a `className` escape hatch; forward refs; spread remaining props; support controlled and uncontrolled state (`activeId`/`defaultActiveId`/`onActiveIdChange`).
- **The correction view is not a rich-text editor:** read-only text with inline inputs, no `contenteditable`. The editor engine for the writing screen is a separate, undecided choice.
- **No shared component** until the code has been copy-pasted 2–3 times.
- **Skills to use:** `emil-design-foundations`, `emil-color`, `emil-typography`, `emil-component-design`, `emil-animations`, `emil-design-system-docs`.
