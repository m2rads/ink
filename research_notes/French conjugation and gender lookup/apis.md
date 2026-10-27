# Hosted APIs for French verb conjugation and noun gender (as of October 2026)

Scope: web APIs a commercial web app could call for French conjugation tables and/or noun gender, plus self-hostable and data-file alternatives, and the LLM fallback. Research ran on 2026-10-26 with about 17 tool calls. Many vendor pages publish no terms or prices; those gaps are marked as such, not guessed.

## Which APIs exist, and what each returns (conjugation tables and/or gender)?

### Takeaway
No major French reference publisher (Larousse, Bescherelle/Hatier, Le Conjugueur/Le Figaro, Reverso, WordReference) offers a public, documented conjugation API. The hosted options are a few marketplace APIs (Zyla Labs, a RapidAPI "French Conjugaison" listing), Verbix's embeddable widget, and general dictionaries (Collins, Oxford) whose entries carry gender but not conjugation tables. Strong open-source options exist (verbecc/Verbiste for conjugation; Lexique 3 and Wiktionary extracts for gender) and can be self-hosted or bundled.

### Cited Findings

**Marketplace conjugation APIs**
- Zyla Labs "French Conjugation API": `GET .../conjugate?word=` with a Bearer token. It returns JSON with verb group, auxiliary, model verb, verb type, a conjugation rule, infinitive and participles, and full tables: indicatif (présent, passé simple, imparfait, passé composé, futur simple, passé antérieur, plus-que-parfait, futur antérieur), subjonctif (présent, passé, imparfait, plus-que-parfait), conditionnel (présent, passé 1re/2e forme), impératif (présent, passé), six persons each — [Zyla Labs listing](https://zylalabs.com/api-marketplace/dictionary/french+conjugation+api/439)
- Zyla's own sample output for *aller* contains a malformed entry ("qu'il/elle/on ail/elle/onle"), so its data quality needs checking — [Zyla Labs listing](https://zylalabs.com/api-marketplace/dictionary/french+conjugation+api/439)
- Zyla does not name its data provider. It says only that the data is "validated against established French language rules" — [Zyla Labs listing](https://zylalabs.com/api-marketplace/dictionary/french+conjugation+api/439)
- RapidAPI "French Conjugaison" by user `conjugaisonapp` claims "9000+ French verbs". A search snippet showed latency of about 590 ms and "updated 8 months ago". Pricing and endpoints were not retrieved — [RapidAPI conjugaisonapp](https://rapidapi.com/uk/user/conjugaisonapp)

**Verbix**
- Verbix's developer service is a JavaScript embed (`content-api.verbix.com/conjugator/v2.0.2.js`) that writes conjugated forms into HTML `div`s. It needs a key requested through a form, supports French (`fra`) and about 40 languages, and documents no JSON endpoints — [Verbix Verb Conjugation Service](https://api.verbix.com/conjugator/html)
- Unofficial SDKs use the key the Verbix website itself uses, or suggest contacting Verbix for one — [verbix-sdk on PyPI](https://pypi.org/project/verbix-sdk)
- Crunchbase describes Verbix as a non-profit organization (not verified on Verbix's own site) — [Crunchbase](https://www.crunchbase.com/organization/verbix)

**Reverso**
- There is no official Reverso API. Third-party clients scrape it: the ReversoAPI NuGet package "leverag[es] the Reverso site API and pars[es] HTML", and lists conjugation as a feature — [ReversoAPI NuGet](https://www.nuget.org/packages/ReversoAPI/)
- An Emacs client's README says Reverso "doesn't offer an official API" — [reverso.el README](https://mirrors.ocf.berkeley.edu/melpa/reverso-readme.txt)

**Larousse, Bescherelle (Hatier), Le Conjugueur (Le Figaro)**
- No API or data-licensing page was found for any of them. The Bescherelle book covers 104 model verbs and a repertoire of 10,000 verbs; it is a print product — [Éditions Hatier](https://www.editions-hatier.fr/node/51391)
- Le Conjugueur appears only as a consumer app — [Le Conjugueur app listing](https://mwm.ai/fr/apps/le-conjugueur/356994010)

**WordReference**
- API key generation appears closed. A third-party extension listing says the "service has been shut down as well as the generation of API key" (not confirmed by WordReference) — [EasyWords Chrome listing](https://chrome.google.com/webstore/detail/easywords/faiilkphlbkfnjddbappbaahpmafhmbj/reviews)
- WordReference also blocks embedding on other domains, so Readlang switched to linking out — [Readlang forum](https://forum.readlang.com/t/dictionary-with-word-reference-nightly-not-working/2059)

**Oxford Dictionaries API (OUP)**
- Still active in 2026, not discontinued. OUP shipped English and Spanish dataset updates in May 2026 and a new dataset for its "Growing and Enterprise plans" — [OUP: Oxford Dictionaries API updates 2026](https://languages.oup.com/oxford-dictionaries-api-updates-2026/)
- Endpoints include headwords, parts of speech, definitions, translations, audio, examples and labels. Licensing covers "over 35 languages". The about page does not mention French grammatical gender or inflection tables — [Oxford Dictionaries API: About](https://developer.oxforddictionaries.com/about)
- Lexico (OUP's consumer site) closed and redirected to Dictionary.com on 26 August 2022. API v1 sunset on 30 June 2019 — [Wikipedia: Lexico](https://en.wikipedia.org/wiki/Lexico); [GitHub alfaaz](https://github.com/AninditaBasu/_alfaaz_)

**Collins Dictionary API**
- The project's own earlier research (AGENTS.md, from Collins' terms of 13 February 2025) records:
  - bilingual dictionaries free up to 5,000 calls a month, then £75/month to 30,000 and £400/month to 100,000;
  - a commercial licence needed for a commercial product;
  - no storing or caching of entries;
  - mandatory notice "www.collinsdictionary.com © HarperCollins Publishers Ltd 2025".

  Source: `/Users/m2rads/Documents/projects/ink/AGENTS.md`. The Collins API docs returned HTTP 403 when fetched, so whether entries expose gender or verb tables in a parseable field was not verified — [Collins API docs (403)](https://api.collinsdictionary.com/api/v1/documentation/html/)
- Collins also licenses its bilingual dictionaries for 26 languages as data, through collins.licensing@harpercollins.co.uk (project AGENTS.md).

**Lexicala (K Dictionaries)**
- Lexical data from K Dictionaries for 50 languages, accessed through RapidAPI with an `X-RapidAPI-Key`. Pricing was not found — [Lexicala API docs (old)](https://api.lexicala.com/documentation-old/)

**Wiktionary REST API**
- en.wiktionary's `/api/rest_v1/page/definition/{term}` is documented as "experimental", with other languages "under discussion". It is not confirmed deprecated — [Wikimedia REST API page (mirror)](https://kompas.wasmer.app/https_www_mediawiki_org/wiki/Wikimedia_REST_API); [Phabricator T119235](https://phabricator.wikimedia.org/T119235)
- An API catalog calls `/api/rest_v1/` the legacy option, distinct from the newer MediaWiki Core REST API at `/w/rest.php` — [API Evangelist: Wiktionary](https://providers.apievangelist.com/providers/wiktionary/)
- The old RESTBase docs now redirect to a "REST Sandbox" page — [Wikimedia APIs/Changelog](https://www.mediawiki.org/wiki/Wikimedia_APIs/Changelog); [en.wiktionary REST sandbox](https://en.wiktionary.org/api/rest_v1/)

**Wiktionary extracts (kaikki.org / Wiktextract)**
- French from en.wiktionary: 391,323 distinct word forms, 284,899 verb senses, 103,946 noun senses and 287 distinct tags. Extracted 2026-10-25 from the 2026-10-01 dump. The 565.4 MB postprocessed JSONL is marked "deprecated and slated for removal". The page asks users to cite Ylonen (LREC 2022) and link back to kaikki.org — [kaikki.org French](https://kaikki.org/dictionary/French/index.html)

**Self-hostable conjugation engines**
- verbecc: LGPL-3.0; French, Spanish, Catalan, Italian, Portuguese, Romanian. French templates come from Pierre Sarrazin's Verbiste. It claims "99% accuracy" for unknown verbs with ML, without giving a method. The repo has 433 commits. A live HTTP example runs at `verbe.cc/verbecc/conjugate/fr/manger` — [verbecc GitHub](https://github.com/bretttolbert/verbecc)
- verbecc supports "over 7,000 French verbs" — [verbecc PyPI](https://pypi.org/project/verbecc)
- verbecc-svc: a Dockerized Python microservice with a REST/JSON API for French, Spanish and Portuguese conjugation — [verbecc-svc GitHub](https://github.com/bretttolbert/verbecc-svc)
- mlconjug3: a Python library with pre-trained models for French (the default), English, Spanish, Italian, Portuguese and Romanian — [mlconjug3 docs](https://mlconjug3.readthedocs.io/en/latest/modules.html)
- Verbiste: a French conjugation database of more than 7,000 verbs, with `french-conjugator` and `french-deconjugator` command-line tools — [Verbiste package](https://mankier.com/package/verbiste)

**Noun gender data (downloadable)**
- Lexique 3.83: about 140,000 French words with `genre` and `nombre` fields (for example `"genre": "m"`), lemmas and frequencies. It can be downloaded or queried freely — [pylexique docs](https://pylexique.readthedocs.io/en/stable/readme.html); [Lexique 2 paper](https://hal.archives-ouvertes.fr/hal-02341287)
- The gender field is sometimes null in a Hugging Face copy — [HF FrancophonIA/Lexique3](https://huggingface.co/datasets/FrancophonIA/Lexique3/viewer/default/train)

### Inferences
- For full conjugation tables, the realistic choices are: (a) self-host verbecc or bundle Verbiste's XML (LGPL/GPL-family; check how it may be combined with closed code), (b) a marketplace API such as Zyla (paid, unnamed data provider, visible data errors), or (c) an LLM. Reference publishers are not an API option without a bespoke licensing deal.
- For noun gender, Lexique 3 or kaikki.org data bundled as a static lookup is cheaper, instant and storable, unlike Collins or Oxford, which forbid caching.
- DeepL and Linguee: nothing found suggests DeepL exposes a dictionary, conjugation or gender API. Its public API is translation only (not verified this session; see Gaps).

### Gaps
- Collins API entry structure (whether gender like nm/nf is a parseable field, whether verb tables exist): the docs returned 403.
- Oxford API prices and free-tier limits: the pricing page was not fetched, and the terms state no figures. Whether Oxford has a French monolingual dataset with gender or inflections: not confirmed.
- Pricing and plans for the RapidAPI "French Conjugaison" listing and for Lexicala.
- Cooljugator, Lingolex, Glosbe: not researched this session (tool budget). Cooljugator is not known to have a public API.
- DeepL/Linguee: no search was run, so "no dictionary API" is my prior, not a sourced fact.
- The licence of the verbecc HTTP endpoint at verbe.cc for third-party commercial use: unknown.

## Free tiers, pricing, rate limits, latency, caching, commercial use, attribution

### Takeaway
Only Zyla publishes full prices, and its page contradicts itself. Collins (5,000 free calls a month) and Oxford both forbid storing or caching content. Open data (Lexique, Wiktionary extracts, Verbiste/verbecc) is the only route to storable, offline lookups, in exchange for licence attribution or share-alike terms.

### Cited Findings
- **Zyla, prices conflict between fetches:**
  - One fetch showed CAD: Basic C$37.99/mo for 1,000 requests at 60 req/min; Pro C$149.99/mo for 10,000; Pro Plus C$299.99/mo for 200,000 at 120 req/min; overage C$0.0493870 per request; Enterprise from C$15,000/yr.
  - Another showed USD: $24.99 / $83.33 (100k) / $199.99.
  - The schema.org data shows C$24.99 / C$99.99 / C$199.99, and one passage cites a 1 request/second limit.

  [Zyla Labs listing](https://zylalabs.com/api-marketplace/dictionary/french+conjugation+api/439)
- **Zyla, other terms:** 7-day trial of up to 50 requests, once per account; 761 ms average response and "100% uptime" (self-reported). Caching and commercial-use terms are not stated on the listing — [Zyla Labs listing](https://zylalabs.com/api-marketplace/dictionary/french+conjugation+api/439)
- **RapidAPI "French Conjugaison":** about 590 ms latency per the listing snippet — [RapidAPI conjugaisonapp](https://rapidapi.com/uk/user/conjugaisonapp)
- **Oxford, caching:** both commercial and non-commercial terms say "You will not cache, store, or save Content". The only exception is user-level session caching of the formatted display. Local storage requires contacting OUP, and commercial terms point to an Enterprise licence. Content must be deleted within 21 days of termination — [OUP API Terms](https://developer.oxforddictionaries.com/api-terms-and-conditions)
- **Oxford, commercial use and attribution:** commercial use is allowed under the commercial terms, but "standalone dictionary lookup products need OUP approval". Sublicensing and redistribution need written approval. Attribution may read "Powered by Oxford Dictionaries", and users must be told the content is copyrighted. Rate limits follow a Fair Use Policy on the docs pages; no numbers are given in the terms. The free trial is one-time and limited. No prices are in the terms — [OUP API Terms](https://developer.oxforddictionaries.com/api-terms-and-conditions)
- **Collins:** 5,000 free calls/month on bilingual dictionaries, £75/month to 30,000, £400/month to 100,000. No storing or caching. Mandatory © HarperCollins notice. Commercial licence required for a commercial product (project AGENTS.md, Collins terms of 13 Feb 2025; not re-verified this session).
- **Verbix:** pricing, rate limits, attribution and commercial terms are not stated on the developer page. A terms page at `verbix.com/webverbix/termsofuse.html` is referenced by a client but was not retrieved. The page states copyright 1995–2024, all rights reserved — [Verbix service page](https://api.verbix.com/conjugator/html); [python-verb-conjugator](https://github.com/syedpeer/python-verb-conjugator)
- **Reverso:** scraping (via the NuGet or JS wrappers) has no sanctioned terms and "could break if Reverso changes its pages" — [ReversoAPI NuGet](https://www.nuget.org/packages/ReversoAPI/)
- **kaikki.org:** free download. Attribution is a citation of the Wiktextract paper plus a link. The page states no licence; Wiktionary content itself is CC BY-SA — [kaikki.org French](https://kaikki.org/dictionary/French/index.html)
- **Lexique 3.83:** secondary sources list "CC BY SA 4.0" (garbled) — [pylexique docs](https://pylexique.readthedocs.io/en/stable/readme.html). The Lexique 2 paper describes "a GNU-like license" — [HAL](https://hal.archives-ouvertes.fr/hal-02341287). These conflict; check lexique.org.
- **verbecc:** LGPL-3.0. Self-hosted, so there are no per-call costs, and storage and caching are unrestricted apart from licence obligations — [verbecc GitHub](https://github.com/bretttolbert/verbecc)

### Inferences
- **Latency:** hosted marketplace APIs report 0.6–0.8 s per call (self-reported). A self-hosted verbecc service, or a bundled JSON table in the browser, would be effectively instant. That matters for Ink's dictionary, which already waits 300 ms for a pause.
- Because Collins and Oxford forbid caching, every gender lookup through them is a paid, metered, online call. Bundling Lexique or Wiktionary gender data avoids that, and keeps working if the vendor shuts down.
- **Abandoned or closed:** WordReference API (key generation closed, per a third party); Oxford API v1 (sunset 2019); Lexico (closed 2022); the kaikki.org full French JSONL download (deprecated, slated for removal). Wiktionary's `rest_v1` definition endpoint is experimental or legacy, not deprecated.

### Gaps
- Exact Oxford plan prices (Growing/Enterprise) and free-tier quotas.
- Zyla's true current prices and currency (sources conflict), and its caching terms.
- Verbix terms of use content and pricing.
- Wikimedia API rate limits and User-Agent policy: not fetched this session.

## Is an LLM a reasonable fallback for conjugation and gender, and how accurate is it?

### Takeaway
I found no published benchmark that isolates LLM accuracy on French conjugation tables or noun gender. The adjacent evidence suggests LLMs are strong on frequent forms but make morphosyntactic errors, so using an LLM as the primary source of truth for a reference table is risky. A deterministic engine (verbecc, Lexique) with the LLM as a fallback for unknown words is the safer design.

### Cited Findings
- MORPHOGEN (2026) benchmarks 15 open and closed models on gender-aware morphological generation (including verb agreement) in French, Arabic and Hindi. French-specific figures were not visible in the snippet — [MORPHOGEN, arXiv 2604.18914](https://arxiv.org/html/2604.18914)
- GeNRe (French gender-neutral rewriting) found morphosyntactic errors, especially on adjectives and verbs, were the most common error type of its rewriting models — [GeNRe, arXiv 2505.23630](https://arxiv.org/pdf/2505.23630)
- FairTranslate (EN→FR gender) reported accuracies roughly in the low 30s to mid 50s (%) for Gemma2-2B, Mistral-7B, Llama3.1-8B and Llama3.3-70B. The task is gender inference in translation, not lexical noun gender — [FairTranslate, arXiv 2504.15941](https://arxiv.org/html/2504.15941v2)
- For English learner writing, ChatGPT was highly accurate on verb forms and subject-verb agreement but only moderate on verb tense (Alsaweed & Aljebreen, 2024) — [IDEAS/RePEc](https://ideas.repec.org/a/igg/jcallt/v14y2024i1p1-18.html)
- Grammatical gender of French nouns is partly predictable from form, which is why models of it exist (relevant to how LLMs might guess) — [Predicting and Explaining French Grammatical Gender, SIGTYP 2021](https://aclanthology.org/2021.sigtyp-1.9.pdf)

### Inferences
- **Cost:** Ink already calls GPT-class models through the Vercel AI SDK, so an LLM fallback costs one structured-output call per uncached word. Latency would be seconds, not milliseconds, and answers could be stored, since the outputs are generated and not licensed content. (The provider's own terms on storing outputs were not checked here.)
- **Validation:** results could be checked against verbecc for every verb it knows. The LLM is then needed mainly for rare or neologism verbs (verbecc already predicts those with ML) and for gender of nouns missing from Lexique or Wiktionary.
- **Hard cases:** the likely LLM failures are passé simple and imparfait du subjonctif of irregular verbs, rare defective verbs, auxiliary choice (être/avoir), and nouns whose gender changes meaning (le/la tour, le/la livre). Ink's own AGENTS.md already requires "precision over recall" for AI feedback.

### Gaps
- No direct, quantitative accuracy figure for any frontier LLM (GPT-5/6 class, Claude, Gemini) on full French conjugation tables or noun gender lookup was found. A small in-house test (for example 200 verbs × all tenses against verbecc/Verbiste, and 500 nouns against Lexique) would settle it.
- MORPHOGEN's French-specific results were not read in full.
