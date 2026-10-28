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

### Review: the coach (decided 2026-10-27)

The review used to mark mistakes in four categories (Margin, decided 2026-10-24); once Grammalecte underlined grammar and spelling while writing, it mostly repeated them. It's now a coach, modelled on the user's own ChatGPT sessions (an estimated level, the one thing holding them there, what they did well, the few mistakes that matter, a plan for the next level), distilled into the essay instead of a chat. Explored in a throwaway `/proto/review` over three rounds. Research behind it: `reports/Correction écrite TEF et TCF Canada.md`.

- **What it says:** the estimated level (CEFR band and NCLC range, never a point score), what that rests on ("TEF Canada · Section B · estimate from 214 words", and a caveat when the essay is too short to judge), a one-sentence diagnosis naming the bottleneck, each skill (Task, Organisation, Sentences, Vocabulary, Accuracy) against the next level, up to six changes and two strengths aimed one level up, and two or three patterns to work on across essays, with how many essays each came up in.
- **Honest grading:** the AI grades only from evidence in the essay, rounds down when torn, marks a skill "unclear" rather than guess, and says when there's too little text. Research: prompted models grade L2 essays to about one level, and even two human TCF graders agree exactly only ~60% of the time; a level shown too high gives false confidence before a real exam.
- **One level at a time:** items aim at the next full level (B1 and B1+ → B2). Kinds: fix (holds you below it), better (wording: register, precision, calques), clarify (content or logic the reader can't follow; no answer), keep (already at the next level). It prefers what rules can't catch (prepositions a verb requires, tense and mood, relative pronouns, calques, development) and never repeats what Grammalecte underlines; items overlapping an underline are dropped.
- **Placement:** in the essay only underlines (colored by kind) and a card at the words when the caret or a click lands in them: kind, point, why, then "Answer" (fix and better) or "Check". Everything else in the column on the right, sticky as the essay scrolls; stacked above the essay when the window has no room (phones need better: the planned bottom sheet). DESIGN.md rules 8 and 10.
- **Fixing:** the writer types the fix. Words matching an accepted answer close the item with no model call. Changed words that don't, or a changed paragraph for an item with no answer, get "Check": the AI judges the passage now and closes it or says in a few words what's still missing. "Answer" shows the answer in the card, never in the text.
- **Incremental:** Review any time. The first covers the whole essay; after that only paragraphs new or changed since (a dot in the gutter marks them until reviewed), with the level, diagnosis, skills and focus always re-estimated on the whole essay. Fixes made through the review don't count as changes. With nothing new, a toast offers "Review again" (everything).
- Rejected:
  - **Margin with four categories** (2026-10-24 to 2026-10-27): numbered marks, notes beside each paragraph, category filters. It became what Grammalecte already does, and said nothing about level or structure.
  - **A criteria checklist** (round 1: Summary, Anchored, Copie, Bar): TEF/TCF criteria met or not. What it measured wasn't what learners want: where they stand and how to get to the next level.
  - **Coach** (round 2, notes beside paragraphs) and **Path** (one change at a time): the right column is for the AI's feedback and the essay for underlines only; one at a time hid the picture.
- Not building: user-customizable correction modes, drag-and-drop sentence reordering (parked).

### Grammar underlines: Grammalecte (decided 2026-10-27)

The AI review was spending itself on mistakes a rule-based checker catches (agreement, conjugation, a/à, spelling), the kind Google Docs underlines. Those now come from Grammalecte, the free French grammar checker LibreOffice uses, while writing, so the review can go after what rules miss.

- **Underlined, never in the margin:** a quiet wavy underline (`decoration-warn/70`) under each mistake, drawn in the editor's underlay like the review's marks. A small card under the words shows its explanation on hover (after 250ms; it stays open while the pointer is on it) or while the caret is inside the words (not at their end, where typing leaves it); typing hides it. The explanation is Grammalecte's own, in French ("Accord de genre erroné : « problème » est masculin."). The answer waits behind "Answer", plain text at the card's bottom right (decided 2026-10-27): Grammalecte's corrections, up to three ("écris · écrivais · écrivis"; two for spelling), in the card, never in the text. The writer types the fix; the paragraph is checked again 600ms after it stops changing and the underline goes. Some messages name the right form anyway ("Pour la préposition, écrivez « à »"), and some mistakes have no correction to show (no button then).
- **Spelling too:** Grammalecte's dictionary replaces the browser's spellcheck, which is off on the essay ("Mot absent du dictionnaire."). Coffee mode hides the underlines with everything else.
- **What it checks:** agreement, conjugation, homophones, infinitives, past participles, spelling. Off: typography a keyboard can't easily type (curly apostrophes, spaces before « : ? »), inclusive writing, number and unit formats (`OPTIONS` in `lib/grammar.ts`). It's precise but misses things: a verb far from its subject ("les grandes villes doit"), and some homophones in context ("je suis allé a Paris").
- **The review builds on it:** `reviewEssay` runs Grammalecte first, lists what it underlines after the essay ("Already underlined"), tells the model to leave those and look for what rules miss (a preposition a verb requires, the tense the meaning needs, agreement across a sentence), and drops any mark that overlaps an underline (`repeated` in the `ai.check` log).
- **How it runs:** `lib/grammar.ts`, server only, through the `findGrammar` action (only paragraphs not checked yet this session; results are cached by text in the page). Grammalecte's JavaScript build (from its Firefox extension, the only JS release) runs in a `node:vm` context dressed as the browser worker it was written for. About 300ms to load once per server process, a few ms a paragraph.
- **Licence: GPL 3, and this repo is public.** Its code is never committed: `scripts/fetch-grammalecte.ts` downloads version 2.3.0 on `bun install` (postinstall), checks Mozilla's published sha256, and keeps only the files it needs in git-ignored `vendor/grammalecte/` (9 MB, with its notice). It runs only on our server and never ships to browsers, which the GPL allows without relicensing Ink. `next.config.ts` traces the folder into deployments. Without it, checks return nothing and the essay works as before.
- Rejected: **LanguageTool** (a Java server or a paid API, no better at French), **the browser's spellcheck** (non-words only, different on every browser), **an AI pass while writing** (cost per keystroke pause, and it's the review's job).
- Next: the review as a coach, built on top of it (Review: the coach).

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
- Whether a tired learner finishes the review's changes or skips to the answer.
- Whether the AI's level estimates track real TEF/TCF results: build the small graded set the research recommends (30–60 essays, two FLE teachers) before trusting them.
- Whether AI score estimates track real TEF results.
- Which dictionary source to license: compare candidates on the same 50 words from real essays.

## Rendering

`cacheComponents` is on in `next.config.ts`, so every page prerenders a static shell. Read request-time data (`searchParams`, `params` without `generateStaticParams`, `cookies()`, `headers()`) inside a `<Suspense>` boundary with a skeleton fallback, never at the top of a page: outside Suspense it blocks the whole route (the dev overlay reports "Next.js encountered runtime data during prerendering"). See `app/write/page.tsx`. Browser-only state (localStorage drafts, carets, reviews) goes through `createLocalStore` in `lib/local-store.ts`, which renders `null` on the server and the stored value after hydration. Navigating away doesn't unmount a page: Cache Components hides it in React's `<Activity>`, so `useState` survives a trip Home and back while effects clean up and re-run. State that must end when the writer leaves (the timer) resets in a `useLayoutEffect` cleanup; see `essay-timer.tsx`.

### Coffee mode and the word count (decided 2026-10-26)

- **Coffee mode:** a coffee-cup button in the essay's app bar. On, only the writing and its word count are left: the app bar (crumb, timer, Review), the underlines and the review's column fade out and turn invisible, holding their places so the text doesn't move. The timer's line stays. The button stays where it was, to turn it off. The dictionary stays, since the writer can hide it themselves, but without its recent words; the timer keeps running. Page state only, like the timer.
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

### Review data (since 2026-10-27)

- One review per essay in localStorage (`app/write/review-store.ts`, `version: 2`; older reviews are dropped): the estimate, the items with their positions and status, and each paragraph's text as last reviewed (`reviewed`), which is what makes a paragraph new to the review.
- Items follow every edit (`trackEdit` → `marks.ts`); a lost item's words are found again by the text before them.
- **Memory across essays** keeps each essay's latest focus titles (each essay counted once, so reviewing again doesn't inflate a pattern); the review sends them to the AI so it reuses a title for a recurring pattern, and the column shows ×N.

