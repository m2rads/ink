# French verb conjugation libraries for a TypeScript/Next.js app (state as of 2026-10-26)

Method note: package metadata came from the npm registry (`npm view`), the npm downloads API, PyPI JSON, pypistats, the crates.io API and the GitHub API, all queried on 2026-10-26. Data sizes, gzip sizes and sample entries were measured by downloading the published files from jsDelivr and inspecting them locally. **Caveat:** the npm "last-week" downloads endpoint returned the window 2026-06-25 to 2026-07-01 for every package, not the current week. Treat npm weekly figures as a rough order of magnitude.

## 1. Which npm packages conjugate French verbs (version, date, downloads, maintainer, license of code and data)?

### Takeaway
There are only three real offline JS options. RosaeNLG's `french-verbs` + `french-verbs-lefff` has Apache-2.0 code and LGPL-LR data, but its project was **archived and deprecated in March 2026**. `conjugation-fr` is GPL-2.0 for both code and data (Verbiste), with no release since 2023. `@v4nn4/ablaut` is a permissive (MIT OR Apache-2.0) Rust→WebAssembly rule engine that ships no data, but it is brand new (August 2026) and has one maintainer. Everything else on npm either doesn't conjugate French or is a client for a network API.

### Cited Findings

**RosaeNLG `french-verbs` (the engine)**
- Version 5.4.0, license Apache-2.0, maintainer `ludan.stoeckle <ludan.stoeckle@rosaenlg.org>`, registry entry last modified 2026-03-06, unpacked size 43,568 bytes, repo github.com/RosaeNLG/rosaenlg — [npm: french-verbs](https://www.npmjs.com/package/french-verbs)
- The npm registry marks it `deprecated: "Package no longer supported. Contact Support at https://www.npmjs.com/support for more info."` The same flag is on `french-verbs-lefff` and `french-verbs-transitive` — [npm: french-verbs](https://www.npmjs.com/package/french-verbs), [npm: french-verbs-lefff](https://www.npmjs.com/package/french-verbs-lefff)
- npm weekly downloads (stale window, see the method note): french-verbs 395, french-verbs-lefff 551, french-verbs-transitive 401 — [npm downloads API](https://api.npmjs.org/downloads/point/last-week/french-verbs)
- The RosaeNLG README reads "DEPRECATED March 2026 … The LF AI TAC chair in January 2026 validated to archive the project". Reasons given: no backlog, low usage, no corporate or community support, and that "template-based NLG engines are replaced by LLMs". It also says "The last available version is 4.4.0 from 2024-12-27". RosaeNLG's 4.4.0 is the monorepo release; the npm packages carry their own versions (5.4.0 / 3.4.0) — [RosaeNLG README](https://github.com/RosaeNLG/rosaenlg)
- GitHub: archived = true, last push 2026-03-06 (commit message "deprecated"), 106 stars, 0 open issues, license Apache-2.0 — [GitHub API: RosaeNLG/rosaenlg](https://github.com/RosaeNLG/rosaenlg)

**RosaeNLG `french-verbs-lefff` (the data)**
- Version 3.4.0, license field Apache-2.0, registry entry modified 2026-03-06, unpacked 6,308,316 bytes. Its contents are `dist/conjugations.json` (6,277,936 bytes) plus a `dist/LICENSE`, which is the full LGPL-LR text — [npm: french-verbs-lefff](https://www.npmjs.com/package/french-verbs-lefff), [jsDelivr file listing](https://www.jsdelivr.com/package/npm/french-verbs-lefff)
- README: "Verbs extracted from Lefff … distributed under the free LGPL-LR licence" and "The derived resource file `conjugation.json` remains under LGPLLR". So the npm `license: Apache-2.0` field is misleading for the data — [french-verbs-lefff README](https://cdn.jsdelivr.net/npm/french-verbs-lefff@3.4.0/README.md)
- The maintainer's reading of the license (issue #214, 2025-02-26), quoting his own license scan: LGPL-LR section 4 lets the modules be distributed under terms of choice provided the source (Lefff) is named, the LGPL-LR text is copied, the derivation code is provided, and the user can swap in a modified resource. For an app he suggests "an attribution page in the settings, mentioning both RosaeNLG (under Apache 2.0) and LEFFF under LGPLLR". He adds "I am not a lawyer" — [RosaeNLG issue #214](https://github.com/RosaeNLG/rosaenlg/issues/214)
- LGPL-LR text in the package: section 2(c) requires a modified work to be licensed "at no charge to all third parties under the terms of this License". Also: "The act of running a program using the Linguistic Resource is not restricted, and output from such a program is covered only if its contents constitute a work based on the Linguistic Resource" — [french-verbs-lefff dist/LICENSE](https://cdn.jsdelivr.net/npm/french-verbs-lefff@3.4.0/dist/LICENSE)
- Companion package `french-verbs-transitive` 3.4.0 (Apache-2.0, 389,673 bytes): "French transitive verbs, based on Wikipedia". `french-verbs` uses it to guess the auxiliary — [npm: french-verbs-transitive](https://www.npmjs.com/package/french-verbs-transitive)

**`conjugation-fr`**
- Version 0.3.4, license GPL-2.0, maintainer `gauthier-th`, last publish 2023-10-24, ~212 downloads per week (stale window), unpacked 1,022,847 bytes — [npm: conjugation-fr](https://www.npmjs.com/package/conjugation-fr)
- GitHub: not archived, last push 2023-10-24, 19 stars, 0 open issues. Only 4 issues ever, all closed: "Fix forceAux in perfect-tense and past-participle", "The ' is missing for all the verb starting with é", "Verbe Être in perfect tense (passé composé) not working!", "TypeError: Cannot read property 't' of undefined" — [GitHub: gauthier-th/conjugation-fr](https://github.com/gauthier-th/conjugation-fr)
- README: "based on the Verbiste database … more than 7000 verbs", "distributed under the GNU General Public License (version 2 or later)" — [conjugation-fr README](https://github.com/gauthier-th/conjugation-fr)
- Verbiste's own terms say that if its XML knowledge base "is converted to another format, the result must be shipped under the GPL, with the original XML" — [Verbiste homepage](http://sarrazip.com/dev/verbiste.html)

**`@v4nn4/ablaut` (also on crates.io as `ablaut` and on PyPI)**
- npm 0.10.0, license "MIT OR Apache-2.0", created 2026-08-15, last modified 2026-08-22, unpacked 6,570,186 bytes, 0 downloads in the (stale) window. The crate is at 0.11.0 (crates.io updated 2026-08-30, 222 downloads total) — [npm: @v4nn4/ablaut](https://www.npmjs.com/package/@v4nn4/ablaut), [crates.io: ablaut](https://crates.io/crates/ablaut)
- GitHub ablaut-dev/ablaut: created 2026-08-15, last push 2026-08-30, 4 stars, 1 open issue — [GitHub: ablaut-dev/ablaut](https://github.com/ablaut-dev/ablaut)
- README: "Reference lexicons are used at test time only and never shipped"; "the exception tables are factual data about each language (principal parts, class membership, auxiliaries)" — [ablaut README](https://github.com/ablaut-dev/ablaut)

**Others found**
- `@myfrenchllc/conjugaison-fr` 1.0.0 (MIT client, published 2026-09-18): a "Client for the free My French conjugation API". Network-only. The data is CC-BY 4.0 with attribution to My French LLC required; an API key gives a higher rate limit. Its repository URL is still the placeholder `github.com/<ton-user-github>/conjugaison-fr.git`, and its README tells users to `npm install conjugaison-fr`, which isn't its published name — [npm: @myfrenchllc/conjugaison-fr](https://www.npmjs.com/package/@myfrenchllc/conjugaison-fr)
- `conjugate` 1.0.4 (MIT, 2022) conjugates English verbs by pronoun; it isn't French — [npm: conjugate](https://www.npmjs.com/package/conjugate)
- `french-verbs-list` is a JSON list of French verbs grouped by conjugation group and does not conjugate — [npm: french-verbs-list](https://www.npmjs.org/package/french-verbs-list)
- No npm package exists under `french-conjugator`, `conjugate-french`, `conjugaison`, `verbe`, `verbecc`, `mlconjug`, `fr-conjugator`, `grammalecte` or `grammalecte-js` (registry 404 on 2026-10-26) — [npm registry](https://registry.npmjs.org/)

### Inferences
- `french-verbs` + `french-verbs-lefff` still install and work, but they will get no fixes. Treat them as a frozen snapshot: vendor the code (about 13 KB of JS) and the data rather than depending on deprecated packages.
- For a closed-source web app, the Lefff route works if the data file is kept as a separately identified LGPL-LR resource: license text shipped, Lefff credited, and the derived file kept under LGPL-LR and swappable. Your own app code stays closed. Weak copyleft attaches to the data file, not the app. This is my reading plus the maintainer's; it is not legal advice.
- `conjugation-fr` (GPL code + GPL data) can't be bundled into a closed-source client bundle. Verbiste's clause also puts any JSON converted from it under the GPL.

### Gaps
- Current-week npm downloads: the API returned a June/July 2026 window. Live figures should be checked on npmjs.com.
- Why npm shows the generic "Contact Support" deprecation text, rather than a maintainer message, is not explained anywhere I found.
- Grammalecte's conjugator: ablaut's research notes describe it as "MPL 2.0, Dicollecte lineage" and independent ([ablaut docs/fra/oracles.md](https://github.com/ablaut-dev/ablaut/blob/main/docs/fra/oracles.md)), and Grammalecte has a JS implementation for its browser extension. But it isn't on npm, grammalecte.net returned nothing parseable, and I couldn't verify its current version, file layout or data size. Worth a follow-up, since MPL 2.0 is file-level copyleft and friendly to closed-source apps.

## 2. How do they work, and what do they cover (tenses, persons, compound tenses, agreement, pronominal, negation, irregular and defective verbs, 1990 spelling variants)?

### Takeaway
`french-verbs` is a small engine over a full lookup table: one stored form per cell, with compound tenses, agreement, pronominals and negation built at call time. `conjugation-fr` and the Python tools follow Verbiste: about 150 stem+ending templates and a verb→template index, keeping **multiple variants per cell**. ablaut uses rules plus an exception table. None of them reliably outputs both forms for 1990-reform doublets; Verbiste-family data comes closest.

### Cited Findings

**french-verbs (RosaeNLG)**
- API: one `getConjugation(verbsList, verb, tense, person, {aux, agreeGender, agreeNumber}, pronominal, negativeAdverb, modifierAdverb)`. Tenses: PRESENT, FUTUR, IMPARFAIT, PASSE_SIMPLE, PASSE_COMPOSE, PLUS_QUE_PARFAIT, PASSE_ANTERIEUR, FUTUR_ANTERIEUR, CONDITIONNEL_PRESENT, CONDITIONNEL_PASSE_1/2, IMPERATIF_PRESENT/PASSE, SUBJONCTIF_PRESENT/IMPARFAIT/PASSE/PLUS_QUE_PARFAIT, INFINITIF(_PASSE), PARTICIPE_PRESENT/PASSE/PASSE_COMPOSE. Persons are 0–5 (je…ils) — [french-verbs README](https://cdn.jsdelivr.net/npm/french-verbs@5.4.0/README.md)
- Auxiliary: if `aux` isn't given, pronominal verbs take ÊTRE, "a short list of verbs that always take être" take ÊTRE, and transitive verbs "rather take AVOIR". Agreement is never automatic: "The agreement is not done automatically even when aux is ETRE, as the subject gender is not known". Pronominals come from `pronominal: true` or "s'écrier"/"se rendre" spellings, with elision handled ("elle s'est marrée", "ils se haïssent"). Negation: `negativeAdverb` places "pas/plus/jamais" between auxiliary and participle ("a pas donné"); the README does not show it adding the "ne" particle — [french-verbs README](https://cdn.jsdelivr.net/npm/french-verbs@5.4.0/README.md)
- Someone asked for the ne particle in issue #213, "possible to add ne particle to getConjugation" (closed). Passive voice was requested in #204 (closed) — [RosaeNLG issues](https://github.com/RosaeNLG/rosaenlg/issues?q=verb)
- Data format (measured): `conjugations.json` maps 7,826 infinitives to tense-letter keys. P present, S subj. present, Y imperative, I imparfait, G participe présent, K participe passé [m.sg, m.pl, f.sg, f.pl], J passé simple, T subj. imparfait, F futur, C conditionnel, W infinitive. Each key holds six forms. Missing persons are `null` and impossible imperative persons are `"NA"`. **One form per cell; no variant lists.** — [french-verbs-lefff conjugations.json](https://cdn.jsdelivr.net/npm/french-verbs-lefff@3.4.0/dist/conjugations.json)
- Defective verbs (measured): `falloir` has only the 3sg (`[null,null,"faut",null,null,null]`). `pleuvoir` has 3sg and 3pl. `clore` has `null` for nous/vous in the present, and its I/J/T keys are missing — [same file](https://cdn.jsdelivr.net/npm/french-verbs-lefff@3.4.0/dist/conjugations.json)
- 1990 rectifications (measured): no reform spellings. `paraître`/`connaître` exist but `paraitre`/`connaitre` don't. `céder` future is only "céderai" (no "cèderai"). `ruisseler` is only "ruisselle". `asseoir` has only the "assois/assoyons" series, with no "assieds/asseyons", and there is no `assoir` key. `payer` has only "paye", not "paie" — [same file](https://cdn.jsdelivr.net/npm/french-verbs-lefff@3.4.0/dist/conjugations.json)

**conjugation-fr (Verbiste data)**
- API: `conjugate(verb, mode, tense, fGender=false, forceAux)` plus `findTense(verb, input)`, which parses tense names in English or French ("passé composé"). Modes: infinitive, indicative (8 tenses incl. passé composé, plus-que-parfait, passé antérieur, futur antérieur), conditional (present, past), subjunctive (4), imperative (2), participle (2). It supports pronominal forms, and `forceAux` covers verbs with two auxiliaries — [conjugation-fr README](https://github.com/gauthier-th/conjugation-fr)
- Its README example output for aller in the passé composé is "nous sommes allé", "ils sont allé": **no number agreement on the plural persons, even with être**, and only feminine via a flag — [conjugation-fr README](https://github.com/gauthier-th/conjugation-fr)
- Data format (measured): `conjugation-fr.json` holds 149 templates such as `pa:yer`, `ass:eoir`, `c:éder`, `app:eler`. `verbs-fr.json` maps 7,014 verbs to `{t: template, aux}`, where aux can be an array (`paraître → aux ["avoir","être"]`). Cells hold **arrays of variants**: `pa:yer` present gives `["ie","ye"]` (paie/paye). `ass:eoir` present gives `["ieds","ois"]` and its future gives `["iérai","eyerai","oirai"]`. There are separate templates `ass:oir` and `surs:oir` (reform spellings asseoir→assoir) — [conjugation-fr data on jsDelivr](https://www.jsdelivr.com/package/npm/conjugation-fr?tab=files)
- Oddity (measured): `paraître` maps to template `rep:aître` rather than `par:aître`. It gives the same endings, but shows the index isn't always the obvious template — [verbs-fr.json](https://cdn.jsdelivr.net/npm/conjugation-fr@0.3.4/verbs-fr.json)

**ablaut**
- Design: "Each engine is a productive default rule plus a finite table of stored exceptions … Rule engines with curated exception tables, not lookup dumps: novel verbs (googeln, tweeter) conjugate correctly." Coverage claim for French: "French spelling doublets and reflexive clitics". It has reverse lookup ("suis" → être, suivre) — [ablaut README](https://github.com/ablaut-dev/ablaut)
- The JS API (from `ablaut.d.ts`) is one function: `conjugate(infinitive: string, lang?: string): any`, where "full conjugation table for an infinitive". It throws for strings that are not infinitives. It is typed as `any`, so there's no typed output and no gender/negation/pronominal parameters — [ablaut.d.ts on jsDelivr](https://cdn.jsdelivr.net/npm/@v4nn4/ablaut@0.10.0/ablaut.d.ts)
- Its French verification excludes compound tenses ("Compound tenses are excluded (compositional layer's business)"). Pronominal clitics are stripped before scoring. On 1990 doublets, as of 2026-08-16: "Both are standard; the engine should eventually emit variant sets here". That conflicts with the README's claim that it covers "French spelling doublets" — [ablaut docs/fra/oracles.md](https://github.com/ablaut-dev/ablaut/blob/main/docs/fra/oracles.md)

**verbecc / mlconjug3 (Python, for comparison)**
- verbecc: "Conjugate thousands of known verbs without machine learning, using simple string transformations based on XML conjugation templates". It predicts unknown verbs with ML, includes "both simple and compound conjugations", "alternate conjugations", "inflections for all genders" and the pronoun "on". Its French templates are "derived from Pierre Sarrazin's C++ program Verbiste". Dependencies: scikit-learn, scipy, numpy, lxml — [verbecc README](https://github.com/bretttolbert/verbecc)
- mlconjug3: "Conjugate any verb … even completely new or made-up verbs, with the help of a pre-trained Machine Learning model" (scikit-learn); "created with the help of Verbiste" — [mlconjug3 README](https://github.com/Ars-Linguistica/mlconjug3)

### Inferences
- For Ink's learners, Verbiste-derived data has the most useful shape: variants per cell (paie/paye, assieds/assois) and some reform spellings. The Lefff extraction hides legitimate alternatives, which can make a learner think a correct form is wrong. That matters to Ink, which already worries about false "mistakes".
- None of the JS options gets passé composé agreement right on its own for every case. `french-verbs` agrees only when told gender and number. `conjugation-fr` doesn't agree in number. A lookup panel should show the agreement rule (e.g. "allé(e)(s)") rather than one agreed form.
- Negation with "ne" and pronominal word order in compound tenses ("je ne me suis pas levé") would need to be composed in Ink's own code in every option.

### Gaps
- I did not run `french-verbs` or ablaut code. Its coverage of compound tenses, imperative with pronouns and pronominal output is taken from the README and typings, not observed.
- Whether ablaut's French output really includes compound tenses and both reform doublets in the 0.10/0.11 builds is unverified (the README and the oracle notes disagree).

## 3. Data size, lookup speed, and lazy loading or per-verb splitting

### Takeaway
The Verbiste template format is tiny (about 41 KB gzipped for all ~7,000 verbs), but it is GPL. The Lefff JSON is 6.3 MB raw / about 0.98 MB gzipped, around 800 bytes per verb, and splits trivially per verb. The ablaut WASM is 6.5 MB raw / about 1.5 MB gzipped for all its languages in one binary. Every option looks a verb up in memory in well under a millisecond once loaded. The cost is the download, not the lookup.

### Cited Findings
- `french-verbs-lefff/dist/conjugations.json`: 6,277,936 bytes. gzip -9 gives 977,274 bytes (measured). 7,826 verbs, about 802 bytes per verb on average uncompressed (measured) — [jsDelivr: french-verbs-lefff](https://cdn.jsdelivr.net/npm/french-verbs-lefff@3.4.0/dist/conjugations.json)
- `french-verbs` engine: `dist/index.js` is 13,118 bytes — [jsDelivr: french-verbs files](https://www.jsdelivr.com/package/npm/french-verbs?tab=files)
- `conjugation-fr`: `conjugation-fr.json` (templates) is 141,298 bytes, 13,084 gzipped. `verbs-fr.json` (index) is 289,055 bytes, 28,297 gzipped (measured). The package also ships the original XML files (271 KB + 284 KB), which is how it meets Verbiste's "with the original XML" clause — [jsDelivr: conjugation-fr files](https://www.jsdelivr.com/package/npm/conjugation-fr?tab=files)
- `@v4nn4/ablaut` 0.10.0: `ablaut_bg.wasm` is 6,540,730 bytes, 1,510,862 gzipped (measured), plus a 9 KB JS glue file. It covers 21 languages in one binary, so there is no French-only build in the npm package. The README says "A full table takes microseconds; all twenty-one languages fit in one small WebAssembly binary" — [jsDelivr: @v4nn4/ablaut](https://www.jsdelivr.com/package/npm/@v4nn4/ablaut), [ablaut README](https://github.com/ablaut-dev/ablaut)
- The ablaut repo's `docs/` folder now lists about 75 language codes (afr … zul), far more than the 21 in the npm README. Later builds may be larger — [GitHub: ablaut-dev/ablaut docs](https://github.com/ablaut-dev/ablaut/tree/main/docs)

### Inferences
- Lefff: split `conjugations.json` at build time into one file per infinitive (about 0.8 KB each, around 300–400 bytes gzipped). Fetch or serve on demand as a static asset, or store in IndexedDB for offline use. Alternatively load the whole ~1 MB gzipped file once in a Web Worker. Either way the lookup is a hash-map read.
- Verbiste templates: the whole set fits comfortably in the initial bundle (about 41 KB gzipped). It is the smallest option by far, if the GPL is acceptable (it isn't for a closed client bundle).
- ablaut: 1.5 MB gzipped of WASM for one language's lookup is heavy for a panel. Building a French-only WASM from the Rust crate (cargo features, `wasm-pack`) might shrink it a lot, but that is unverified.

### Gaps
- No published lookup benchmarks for `french-verbs` or `conjugation-fr`. "Sub-millisecond" is an inference from their being in-memory hash or template lookups.
- Whether ablaut can be built per language (feature flags) to cut WASM size wasn't checked.

## 4. Known accuracy issues and bug reports

### Takeaway
Every source has errors. Lefff, the data behind `french-verbs-lefff`, has documented wrong forms, and the RosaeNLG extraction adds its own (e.g. the past participle of "résoudre" is given as "résous", and gésir's present is broken). Verbiste-family Python tools have open regressions: mlconjug3 4.0.1 corrupts participles and imperatives, and verbecc invents compound forms for impersonal verbs and mishandles h aspiré. ablaut reports 100% on French, but it is self-measured, excludes compound tenses, and the project is weeks old.

### Cited Findings
- `french-verbs-lefff` (measured from the shipped JSON):
  - "résoudre" past participle is `["résous","résous","résoute","résoutes"]`. Modern French uses "résolu"; "résous/résoute" is a rare chemistry sense.
  - "gésir" present is `["gisons","gisons","gît",null,null,null]`, which is wrong. It should be gis, gis, gît, gisons, gisez, gisent.
  - "faillir" present 1sg is the archaic "faux".
  - "absoudre" has no passé simple key.
  - "être" past participle is "été" in all four agreement slots, which is correct (it doesn't vary).
  - [french-verbs-lefff conjugations.json](https://cdn.jsdelivr.net/npm/french-verbs-lefff@3.4.0/dist/conjugations.json)
- Lefff errors documented by ablaut's adjudication log:
  - "Lefff writes taît; taire takes no circumflex in the 3sg present (only plaît does). Grevisse §778"
  - "Lefff writes fouts; the imperative is fous"
  - repaître's imperfect subjunctive given as "repusse" for the 3sg
  - automaintenir conjugated as second group
  - énamourer conjugated on a "meur-" stem
  - [ablaut docs/fra/adjudications.tsv](https://github.com/ablaut-dev/ablaut/blob/main/docs/fra/adjudications.tsv)
- Lefff vs Wiktionary (kaikki) agree on 99.88% of 277,379 shared French slots. Most of the 342 disagreements are 1990-reform doublets on -eler/-eter verbs (Lefff traditional "ruisselle", kaikki reform "ruissèle") — [ablaut docs/fra/oracles.md](https://github.com/ablaut-dev/ablaut/blob/main/docs/fra/oracles.md)
- ablaut accuracy claim: French has 284,034 verified forms at 100.00%, scored only "on the slots where its two reference lexicons agree" (Lefff ∩ kaikki), with disagreements ruled on in a published log — [ablaut README](https://github.com/ablaut-dev/ablaut), [ablaut docs/correctness.md](https://github.com/ablaut-dev/ablaut/blob/main/docs/correctness.md)
- conjugation-fr's past bugs (all closed): forceAux in passé composé, a missing apostrophe for verbs starting with é ("je étais"), être in passé composé "not working", a TypeError on unknown verbs — [conjugation-fr issues](https://github.com/gauthier-th/conjugation-fr/issues?q=is%3Aissue)
- mlconjug3 issue #563 (open, 2026-07-23), on 4.0.1 and the template path for known verbs (not ML):
  - Infinitif "manmanger", participe présent "manmangeant"
  - participe passé returned as the feminine plural ("mangées", "prises") under an empty key
  - imperative gives only the vous form
  - être's past participle is null
  - it also needs scikit-learn 1.6.1, and ">=1.8 fails with ModuleNotFoundError"
  - [mlconjug3 issue #563](https://github.com/Ars-Linguistica/mlconjug3/issues/563)
- verbecc issue #53 (open, 2026-08-27): compound tenses are generated for defective verbs, e.g. neiger → "ils ont neigé", "elles ont neigé" — [verbecc issue #53](https://github.com/bretttolbert/verbecc/issues/53)
- verbecc issue #42 (open, 2026-01-28): after fixing elision for h muet (habiter), h aspiré verbs are now elided wrongly; "je hache" is expected — [verbecc issue #42](https://github.com/bretttolbert/verbecc/issues/42)
- verbecc claims ML prediction of unknown verbs "with 99% accuracy" without a published method in the README — [verbecc README](https://github.com/bretttolbert/verbecc)

### Inferences
- For a learner tool, a wrong form shown with authority is worse than none. Whatever source is chosen, Ink should check it against a hand-checked list of the verbs TEF candidates actually use (e.g. the 50–200 most frequent, plus every irregular in a Bescherelle table) before shipping. The Lefff errors above all sit in rare or irregular verbs, which is exactly what learners look up.
- ablaut's verification method (two independent lexicons plus adjudication against Grevisse, Bescherelle and TLFi) is the most rigorous seen. But it is self-reported, very new, and has a single maintainer.

### Gaps
- I did not run any spot-checks on ablaut's or conjugation-fr's actual output.
- No independent accuracy evaluation of verbecc, mlconjug3 or Verbiste was found. Only self-claims and bug reports.

## 5. Non-JS options via a server (mlconjug3, verbecc, Verbiste, Rust/Go)

### Takeaway
On a server, GPL/LGPL code doesn't spread to Ink's closed client, because none of these are AGPL. But the Python tools are heavy (scikit-learn), and mlconjug3 4.0.1 has a live regression. The data under all of them is Verbiste (GPL), so "MIT" on mlconjug3 doesn't make its French data permissive. The one permissive non-JS option is the Rust crate `ablaut`, the same engine as the npm WASM. No Go library was found.

### Cited Findings
- mlconjug3: PyPI 4.0.1 released 2026-04-19, MIT. pypistats: 774 downloads last week, 1,842 last month. GitHub last push 2026-08-09, 83 stars, 26 open issues. The old `mlconjug` 3.4.0 dates from 2019-04-29 — [PyPI: mlconjug3](https://pypi.org/project/mlconjug3/), [pypistats: mlconjug3](https://pypistats.org/packages/mlconjug3), [GitHub: mlconjug3](https://github.com/Ars-Linguistica/mlconjug3)
- verbecc: PyPI 2.0.3 released 2026-08-26, license LGPL-3.0. pypistats: 1,330 downloads last week, 4,458 last month. GitHub last push 2026-09-12, 107 stars, 9 open issues. CI covers Python 3.9–3.14. It offers an HTTP API at verbe.cc — [PyPI: verbecc](https://pypi.org/project/verbecc/), [pypistats: verbecc](https://pypistats.org/packages/verbecc), [GitHub: verbecc](https://github.com/bretttolbert/verbecc)
- Verbiste: C++, "distributed under the GNU General Public License (version 2 or later)". A converted XML knowledge base "must be shipped under the GPL, with the original XML". ablaut's survey describes it as "~7,000 verbs, hand-built deterministic XML templates, maintained since 2003" — [Verbiste homepage](http://sarrazip.com/dev/verbiste.html), [ablaut docs/fra/oracles.md](https://github.com/ablaut-dev/ablaut/blob/main/docs/fra/oracles.md)
- ablaut's survey rejects mlconjug3 as an oracle ("ML-predicted forms") and notes that verbecc's French template data "is Verbiste's, so it adds nothing over Verbiste" — [ablaut docs/fra/oracles.md](https://github.com/ablaut-dev/ablaut/blob/main/docs/fra/oracles.md)
- Rust: `ablaut` 0.11.0 (MIT OR Apache-2.0) is the only French conjugation crate found by a crates.io search for "french conjugation"/"conjugation". The other hits were Portuguese, Japanese, Latin and unrelated maths crates — [crates.io search](https://crates.io/search?q=conjugation)
- Other lexicons named in the same survey: DELAF fr (Unitex, LGPL-LR, 683k forms / 102k lemmas); Flexique (CC BY-NC-SA, so not for commercial use); Lexique.org (incomplete paradigms); UniMorph fra (CC BY-SA 3.0, scraped from English Wiktionary); kaikki.org Wiktionary extracts (CC BY-SA / GFDL) — [ablaut docs/fra/oracles.md](https://github.com/ablaut-dev/ablaut/blob/main/docs/fra/oracles.md)

### Inferences
- A Python sidecar on Vercel adds deployment complexity, cold starts and a scikit-learn pin, and it breaks "instant, offline". It isn't worth it, since its only edge (ML guesses for unknown verbs) doesn't help learners who look up real verbs.
- mlconjug3's MIT code plus Verbiste-derived French data means the French tables it emits likely carry Verbiste's GPL terms if redistributed. This is my inference from Verbiste's conversion clause; I didn't inspect which data files mlconjug3 bundles.
- CC BY-SA sources (Wiktionary/kaikki, UniMorph) are usable commercially, but ShareAlike would apply to a redistributed derived table. Fine for a separately licensed data file, as with LGPL-LR.

### Gaps
- No Go French conjugation library was found (not searched deeply).
- Whether mlconjug3 ships Verbiste XML/JSON verbatim inside its wheel wasn't checked.

## 6. Can a library's output be precomputed into a static JSON table shipped with the app?

### Takeaway
Yes, technically, for all of them: around 7–8k verbs × about 50 simple forms is a few MB raw and about 1 MB gzipped, splittable per verb. Legally the license follows the data. A table generated from Lefff stays LGPL-LR. One generated from Verbiste (conjugation-fr, verbecc, mlconjug3) must be GPL. One generated from ablaut is MIT/Apache, though its outputs encode facts cross-checked against Lefff and Wiktionary, which the project argues are uncopyrightable "factual data".

### Cited Findings
- `french-verbs-lefff` already is such a precomputed table ("essentially a big JSON file containing all conjugations of French verbs, and it can be used without french-verbs"), and it remains LGPL-LR — [french-verbs-lefff README](https://cdn.jsdelivr.net/npm/french-verbs-lefff@3.4.0/README.md)
- LGPL-LR: a modified resource must be "licensed at no charge to all third parties under the terms of this License" and carry notices of the changes. Program output "is covered only if its contents constitute a work based on the Linguistic Resource" — [LGPL-LR text in french-verbs-lefff](https://cdn.jsdelivr.net/npm/french-verbs-lefff@3.4.0/dist/LICENSE)
- Verbiste: a converted knowledge base "must be shipped under the GPL, with the original XML" — [Verbiste homepage](http://sarrazip.com/dev/verbiste.html)
- ablaut: "Reference lexicons are used at test time only and never shipped, whatever their license", and its exception tables are "factual data … established by the agreement of independent sources" — [ablaut README](https://github.com/ablaut-dev/ablaut)

### Inferences
- **Most practical, as of 2026-10-26:**
  1. Precompute per-verb JSON at build time from the frozen Lefff data. Fix the known bad cells (résoudre, gésir, taire, foutre…) in a patch file, and ship that file as a clearly labelled LGPL-LR resource with an "About / licenses" credit to Lefff and RosaeNLG. Keep the extraction script and the patch public so the resource stays "swappable".
  2. Alternatively generate the table from ablaut (permissive). Ship JSON rather than the 1.5 MB WASM, and diff it against Lefff to find its gaps. Lean on it only after the project shows it will last more than a few months.
  - Either way, add hand-entered variants for the 1990 doublets and the asseoir/payer-type alternatives that Lefff drops.
- Static per-verb JSON fits Ink's constraints: no key, works offline once cached, and Cache Components-friendly (static assets, or a `generateStaticParams` route).

### Gaps
- No legal opinion found on whether a full conjugation table is a copyrightable "work based on" a lexicon in the EU or US (database rights in the EU may apply to Lefff). This needs a lawyer before relying on ablaut's "factual data" argument or skipping the LGPL-LR notices.
