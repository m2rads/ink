# Ship LGPL-LR tables, skip genre-substantif

**Recommendation.** For conjugation, build static per-verb JSON from the Lefff table in `french-verbs-lefff` (LGPL-LR data, 7,826 verbs). Patch the bad cells you know about, add the variant spellings it leaves out, and compose compound tenses in Ink's own code. For noun gender, **don't reuse genre-substantif**. It has no license, its data is a buggy one-off conversion of a GPL-3.0 machine-translation lexicon, and it holds only about 6,500 words. Build gender from **Morphalou 3.1** instead: LGPL-LR like the conjugation data, about 102k noun lemmas, gender on every noun. Trim it with Lexique 3.83 frequencies. Every free option is fast once loaded, so the real costs are licence paperwork and a hand check of the verbs and nouns TEF candidates actually use. No source is clean enough to show learners unchecked. This is not legal advice: have counsel read LGPL-LR before launch.

## Conjugation: three real JS options, and only one fits a closed app

| Option | Code / data licence | State | Size | Verdict |
|---|---|---|---|---|
| `french-verbs` + `french-verbs-lefff` (RosaeNLG) | Apache-2.0 / **LGPL-LR** (Lefff) | **Archived and deprecated March 2026**; still installs | 13 KB engine; 6.3 MB JSON, **~0.98 MB gzipped**, ~0.8 KB per verb | **Use it: vendor the code and data** |
| `conjugation-fr` (Verbiste) | GPL-2.0 / GPL-2.0 | No release since 2023 | ~41 KB gzipped (templates) | Smallest and has the best variants, but **GPL rules out a closed client bundle** |
| `@v4nn4/ablaut` | MIT OR Apache-2.0, ships no data | Released August 2026, 1 maintainer, 4 stars | 1.5 MB gzipped WASM (21 languages) | Most rigorous checking, too young to depend on. Watch it |
| Morphalou 3.1 (ATILF) | LGPL-LR | Released 2016 | 14,762 verbs, simple tenses only | A source to diff against for variants |
| verbecc, mlconjug3 (Python) | LGPL-3.0 / MIT, but the data is Verbiste's | Open regressions | Needs a server and scikit-learn | No |
| Zyla, RapidAPI, Verbix | Paid or unclear | 0.6–0.8 s per call; Zyla's own sample has garbled forms | n/a | No |

