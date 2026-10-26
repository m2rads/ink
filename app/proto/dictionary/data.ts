// Throwaway: /proto/dictionary. Hand-written entries standing in for the
// real dictionary data, chosen to break the layout: a verb with six senses,
// long phrases, a usage note, m./f. pairs, an irregular plural.

import type { Block } from "@/app/write/blocks";

export type Sense = { en: string; es: string; fr?: string; enEx?: string };
export type Entry = {
  word: string;
  /** "masculine noun", "verb, irregular"… as a learner reads it. */
  kind: string;
  /** Other forms worth knowing: feminine, plural, past participle. */
  forms?: string;
  note?: string;
  senses: Sense[];
};

export const ENTRIES: Entry[] = [
  {
    word: "télétravail",
    kind: "masculine noun",
    senses: [
      {
        en: "remote work; working from home", es: "teletrabajo; trabajo desde casa",
        fr: "Le télétravail permet d’éviter les embouteillages.",
        enEx: "Remote work means avoiding traffic jams.",
      },
    ],
  },
  {
    word: "trajet",
    kind: "masculine noun",
    senses: [
      {
        en: "journey, trip; commute", es: "trayecto, viaje; trayecto al trabajo",
        fr: "Mon trajet jusqu’au bureau dure une heure.",
        enEx: "My commute to the office takes an hour.",
      },
    ],
  },
  {
    word: "faire la navette",
    kind: "phrase",
    senses: [
      {
        en: "to commute (back and forth)", es: "ir y venir a diario entre dos lugares",
        fr: "Elle fait la navette entre Lyon et Paris.",
        enEx: "She commutes between Lyon and Paris.",
      },
    ],
  },
  {
    word: "navette",
    kind: "feminine noun",
    senses: [
      {
        en: "shuttle (bus, train)", es: "lanzadera, autobús de enlace",
        fr: "Une navette relie la gare à l’aéroport.",
        enEx: "A shuttle runs between the station and the airport.",
      },
    ],
  },
  {
    word: "collègue",
    kind: "masculine or feminine noun",
    senses: [
      {
        en: "colleague, coworker", es: "colega, compañero de trabajo",
        fr: "Je déjeune avec mes collègues le vendredi.",
        enEx: "I have lunch with my colleagues on Fridays.",
      },
    ],
  },
  {
    word: "entreprise",
    kind: "feminine noun",
    senses: [
      {
        en: "company, business", es: "empresa, negocio",
        fr: "Les petites entreprises ont moins de moyens.",
        enEx: "Small businesses have fewer resources.",
      },
    ],
  },
  {
    word: "efficace",
    kind: "adjective",
    forms: "same in masculine and feminine",
    senses: [
      {
        en: "effective; efficient", es: "eficaz; eficiente",
        fr: "Une réunion courte est souvent plus efficace.",
        enEx: "A short meeting is often more effective.",
      },
    ],
  },
  {
    word: "isolement",
    kind: "masculine noun",
    senses: [
      {
        en: "isolation, loneliness", es: "aislamiento, soledad",
        fr: "L’isolement est le principal inconvénient du télétravail.",
        enEx: "Isolation is the main drawback of remote work.",
      },
    ],
  },
  {
    word: "équilibre",
    kind: "masculine noun",
    senses: [
      {
        en: "balance; work-life balance (équilibre entre vie professionnelle et vie privée)", es: "equilibrio; conciliación de la vida laboral y personal (équilibre entre vie professionnelle et vie privée)",
        fr: "Il cherche un meilleur équilibre entre vie professionnelle et vie privée.",
        enEx: "He’s looking for a better work-life balance.",
      },
    ],
  },
  {
    word: "se rendre compte de quelque chose",
    kind: "pronominal verb phrase",
    forms: "past participle rendu",
    note: "Rendu never agrees here, because compte is the direct object: elle s’est rendu compte, not rendue.",
    senses: [
      {
        en: "to realize, to notice", es: "darse cuenta de algo",
        fr: "Je me suis rendu compte de mon erreur trop tard.",
        enEx: "I realized my mistake too late.",
      },
    ],
  },
  {
    word: "prendre",
    kind: "verb, irregular",
    forms: "past participle pris",
    senses: [
      { en: "to take", es: "tomar, coger", fr: "Prends ton temps.", enEx: "Take your time." },
      { en: "to have (food, a drink)", es: "tomar (comida, una bebida)", fr: "On prend un café ?", enEx: "Shall we have a coffee?" },
      { en: "to catch (a train, a bus)", es: "tomar (un tren, un autobús)", fr: "Je prends le train de huit heures.", enEx: "I catch the eight o’clock train." },
      { en: "to make (a decision): prendre une décision", es: "tomar (una decisión): prendre une décision", fr: "Il faut prendre une décision.", enEx: "We have to make a decision." },
      { en: "to pick someone up: passer prendre", es: "recoger a alguien: passer prendre", fr: "Je passe te prendre à midi.", enEx: "I’ll pick you up at noon." },
      { en: "to take (time)", es: "llevar (tiempo)", fr: "Ça prend du temps.", enEx: "It takes time." },
    ],
  },
  {
    word: "dépendre de",
    kind: "verb",
    note: "Takes de, never sur.",
    senses: [
      {
        en: "to depend on", es: "depender de",
        fr: "Tout dépend de la nature du travail.",
        enEx: "It all depends on the kind of work.",
      },
    ],
  },
  {
    word: "avantage",
    kind: "masculine noun",
    senses: [
      {
        en: "advantage, benefit", es: "ventaja, beneficio",
        fr: "Le principal avantage, c’est la souplesse.",
        enEx: "The main advantage is flexibility.",
      },
    ],
  },
  {
    word: "inconvénient",
    kind: "masculine noun",
    senses: [
      {
        en: "drawback, disadvantage", es: "inconveniente, desventaja",
        fr: "Chaque solution a ses avantages et ses inconvénients.",
        enEx: "Every solution has its advantages and drawbacks.",
      },
    ],
  },
  {
    word: "réunion",
    kind: "feminine noun",
    senses: [
      {
        en: "meeting", es: "reunión",
        fr: "La réunion est reportée à jeudi.",
        enEx: "The meeting has been moved to Thursday.",
      },
    ],
  },
  {
    word: "visioconférence",
    kind: "feminine noun",
    senses: [
      {
        en: "video call, video conference", es: "videollamada, videoconferencia",
        fr: "Nous faisons une visioconférence chaque matin.",
        enEx: "We have a video call every morning.",
      },
    ],
  },
  {
    word: "horaires",
    kind: "masculine noun, usually plural",
    senses: [
      {
        en: "hours, schedule; des horaires flexibles: flexible hours", es: "horario; des horaires flexibles: horario flexible",
        fr: "Les horaires flexibles plaisent aux parents.",
        enEx: "Parents like flexible hours.",
      },
    ],
  },
  {
    word: "souplesse",
    kind: "feminine noun",
    senses: [
      {
        en: "flexibility", es: "flexibilidad",
        fr: "Le télétravail offre une grande souplesse.",
        enEx: "Remote work offers a lot of flexibility.",
      },
    ],
  },
  {
    word: "embouteillage",
    kind: "masculine noun",
    senses: [
      {
        en: "traffic jam", es: "atasco",
        fr: "Je suis resté coincé dans un embouteillage.",
        enEx: "I was stuck in a traffic jam.",
      },
    ],
  },
  {
    word: "économiser",
    kind: "verb",
    senses: [
      {
        en: "to save (money, time)", es: "ahorrar (dinero, tiempo)",
        fr: "On économise deux heures de trajet par jour.",
        enEx: "You save two hours of commuting a day.",
      },
    ],
  },
  {
    word: "en revanche",
    kind: "adverb phrase",
    senses: [
      {
        en: "on the other hand; however", es: "en cambio; sin embargo",
        fr: "En revanche, les échanges informels disparaissent.",
        enEx: "On the other hand, informal conversations disappear.",
      },
    ],
  },
  {
    word: "néanmoins",
    kind: "adverb",
    senses: [
      {
        en: "nevertheless, however", es: "no obstante, sin embargo",
        fr: "C’est pratique ; néanmoins, cela demande de la discipline.",
        enEx: "It’s convenient; nevertheless, it takes discipline.",
      },
    ],
  },
  {
    word: "travail",
    kind: "masculine noun",
    forms: "plural travaux",
    note: "Travaux usually means works: roadworks, building works.",
    senses: [
      { en: "work", es: "trabajo", fr: "J’ai beaucoup de travail cette semaine.", enEx: "I have a lot of work this week." },
      { en: "job", es: "empleo, trabajo", fr: "Elle a trouvé un travail à Montréal.", enEx: "She found a job in Montreal." },
    ],
  },
  {
    word: "salarié",
    kind: "noun",
    forms: "feminine salariée",
    senses: [
      {
        en: "employee (on a salary)", es: "asalariado, empleado",
        fr: "Les salariés demandent plus de télétravail.",
        enEx: "Employees are asking for more remote work.",
      },
    ],
  },
  {
    word: "épanouissement",
    kind: "masculine noun",
    senses: [
      {
        en: "fulfilment; personal growth", es: "realización personal; desarrollo personal",
        fr: "Le travail contribue à l’épanouissement personnel.",
        enEx: "Work contributes to personal fulfilment.",
      },
    ],
  },
];

