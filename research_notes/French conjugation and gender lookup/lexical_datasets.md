# Open French lexical datasets for verb conjugation and noun gender (as of October 2026)

Scope: the DATA sources (not code libraries) a closed-source commercial web app could ship to browsers or query for (a) full French verb conjugation tables and (b) noun grammatical gender. Researched 2026-10-26. Several primary pages were unreachable during this session (redac.univ-tlse2.fr refused connections; the ORTOLANG market page rendered empty; atilf.fr's Morphalou page returned 404), so some facts come from mirrors (openlexicon, Hugging Face, Debian, Arch packaging) and are flagged as such.

## Q1. Which resources exist, who maintains them, latest version, size, and do they cover all tenses/moods and noun gender?

### Takeaway
Morphalou 3.1 (ATILF, LGPL-LR) is the best-documented full-paradigm lexicon: 159,271 lemmas and 976,570 forms, with mood/tense/person on every verb form and gender on nouns. Lefff 3.5 and DELA are similar but older or less documented. Lexique (3.83 / 4.1) is smaller and frequency-oriented. Wiktionary extracts (kaikki/wiktextract, GLÀFF/GLAWI) are the largest and the only ones updated continuously, but they are share-alike. Verbiste covers verbs only and is GPL.

### Cited Findings

**Morphalou 3.1 (ATILF, CNRS / Université de Lorraine; distributed on ORTOLANG)**
- Version 3.1, dated June 2016. 159,271 lemmas and 976,570 inflected forms of modern French — [Morphalou 3.1 LISEZ-MOI (ORTOLANG)](https://repository.ortolang.fr/api/content/morphalou/latest/LISEZ-MOI.html)
- Lemmas by category: nouns 102,238; adjectives 36,523; verbs 14,762; adverbs 4,157; plus small closed classes. Forms by category: verbs 682,417; nouns 188,912; adjectives 98,970 — [LISEZ-MOI](https://repository.ortolang.fr/api/content/morphalou/latest/LISEZ-MOI.html)
- Verb features: mood (indicative, participle, subjunctive, imperative, infinitive, conditional), tense (present, future, past, imperfect, simple past), person (1/2/3) — [LISEZ-MOI](https://repository.ortolang.fr/api/content/morphalou/latest/LISEZ-MOI.html)
- Noun gender: masculine, feminine, invariable. Gender is recorded per inflected form for the three nouns whose gender changes with number: *amour*, *délice*, *orgue* — [LISEZ-MOI](https://repository.ortolang.fr/api/content/morphalou/latest/LISEZ-MOI.html)
- Formats: TEI XML (dictionaries module, with a RELAX NG schema); semicolon-separated CSV (14-line header, one inflected form per row); LMF XML (Morphalou 2 format); MySQL. File sizes not stated — [LISEZ-MOI](https://repository.ortolang.fr/api/content/morphalou/latest/LISEZ-MOI.html)
- Version 3.1 is a merge of Morphalou 2 (Dec 2013), DELA (Dec 2011), Dicollecte 4.3, LGLex/LGLexLefff 3.4 and Lefff 2.1 (Apr 2006) — [LISEZ-MOI](https://repository.ortolang.fr/api/content/morphalou/latest/LISEZ-MOI.html)
- 3.1 added 21,880 missing forms, mostly first-person-singular conjugations. Handle https://hdl.handle.net/11403/morphalou/v3.1 — [ORTOLANG Morphalou page](https://www.ortolang.fr/market/lexicons/morphalou/1); also mirrored as [datasets-CNRS/Morphalou on Hugging Face](https://huggingface.co/datasets/datasets-CNRS/Morphalou) and [openlexicon](http://openlexicon.fr/datasets-info/Morphalou/README-Morphalou.html)
- Morphalou 1.0 originally came from the TLFnome (the Trésor de la Langue Française word list): 540,000 forms over about 68,000 lemmas. It is an "extensional" lexicon: it lists every inflected form explicitly — [Morphalou documentation PDF](https://repository.ortolang.fr/api/content/morphalou/1/documentation.pdf)

**Lefff (Lexique des formes fléchies du français; Benoît Sagot, Inria ALMAnaCH)**
- Current version 3.5. The morphological layer is published as 4-tuples (form, lemma, category, features), in native Lefff tags and in UniMorph format. The Hugging Face size bucket is 100K–1M entries; the last commit there is over 4 years old. Contact benoit.sagot@inria.fr. Source repository: https://gitlab.inria.fr/almanach/alexina/lefff — [Hugging Face sagot/lefff_morpho](https://huggingface.co/datasets/sagot/lefff_morpho/blob/main/README.md?code=true)
- Reference description: Sagot (2010), LREC, "The Lefff, a Freely Available and Large-coverage Morphological and Syntactic Lexicon for French" — [ACL Anthology L10-1487](https://preview.aclanthology.org/menus/L10-1487/)
- Third-party npm packages repackage Lefff verb data (e.g. `french-verbs-lefff`) — [npm french-verbs-lefff](https://npmjs.com/package/french-verbs-lefff)

**Lexique (Boris New and Christophe Pallier; lexique.org / openlexicon)**
- Lexique 3.83: about 140,000 words, with spelling and phonemic forms, lemmas, syllabification, grammatical category, **gender and number**, and frequencies from a book corpus and a film-subtitle corpus — [openlexicon README-Lexique](https://github.com/chrplr/openlexicon/blob/master/datasets-info/Lexique383/README-Lexique.md)
- lexique.org now offers **Lexique 4.1** (download `Lexique410/Lexique4.1.zip`): about 190,000 forms, subtitle frequencies (316-million-word corpus), contextual diversity, phonology, lemmas, morphological structure, prevalence and lexical-decision data. A 2026 citation lists New, Pallier, Schalchli, Bourgin and Gimenes — [lexique.org](http://www.lexique.org/)

**Wiktionary-derived: wiktextract / kaikki.org (Tatu Ylonen)**
- kaikki.org publishes raw wiktextract JSONL for the English Wiktionary (all languages, English glosses) and, as "work in progress", other editions. The French-edition file `fr-extract.jsonl` is 6.4 GB (702.5 MB gzipped). English data was extracted 2026-10-25 from the 2026-10-01 dump, updated "usually at least once a week". The page asks academic users to cite Ylonen's LREC 2022 paper — [kaikki.org raw data](https://kaikki.org/dictionary/rawdata.html)

**GLÀFF and GLAWI (Nabil Hathout, Franck Sajous, Basilio Calderone; CLLE-ERSS, CNRS / Université de Toulouse)**
- GLÀFF is a lexicon built from the French Wiktionary (Wiktionnaire) with POS, inflectional features and phonemic transcriptions. Its abstract cites "its size, its potential for constant updating and its copylefted license" — [GLÀFF, LREC 2014 (L14-1469)](https://aclanthology.org/L14-1469/); [GLÀFF, TALN 2013 (F13-1021)](https://aclanthology.org/F13-1021.pdf)
- Over 1.4 million entries. PsychoGLÀFF, derived from it, keeps about 340,000 corpus-attested entries (120,000 lemmas) for psycholinguistics — [From GLÀFF to PsychoGLÀFF (HAL)](https://hal.archives-ouvertes.fr/hal-01121487)
- GLAWI is the full machine-readable dictionary (XML) behind GLÀFF. The archive `GLAWI_FR_workParsed_D2015-12-26_R2016-05-18.xml.bz2` is 214 MB compressed, 3.4 GB uncompressed — [GLAWI page (REDAC)](https://redac.univ-tlse2.fr/lexiques/glawi.html); [GLAWI, eLex 2015](https://elex.link/elex2015/proceedings/eLex_2015_27_Sajous+Hathout.pdf)

**DELA / DELAF (LADL, Maurice Gross; distributed with Unitex)**
- DELAF is a text format, one inflected form per line. UCLouvain describes DELAF as about 792,260 entries, with no significant update since 2001 — [UCLouvain CENTAL DELAF 2.0](https://www.uclouvain.be/fr/instituts-recherche/ilc/cental/delaf-2-0)
- An undated forum post gives Unitex's French dictionary as about 680,000 simple words, 100,000 compounds, 24,000 proper nouns and 2,700 Québec words (weak source) — [LinuxFr forum](https://linuxfr.org/forums/general-cherche-logiciel/posts/recherche-lexique-de-la-langue-fran%C3%A7aise)
- Repackaged on PyPI as `dict-fr-au-dela` — [PyPI dict-fr-au-dela](https://pypi.org/project/dict-fr-au-dela)

**Verbiste (Pierre Sarrazin)**
- Verbs only. `data/verbs-fr.xml` maps each infinitive (`<i>`) to a conjugation template (`<t>`); the templates are in `data/conjugation-fr.xml` — [Debian verbiste README](https://sources.debian.org/src/verbiste/0.1.49-1/README)
- Verb count: "over 6800" per Mageia packaging, "over 7000" per a later project description. The two sources conflict, probably because of different versions — [Mageia verbiste](https://madb.mageia.org/package/show/application/0/name/verbiste); [Verbiste listing](https://lebottinlinux.vps.a-lec.org/Bottin_T-Z_files/Verbiste-13362.html)

**Grammalecte / Dicollecte dictionary (Olivier R.; grammalecte.net)**
- The French Hunspell dictionaries from Grammalecte/Dicollecte (classic, reform 1990, comprehensive, etc.; current packaged version 7.7) — [Arch hunspell-fr-revised 7.7](https://www.archlinux.org/packages/extra/any/hunspell-fr-revised); [Arch hunspell-fr-comprehensive 7.7](https://archlinux.org/packages/extra/any/hunspell-fr-comprehensive/); [OpenOffice French dictionaries](https://extensions.openoffice.org/fr/node/17340)
- Morphalou 3.1 merged Dicollecte 4.3 as one of its sources — [Morphalou LISEZ-MOI](https://repository.ortolang.fr/api/content/morphalou/latest/LISEZ-MOI.html)

**Others found**
- *Le DM* (Dictionnaire morphologique for NooJ, François Trouilleux), on Hugging Face under datasets-CNRS — [le-DM README](https://huggingface.co/datasets/datasets-CNRS/le-DM/blob/main/README.md); [Le DM paper](https://diffusion.lrl.uca.fr/wp-content/uploads/2024/03/ftrouilleux_Le_DM_a_French_Dictionary_for_NooJ.pdf)
- A French Ministry of Culture document describes an LGPL-LR resource that generates "758 035 formes fléchies … pour 102 962 lemmes"; the snippet does not name the resource — [culture.gouv.fr document](https://www.culture.gouv.fr/content/download/124893/1380273)
- Survey list of French resources — [ACL wiki: Resources for French](https://aclweb.org/aclwiki/Resources_for_French)
- A 2023 survey paper on French lexical resources and their NLP use — [CORIA-TALN 2023 short paper 3](https://aclanthology.org/2023.jeptalnrecital-short.3v1.pdf) (the PDF could not be extracted this session; see Gaps)

### Inferences
- **Compound tenses are not stored by any of these lexicons.** Morphalou's tense list (present, future, past, imperfect, simple past) covers the simple forms only: *passé composé*, *plus-que-parfait*, *futur antérieur*, *conditionnel passé*, *subjonctif passé* and so on are built from auxiliary + past participle. An app needs each verb's auxiliary (avoir / être / both, pronominal verbs take être) to generate them. Morphalou's LISEZ-MOI does not mention auxiliary data.
- Morphalou's verb lemma count (14,762) is about twice Verbiste's (~7,000). For learners, Verbiste's smaller list is closer to the verbs people actually use, but it is GPL (see Q2).
- Lexique's gender and number come per form and only for attested forms. It is a frequency database, not a paradigm generator. Use it to filter and rank, not as the source for full conjugation tables.
- Meaning-dependent gender (*le/la tour*, *le/la manche*, *le/la poste*): Morphalou records gender per lemma, so these must appear as two homograph lemmas, which a lookup UI then has to show together. Wiktionary handles them as separate etymology/sense sections, each with its own gender, and also marks epicene nouns (e.g. *élève*, *journaliste*) as "masculine and feminine". So Wiktionary extracts are the only source that can say *which meaning* goes with which gender.

### Gaps
- Exact Lefff 3.5 counts (lemmas, forms) and release date: the Hugging Face card gives only a 100K–1M bucket. The 2010 LREC paper has figures, but they were not retrieved.
- Whether Lefff records verb auxiliaries in the morphological layer distributed today: not verified.
- GLÀFF's current version number and file size: the REDAC GLÀFF page refused connections this session.
- Whether the French-edition wiktextract output includes full conjugation tables. It is labeled "work in progress", and the kaikki page doesn't say whether inflection tables or gender tags are included. The English-edition extract of French entries is known to carry `forms` and gender tags, but this was not verified this session.
- Grammalecte lexicon file name, size, tag set (gender, verb flags) and form count: not retrieved.
- How Morphalou encodes *le/la tour*-type homographs (separate lemma IDs?) and epicene nouns (an "invariable" gender value?): not verified.
- Lexique 3.83 exact counts and the verb-inflection field (`infover`) were not confirmed from a primary source.

## Q2. Exact licenses, and what they mean for a closed-source commercial web app that ships the data to browsers

### Takeaway
- **Most permissive:** LGPL-LR resources (Morphalou, Lefff, DELA) allow commercial, closed-source use. Shipping the data unmodified with its license and notice is straightforward. A trimmed or converted copy is a modified resource and must stay LGPL-LR and be published.
- **Share-alike on the data:** CC BY-SA (Lexique 3.83, GLÀFF/GLAWI, Wiktionary extracts) and MPL 2.0 (Grammalecte's dictionary). The app code can stay closed, but the derived data file must be released under the same license with attribution.
- **Avoid for closed-source shipping:** Verbiste (GPL v2+). Lexique 4.1's license is contradictory on its own site.

### Cited Findings
- **Morphalou 3.1: LGPL-LR** (Lesser General Public License For Linguistic Resources), a free license for linguistic resources that guarantees the freedom to share and modify the data — [Morphalou LISEZ-MOI](https://repository.ortolang.fr/api/content/morphalou/latest/LISEZ-MOI.html); [ORTOLANG Morphalou](https://www.ortolang.fr/market/lexicons/morphalou/1)
- **Lefff: LGPL-LR.** The HF metadata lists `lgpl-lr`, and the card says the whole Lefff is under LGPL-LR — [HF sagot/lefff_morpho](https://huggingface.co/datasets/sagot/lefff_morpho/blob/main/README.md?code=true); [LabEx EFL resource description](http://ressources.labex-efl.org/lefff--lexique-des-formes-flechies-du-francais-)
- **DELA (Unitex): LGPLLR** — [LinuxFr forum](https://linuxfr.org/forums/general-cherche-logiciel/posts/recherche-lexique-de-la-langue-fran%C3%A7aise); [PyPI dict-fr-au-dela](https://pypi.org/project/dict-fr-au-dela) (secondary sources; the Unitex distribution's own license file was not read)
- **Lexique 3.83: CC BY-SA 4.0** ("CC BY SA40.0"), license file at https://github.com/chrplr/openlexicon/blob/master/datasets-info/Lexique383/LICENSE-CC-BY-SA4.0.txt — [openlexicon README-Lexique](https://github.com/chrplr/openlexicon/blob/master/datasets-info/Lexique383/README-Lexique.md)
- **Lexique 4.1: contradictory.** lexique.org's text names CC BY-SA 4.0, but its license link points to CC BY-NC 4.0 (NonCommercial) — [lexique.org](http://www.lexique.org/)
- **GLAWI: CC BY-SA 3.0**, matching Wiktionary's license since it is extracted from it. GLÀFF (derived from GLAWI) is described as "copylefted" / CC BY-SA — [GLAWI REDAC (FR)](https://redac.univ-tlse2.fr/lexiques/glawi.html); [GLAWI REDAC (EN)](http://redac.univ-tlse2.fr/lexiques/glawi_en.html); [GLÀFF LREC 2014](https://aclanthology.org/L14-1469/)
- **kaikki.org / wiktextract:** the raw-data page states no license, only a citation request (Ylonen, LREC 2022) — [kaikki.org raw data](https://kaikki.org/dictionary/rawdata.html). The data inherits Wiktionary's license (CC BY-SA, plus GFDL for older text) — [Wikimedia Terms of Use](https://foundation.wikimedia.org/wiki/Policy:Terms_of_Use) (standard Wikimedia terms; not re-fetched this session)
- **Verbiste: GNU GPL v2 or later.** "If the XML knowledge base is converted to another format, the result must be shipped under the GPL, with the original XML" — [Debian verbiste README](https://sources.debian.org/src/verbiste/0.1.49-1/README); [Mageia verbiste (GPLv2+)](https://madb.mageia.org/package/show/application/0/name/verbiste)
- **Grammalecte/Dicollecte dictionaries: MPL 2.0** per distro packaging (hunspell-fr-* 7.7: "MPL-2.0"). The Grammalecte *software* is GPL 3+ — [Arch hunspell-fr-revised](https://www.archlinux.org/packages/extra/any/hunspell-fr-revised); [CentOS hunspell-fr (MPLv2.0)](https://linuxsoft.cern.ch/cern/centos/7/updates/x86_64/repoview/hunspell-fr.html); [Guix grammalecte (GPL 3+)](https://packages.guix.gnu.org/packages/grammalecte/2.1.1)

### Inferences (not legal advice; have counsel confirm before launch)
- **LGPL-LR** follows the LGPL model applied to data. Software that merely *uses* the resource can be proprietary. The resource itself, and any modification of it, must stay under LGPL-LR, come with the license text and copyright notice, and be available to recipients.
  - A JSON file pre-processed from Morphalou or Lefff and shipped to browsers (filtered to common words, reshaped into per-verb tables) is very likely a "modified resource". Publish that derived file under LGPL-LR, for example as a downloadable file or a public repo, with credit to ATILF (Morphalou) or Inria (Lefff).
  - The app's own code is not affected. This is the cleanest fit for a closed-source product among the full-paradigm sources.
- **CC BY-SA** (Lexique 3.83, GLÀFF, Wiktionary):
  - Attribution is required in the UI or credits.
  - Any adapted data set you distribute (shipping it to browsers counts as distribution) must be released under CC BY-SA.
  - Share-alike reaches the data, not the separate app code, so a closed-source app can still use it if the derived data file is offered openly.
  - Combining CC BY-SA data with LGPL-LR data into one merged file raises license-compatibility questions. Keeping them in separate files avoids that.
- **MPL 2.0** (Grammalecte dictionary) is file-level copyleft. Modified dictionary files must stay MPL and be offered in source form. Larger works can be proprietary.
- **GPL** (Verbiste): shipping Verbiste-derived tables to browsers is distribution. The GPL text and the "converted format must also be GPL, with the original XML" clause make the derived data GPL. That conflicts with a closed-source product unless the data is kept fully separate and offered under the GPL, and the "aggregate" argument for data is legally uncertain. Avoid it.
- **Querying server-side instead of shipping**: CC BY-SA, LGPL-LR and MPL obligations trigger on distribution. Keeping the data on the server and returning only per-lookup results reduces the distribution footprint (none of these are AGPL-style network licenses), but attribution is still expected. Treat this as a hedge, not a loophole.
- **Lexique 4.1**: given the CC BY-NC link, do not use it commercially until the authors clarify. Lexique 3.83 on openlexicon is unambiguously CC BY-SA 4.0.

### Gaps
- The full LGPL-LR text was not fetched this session. The Morphalou LISEZ-MOI links to it only internally (#lgpllr). The exact wording on "modified resource" vs "work that uses the resource" should be read before relying on the inference above.
- The Grammalecte lexicon file's own license header was not read; MPL 2.0 is confirmed only through distro packaging.
- The GLÀFF page itself (not GLAWI's) could not be reached to confirm "CC BY-SA 3.0" verbatim.
- The license of *Le DM* was not checked.

## Q3. Known accuracy/quality assessments, and which sources suit learners (standard French, frequency filtering)

### Takeaway
No head-to-head accuracy study of these lexicons was retrieved this session. Structurally, Morphalou (curated from the TLF plus merged DELA, Lefff and Dicollecte) and Lefff are the most reliable for paradigms. Wiktionary-derived data is the broadest and most current, but crowdsourced and noisy. Only Lexique (and PsychoGLÀFF) carries frequency, so the learner-friendly path is a paradigm source filtered by Lexique frequencies.

### Cited Findings
- Morphalou is curated from the TLF nomenclature (ATILF) and merges four other lexicons (DELA, Dicollecte, LGLex/Lefff), filling 21,880 missing forms in 3.1 — [Morphalou documentation](https://repository.ortolang.fr/api/content/morphalou/1/documentation.pdf); [LISEZ-MOI](https://repository.ortolang.fr/api/content/morphalou/latest/LISEZ-MOI.html)
- DELAF has had no significant update since 2001 — [UCLouvain DELAF 2.0](https://www.uclouvain.be/fr/instituts-recherche/ilc/cental/delaf-2-0)
- GLÀFF's selling points are size (over 1.4M entries) and continuous updating from Wiktionnaire. PsychoGLÀFF filters it down to about 340k entries (120k lemmas) attested in corpora, i.e. a frequency-filtered version — [PsychoGLÀFF (HAL)](https://hal.archives-ouvertes.fr/hal-01121487); [GLÀFF LREC 2014](https://aclanthology.org/L14-1469/)
- A comparison of crowdsourced vs professional dictionaries through neology exists (Sajous et al.) — [ResearchGate](https://www.researchgate.net/publication/329687949_The_Complementarity_of_Crowdsourced_Dictionaries_and_Professional_Dictionaries_viewed_through_the_Filter_of_Neology)
- Lexique 3.83 carries book and film-subtitle frequencies. Lexique 4.1 adds subtitle frequencies on 316M words, contextual diversity and "prevalence" (the share of people who know a word) — [openlexicon README](https://github.com/chrplr/openlexicon/blob/master/datasets-info/Lexique383/README-Lexique.md); [lexique.org](http://www.lexique.org/)
- Morphalou 3.1 lists 14,762 verb lemmas and 102,238 noun lemmas, far more than a learner needs. Many are rare or technical — [LISEZ-MOI](https://repository.ortolang.fr/api/content/morphalou/latest/LISEZ-MOI.html)

### Inferences
- **Recommended stack for a TEF learner app:**
  - Conjugation and gender: Morphalou 3.1 (LGPL-LR).
  - Ranking and filtering: join it with Lexique 3.83 frequencies (CC BY-SA 4.0), e.g. keep verbs and nouns above a subtitle-frequency threshold. That cuts rare and archaic noise and keeps the shipped file small.
  - Publish the derived files under their respective licenses, kept separate, with ATILF and New & Pallier credited.
- **Use Wiktionary extracts as a complement, not the base:**
  - They are the only source that ties gender to sense (*le tour* "turn, trip" vs *la tour* "tower"), labels epicene nouns explicitly, and covers new words.
  - They are CC BY-SA and noisier.
  - The French-edition extract is 6.4 GB raw, so it needs heavy server-side filtering before any browser use.
- **Spelling variants:** Morphalou includes many 1990-reform and older variant spellings (from Dicollecte and DELA). A learner UI should prefer the most frequent spelling by Lexique frequency.
- **Verbiste** is nicely sized for learners (~7k verbs, template-based, so tables are compact), but GPL rules it out for closed-source shipping.
- **Auxiliaries:** compound tenses need each verb's auxiliary. If Morphalou lacks it (unverified), the auxiliary has to come from Lefff (LGPL-LR) or Wiktionary (CC BY-SA), or from a hand-curated list of the ~20 être verbs plus the rule that pronominal verbs take être.

### Gaps
- No quantitative error-rate comparison between Morphalou, Lefff, DELA, GLÀFF and Wiktionary was found. The 2023 CORIA-TALN survey ([PDF](https://aclanthology.org/2023.jeptalnrecital-short.3v1.pdf)) compares French lexicons, including a chart of lexicons by year, but its text could not be extracted this session. Read it for any numbers.
- No source was found that measures how often these lexicons get gender wrong for learner-relevant nouns, or how they handle *le/la tour*-type pairs. A practical check is a spot test on ~50 nouns from real essays, the same method AGENTS.md proposes for dictionary sources.
- FLELex (UCLouvain CENTAL; CEFR-graded word frequencies for French learners) and Manulex came to mind as learner-oriented frequency sources but were not researched this session. Their licenses (FLELex is believed to be non-commercial) are unverified.
