# genre-substantif (ddikman): French noun gender lookup, evaluated for reuse in Ink

Method: cloned https://github.com/ddikman/genre-substantif (163 commits, HEAD `7489842`, 2025-11-04 on `main`) and its upstream https://github.com/apertium/apertium-fra-eng, downloaded `apertium-fra.fra.metadix` from https://github.com/apertium/apertium-fra, read the GitHub REST API for metadata and issues, and parsed the shipped dataset with a Node script to count entries and spot-check words. Counts below come from that parse on 2026-10-26.

## What the project is, how it's built and deployed, who maintains it

### Takeaway
A small hobby Vue 3 + Vite single-page app by David Dikman (Greycastle, Sweden), live at genre-substantif.vercel.app. It looks up a French noun's gender entirely in the browser against an ~8,200-entry array bundled into the JS. It gets bursts of activity (much of the 2025 work came from Cursor/Claude agents) and has 12 stars.

### Cited Findings
- Description: "Gender lookup for french words, in browser." Homepage `genre-substantif.vercel.app`; 12 stars, 2 forks, 5 open issues/PRs; created 2022-08-25; last push 2026-02-28; primary language TypeScript; not archived; GitHub's `license` field is `null` — [GitHub API repo](https://api.github.com/repos/ddikman/genre-substantif)
- Author: David Dikman, company Greycastle, Örebro, Sweden, 141 public repos — [GitHub API user](https://api.github.com/users/ddikman)
- Live site responds HTTP 200 with title "French word gender lookup - Genre Substantif" — [genre-substantif.vercel.app](https://genre-substantif.vercel.app/)
- Stack: Vue 3.3, vue-router 4, @vueuse, Vite 4, vitest; `firebase` and `@slack/web-api` for the backend; yarn — [package.json](https://github.com/ddikman/genre-substantif/blob/main/package.json)
- Build: `yarn build` → Vite client build + SSR build + `prerender.js`, which pre-renders each `src/pages/*.vue` to static HTML (SSG). Vercel serves `dist/static` with an SPA rewrite of everything to `/index.html` — [README](https://github.com/ddikman/genre-substantif/blob/main/README.md), [prerender.js](https://github.com/ddikman/genre-substantif/blob/main/prerender.js), [vercel.json](https://github.com/ddikman/genre-substantif/blob/main/vercel.json)
- The only backend is a Vercel function, [api/request.ts](https://github.com/ddikman/genre-substantif/blob/main/api/request.ts). When a word isn't found, the user can click "Request to add": the function posts "Request to add {word}" to a Slack channel and writes the word to Firestore (`genre-substantif/data/word-requests/{word}`). The client calls it from [TheNotFoundNotice.vue](https://github.com/ddikman/genre-substantif/blob/main/src/components/TheNotFoundNotice.vue). Lookups are logged to Google Analytics via `gtag` ([logEvent.ts](https://github.com/ddikman/genre-substantif/blob/main/src/services/logEvent.ts)).
- Features: a lookup page (debounced input, recent lookups), a `/dictionary` page with search and pagination (added 2025-06-22 by Cursor Agent, PR #24), and a "practice" quiz over a hard-coded list of ~18 words with ending-rule tips — [ThePractice.vue](https://github.com/ddikman/genre-substantif/blob/main/src/components/ThePractice.vue), [PR list](https://api.github.com/repos/ddikman/genre-substantif/issues?state=all)
- Commit history (git log): the first commit is 2022-08-26; a burst ran Aug–Nov 2022, then sporadic fixes in 2023–2025. Commits on 2025-06-22/23 are authored by "Cursor Agent" and on 2025-11-04 by "Claude". The last merged commit is 2025-11-04 (fix étudiant/étudiante, fix a "not found" race condition). Open PR #30 (2026-02-28, Cursor) adds `scripts/generate-french-words.sh`, which generates "2,928 unique French nouns with gender using the OpenAI API" — [PR #30](https://github.com/ddikman/genre-substantif/pull/30)
- Open PR #1 (2022) tried the PONS API but hit CORS and a 1,000 lookups/month limit — [PR #1](https://github.com/ddikman/genre-substantif/pull/1)
- README roadmap: "Automatically add more entries to the dictionary using AI" and "Fix the multiple-match by showing gender per word, not for the first match" — [README](https://github.com/ddikman/genre-substantif/blob/main/README.md)

### Inferences
- This is a one-person side project with hobby-level maintenance; nothing about it suggests a maintained dataset or API Ink could depend on.

### Gaps
- No traffic or usage figures are public. The Figma file linked in the README was not opened.

## Where the gender data comes from and how lookups work

### Takeaway
The data is a one-off conversion of Apertium's French–English **bilingual** translation dictionary (`apertium-fra-eng.fra-eng.dix`, GPL-3.0), plus 77 hand-added entries. It's frozen as a 556 KB TypeScript array that has since been hand-edited. A lookup is a linear `Array.filter` over that array, matching exact lowercase or accent-stripped forms, with an English fallback and a naive plural stripper.

### Cited Findings
- README: "For the dictionary I am using a reparsed version of apertium-fra-eng. It is parsed using the `convert-dix.js` format and the jsonized dictionary is stored in `src/services/dictionary.ts`." — [README](https://github.com/ddikman/genre-substantif/blob/main/README.md)
- [convert-dix.js](https://github.com/ddikman/genre-substantif/blob/main/convert-dix.js) parses the `.dix` XML with `xml2js` (which isn't in package.json). For each `<e><p><l>…</l><r>…</r></p></e>` it takes the French word (`l._`), the English word (`r._`) and the tags. It keeps entries tagged `n` or `np` (proper nouns too) whose tags include a gender in `{f:'f', m:'m', un:'n'}`, and writes `[{fr, en, gen}]` to `src/services/dictionary.ts`.
- **Bug: nouns of both genders are dropped.** The mapping looks for a tag `un`, but Apertium marks both-gender nouns `mf` (1,619 `n="mf"` occurrences in the bidix; for example `élève<s n="n"/><s n="mf"/>`, `enfant … mf`, `critique … mf`). The output has 0 `n`/`m/f` entries, so words like élève, enfant and critique are missing from the generated data. The author re-added élève and colocataire by hand as `m/f` in [customDictionary.ts](https://github.com/ddikman/genre-substantif/blob/main/src/services/customDictionary.ts), and enfant as `m` only — [apertium-fra-eng.fra-eng.dix](https://github.com/apertium/apertium-fra-eng/blob/master/apertium-fra-eng.fra-eng.dix); parse of `src/services/dictionary.ts`
- **Bug: multi-word nouns are concatenated.** `xml2js` `._` loses the `<b/>` blank element, giving entries like `"sessionplénière"`, `"compagnieaérienne"`, `"armebiologique"`, `"Émiratsarabesunis"`/`"UnitedArabEmirates"`, `"Samoaoccidentales"`. These can never match user input. My parse found 0 French entries containing a space — [src/services/dictionary.ts](https://github.com/ddikman/genre-substantif/blob/main/src/services/dictionary.ts)
- `GD` (gender-to-be-determined) entries are also dropped. Example source lines for détenteur: `c="alt-eco"` m → "fork", `c="alt-std"` f → "fork", `r="RL"` GD → "possessor". The app keeps only the nonsensical "fork" rows — [bidix](https://github.com/apertium/apertium-fra-eng/blob/master/apertium-fra-eng.fra-eng.dix)
- The generated file says "This file is generated by convert-dix.js. Do not edit by hand." It has nonetheless been hand-edited: `.concat(customDictionary)` was appended, the maison mapping removed (commit `6052801`, 2025-04-04, issue #21), chat changed f→m (commit `c750de4`, 2025-06-18, issue #22), and étudiant fixed (commit `252eeaf`, 2025-11-04). Re-running the script would wipe these fixes — git log of `src/services/dictionary.ts`
- Upstream: apertium-fra-eng is licensed GPL-3.0, last pushed 2025-04-05, first commit 2013-05-11 ("new pair"); the bidix has 16,802 lines / ~16,575 `<e` entries — [GitHub API apertium-fra-eng](https://api.github.com/repos/apertium/apertium-fra-eng), [COPYING](https://github.com/apertium/apertium-fra-eng/blob/master/COPYING)
- Lookup ([lookupWord.ts](https://github.com/ddikman/genre-substantif/blob/main/src/services/lookupWord.ts)):
  - `dictionary.filter(item => item.fr === value.toLowerCase() || toNormalForm(item.fr) === value.toLowerCase())`, where `toNormalForm` is NFD plus stripping combining marks (so "depot" finds "dépôt").
  - If nothing matches, it takes the first entry whose `en` equals the input.
  - `groupWordsByGender` dedupes the matches and marks the gender with the most matches as "primary".
  - Comparing a lowercased query to `item.fr` without lowercasing `item.fr` means the 475 capitalized entries (countries, etc.) only match through the accent-stripped branch if the stored form is already lowercase; for example "France" is stored capitalized and can't be found from "france" (inference from the code).
- Plurals: [getSingularForm.ts](https://github.com/ddikman/genre-substantif/blob/main/src/services/getSingularForm.ts) applies regexes in order: `eaux→eau`, `aux→al`, strip `s`, strip `x`. [TheNounLookup.vue](https://github.com/ddikman/genre-substantif/blob/main/src/components/TheNounLookup.vue) retries with that form when the input isn't found. There's no lemmatizer. Irregular plurals fail: "travaux" isn't in the data, and the `aux→al` rule turns it into "traval", which isn't either. The `s`/`x` rules also strip nouns that are invariable or end in s/x in the singular (for example "bras", "prix").
- Data shape: `interface DictionaryWord { fr: string; en: string; gen: string }`, where gen is in `m | f | n | m/f` per the test ([models/dictionaryWord.ts](https://github.com/ddikman/genre-substantif/blob/main/src/models/dictionaryWord.ts), [dictionary.test.ts](https://github.com/ddikman/genre-substantif/blob/main/src/services/dictionary.test.ts))

### Inferences
- "How it was built" amounts to one Node script run once (probably in 2022) against the bidix. That script is the whole pipeline; nothing has regenerated the data since.
- The upstream file is a machine-translation transfer lexicon, not a dictionary of French. Its coverage is shaped by what the MT pair needed, which explains the odd glosses (avoir → "tank", détenteur → "fork").

### Gaps
- Which apertium-fra-eng commit was converted isn't recorded anywhere.

## License (code and data) and what carries through

### Takeaway
The repo has **no license**, so its code and its curated additions are all rights reserved by default. The underlying data is derived from **GPL-3.0** Apertium data, so the generated `dictionary.ts` is a GPL-3.0 derivative that the repo redistributes without stating the GPL. Ink can't legally copy the repo's code or `customDictionary.ts`. It could use Apertium data directly under GPL-3.0 terms, with the copyleft caveats below.

### Cited Findings
- There's no LICENSE file in the repo root (the tree has no LICENSE/COPYING). The GitHub API returns `"license": null`, and `/license` returns 404 — [GitHub API](https://api.github.com/repos/ddikman/genre-substantif/license)
- With no license, default copyright applies: others may not reproduce, distribute, or create derivative works — [choosealicense.com "No License"](https://choosealicense.com/no-permissions/)
- apertium-fra-eng and apertium-fra are both GPL-3.0 (COPYING: "GNU GENERAL PUBLIC LICENSE Version 3, 29 June 2007") — [apertium-fra-eng COPYING](https://github.com/apertium/apertium-fra-eng/blob/master/COPYING), [apertium-fra COPYING](https://github.com/apertium/apertium-fra/blob/master/COPYING)
- Issue #18 (open) suggests switching to Lefff 3.4 (`lefff-3.4.mlex`, through FrenchLefffLemmatizer). The author replied it's in the backlog — [issue #18](https://github.com/ddikman/genre-substantif/issues/18)

### Inferences
- **Code**: all rights reserved. It's also tiny and Vue-specific (`lookupWord.ts` ~90 lines, `getSingularForm.ts` ~20 lines), so rewriting it from scratch in TypeScript takes minutes and needs no permission. Asking the author for an MIT license is possible, but there's nothing worth it.
- **Data**, as I read GPL-3.0 (not legal advice):
  - Running GPL-3.0 data on Ink's server only (a lookup in a server action) isn't "conveying", so it creates no source-release duty. GPL-3.0, unlike AGPL-3.0, has no network clause.
  - Shipping the data to the browser (bundled JSON, IndexedDB download) is conveying. The safe pattern is a separate, unmodified-or-documented data file with a GPL-3.0 notice and a source offer, kept apart from Ink's own code (an "aggregate"). Bundling it into Ink's JS chunk invites the argument that the bundle is a derivative work.
  - Either way, Ink should use Apertium directly, not the genre-substantif copy, because that copy adds unlicensed hand edits.
- If share-alike terms are a concern at all, the alternatives (Wiktionary/kaikki: CC BY-SA; Lexique 3: CC BY-SA 4.0; Lefff: LGPL-LR) all carry some copyleft or attribution. The GPL is the strongest of these for software but doesn't apply to server-side use. Those sources are other researchers' scope; I didn't verify them here.

### Gaps
- I didn't verify whether Apertium's contributors have stated how the GPL applies to the data alone, outside the software. No legal opinion was sought.

## Data quality

### Takeaway
Low: 6,488 unique French forms (8,135 rows plus 77 custom), with no both-gender nouns from the source, no usable multi-word nouns, about 475 proper nouns mixed in, sense-blind m/f pairs, and known wrong entries fixed one issue at a time. Common TEF words are missing (orgue, pétale, critique, pendule, cœur, œuvre with the ligature). It isn't fit as Ink's gender authority. Apertium's own **monolingual** `apertium-fra.fra.metadix` is far bigger and better.

### Cited Findings (my parse of [src/services/dictionary.ts](https://github.com/ddikman/genre-substantif/blob/main/src/services/dictionary.ts), excluding customDictionary)
- 8,135 rows; 6,488 unique `fr` strings; genders m 3,812 / f 4,323 rows. By lemma, 2,846 only-m, 3,493 only-f, and 149 with both m and f rows (polysemous or alternating nouns). There are 0 `n` or `m/f` rows.
- Spot checks:

| Word | Result |
|---|---|
| tour | m: return/shift/turn/vault, f: tower (correct, sense-split) |
| livre | m: book only (misses la livre, pound) |
| après-midi | m twice (f also accepted, missing) |
| pétale | missing |
| espace | m (correct) |
| orgue | missing |
| manche | m handle / f sleeve (correct) |
| mode | f fashion / m way (correct) |
| moule | m mould / f mussel (correct) |
| voile | m veil / f sail, but also f "candle" (wrong gloss) |
| vase | m "mud" (wrong: la vase = mud), m vase |
| poste | m only (la poste missing) |
| critique, pendule, élève, enfant | missing from the generated data (élève/enfant only via custom; enfant custom is m-only) |
| œuvre / cœur | missing (oeuvre spelled with "oe" exists as f) |
| gens | m "person" |
| télétravail | m |
| embouteillage | m "bottling" |
| verre | m (fixed in issue #20) |
| France | f, but unreachable from lowercase input |

- The bidix itself carries errors that pass straight through. For example `vase<s n="n"/><s n="m"/></l><r>mud` is wrong in the source, and élève/critique entries have Spanish glosses ("alumno", "crítico") — [apertium-fra-eng bidix](https://github.com/apertium/apertium-fra-eng/blob/master/apertium-fra-eng.fra-eng.dix)
- User reports of wrong genders: maison (#21), chat (#22), verre (#20), étudiant (#26), plus a general "words source used is not accurate" (#18) — [issues](https://github.com/ddikman/genre-substantif/issues?q=is%3Aissue)
- The practice list itself has errors: `{ word: 'verre', tip: FEMININE_ENDINGS, gender: FEMININE }` (verre is masculine), and `'legume'` without its accent — [ThePractice.vue](https://github.com/ddikman/genre-substantif/blob/main/src/components/ThePractice.vue)
- Custom entries tag adjectives as nouns with a gender: "même" m ("same"/"even"), "bon" m, "cher"/"chère", "aérienne" f, "ridicule" m "ridiculous" — [customDictionary.ts](https://github.com/ddikman/genre-substantif/blob/main/src/services/customDictionary.ts)
- **Apertium monolingual comparison** ([apertium-fra.fra.metadix](https://github.com/apertium/apertium-fra/blob/master/apertium-fra.fra.metadix), 9.2 MB, last pushed 2026-10-12):
  - Nouns attach to gender paradigms: `accessoire__n` = m (sg/pl), `abeille__n` = f, `artiste__n` = mf, `mois__n` = m invariable.
  - Lines referencing the main paradigms: accessoire__n 13,155, abeille__n 13,087, artiste__n 2,831. That's roughly 29k common-noun lemma entries, about 4× genre-substantif.
  - It has pétale (m), orgue (m), espace (m), tour (m and f), livre (m and f), and après-midi (m and f, plus a `mois__n` pre-1990 spelling).
  - Some entries carry sense comments: vase `c="récipient"` → m, `c="limon"` → f.

### Inferences
- Counts of meaning-dependent nouns (tour, manche, mode, moule, voile, poste, livre, vase) are hit-or-miss. The app shows a "primary" gender by majority of rows, which is meaningless for homographs: tour gets 4 m rows vs 1 f, so it's shown as "masculine" with "feminine" secondary.
- Gender rules a TEF writer needs aren't captured: orgue/amour/délice switching gender in the plural, gens, words whose gender depends on the person (un/une élève). Noise comes mostly from the MT bidix (proper nouns, odd glosses), not rare-word junk.
- The 29k figure is an approximate grep count of paradigm references, not deduplicated lemmas. Treat it as an order of magnitude.

### Gaps
- I didn't check the apertium-fra metadix error rate systematically, how it handles plural-only nouns, or how it handles orgue/amour/délice in the plural.

## Reuse options for Ink, effort, and pitfalls

### Takeaway
Don't reuse genre-substantif's code or dataset: it's unlicensed, Vue-specific, small and buggy. If Ink wants a free, storable gender source, rebuild the idea from **Apertium's monolingual `apertium-fra.fra.metadix`** (GPL-3.0) with a ~100-line build script producing `{lemma: "m"|"f"|"mf"}` JSON, and serve lookups server-side so GPL conveying doesn't come up. Compare it against Lefff, Lexique and Wiktionary, which other researchers cover, before choosing.

### Cited Findings
- The app's whole pipeline is [convert-dix.js](https://github.com/ddikman/genre-substantif/blob/main/convert-dix.js) (~60 lines) plus a static TS array; there's nothing else to "reuse" — [repo tree](https://github.com/ddikman/genre-substantif)
- The author's own planned direction is AI-generated word lists (PR #30, OpenAI script) and possibly Lefff (#18), which shows he also considers the current data inadequate — [PR #30](https://github.com/ddikman/genre-substantif/pull/30), [issue #18](https://github.com/ddikman/genre-substantif/issues/18)

### Inferences

**Options:**

1. **Copy the code.** Not allowed (no license), and not worth it: Vue 3 SFCs and ~110 lines of trivial TS. Ink is Next.js 16 / React 19 with its own dictionary panel (`app/write/dictionary.tsx`), so a rewrite is ~1 hour and the right call anyway.
2. **Reuse `dictionary.ts`.** Not allowed (it's a GPL-3.0 derivative plus unlicensed hand edits, with no license stated) and low quality (no mf, broken multi-word nouns, ~6.5k forms). Reject.
3. **Rebuild from Apertium monolingual** (recommended if Apertium is chosen):
   - Parse `apertium-fra.fra.metadix` `<e lm="…"><i>…</i><par n="X__n"/>`.
   - Resolve each `__n` pardef to its gender (`m`/`f`/`mf`, plus sg/pl/sp number) by reading its `<pardef>`.
   - Collect every (lemma, gender, `c=` sense comment) triple, keep `__np` (proper nouns) separately or drop them, and also emit the inflected surface forms (lemma + pardef suffix such as `s`, `x`, `aux`) mapped back to the lemma, so plurals resolve without regex guessing.
   - Output: one JSON keyed by lemma, roughly 30k entries, likely around 1 MB raw and a few hundred KB gzipped (my estimate, not measured).
   - Effort: about 0.5–1 day for the script and tests, plus 0.5 day spot-checking against a 50-word TEF list.
4. **Bilingual Apertium (what genre-substantif used).** It's only useful if Ink wants a French→English gloss alongside the gender. The gloss quality is poor; Ink already gets glosses from Google Translate.

**Pitfalls when rebuilding:**

- Map `mf` (both genders) explicitly; this is the exact bug in `convert-dix.js`.
- Preserve `<b/>` as a space and `<j/>`/`<g>` as needed for multi-word nouns ("pomme de terre", "salle à manger").
- Don't pick a "primary" gender by row count. Show every gender with its sense (`c=` comments where present) and flag homographs (tour, manche, livre, poste, voile, vase, moule, mode, critique, mémoire, page, somme, solde).
- Lowercase both sides, but keep the accents in the stored form. Accent-insensitive matching is fine for the input but must show the accented lemma back.
- GPL-3.0: keep the generated JSON as a separate file with attribution, a GPL-3.0 notice and a link to the Apertium source, and ideally query it server-side (an `app/write/actions.ts`-style server function) rather than bundling it client-side. Reconsider if Ink wants offline in-browser lookups (the CLAUDE.md "instant, offline lookups stored in the browser" goal for licensed data), because shipping the data to the browser conveys it.
- Apertium is an MT lexicon. It encodes what's needed for translation and may lack plural-gender quirks (amour/délice/orgue plural feminine) and person-dependent nouns. Pair it with a short hand-curated exceptions list owned by Ink.

### Gaps
- No measured output size or lemma count for an Apertium-monolingual rebuild; only the grep-based estimate above.
- No side-by-side accuracy measurement against Lefff, Lexique 3 or Wiktionary was done here. The Ink open question ("compare candidates on the same 50 words from real essays") still applies.
