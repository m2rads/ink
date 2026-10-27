# Verb conjugation data

`lib/conjugation.ts` reads `lefff.json` and `lexique.json` on the server only (the dictionary's `lookUp` action). They never ship to the browser: a lookup returns one verb (about 0.6–1.1 KB of JSON), and `compose.ts` builds its compound tenses on the client from `auxiliaries.ts`. Rebuild with `bun scripts/build-conjugation.ts`; it downloads the sources to `.cache/conjugation/` (git-ignored), and reuses Lexique from `.cache/gender/` if the gender build fetched it.

| File | Source | Licence | What was changed |
|---|---|---|---|
| `lefff.json` | The Lefff conjugation table (Sagot, INRIA), as extracted in the npm package [`french-verbs-lefff`](https://www.npmjs.com/package/french-verbs-lefff) 3.4.0 (RosaeNLG, archived 2026) | [LGPL-LR](LICENSE-LGPLLR.txt) | Re-encoded as stems and shared ending templates. Imparfait du subjonctif dropped. Entries removed, cells fixed, variant and 1990 spellings added, and auxiliary, pronominal and h-aspiré flags set, all from `curated.ts` and the rules in `scripts/build-conjugation.ts` (listed below). |
| `LICENSE-LGPLLR.txt` | Copied from `french-verbs-lefff/dist/LICENSE` | | |
| `lexique.json` | [Lexique 3.83](http://www.lexique.org/) (New, Pallier et al.) | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | Verbs in order of frequency (lemma, books and films averaged), and two lists of verb forms used mostly as other words: under half their uses (`other`: porte, livre, souvenir) and under 15% (`rare`: plus, tu, bois). |
| `curated.ts` | Ink | Ink's own | Auxiliaries, pronominal-only verbs, h aspiré, fixes. Facts checked by hand, not derived from Lefff. |

Under the LGPL-LR, `lefff.json` is a modified copy of the Lefff resource and stays under the LGPL-LR (this notice and the licence text go with it, and the build script that derives it is in the repo, so it can be rebuilt from or swapped for another copy of Lefff). Ink's code is not affected. `lexique.json` stays under CC BY-SA 4.0 with the attribution above. The npm `french-verbs` engine (Apache-2.0) is not used: its auxiliary rule (pronominal → être, a list of être verbs, transitive → avoir) was rewritten as Ink's own lists in `curated.ts`. Not legal advice: have counsel read the LGPL-LR before launch.

## What Ink changes in Lefff

- **Wrong cells fixed:** résoudre's participle (résous → résolu), inclure's (inclu → inclus), taire (taît → tait), vêtir (vêtit → vêt), foutre's imperative (fouts → fous), pouvoir's present (puis alone → peux, puis), circumflexes on agreed participles (dûs, mûs, crûs, accrû, décrû → dus, mus, crus, accru, décru), invariable participles inflected (plues, luit → plu, lui), courbaturer (courbatus). Gésir's broken present, frire (conjugated on friser's endings), faillir (an archaic present colliding with il faut), échoir (impersonal, given every person) and surseoir (a handful of cells) rewritten. Ressortir, dévêtir, revêtir, reluire, rasseoir and automaintenir rebuilt from their base verb.
- **Removed:** non-verbs (voici, voilà), verbs conjugated wrongly throughout and rare (raller, énamourer), old spellings duplicated by a modern entry (déjeûner, draîner, saoûler), and 18 verbs with no present (quérir, issir, forfaire…).
- **Variants shown** (both standard, the more common first): paie/paye for every -ayer verb but bayer, in every tense; asseoir's assieds/assois series in full (Lefff has only assois); je peux/je puis.
- **1990 spellings: recognised, not shown.** The reform spellings are correct and the TEF accepts them, so a learner who writes one finds the verb (je cèderai, il ruissèle, il connait, entrainer, assoir). The tables show the traditional spellings only: putting both in every cell of every -eler, -eter, é→è and î verb would double much of the table for a choice the learner doesn't have to make. Kept out: circumflexes in passé simple endings (nous connûmes), dû and mû, croître (its circumflex tells it from croire).
- **Checked by hand:** the 150 most frequent verbs in Lexique (62 irregular ones cell by cell; the rest are first and second group verbs, all checked against the regular endings, as were all 7,000 -er verbs) plus 70 irregular verbs learners use (résoudre, acquérir, conclure, craindre, haïr, mouvoir, croître, the -dire family…). Every derived verb was also compared with its base verb (maintenir/tenir) to find the automaintenir and ressortir errors.

## Known gaps

- No imparfait du subjonctif (qu'il fût); the dictionary doesn't show it, so it isn't recognised either.
- Verbs whose meaning changes the auxiliary beyond `BOTH` (convenir, paraître, apparaître with avoir) show one auxiliary.
- s'en aller, s'en vouloir and other verbs with "en" are shown without it (aller; se vouloir).
- "allez-vous", "levez-vous": a question and an imperative look alike; both readings are returned, the verb isn't marked pronominal.
- The rare defective verbs (choir, déchoir, ouïr, seoir, clore) are Lefff's, unchecked.
- Context reading is a few rules (subject pronouns, a noun after a determiner, que, ne, reflexive pronouns, an auxiliary within a few adverbs of a participle), not a parser. "Il a plu" is read as plaire, the more frequent verb.

## Performance (measured 2026-10-27, `bun scripts/bench-conjugation.ts`)

Each layout in a fresh Node 22 process, bundled as Next would (the JSON inlined in the module); medians of 5 runs; lookups over 22,000 forms (20,000 drawn from every verb, 2,000 non-verbs) after warm-up; MacBook (Apple silicon).

| Layout | Data raw / gzip | Cold: import + first lookup | Heap | One form p50 / p99 |
|---|---|---|---|---|
| A: one JSON of every verb's forms, a Map of all forms built at cold start | 4,231 KB / 740 KB | 22 + 110 ms | 49 MB | 0.1 / 0.3 µs |
| B: a sorted form index searched in place (as `lib/gender`) + one line per verb decoded on demand | 10,909 KB / 2,468 KB | 51 + 7 ms | 22 MB | 1.5 / 2.5 µs |
| **C (shipped): stems + 149 shared ending templates; a form is found by its ending** | **266 KB / 79 KB** | **2 + 9 ms** | **4 MB** | **3.4 / 12 µs** |

C is 16× smaller than A and 40× smaller than B, starts fastest and uses the least memory; its lookups are slower but still microseconds, next to a Google Translate call of 100 ms or more. The whole `lookUpVerb` (tokenising, context, choosing the verb, building the result) takes 9 µs p50 and 20 µs p99 on C; a result is 0.6–1.1 KB. The index is built on the first lookup, not at import.