## AI

Vercel's AI SDK (v7: `instructions`, not `system`; structured output is `generateText` + `Output.object`; portable `reasoning` effort). Models are named as AI Gateway ids like `openai/gpt-6-sol`. Config lives in `.env.local` (git-ignored): `INK_AI`, plus keys.

- `lib/ai/models.ts` (`resolveModel`): a provider's own key wins for that provider and calls it directly (`OPENAI_API_KEY` → `@ai-sdk/openai`; only OpenAI is wired up). Every other provider goes through AI Gateway (`AI_GATEWAY_API_KEY`, a `vck_…` key; on Vercel the deployment's OIDC token works instead). To route a provider through the Gateway, leave its key unset. The Gateway's free tier can't call every model (GPT-6 Sol needs paid credits). A missing key throws an error naming the env var to set.

- `lib/ai/instructions.ts`: the system prompts (`REVIEW_INSTRUCTIONS`, `ITEM_CHECK_INSTRUCTIONS`). A lean prompt plus the schema's `.describe()` text, not an uploaded skill (skills are provider-hosted bundles for sandboxed agents, and would tie the A/B to one provider). Honest over encouraging and precision over recall: a level shown too high gives false confidence, and a correct sentence marked wrong teaches a mistake. The exam tasks' facts live in the prompt. No `temperature`: reasoning models reject it.
- `lib/ai/config.ts`: which model and reasoning effort run each task (`check` an essay, judge a `fix`), as weighted arms. Default: GPT-6 Sol, `medium` for the check, `low` for fix checks. Read per request from Edge Config key `ai` when `EDGE_CONFIG` is set (live within ~1 min, no redeploy), else `INK_AI` (same JSON; `next dev` reloads it, but a deployment needs a restart, and on Vercel a redeploy), else the default. A bad config logs and falls back; it never stops checks. A review's id picks its arm, so one review and all its fix checks use one arm.
- `lib/ai/check.ts`: `runReview` (streamed; `onFound` gets the count of anchored items as the model writes them out, for the review trace; `review` limits items to some paragraphs), `judgeItem` (Check). Each call logs one JSON line (`ai.check` / `ai.fix`: arm, model, ms, level, task, items, dropped quotes, repeated underlines, tokens); that's what an A/B comparison is read from.
- `lib/ai/review.ts`: client-safe. Levels and their NCLC ranges (`NCLC`, approximate: FEI's TCF scale joined to IRCC's table; the TEF has no official CEFR table), `nextLevel`, skills, item kinds, tasks, the model-facing schema (no `.optional()` or numeric bounds: OpenAI's strict mode rejects some), and `anchorItems` (the model quotes the writer's words; offsets are found here, a quote not in the text is dropped, never guessed, and at most six changes and two strengths are kept).
- `lib/ai/correction.ts`: client-safe text helpers: `locate` (re-finds an item after edits by the words before it), `matchesAccepted` (a fix matching an accepted answer passes with no model call), `sentenceAround`.
- `app/write/actions.ts`: the server functions the review calls. `reviewEssay` runs Grammalecte first, then returns a `ReadableStream` of `found` events then `done`; `checkItem` is Check. Public POST endpoints: validate and cap input there, and add rate limiting before launch.
- `app/write/review-store.ts` (reviews and focus memory in localStorage, `trackEdit` moving items with every edit through `marks.ts`, `mergeReview` for incremental reviews), `review.tsx` (the flow, `EssayReview` with its layout and the item card, `ReviewAside`, `ReviewMarks`, `ReviewPending`, `useReviewText`).

