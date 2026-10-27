// Ink's own facts about French verbs, applied over the Lefff table by
// scripts/build-conjugation.ts (auxiliaries, pronominal verbs, fixes) and
// read by lib/conjugation.ts at lookup time (h aspiré). Not derived from
// Lefff: checked by hand against Bescherelle-style tables.

/**
 * Conjugated with être when used on their own (je suis venu). Pronominal
 * uses always take être and aren't listed: that's the lookup's job.
 * Verbs that take avoir with a direct object are under BOTH instead.
 */
export const ÊTRE = [
  "advenir",
  "aller",
  "apparaître",
  "arriver",
  "décéder",
  "devenir",
  "échoir",
  "éclore",
  "intervenir",
  "mourir",
  "naître",
  "partir",
  "parvenir",
  "provenir",
  "réapparaître",
  "redevenir",
  "renaître",
  "repartir",
  "rester",
  "retomber",
  "revenir",
  "survenir",
  "tomber",
  "venir",
];

/**
 * Être without an object, avoir with one: je suis sorti / j'ai sorti la
 * poubelle; je suis passé / j'ai passé un examen. Demeurer and accourir
 * change by meaning or register rather than object, but both are correct.
 */
export const BOTH = [
  "accourir",
  "demeurer",
  "descendre",
  "entrer",
  "monter",
  "passer",
  "redescendre",
  "remonter",
  "rentrer",
  "repasser",
  "ressortir",
  "retourner",
  "sortir",
];

/** Only used with se: the lookup always shows them pronominal (se souvenir, s'évanouir). */
export const PRONOMINAL = [
  "abstenir",
  "absenter",
  "accouder",
  "accroupir",
  "adonner",
  "agenouiller",
  "arroger",
  "avérer",
  "blottir",
  "chamailler",
  "dédire",
  "démener",
  "désister",
  "ébattre",
  "écrier",
  "écrouler",
  "efforcer",
  "emparer",
  "empresser",
  "enfuir",
  "enorgueillir",
  "enquérir",
  "ensuivre",
  "entraider",
  "envoler",
  "esclaffer",
  "évader",
  "évanouir",
  "évertuer",
  "exclamer",
  "extasier",
  "fier",
  "formaliser",
  "gargariser",
  "immiscer",
  "ingénier",
  "insurger",
  "lamenter",
  "méfier",
  "méprendre",
  "moquer",
  "morfondre",
  "mutiner",
  "obstiner",
  "pâmer",
  "prélasser",
  "raviser",
  "rebeller",
  "rebiffer",
  "récrier",
  "réfugier",
  "renfrogner",
  "repentir",
  "soucier",
  "souvenir",
  "suicider",
  "targuer",
  "vautrer",
];

/**
 * Verbs starting with an h aspiré: no elision before them (je hais, je me
 * hâte, se hisser). Every other verb in h elides (j'habite, s'habiller).
 */
export const H_ASPIRÉ = [
  "hacher",
  "hachurer",
  "haïr",
  "haler",
  "hâler",
  "haleter",
  "handicaper",
  "hanter",
  "happer",
  "haranguer",
  "harasser",
  "harceler",
  "harnacher",
  "harponner",
  "hasarder",
  "hâter",
  "hausser",
  "héler",
  "hennir",
  "hérisser",
  "herser",
  "heurter",
  "hiérarchiser",
  "hisser",
  "hocher",
  "hongrer",
  "honnir",
  "hoqueter",
  "houspiller",
  "huer",
  "hululer",
  "humer",
  "hurler",
];

/**
 * Lefff entries that aren't verbs or are conjugated wrongly throughout, and
 * rare enough to leave out rather than rewrite: a wrong table teaches the
 * mistake. raller is conjugated on "rv-"; énamourer on a "meur-" stem;
 * déjeûner, draîner and saoûler are old spellings of verbs Lefff also has
 * (déjeuner, drainer, soûler).
 */
export const DROP = ["uw", "uwSe", "voici", "voilà", "revoici", "revoilà", "raller", "énamourer", "enamourer", "déjeûner", "draîner", "saoûler"];

/**
 * Cells that replace Lefff's, by verb and tense: P présent, I imparfait,
 * J passé simple, F futur, C conditionnel, S subjonctif, Y impératif (tu,
 * nous, vous), G participe présent, K participe passé (m, m pl, f, f pl),
 * W more spellings of the infinitive. Persons are separated by spaces, "-"
 * is a person the verb doesn't have, "a/b" are two correct spellings (the
 * first shown first), and "~x" is recognised in a lookup but not shown
 * (1990 spellings: see lib/conjugation/NOTICE.md).
 */
