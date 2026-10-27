# Noun-gender data

`lib/gender.ts` reads these files on the server only (the dictionary's `lookUp` action). They never ship to the browser. Rebuild them with `bun scripts/build-gender.ts`; it downloads the sources to `.cache/gender/` (git-ignored).

| File | Source | Licence | What was changed |
|---|---|---|---|
| `morphalou.json` | [Morphalou 3.1](https://www.ortolang.fr/market/lexicons/morphalou) (ATILF, CNRS & Université de Lorraine), CSV edition | [LGPL-LR](LICENSE-LGPLLR.txt) | Nouns only, as one sorted index of `key;form;gender;lemma` lines: accents and case folded into the key, ligature spellings merged, plurals that duplicate a lemma of the same gender dropped, weakly attested plurals dropped, a flag for forms that are also another part of speech and for plural-only nouns. Genders are Morphalou's; `curated.ts` overrides the ones it gets wrong. |
| `lexique.json` | [Lexique 3.83](http://www.lexique.org/) (New, Pallier et al.) | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | Three word lists computed from its book and film frequencies: noun forms that are mostly nouns, forms that are mostly another part of speech, and lemmas whose gender it disputes with Morphalou. |
| `curated.ts` | Ink | Ink's own | Hand-checked genders, meaning-dependent pairs with our own short glosses, and fixes. |

Under the LGPL-LR, `morphalou.json` is a modified copy of Morphalou and stays under the LGPL-LR (this notice and the licence text go with it); Ink's code is not affected. `lexique.json` stays under CC BY-SA 4.0 with the attribution above.