/** The learner's own language. Only English and Spanish have glosses in this prototype. */
export type Language = {
  code: string;
  name: string;
  native: string;
  /** Show the English name too: the native script isn't Latin. */
  hint?: boolean;
  rtl?: boolean;
  glosses?: "en" | "es";
};

export const LANGUAGES: Language[] = [
  { code: "en", name: "English", native: "English", glosses: "en" },
  { code: "es", name: "Spanish", native: "Español", glosses: "es" },
  { code: "pt-BR", name: "Portuguese (Brazil)", native: "Português (Brasil)" },
  { code: "ar", name: "Arabic", native: "العربية", hint: true, rtl: true },
  { code: "fa", name: "Persian", native: "فارسی", hint: true, rtl: true },
  { code: "zh-Hans", name: "Chinese (Simplified)", native: "中文（简体）", hint: true },
];

export const language = (code: string) => LANGUAGES.find((l) => l.code === code) ?? LANGUAGES[0];

/** auto: either way. to-fr: type in your language. from-fr: type French. */
export type Direction = "auto" | "to-fr" | "from-fr";

export type Hit = { entry: Entry; via: "fr" | "own" };

const fold = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, "'")
    .toLowerCase()
    .trim();

/** French headwords first (exact, then prefix, then any word), then meanings in the learner's language. */
export function search(query: string, lang: Language, direction: Direction = "auto"): Hit[] {
  const q = fold(query);
  if (!q) return [];
  const glosses = lang.glosses;
  const score = (e: Entry): [number, Hit["via"]] | null => {
    if (direction !== "to-fr") {
      const w = fold(e.word);
      if (w === q) return [0, "fr"];
      if (w.startsWith(q)) return [1, "fr"];
      if (w.split(/\s+/).some((part) => part.startsWith(q))) return [2, "fr"];
    }
    if (direction !== "from-fr" && glosses && q.length >= 3) {
      // A meaning that *is* the word ("trabajo") beats one that mentions it ("compañero de trabajo").
      const head = (g: string) => fold(g.split(/[;,(:]/)[0]);
      if (e.senses.some((s) => head(s[glosses]) === q)) return [3, "own"];
      const own = e.senses.some((s) => fold(s[glosses]).split(/[^a-z'-]+/).some((part) => part.startsWith(q)));
      if (own) return [4, "own"];
    }
    return null;
  };
  return ENTRIES.flatMap((entry) => {
    const hit = score(entry);
    return hit ? [{ entry, via: hit[1], rank: hit[0] }] : [];
  })
    .sort((a, b) => a.rank - b.rank)
    .map(({ entry, via }) => ({ entry, via }));
}

export const ESSAY_TITLE =
  "Le télétravail devrait-il devenir la norme dans toutes les entreprises, même les plus petites ?";

const PARAGRAPHS = [
  "Depuis la pandémie, beaucoup d’entreprises ont découvert le télétravail. Selon certains, il devrait devenir la norme pour tous les employés. Je ne suis pas complètement d’accord, mais je reconnais que ce mode de travail présente de vrais avantages.",
  "Premièrement, le télétravail permet d’économiser le temps du trajet. Un salarié qui habite loin de son bureau peut perdre deux heures par jour dans les transports en commun ou dans les embouteillages. Ce temps peut être consacré à sa famille, au sport ou simplement au repos, ce qui améliore l’équilibre entre la vie professionnelle et la vie privée. De plus, les entreprises économisent sur les loyers des bureaux, ce qui est un argument important pour les petites structures qui ont peu de moyens.",
  "En revanche, travailler seul à la maison peut provoquer un sentiment d’isolement. Les échanges informels avec les collègues, à la pause café par exemple, disparaissent, et les réunions en visioconférence ne les remplacent pas vraiment.",
  "Pour conclure, je pense que le télétravail ne doit pas devenir la norme partout. Tout dépend de la nature du travail et de la personnalité de chacun. Une solution hybride, avec deux ou trois jours au bureau, me semble plus équilibrée.",
];

export const ESSAY_BLOCKS: Block[] = PARAGRAPHS.map((text, i) => ({ id: `p${i}`, text }));