## Design system

We are building our own design system, held to shadcn's standard. **Before writing any UI, read [DESIGN.md](DESIGN.md)** and the topic file it points to: tokens, the closed variant sets of every component, and which component to use when. This section covers how components get built; DESIGN.md covers how to use them. shadcn is allowed as a source of code, not as a look: it copies component source into `components/ui/`, which we own and restyle. No other styled component library.

- **shadcn for behavior-heavy components:** anything where the hard part is focus, keyboard, positioning or overlay behavior. Tooltip, Popover, Dialog/AlertDialog, Drawer (the review's column on phones), ToggleGroup, Tabs, DropdownMenu, Command (dictionary lookup), Sonner, Sidebar (with Sheet, for the app sidebar). Small pieces may start from it too: Button, Input, Textarea, Progress, Skeleton, Kbd, Separator. Underneath they stay Radix or Base UI. Styles, variants, tokens and motion are ours.
  - Add one with `bunx shadcn@latest add <name>` when a screen needs it, not in bulk. Run it with `--dry-run` first: a component that depends on Button, Input, Tooltip… lists them as `overwrite`, and installing would replace our restyled versions with stock ones. Back those files up and restore them right after, then diff to confirm.
  - shadcn sometimes renders random values (`SidebarMenuSkeleton` used `Math.random()`); with Cache Components that's a prerender error and a hydration mismatch. Make them deterministic.
  - Restyle it on arrival: swap shadcn's token classes (`bg-background`, `text-muted-foreground`, `bg-popover`, `ring-ring`, `border-input`…) for Ink's (`bg-raised`, `text-text-3`, `border-border-strong`…). Its classes generate nothing here. Don't add alias tokens for shadcn's names.
  - Replace its animation classes (`animate-in`, `fade-in-0`… from `tw-animate-css`) with our own motion; don't import `tw-animate-css`.
  - Never run `shadcn init`: its preset adds Geist as `--font-sans` and overwrites `--border` and `--primary`. `components.json` is hand-written; `shadcn add` only needs that. Added components import `cn` from `"cn"`: change it to `@/lib/utils`, whose `cn` knows our `text-*` sizes (the stock one drops `text-ui` next to `text-text-2`).
- **Native for product components**, the ones that are Ink: essay editor, prompt card, timer, word count, lookup panel (on Command), app bar, the review (`EssayReview`, `ReviewAside`, `ReviewMarks`, the item card), the grammar underlines, essay history row, empty states.
- **Build order:** tokens, motion pass, `DESIGN.md`, the review and the lookup panel are done → the phone bottom sheet for the review's column, essay history. When a component, variant or token changes, update its file in `docs/design/` in the same change.
- **Component APIs:** composition over configuration; compound components sharing state through context (e.g. `<EssayReview>` with `ReviewAside` and `ReviewMarks`, `<Dictionary>`); `variant`/`size` plus a `className` for layout only (DESIGN.md rule 2); forward refs; spread remaining props; support controlled and uncontrolled state (`activeId`/`defaultActiveId`/`onActiveIdChange`).
- **The review is not a rich-text editor:** its underlines (and Grammalecte's) are layers drawn under the editor's textareas (`renderUnderlay`), with the same text metrics and transparent text; the gutter dot goes in each paragraph's block (`renderAfter`). No `contenteditable`.
- **The writing screen uses our own block editor** (`app/write/`), never a third-party rich-text editor (TipTap, Lexical, ProseMirror, Slate…) and never `contenteditable`. One auto-growing `<textarea>` per paragraph, so the browser handles typing, accents and IME; the editor handles what crosses paragraphs (Enter, Backspace/Delete at the edges, ↑/↓/←/→, paste, reordering by drag, menu or ⌘⇧↑/↓, and selections across paragraphs) and owns undo. A selection can't span textareas, so one that crosses paragraphs (⌘A, Shift+arrows, Shift+click, a drag) briefly swaps them for plain `<p>`s with the same metrics and uses the browser's own selection; any edit puts the textareas back. Drag uses pointer events with pointer capture, not HTML5 drag-and-drop. (Sentence reordering in the review is still parked.) Enter at the end of a line starts a new line in the paragraph, and Enter again on that empty line takes it back and starts a new paragraph (decided 2026-10-26; how Notion leaves a list, not its plain blocks, where Enter always starts a new block); mid-line, Enter splits the paragraph. Paragraphs are the unit the review works in, so the model stays `{ id, text }[]` plain text, with `\n` for lines inside a paragraph. Block edits are pure functions in `blocks.ts` with tests (`bun test`); add a test with every new edit.
- **No shared component** until the code has been copy-pasted 2–3 times. shadcn primitives in `components/ui/` are the exception, added when a screen first needs one.
- **Skills to use:** `emil-design-foundations`, `emil-color`, `emil-typography`, `emil-component-design`, `emil-animations`, `emil-design-system-docs`.