Sources: [french-verbs-lefff](https://cdn.jsdelivr.net/npm/french-verbs-lefff@3.4.0/README.md), [RosaeNLG README](https://github.com/RosaeNLG/rosaenlg), [conjugation-fr](https://github.com/gauthier-th/conjugation-fr), [Verbiste](http://sarrazip.com/dev/verbiste.html), [ablaut](https://github.com/ablaut-dev/ablaut), [Morphalou LISEZ-MOI](https://repository.ortolang.fr/api/content/morphalou/latest/LISEZ-MOI.html), [Zyla](https://zylalabs.com/api-marketplace/dictionary/french+conjugation+api/439).

Speed isn't the issue. Every option is an in-memory lookup once loaded. Split the Lefff JSON into one file per verb (about 300–400 bytes gzipped each) and serve them as static assets, or cache them in IndexedDB so lookups work offline. The licence does constrain things. The maintainer's reading, which matches the licence text, is that Ink's code can stay closed if the data ships as a **separate, credited LGPL-LR file**. Any trimmed or patched version also has to be published under LGPL-LR ([issue #214](https://github.com/RosaeNLG/rosaenlg/issues/214), [LGPL-LR text](https://cdn.jsdelivr.net/npm/french-verbs-lefff@3.4.0/dist/LICENSE)). Verbiste's terms say any converted copy stays GPL. That rules out `conjugation-fr` and anything built from Verbiste.

**The Lefff table is not accurate enough to ship unedited.** Measured problems:

- It stores one form per cell, so *paie/paye*, *assieds/assois* and 1990-reform spellings (*cèderai*, *paraitre*) are missing. A learner who writes the other correct spelling could take it for a mistake.
- Wrong cells: the participle of *résoudre* is given as "résous", the present of *gésir* is broken, and *taire* is written "taît" ([measured file](https://cdn.jsdelivr.net/npm/french-verbs-lefff@3.4.0/dist/conjugations.json), [ablaut adjudications](https://github.com/ablaut-dev/ablaut/blob/main/docs/fra/adjudications.tsv)).
- No library adds the *ne* of negation or makes past participles agree with être by itself. Ink should show the rule ("allé(e)(s)") rather than one agreed form.

## genre-substantif: unlicensed, built on GPL data, and full of gaps

[genre-substantif](https://github.com/ddikman/genre-substantif) is a one-person Vue side project with 12 stars. One script, run once ([convert-dix.js](https://github.com/ddikman/genre-substantif/blob/main/convert-dix.js)), converted Apertium's **French–English bilingual** translation dictionary into a 556 KB TypeScript array. 77 entries were added by hand, and the array has been hand-edited since, so re-running the script would erase those fixes.

| Question | Finding |
|---|---|
| Licence | **None**: all rights reserved ([GitHub API](https://api.github.com/repos/ddikman/genre-substantif/license)). The data is derived from [GPL-3.0 Apertium](https://github.com/apertium/apertium-fra-eng/blob/master/COPYING) but doesn't say so |
| Size | 8,135 rows, **6,488 unique words**, including ~475 proper nouns |
| Build bugs | Looks for gender tag `un` where Apertium uses `mf`, so **every two-gender noun is dropped** (élève, enfant, critique). It also deletes the spaces in multi-word nouns ("sessionplénière") |
| Accuracy | Missing *pétale*, *orgue*, *cœur*, *la poste*, *la livre*. Wrong or odd entries include *vase* = "mud" and *chat* (fixed by hand). Users filed issues for *maison*, *chat*, *verre* and *étudiant* |
| Lookup | Linear `filter` over the array, plus a regex plural stripper that breaks *travaux*, *bras* and *prix* |
| Author's own plan | Generate words with OpenAI ([PR #30](https://github.com/ddikman/genre-substantif/pull/30)) or switch to Lefff ([issue #18](https://github.com/ddikman/genre-substantif/issues/18)) |

Ink can't legally copy the code or the curated data, and has no reason to: the logic is about 110 lines and quick to rewrite in TypeScript. The idea of an instant, offline gender lookup is worth keeping. The data isn't.

## Gender: Morphalou for coverage, Wiktionary for meaning-dependent gender

| Source | Licence | Coverage | Can Ink ship it to the browser? |
|---|---|---|---|
| **Morphalou 3.1** | LGPL-LR | 102,238 noun lemmas, gender m/f/invariable, per-form gender for *amour*, *délice*, *orgue* | **Yes**, as a separate credited file (same terms as the Lefff data) |
| Lexique 3.83 | CC BY-SA 4.0 | ~140k words with gender, number and **frequency** | Yes, if the derived file stays CC BY-SA. Use it to rank and trim |
| Wiktionary (kaikki.org) | CC BY-SA | Only source that **ties gender to meaning** (*le/la tour*) and marks two-gender nouns | Yes, after heavy filtering (the raw extract is GBs) |
| Apertium `apertium-fra` (monolingual) | GPL-3.0 | ~29k noun lemmas (rough count) | Only behind a server action. Sending it to the browser counts as distributing it under the GPL |
| Lexique 4.1 | Contradictory (page says BY-SA, link says BY-NC) | ~190k forms | Not until the authors clarify |
| Collins, Oxford APIs | Commercial, **no caching allowed** | Gender inside entries | Every lookup is a paid online call |

Sources: [Morphalou LISEZ-MOI](https://repository.ortolang.fr/api/content/morphalou/latest/LISEZ-MOI.html), [Lexique 3.83](https://github.com/chrplr/openlexicon/blob/master/datasets-info/Lexique383/README-Lexique.md), [lexique.org](http://www.lexique.org/), [kaikki.org](https://kaikki.org/dictionary/French/index.html), [apertium-fra metadix](https://github.com/apertium/apertium-fra/blob/master/apertium-fra.fra.metadix), [OUP terms](https://developer.oxforddictionaries.com/api-terms-and-conditions).

Using Morphalou keeps conjugation and gender under one licence, with one notice and one public data repo. Pitfalls to design for:

- Words like *tour*, *manche*, *poste* and *livre* need **every gender shown with its meaning**, never a "primary" one.
- Two-gender nouns (*élève*) and nouns whose gender changes in the plural need their own labels.
- Accent-insensitive matching is fine for input, but the panel must show the word with its accents.

## What's still unknown

- No study was found comparing these sources' error rates, or how often frontier LLMs get French conjugation or gender wrong ([MORPHOGEN](https://arxiv.org/html/2604.18914) is the closest). Run the 50-word check AGENTS.md already plans, on verbs and nouns from real essays.
- Morphalou's own pages were partly unreachable. Not yet checked: how it encodes *le/la tour*, whether it records which auxiliary a verb takes (Lefff's table and a short list of être verbs cover that), and whether its variant spellings fill Lefff's gaps.
- An LLM is useful only as a fallback for rare words, with its answers stored and checked. It shouldn't be the reference: a confidently wrong form teaches the mistake Ink exists to fix.
