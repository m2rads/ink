import type { Block } from "@/app/write/blocks";

// Throwaway: /proto/conjugation. Hand-written conjugation tables for the
// verbs the directions are judged on, and the essay the selection direction
// runs on. Only simple tenses are written out; compound tenses are built in
// conjugate.ts from être and avoir below plus the past participle, so a
// compound form can't be wrong in one table and right in another.
//
// Forms are the verb alone (no subject, no reflexive pronoun); conjugate.ts
// adds je/tu/…, que, me/te/se and the elisions (j’, qu’, m’, t’, s’). A form
// written as an array has more than one correct spelling (payer: paie, paye).

/** je, tu, il/elle, nous, vous, ils/elles */
export type Six = [Form, Form, Form, Form, Form, Form];
export type Form = string | string[];

export type SimpleTense = "present" | "imparfait" | "passeSimple" | "futur" | "conditionnel" | "subjonctif";
export type CompoundTense =
  | "passeCompose"
  | "plusQueParfait"
  | "passeAnterieur"
  | "futurAnterieur"
  | "conditionnelPasse"
  | "subjonctifPasse";
export type TenseId = SimpleTense | CompoundTense | "imperatif" | "participes";

export type Verb = {
  /** Without "se". */
  inf: string;
  pronominal?: boolean;
  meaning: string;
  /** Short facts, shown as labels. */
  group: string;
  aux: "être" | "avoir";
  participePresent: string;
  participePasse: string;
  simple: Record<SimpleTense, Six>;
  /** tu, nous, vous. Pronominal verbs carry their pronoun (lève-toi). */
  imperatif: [Form, Form, Form];
};

