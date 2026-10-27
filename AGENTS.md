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
- **The app is two screens:** Home (`/home`) and the essay (`/write?essay=<id>`): write, time yourself if you want, look words up, review, fix. `/` and `/write` without an essay redirect to Home. The sample exam runs (one prompt per section, practice and mock, at bare `/write`) were removed on 2026-10-25; a mock run (timed, no help) would come back as a mode of the essay, not a separate screen.
- **Why not ChatGPT or LanguageTool:** (1) the writer rewrites each mistake in place and Ink re-checks the fix instead of applying its own; (2) mistakes are remembered by category across essays. Both are required from v1. Without them Ink is a tidier LanguageTool.

### Correction view: Margin (decided 2026-10-24)

Reference: `docs/prototypes/correction-loop.html`. Open it in a browser; `?v=3` is Margin, the other versions are the rejected ones. Its AI checks are faked by matching against accepted answers.

- All mistakes visible at once: numbered highlights in the text, teacher-style notes in a margin column next to each paragraph, filter chips per category (Prepositions, Agreement, Conjugation, Spelling).
- **On the essay itself (decided 2026-10-26):** there's no separate review screen. The essay stays editable under a review; highlights are drawn under the editor's text and notes sit beside each paragraph. Putting the caret in a highlight (a click, arrows) or clicking its note expands the note: rule, short explanation, "you've made this N times before". The writer rewrites the highlighted words in place, and the highlight follows the edit.
- Enter checks the fix. Wrong → feedback and a hint. "Show answer" is available any time and shows the answer in the note, not in the text (decided 2026-10-25): the writer types it in, or puts it in with an icon button beside it. A fix after seeing the answer counts as shown, not fixed. Skip is always available, never a hard stop.
- Rejected:
  - **Guided** (v1): one category at a time with a side panel. Hides the rest of the essay.
  - **Spotlight** (v2): one mistake at a time. Too slow with 13+ mistakes.
  - **Patterns** (v4): drills sentences pulled out of the essay. Loses in-place context, but its cross-essay memory belongs in Margin.
  - **A separate review screen** (Review swapped the editor for read-only Margin, Edit swapped back; dropped 2026-10-26): two states for one essay. The essay always stays editable.
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
- On the essay at all times, review or not.
- Rejected:
  - **Docked** column: moves the essay to re-center and takes 320px.
  - **Sheet** as the main form: its scrim hides the sentence you're looking a word up for. Kept only as the narrow-window fallback.
  - **Peek** corner card: room for one entry, and it floats over the text.
  - **Set once** (auto direction, a language code by the title): words spelled the same in both languages come back mixed, and the code is easy to miss.
  - **Ask once** (asked in the empty state, then a "Change" line): an extra first-use step, and the setting is only reachable from the bottom line.