export const FIXES: Record<string, Partial<Record<"P" | "I" | "J" | "F" | "C" | "S" | "Y" | "G" | "K" | "W", string>>> = {
  // Lefff has only the assois series; both are standard, assieds the more common.
  asseoir: {
    P: "assieds/assois assieds/assois assied/assoit asseyons/assoyons asseyez/assoyez asseyent/assoient",
    I: "asseyais/assoyais asseyais/assoyais asseyait/assoyait asseyions/assoyions asseyiez/assoyiez asseyaient/assoyaient",
    F: "assiérai/assoirai assiéras/assoiras assiéra/assoira assiérons/assoirons assiérez/assoirez assiéront/assoiront",
    C: "assiérais/assoirais assiérais/assoirais assiérait/assoirait assiérions/assoirions assiériez/assoiriez assiéraient/assoiraient",
    S: "asseye/assoie asseyes/assoies asseye/assoie asseyions/assoyions asseyiez/assoyiez asseyent/assoient",
    Y: "assieds/assois asseyons/assoyons asseyez/assoyez",
    G: "asseyant/~assoyant",
    W: "~assoir",
  },
  // Lefff: present 1sg "puis" alone. Je peux is the usual form; je puis is literary but correct.
  pouvoir: { P: "peux/puis peux peut pouvons pouvez peuvent" },
  // Lefff: "dûs". Only the masculine singular takes the circumflex.
  devoir: { K: "dû dus due dues" },
  redevoir: { K: "redû redus redue redues" },
  mouvoir: { K: "mû mus mue mues" },
  croître: { K: "crû crus crue crues" },
  recroître: { K: "recrû recrus recrue recrues" },
  accroître: { K: "accru accrus accrue accrues" },
  décroître: { K: "décru décrus décrue décrues" },
  // Lefff: "résous/résoute", a rare chemistry sense; the participle is résolu.
  résoudre: { K: "résolu résolus résolue résolues" },
  // Lefff: "inclu". The participle is inclus, incluse (unlike conclu, exclu).
  inclure: { K: "inclus inclus incluse incluses" },
  // Invariable participles that Lefff inflects ("plues").
  plaire: { K: "plu plu plu plu" },
  déplaire: { K: "déplu déplu déplu déplu" },
  complaire: { K: "complu complu complu complu" },
  luire: { K: "lui lui lui lui" },
  courbaturer: { K: "courbaturé courbaturés courbaturée courbaturées" },
  // Lefff: "taît". Only plaire's family takes the circumflex (Grevisse §778).
  taire: { P: "tais tais tait taisons taisez taisent" },
  // Lefff: "vêtit".
  vêtir: { P: "vêts vêts vêt vêtons vêtez vêtent" },
  // Lefff: imperative "fouts".
  foutre: { Y: "fous foutons foutez" },
  // Lefff's present is broken (gisons gisons gît). Gésir has no other tenses.
  gésir: {
    P: "gis gis gît gisons gisez gisent",
    I: "gisais gisais gisait gisions gisiez gisaient",
    G: "gisant",
  },
  // Lefff conjugates frire in full on friser's endings ("frisons"); it is defective.
  frire: { P: "fris fris frit - - -", I: "- - - - - -", J: "- - - - - -", S: "- - - - - -", Y: "fris - -", G: "-" },
  // Lefff's archaic present ("je faux", "il faut") collides with falloir.
  // Faillir is used almost only in compound tenses; the modern forms follow finir.
  faillir: {
    P: "faillis faillis faillit faillissons faillissez faillissent",
    I: "faillissais faillissais faillissait faillissions faillissiez faillissaient",
    S: "faillisse faillisses faillisse faillissions faillissiez faillissent",
    Y: "- - -",
  },
  // Impersonal: Lefff gives it every person.
  échoir: {
    P: "- - échoit - - échoient",
    I: "- - échoyait - - échoyaient",
    J: "- - échut - - échurent",
    F: "- - échoira - - échoiront",
    C: "- - échoirait - - échoiraient",
    S: "- - échoie - - échoient",
    Y: "- - -",
    G: "échéant/~échoyant",
  },
  // Lefff has a handful of cells.
  surseoir: {
    P: "sursois sursois sursoit sursoyons sursoyez sursoient",
    I: "sursoyais sursoyais sursoyait sursoyions sursoyiez sursoyaient",
    J: "sursis sursis sursit sursîmes sursîtes sursirent",
    F: "surseoirai surseoiras surseoira surseoirons surseoirez surseoiront",
    C: "surseoirais surseoirais surseoirait surseoirions surseoiriez surseoiraient",
    S: "sursoie sursoies sursoie sursoyions sursoyiez sursoient",
    Y: "sursois sursoyons sursoyez",
    G: "sursoyant",
    K: "sursis sursis sursise sursises",
    W: "~sursoir",
  },
};

/**
 * Verbs conjugated like another with a prefix, replacing Lefff's table:
 * ressortir (go out again, stand out: il ressort) is conjugated as a second
 * group verb in Lefff, which is only right for ressortir à (to fall under);
 * automaintenir as second group too ("automaintenis").
 */
export const LIKE: Record<string, [prefix: string, base: string]> = {
  rasseoir: ["r", "asseoir"],
  ressortir: ["res", "sortir"],
  automaintenir: ["auto", "maintenir"],
  dévêtir: ["dé", "vêtir"],
  revêtir: ["re", "vêtir"],
  reluire: ["re", "luire"],
};
