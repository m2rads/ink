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

### Home (decided 2026-10-24)

Explored in a throwaway `/proto/home` with four directions; the pick is a mix of two.

- **Sidebar:** shadcn's Sidebar (`collapsible="offcanvas"`), stripped to the logo, a New essay button under it, and the essays as one flat list, newest first. No dashboard nav, documents, settings or user footer.
- **Main:** the streak and full-year contribution graph from *Rail*, with its one brand-blue "New essay" button; under them the *Recent* list from *Studio*.
- **New essay:** opens the editor on a new, empty essay. No form, popover or dialog: prompts are the user's own, and an empty title and body show what to do. Nothing is saved until something is written (decided 2026-10-24): blank essays never reach the sidebar, Recent or the streak, and an essay cleared back to nothing is removed.
- Rejected:
  - **Studio** as a whole: a stats row and month-folder tree; more chrome than the page needs, and the graph was one panel among many.
  - **Linked:** the graph as a day filter for the list; clever, but filtering by date is less obvious than a list, and the list lost structure.
  - **Composer:** an inline prompt box leading the page; it pushed history down and assumed every visit starts a new essay.
  - **Rail's** collapsed icon rail: the essay list one click away instead of always visible.
  - The new-essay form (prompt, Section A/B, practice/mock) in a dialog, popover or sheet: too exam-centric for the entry point.

### Dictionary (decided 2026-10-25)

Explored in `/proto/dictionary` in two rounds: where it lives, then how the language is set. Built as `app/write/dictionary.tsx`; the prototype stays only to compare Collins entries once a key arrives, then gets deleted.

- **Placement, Margin:** the dictionary sits in the empty space left of the essay, the mirror of the review's notes on the right. No panel border or scrim; the essay never moves, open or hidden. Hidden, it folds to a "Dictionary ⌘K" button in the same spot. ⌘K (Ctrl+K) opens it or focuses the field; Escape goes back to the essay. It needs about 1312px of window; narrower, the same lookup opens in a sheet from the left (book icon in the app bar).
- **Language, Pair:** above the field, `[Your language ▾] ⇄ Français`. The left side is what you type; ⇄ swaps. The other side is always French. Your language is a menu, each name in its own script (English names only beside non-Latin scripts).
- **Search waits for a pause** (300ms) instead of running per keystroke; the previous result stays until then.
- Practice runs and essays only, never mock runs (no help in exam conditions).
- Rejected:
  - **Docked** column: moves the essay to re-center and takes 320px.
  - **Sheet** as the main form: its scrim hides the sentence you're looking a word up for. Kept only as the narrow-window fallback.
  - **Peek** corner card: room for one entry, and it floats over the text.
  - **Set once** (auto direction, a language code by the title): words spelled the same in both languages come back mixed, and the code is easy to miss.
  - **Ask once** (asked in the empty state, then a "Change" line): an extra first-use step, and the setting is only reachable from the bottom line.
- **Source, for now: Google Cloud Translation** (`lib/translate.ts`, `lookUp` in `app/write/actions.ts`, key in `GOOGLE_TRANSLATE_API_KEY`). One translation per lookup, no gender, senses or examples; the panel shows only the translation (no source label, no outside links). Google's attribution rules still ask for the results to be marked as Google Translate and for the app's description and help to say so: settle that before launch. Answers are kept for the session in the page only.
- **Not decided:** a real dictionary source. The prototype compares 25 hand-written entries with the Collins API (`app/proto/dictionary/collins/route.ts`, key in `COLLINS_API_KEY`).
  - **Collins API** (terms of 13 February 2025): bilingual dictionaries are free up to 5,000 calls a month, then £75/month to 30,000 and £400/month to 100,000; a commercial product needs their commercial licence. Entries may not be stored or cached, so every lookup waits on Collins, and every use shows "www.collinsdictionary.com © HarperCollins Publishers Ltd 2025".
  - **Licensed data instead of the API:** Collins licenses its bilingual dictionaries (26 languages) as data through collins.licensing@harpercollins.co.uk. That's the route to instant, offline lookups stored in the browser.
  - **Wiktionary** (kaikki.org extracts): free and storable (CC BY-SA, attribution), French entries with English meanings only, uneven on phrases.

### Selection lookup: On ask (decided 2026-10-25)

Explored in a throwaway `/proto/selection` with three directions. Selecting French in the essay (or its title) can show what it means in your language, in a popover at the selection. Built into `<Dictionary>`, so it's on wherever the dictionary is: practice runs and essays, never mock runs or review.