export const VERBS: Verb[] = [
  {
    inf: "être",
    meaning: "to be",
    group: "Irregular",
    aux: "avoir",
    participePresent: "étant",
    participePasse: "été",
    simple: {
      present: ["suis", "es", "est", "sommes", "êtes", "sont"],
      imparfait: ["étais", "étais", "était", "étions", "étiez", "étaient"],
      passeSimple: ["fus", "fus", "fut", "fûmes", "fûtes", "furent"],
      futur: ["serai", "seras", "sera", "serons", "serez", "seront"],
      conditionnel: ["serais", "serais", "serait", "serions", "seriez", "seraient"],
      subjonctif: ["sois", "sois", "soit", "soyons", "soyez", "soient"],
    },
    imperatif: ["sois", "soyons", "soyez"],
  },
  {
    inf: "avoir",
    meaning: "to have",
    group: "Irregular",
    aux: "avoir",
    participePresent: "ayant",
    participePasse: "eu",
    simple: {
      present: ["ai", "as", "a", "avons", "avez", "ont"],
      imparfait: ["avais", "avais", "avait", "avions", "aviez", "avaient"],
      passeSimple: ["eus", "eus", "eut", "eûmes", "eûtes", "eurent"],
      futur: ["aurai", "auras", "aura", "aurons", "aurez", "auront"],
      conditionnel: ["aurais", "aurais", "aurait", "aurions", "auriez", "auraient"],
      subjonctif: ["aie", "aies", "ait", "ayons", "ayez", "aient"],
    },
    imperatif: ["aie", "ayons", "ayez"],
  },
  {
    inf: "aller",
    meaning: "to go",
    group: "Irregular",
    aux: "être",
    participePresent: "allant",
    participePasse: "allé",
    simple: {
      present: ["vais", "vas", "va", "allons", "allez", "vont"],
      imparfait: ["allais", "allais", "allait", "allions", "alliez", "allaient"],
      passeSimple: ["allai", "allas", "alla", "allâmes", "allâtes", "allèrent"],
      futur: ["irai", "iras", "ira", "irons", "irez", "iront"],
      conditionnel: ["irais", "irais", "irait", "irions", "iriez", "iraient"],
      subjonctif: ["aille", "ailles", "aille", "allions", "alliez", "aillent"],
    },
    imperatif: ["va", "allons", "allez"],
  },
  {
    inf: "finir",
    meaning: "to finish",
    group: "2nd group",
    aux: "avoir",
    participePresent: "finissant",
    participePasse: "fini",
    simple: {
      present: ["finis", "finis", "finit", "finissons", "finissez", "finissent"],
      imparfait: ["finissais", "finissais", "finissait", "finissions", "finissiez", "finissaient"],
      passeSimple: ["finis", "finis", "finit", "finîmes", "finîtes", "finirent"],
      futur: ["finirai", "finiras", "finira", "finirons", "finirez", "finiront"],
      conditionnel: ["finirais", "finirais", "finirait", "finirions", "finiriez", "finiraient"],
      subjonctif: ["finisse", "finisses", "finisse", "finissions", "finissiez", "finissent"],
    },
    imperatif: ["finis", "finissons", "finissez"],
  },
  {
    inf: "prendre",
    meaning: "to take",
    group: "Irregular",
    aux: "avoir",
    participePresent: "prenant",
    participePasse: "pris",
    simple: {
      present: ["prends", "prends", "prend", "prenons", "prenez", "prennent"],
      imparfait: ["prenais", "prenais", "prenait", "prenions", "preniez", "prenaient"],
      passeSimple: ["pris", "pris", "prit", "prîmes", "prîtes", "prirent"],
      futur: ["prendrai", "prendras", "prendra", "prendrons", "prendrez", "prendront"],
      conditionnel: ["prendrais", "prendrais", "prendrait", "prendrions", "prendriez", "prendraient"],
      subjonctif: ["prenne", "prennes", "prenne", "prenions", "preniez", "prennent"],
    },
    imperatif: ["prends", "prenons", "prenez"],
  },
  {
    inf: "lever",
    pronominal: true,
    meaning: "to get up",
    group: "1st group · e → è",
    aux: "être",
    participePresent: "levant",
    participePasse: "levé",
    simple: {
      present: ["lève", "lèves", "lève", "levons", "levez", "lèvent"],
      imparfait: ["levais", "levais", "levait", "levions", "leviez", "levaient"],
      passeSimple: ["levai", "levas", "leva", "levâmes", "levâtes", "levèrent"],
      futur: ["lèverai", "lèveras", "lèvera", "lèverons", "lèverez", "lèveront"],
      conditionnel: ["lèverais", "lèverais", "lèverait", "lèverions", "lèveriez", "lèveraient"],
      subjonctif: ["lève", "lèves", "lève", "levions", "leviez", "lèvent"],
    },
    imperatif: ["lève-toi", "levons-nous", "levez-vous"],
  },
  {
    inf: "payer",
    meaning: "to pay",
    group: "1st group · y → i or y",
    aux: "avoir",
    participePresent: "payant",
    participePasse: "payé",
    simple: {
      present: [["paie", "paye"], ["paies", "payes"], ["paie", "paye"], "payons", "payez", ["paient", "payent"]],
      imparfait: ["payais", "payais", "payait", "payions", "payiez", "payaient"],
      passeSimple: ["payai", "payas", "paya", "payâmes", "payâtes", "payèrent"],
      futur: [
        ["paierai", "payerai"],
        ["paieras", "payeras"],
        ["paiera", "payera"],
        ["paierons", "payerons"],
        ["paierez", "payerez"],
        ["paieront", "payeront"],
      ],
      conditionnel: [
        ["paierais", "payerais"],
        ["paierais", "payerais"],
        ["paierait", "payerait"],
        ["paierions", "payerions"],
        ["paieriez", "payeriez"],
        ["paieraient", "payeraient"],
      ],
      subjonctif: [["paie", "paye"], ["paies", "payes"], ["paie", "paye"], "payions", "payiez", ["paient", "payent"]],
    },
    imperatif: [["paie", "paye"], "payons", "payez"],
  },
];

export const ESSAY_TITLE = "Le télétravail rend-il les salariés plus heureux ?";

export const ESSAY: Block[] = [
  {
    id: "p1",
    text: "Quand j’étais enfant, nous allions chaque été chez mes grands-parents. Nous nous levions tôt et nous prenions le train de sept heures. Aujourd’hui, beaucoup de salariés ne prennent plus les transports : ils travaillent depuis chez eux.",
  },
  {
    id: "p2",
    text: "Il faut que l’entreprise paie une partie de l’équipement. Si j’étais patron, j’irais plus loin : je financerais aussi la connexion. Il est important que chacun ait un bureau calme et que personne ne soit isolé.",
  },
  {
    id: "p3",
    text: "Hier, je suis allé au bureau pour la première fois depuis un mois et je me suis levé à six heures. Les réunions finissent plus tard qu’avant, mais nous avons gagné du temps.",
  },
];

/** For the harness note: what to select in the essay. */
export const SAMPLE_SELECTIONS = ["allions", "levions", "j’irais", "paie", "suis allé", "finissent", "ait", "financerais"];