- **Source, for now: Google Cloud Translation** (`lib/translate.ts`, `lookUp` in `app/write/actions.ts`, key in `GOOGLE_TRANSLATE_API_KEY`). One translation per lookup, no senses or examples (gender comes from Ink's own data, below); the panel shows only the translation and the gender (no source label, no outside links). Google's attribution rules still ask for the results to be marked as Google Translate and for the app's description and help to say so: settle that before launch. Answers are kept for the session in the page only.
- **Gender:** when the French side of a lookup (what was typed from French, the translation into it, a selection) is a noun, `lookUp` returns its gender with the translation: no extra request. `lookUpGender` in `lib/gender.ts` runs on the server only, so its data never ships to the browser (decided 2026-10-26): Morphalou 3.1 (LGPL-LR) for every noun form's gender, Lexique 3.83 (CC BY-SA 4.0) frequencies to leave out words that are mostly something else ("pendant", "devoir", "ferme" get nothing unless typed with an article), and `lib/gender/curated.ts`, our own hand-checked fixes and meaning pairs, over both. Licences and how it was built: `lib/gender/NOTICE.md`; rebuild with `bun scripts/build-gender.ts` (`--report` lists where the two sources disagree). About 98,600 nouns; 8 ms to load cold, a few µs a lookup. Known limits: Morphalou is often wrong for nouns of people and professions (fixed one by one in `curated.ts`), a missing accent is forgiven only when it leaves one spelling, names and new words (covid) get nothing, and "senses" exist only for the pairs we've listed. It shows under the translation, in the panel and the selection card, the way it's written with the indefinite article: "une maison", "un arbre" (l' and les would hide it), the singular for a plural ("chevaux" → "un cheval"), "un or une élève" when it goes by who it is, and one line per gender with a short gloss when the gender changes the meaning ("un tour · a turn, a trip" / "une tour · a tower"), neither first. A noun only used in the plural is named, since les and des hide it: "les vacances · feminine plural". Not a noun: nothing shows. A known noun spelled the same in both languages ("table", "restaurant") counts as a translation, not "No translation".
- **Pronunciation:** a speaker button beside the French in every lookup (panel and selection card) reads it aloud through the browser's speech synthesis (`lib/speech.ts`): no key, no request, offline, but the voice is the OS's, so quality varies by device, and devices without a French voice get no button. macOS also lists its Eloquence character voices (Eddy, Grandma, Rocko…) as French, and they sort first: `lib/speech.ts` ranks them last, after Premium/Enhanced/Natural voices and known good ones (Thomas, Audrey, Amélie, Google français, Microsoft's). A recorded or cloud voice (Google Cloud Text-to-Speech, a licensed dictionary's audio) would be the upgrade if the OS voices prove too uneven.
- **Conjugation, Entry + Selection (decided 2026-10-26):** explored in `/proto/conjugation` with five directions; built as `app/write/conjugation.tsx`. When the French side of a lookup is a verb form, `lookUp` returns it with the translation (`lookUpVerb` in `lib/conjugation.ts`, server only: no extra request; the client gets one verb's simple forms and builds compound tenses with `lib/conjugation/compose.ts`). A failure there never costs the translation.
  - **Entry**, in the panel: under the translation (and gender), the verb and its facts ("aller · Irregular · être"), a tense menu grouped by mood, and that tense's six persons. A typed form ("allions") opens on its tense with its person marked, and its other readings are a link each ("Also Subjonctif présent"). An infinitive opens on the tense picked last. Forms are 14px Literata, pronouns and agreement quieter; a form breaks only between its words ("levé(e)(s)" never splits) and wraps under itself, so the longest ("que vous vous soyez levé(e)(s)") stay inside the 232px margin, the Sheet and a 320px phone.
  - **Selection**, in the selection card (the same "Translate ⌘K" pill, which never changes its label): under the meaning, what the selected form is, read with the words before it ("je suis **allé**" → "aller · Passé composé · je"), and that tense's rows with the writer's person marked; a form that fits several tenses gets one tab each (short labels: "Subjonctif", "Passé simple"), and the persons follow the tab. The card is a fixed 320px for a verb, so tabs never resize it. The words before (up to six, same line, 100 characters) go with the request, so the session cache keys on them too; still one request per settled selection.
  - **Noun and verb (été, marche):** the panel shows both, gender first. A selection shows one: the noun after a determiner, right before or two words back (cet **été**, une bonne **chose**), unless a pronoun or être/avoir comes right before (il l'a **été**); else the verb (`readsAsNoun` in `actions.ts`).
  - Rejected:
    - **Reference** (the whole verb on one page in a wide sheet over the essay, Bescherelle style): covers the sentence being written, and every tense at once is more than a writer mid-sentence needs.
    - **By person** (one person across the six tenses TEF writing leans on): the writer often doubts the tense, not just the person, and the slice hides the other persons a typed form could be.
    - **Pairs** (the tenses learners confuse side by side, differences marked: irai / irais): a drill more than a lookup; worth revisiting for the review's Conjugation notes.
- **Not decided:** a real dictionary source. The prototype compares 25 hand-written entries with the Collins API (`app/proto/dictionary/collins/route.ts`, key in `COLLINS_API_KEY`).
  - **Collins API** (terms of 13 February 2025): bilingual dictionaries are free up to 5,000 calls a month, then £75/month to 30,000 and £400/month to 100,000; a commercial product needs their commercial licence. Entries may not be stored or cached, so every lookup waits on Collins, and every use shows "www.collinsdictionary.com © HarperCollins Publishers Ltd 2025".
  - **Licensed data instead of the API:** Collins licenses its bilingual dictionaries (26 languages) as data through collins.licensing@harpercollins.co.uk. That's the route to instant, offline lookups stored in the browser.
  - **Wiktionary** (kaikki.org extracts): free and storable (CC BY-SA, attribution), French entries with English meanings only, uneven on phrases.

### Selection lookup: On ask (decided 2026-10-25)

Explored in a throwaway `/proto/selection` with three directions. Selecting French in the essay (or its title) can show what it means in your language, in a popover at the selection. Built into `<Dictionary>`, so it's on wherever the dictionary is: the essay, review or not.

- **On ask:** a settled selection (on mouse up or a double-click; 350ms after Shift+arrows or touch handles stop) of 1–8 words in one paragraph shows a small "Translate ⌘K" pill above it. The meaning appears only when asked: click the pill or press ⌘K. It's fetched as soon as the pill shows (decided 2026-10-25), so asking feels instant; that's one Google call per settled selection, asked or not, including the many made only to retype. With French selected, ⌘K translates it; with nothing selected it opens the dictionary as before.
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

`cacheComponents` is on in `next.config.ts`, so every page prerenders a static shell. Read request-time data (`searchParams`, `params` without `generateStaticParams`, `cookies()`, `headers()`) inside a `<Suspense>` boundary with a skeleton fallback, never at the top of a page: outside Suspense it blocks the whole route (the dev overlay reports "Next.js encountered runtime data during prerendering"). See `app/write/page.tsx`. Browser-only state (localStorage drafts, carets, reviews) goes through `createLocalStore` in `lib/local-store.ts`, which renders `null` on the server and the stored value after hydration. Navigating away doesn't unmount a page: Cache Components hides it in React's `<Activity>`, so `useState` survives a trip Home and back while effects clean up and re-run. State that must end when the writer leaves (the timer) resets in a `useLayoutEffect` cleanup; see `essay-timer.tsx`.

### Coffee mode and the word count (decided 2026-10-26)

- **Coffee mode:** a coffee-cup button in the essay's app bar. On, only the writing and its word count are left: the app bar (crumb, timer, review progress, Review) and the review's marks, notes and summary fade out and turn invisible, holding their places so the text doesn't move. The button stays where it was, to turn it off. The dictionary stays, since the writer can hide it themselves, but without its recent words; the timer keeps running. Page state only, like the timer.
- **Word count:** at the bottom left of the window, in the app bar's old label style. With essay text selected (in a paragraph or across them) it reads "12 of 201 words"; no other copy.

### Timer: Edge (decided 2026-10-25, redesigned 2026-10-27)

Explored in a throwaway `/proto/timer` with four directions; Edge was picked, with the iOS timer's wheels to set it.

- **Off until started:** a timer icon in the essay's app bar opens a popover with three wheels, hours (0–23), minutes and seconds, like the iOS timer without its 3D drum. Each wheel scrolls and snaps, swipes on touch, drags and flings with a mouse (no text selection), and takes typed digits when focused ("1" then "5" is 15, whatever it showed); ↑/↓ and Enter work too. A short click sounds as each value crosses the band (Web Audio, no file). All zero counts up, so the button reads "Count up" instead of "Start". The wheels open on the last time started. No sections, presets or exam durations: the writer sets their own.
- **Running, a line, not numbers:** the app bar's bottom edge becomes a fuse that burns down toward 0:00 (counting up, it fills over the first hour). The time is on the icon's tooltip and in its popover (the time, the limit or "Paused", and small Pause/Resume and Stop buttons). Pause/Resume also sits beside the icon, so pausing never needs the popover.
- A countdown turns the line and icon `text-warn` in its last 5 minutes (when it was longer than that) and stops itself at 0:00; a count-up stops itself after 4 hours. Either way a toast says so. The essay never locks.
- **Coffee mode** hides the icon and Pause but leaves the line: the one piece of chrome left.
- It lives in the page only (`essay-timer.tsx`, never storage): closing the window or leaving the essay ends it. The old sample runs' clocks kept counting in localStorage for days; `legacy-storage.ts` clears them, and everything else those runs left behind, on opening an essay.
- Rejected:
  - **Bar:** the running time as text in the app bar. More to read than a writer mid-sentence needs.
  - **Footer:** the clock beside the word count at the bottom left. Out of the way, but numbers in the corner of the eye all the same.
  - **Session:** a start dialog with named presets and a large clock in the right margin. Presets are the exam-centric setup the timer was kept free of, and the margin belongs to the review's notes.
  - **A "Minutes" field** (the first build): typing a number into a form is slower than turning a wheel, and it couldn't set seconds.

### Review (decided 2026-10-24, one view since 2026-10-26)

- **On demand:** a Review button in the app bar, any time and as often as the writer likes. The editor can't know when writing is done. There's one view: a review adds its marks and notes to the editable essay (no Edit/Review modes, no `view=review` URL). Writing goes on while a review runs; its marks land wherever their words are by then.
- **Marks follow edits** (`app/write/marks.ts`): each edit to a paragraph is one replaced span, and marks in it shift, grow or shrink with it. A few letters typed at a mark's end grow it ("grand" → "grands"); a space doesn't. An edit that takes a mark's words out of its paragraph (split, merge, cut) loses it, and it's found again by its words and the text before them, so an undo or paste brings it back.
- **Checking a fix:** Enter in a highlight whose words were changed, or the note's Check. Enter in an untouched highlight splits the paragraph as usual; Escape closes the note until the caret leaves those words. A correct fix moves the caret to the next open mistake.
- **One review per essay:** pressing Review on text unchanged since the last review does nothing new (a toast says so); on changed text, a new review replaces the old one. Fixes made through the review don't count as changes.
- **Memory counts each essay once**, by category, from its latest review, so reviewing three times doesn't inflate "you've made N … mistakes in earlier essays".

## AI

Vercel's AI SDK (v7: `instructions`, not `system`; structured output is `generateText` + `Output.object`; portable `reasoning` effort). Models are named as AI Gateway ids like `openai/gpt-6-sol`. Config lives in `.env.local` (git-ignored): `INK_AI`, plus keys.

- `lib/ai/models.ts` (`resolveModel`): a provider's own key wins for that provider and calls it directly (`OPENAI_API_KEY` → `@ai-sdk/openai`; only OpenAI is wired up). Every other provider goes through AI Gateway (`AI_GATEWAY_API_KEY`, a `vck_…` key; on Vercel the deployment's OIDC token works instead). To route a provider through the Gateway, leave its key unset. The Gateway's free tier can't call every model (GPT-6 Sol needs paid credits). A missing key throws an error naming the env var to set.

- `lib/ai/instructions.ts`: the system prompts. A lean prompt plus the schema's `.describe()` text, not an uploaded skill (skills are provider-hosted bundles for sandboxed agents, and would tie the A/B to one provider). Precision over recall: LLM correction over-flags learners' writing, and a correct sentence marked wrong teaches a mistake. No `temperature`: reasoning models reject it.
- `lib/ai/config.ts`: which model and reasoning effort run each task (`check` an essay, judge a `fix`), as weighted arms. Default: GPT-6 Sol, `medium` for the check, `low` for fix checks. Read per request from Edge Config key `ai` when `EDGE_CONFIG` is set (live within ~1 min, no redeploy), else `INK_AI` (same JSON; `next dev` reloads it, but a deployment needs a restart, and on Vercel a redeploy), else the default. A bad config logs and falls back; it never stops checks. A review's id picks its arm, so one review and all its fix checks use one arm.
- `lib/ai/check.ts`: `checkEssay` (streamed; `onFound` gets the count of anchored mistakes as the model writes them out, for the review trace), `judgeFix`. Each call logs one JSON line (`ai.check` / `ai.fix`: arm, model, ms, mistakes, dropped quotes, tokens); that's what an A/B comparison is read from.
- `lib/ai/correction.ts`: client-safe. The model-facing schema (no `.optional()` or numeric bounds: OpenAI's strict mode rejects some), `anchorMistakes` (the model quotes the wrong words; offsets are found here, and a quote not in the text is dropped, never guessed), `locate` (re-finds a mark after edits by the words before it), `matchesAccepted` (a fix matching an accepted answer passes with no model call).
- `app/write/actions.ts`: the server functions the review calls. `reviewEssay` returns a `ReadableStream` of `found` events then `done`. Public POST endpoints: validate and cap input there, and add rate limiting before launch.
- `app/write/review-store.ts` (reviews and memory in localStorage, `trackEdit` moving marks with every edit through `marks.ts`), `review.tsx` (the flow, `EssayReview`, `ReviewAside`), `correction.tsx` (the `<Correction>` compound).

## Design system

We are building our own design system, held to shadcn's standard. **Before writing any UI, read [DESIGN.md](DESIGN.md)** and the topic file it points to: tokens, the closed variant sets of every component, and which component to use when. This section covers how components get built; DESIGN.md covers how to use them. shadcn is allowed as a source of code, not as a look: it copies component source into `components/ui/`, which we own and restyle. No other styled component library.

- **shadcn for behavior-heavy components:** anything where the hard part is focus, keyboard, positioning or overlay behavior. Tooltip, Popover, Dialog/AlertDialog, Drawer (Margin's notes on phones), ToggleGroup, Tabs, DropdownMenu, Command (dictionary lookup), Sonner, Sidebar (with Sheet, for the app sidebar). Small pieces may start from it too: Button, Input, Textarea, Progress, Skeleton, Kbd, Separator. Underneath they stay Radix or Base UI. Styles, variants, tokens and motion are ours.
  - Add one with `bunx shadcn@latest add <name>` when a screen needs it, not in bulk. Run it with `--dry-run` first: a component that depends on Button, Input, Tooltip… lists them as `overwrite`, and installing would replace our restyled versions with stock ones. Back those files up and restore them right after, then diff to confirm.
  - shadcn sometimes renders random values (`SidebarMenuSkeleton` used `Math.random()`); with Cache Components that's a prerender error and a hydration mismatch. Make them deterministic.
  - Restyle it on arrival: swap shadcn's token classes (`bg-background`, `text-muted-foreground`, `bg-popover`, `ring-ring`, `border-input`…) for Ink's (`bg-raised`, `text-text-3`, `border-border-strong`…). Its classes generate nothing here. Don't add alias tokens for shadcn's names.
  - Replace its animation classes (`animate-in`, `fade-in-0`… from `tw-animate-css`) with our own motion; don't import `tw-animate-css`.
  - Never run `shadcn init`: its preset adds Geist as `--font-sans` and overwrites `--border` and `--primary`. `components.json` is hand-written; `shadcn add` only needs that. Added components import `cn` from `"cn"`: change it to `@/lib/utils`, whose `cn` knows our `text-*` sizes (the stock one drops `text-ui` next to `text-text-2`).
- **Native for product components**, the ones that are Ink: essay editor, prompt card, timer, word count, lookup panel (on Command), app bar, the correction compound (`<Correction>`, `Correction.Filters`, `Correction.Marks`, `Correction.Notes`/Note, Feedback), category tag, correction summary, essay history row, category trend bars, empty states.
- **Build order:** tokens, motion pass, `DESIGN.md` and the `<Correction>` compound (Margin) are done → the phone Drawer for Margin's notes, lookup panel, essay history. When a component, variant or token changes, update its file in `docs/design/` in the same change.
- **Component APIs:** composition over configuration; compound components sharing state through context (e.g. `<Correction>`, `Correction.Filters`, `Correction.Marks`, `Correction.Notes`); `variant`/`size` plus a `className` for layout only (DESIGN.md rule 2); forward refs; spread remaining props; support controlled and uncontrolled state (`activeId`/`defaultActiveId`/`onActiveIdChange`).
- **The correction view is not a rich-text editor:** its marks are a layer drawn under the editor's textareas (`renderUnderlay`), with the same text metrics and transparent text, and its notes go in each paragraph's block (`renderAfter`). No `contenteditable`.
- **The writing screen uses our own block editor** (`app/write/`), never a third-party rich-text editor (TipTap, Lexical, ProseMirror, Slate…) and never `contenteditable`. One auto-growing `<textarea>` per paragraph, so the browser handles typing, accents and IME; the editor handles what crosses paragraphs (Enter, Backspace/Delete at the edges, ↑/↓/←/→, paste, reordering by drag, menu or ⌘⇧↑/↓, and selections across paragraphs) and owns undo. A selection can't span textareas, so one that crosses paragraphs (⌘A, Shift+arrows, Shift+click, a drag) briefly swaps them for plain `<p>`s with the same metrics and uses the browser's own selection; any edit puts the textareas back. Drag uses pointer events with pointer capture, not HTML5 drag-and-drop. (Sentence reordering in the correction view is still parked.) Enter at the end of a line starts a new line in the paragraph, and Enter again on that empty line takes it back and starts a new paragraph (decided 2026-10-26; how Notion leaves a list, not its plain blocks, where Enter always starts a new block); mid-line, Enter splits the paragraph. Paragraphs are the unit the correction view highlights, so the model stays `{ id, text }[]` plain text, with `\n` for lines inside a paragraph. Block edits are pure functions in `blocks.ts` with tests (`bun test`); add a test with every new edit.
- **No shared component** until the code has been copy-pasted 2–3 times. shadcn primitives in `components/ui/` are the exception, added when a screen first needs one.
- **Skills to use:** `emil-design-foundations`, `emil-color`, `emil-typography`, `emil-component-design`, `emil-animations`, `emil-design-system-docs`.