- **On ask:** a settled selection (on mouse up or a double-click; 350ms after Shift+arrows or touch handles stop) of 1–8 words in one paragraph shows a small "Translate ⌘K" pill above it. The meaning appears only when asked: click the pill or press ⌘K. With French selected, ⌘K translates it; with nothing selected it opens the dictionary as before.
- The pill grows into a card in the same place: the French in Literata italic, then the translation. Neither takes focus, so typing still replaces the selection. Escape or a click elsewhere closes it. Above the selection with a mouse, below it on touch screens (the system's copy/paste menu sits above).
- The selection widens to whole words ("élétrava" looks up "télétravail"). Same source and session cache as the dictionary (Google Translate, French into your language).
- Rejected:
  - **Instant** (the card on every settled selection): writers select words to retype them far more often than to look them up, and each time a card covers the line above.
  - **Margin** (the selection fills the dictionary on the left; nothing over the essay): the eye has to travel away from the sentence, and below 1312px it needs a popover anyway.
- Found with real essays, true of every direction and worth weighing in the source decision: Google silently corrects misspellings ("embouteilages" came back "traffic jams", so the learner never sees the mistake), and translates idioms and lone words without their sentence ("tirent le diable par la queue" → "are pulling the devil by the tail", "trajet" → "route").

### Open questions

- How often AI grammar feedback flags correct French as wrong. Measure on real essays before trusting the loop.
- Whether a tired learner finishes the correction loop or skips to the answer.
- Whether AI score estimates track real TEF results.
- Which dictionary source to license: compare candidates on the same 50 words from real essays.

## Rendering

`cacheComponents` is on in `next.config.ts`, so every page prerenders a static shell. Read request-time data (`searchParams`, `params` without `generateStaticParams`, `cookies()`, `headers()`) inside a `<Suspense>` boundary with a skeleton fallback, never at the top of a page: outside Suspense it blocks the whole route (the dev overlay reports "Next.js encountered runtime data during prerendering"). See `app/write/page.tsx`. Browser-only state (localStorage drafts, the exam clock) goes through `createLocalStore` in `lib/local-store.ts`, which renders `null` on the server and the stored value after hydration.

### Review (decided 2026-10-24)

- **On demand:** a Review button in the app bar, any time. The editor can't know when writing is done. It swaps the editor for Margin; "Edit" swaps back (exam runs: "Back").
- **Mock runs hand in:** in a running mock run, Review first asks to hand the essay in (the clock stops, the essay locks), since feedback mid-run would break exam conditions.
- **One review per essay:** reviewing unchanged text reopens the last review (no new call); reviewing changed text replaces it, because edits move the text and old marks would point at the wrong words. Fixes made in the review are written into the essay in place and don't count as changes.
- **Memory counts each essay once**, by category, from its latest review, so reviewing three times doesn't inflate "you've made N … mistakes in earlier essays".

## AI

Vercel's AI SDK (v7: `instructions`, not `system`; structured output is `generateText` + `Output.object`; portable `reasoning` effort). Models are named as AI Gateway ids like `openai/gpt-6-sol`. Config lives in `.env.local` (git-ignored): `INK_AI`, plus keys.

- `lib/ai/models.ts` (`resolveModel`): a provider's own key wins for that provider and calls it directly (`OPENAI_API_KEY` → `@ai-sdk/openai`; only OpenAI is wired up). Every other provider goes through AI Gateway (`AI_GATEWAY_API_KEY`, a `vck_…` key; on Vercel the deployment's OIDC token works instead). To route a provider through the Gateway, leave its key unset. The Gateway's free tier can't call every model (GPT-6 Sol needs paid credits). A missing key throws an error naming the env var to set.

- `lib/ai/instructions.ts`: the system prompts. A lean prompt plus the schema's `.describe()` text, not an uploaded skill (skills are provider-hosted bundles for sandboxed agents, and would tie the A/B to one provider). Precision over recall: LLM correction over-flags learners' writing, and a correct sentence marked wrong teaches a mistake. No `temperature`: reasoning models reject it.
- `lib/ai/config.ts`: which model and reasoning effort run each task (`check` an essay, judge a `fix`), as weighted arms. Default: GPT-6 Sol, `medium` for the check, `low` for fix checks. Read per request from Edge Config key `ai` when `EDGE_CONFIG` is set (live within ~1 min, no redeploy), else `INK_AI` (same JSON; `next dev` reloads it, but a deployment needs a restart, and on Vercel a redeploy), else the default. A bad config logs and falls back; it never stops checks. A review's id picks its arm, so one review and all its fix checks use one arm.
- `lib/ai/check.ts`: `checkEssay` (streamed; `onFound` gets the count of anchored mistakes as the model writes them out, for the review trace), `judgeFix`. Each call logs one JSON line (`ai.check` / `ai.fix`: arm, model, ms, mistakes, dropped quotes, tokens); that's what an A/B comparison is read from.
- `lib/ai/correction.ts`: client-safe. The model-facing schema (no `.optional()` or numeric bounds: OpenAI's strict mode rejects some), `anchorMistakes` (the model quotes the wrong words; offsets are found here, and a quote not in the text is dropped, never guessed), `locate` (re-finds a mark after edits by the words before it), `matchesAccepted` (a fix matching an accepted answer passes with no model call).
- `app/write/actions.ts`: the server functions the review calls. `reviewEssay` returns a `ReadableStream` of `found` events then `done`. Public POST endpoints: validate and cap input there, and add rate limiting before launch.
- `app/write/review-store.ts` (reviews and memory in localStorage), `review.tsx` (the flow and the view), `correction.tsx` (the `<Correction>` compound).

## Design system

We are building our own design system, held to shadcn's standard. **Before writing any UI, read [DESIGN.md](DESIGN.md)** and the topic file it points to: tokens, the closed variant sets of every component, and which component to use when. This section covers how components get built; DESIGN.md covers how to use them. shadcn is allowed as a source of code, not as a look: it copies component source into `components/ui/`, which we own and restyle. No other styled component library.

- **shadcn for behavior-heavy components:** anything where the hard part is focus, keyboard, positioning or overlay behavior. Tooltip, Popover, Dialog/AlertDialog, Drawer (Margin's notes on phones), ToggleGroup, Tabs, DropdownMenu, Command (dictionary lookup), Sonner, Sidebar (with Sheet, for the app sidebar). Small pieces may start from it too: Button, Input, Textarea, Progress, Skeleton, Kbd, Separator. Underneath they stay Radix or Base UI. Styles, variants, tokens and motion are ours.
  - Add one with `bunx shadcn@latest add <name>` when a screen needs it, not in bulk. Run it with `--dry-run` first: a component that depends on Button, Input, Tooltip… lists them as `overwrite`, and installing would replace our restyled versions with stock ones. Back those files up and restore them right after, then diff to confirm.
  - shadcn sometimes renders random values (`SidebarMenuSkeleton` used `Math.random()`); with Cache Components that's a prerender error and a hydration mismatch. Make them deterministic.
  - Restyle it on arrival: swap shadcn's token classes (`bg-background`, `text-muted-foreground`, `bg-popover`, `ring-ring`, `border-input`…) for Ink's (`bg-raised`, `text-text-3`, `border-border-strong`…). Its classes generate nothing here. Don't add alias tokens for shadcn's names.
  - Replace its animation classes (`animate-in`, `fade-in-0`… from `tw-animate-css`) with our own motion; don't import `tw-animate-css`.
  - Never run `shadcn init`: its preset adds Geist as `--font-sans` and overwrites `--border` and `--primary`. `components.json` is hand-written; `shadcn add` only needs that. Added components import `cn` from `"cn"`: change it to `@/lib/utils`, whose `cn` knows our `text-*` sizes (the stock one drops `text-ui` next to `text-text-2`).
- **Native for product components**, the ones that are Ink: essay editor, prompt card, timer, word count, lookup panel (on Command), app bar, the correction compound (`<Correction>`, `Correction.Filters`, `Correction.Paragraph`, Mark, FixInput, `Correction.Notes`/Note, Feedback), category tag, correction summary, essay history row, category trend bars, empty states.
- **Build order:** tokens, motion pass, `DESIGN.md` and the `<Correction>` compound (Margin) are done → the phone Drawer for Margin's notes, lookup panel, essay history. When a component, variant or token changes, update its file in `docs/design/` in the same change.
- **Component APIs:** composition over configuration; compound components sharing state through context (e.g. `<Correction>`, `Correction.Filters`, `Correction.Row`, `Correction.Paragraph`, `Correction.Notes`); `variant`/`size` plus a `className` for layout only (DESIGN.md rule 2); forward refs; spread remaining props; support controlled and uncontrolled state (`activeId`/`defaultActiveId`/`onActiveIdChange`).
- **The correction view is not a rich-text editor:** read-only text with inline inputs, no `contenteditable`.
- **The writing screen uses our own block editor** (`app/write/`), never a third-party rich-text editor (TipTap, Lexical, ProseMirror, Slate…) and never `contenteditable`. One auto-growing `<textarea>` per paragraph, so the browser handles typing, accents and IME; the editor handles what crosses paragraphs (Enter, Backspace/Delete at the edges, ↑/↓/←/→, paste, reordering by drag, menu or ⌘⇧↑/↓, and selections across paragraphs) and owns undo. A selection can't span textareas, so one that crosses paragraphs (⌘A, Shift+arrows, Shift+click, a drag) briefly swaps them for plain `<p>`s with the same metrics and uses the browser's own selection; any edit puts the textareas back. Drag uses pointer events with pointer capture, not HTML5 drag-and-drop. (Sentence reordering in the correction view is still parked.) Paragraphs are the unit the correction view highlights, so the model stays `{ id, text }[]` plain text. Block edits are pure functions in `blocks.ts` with tests (`bun test`); add a test with every new edit.
- **No shared component** until the code has been copy-pasted 2–3 times. shadcn primitives in `components/ui/` are the exception, added when a screen first needs one.
- **Skills to use:** `emil-design-foundations`, `emil-color`, `emil-typography`, `emil-component-design`, `emil-animations`, `emil-design-system-docs`.
