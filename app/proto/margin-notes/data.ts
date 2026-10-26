import type { Category } from "@/lib/ai/correction";
import type { MarkStatus } from "@/app/write/review-store";

import type { CorrectionMistake } from "./correction";

// Worst case for the margin: one long paragraph with 15 marks, most of them
// resolved, the one being fixed (14, "professionnele") near its end; a short
// paragraph above with none, and one below whose notes get pushed down.

export const TITLE = "Le télétravail devrait-il devenir la norme ?";

type Seg =
  | string
  | {
      wrong: string;
      fix: string;
      accept?: string[];
      category: Category;
      rule: string;
      explain: string;
      hint: string;
      status?: MarkStatus;
    };

const P1: Seg[] = [
  "Depuis quelques années, le travail à distance s’est imposé dans de nombreux secteurs. Faut-il s’en réjouir ou s’en inquiéter ?",
];

const P2: Seg[] = [
  "Depuis la pandémie, beaucoup d’entreprises ",
  {
    wrong: "ont adoptées",
    fix: "ont adopté",
    category: "agreement",
    rule: "No agreement with avoir",
    explain: "With *avoir*, the participle agrees only with a direct object placed before it.",
    hint: "The object comes after.",
    status: "fixed",
  },
  " le télétravail, et je pense que cette évolution est ",
  {
    wrong: "benefique",
    fix: "bénéfique",
    category: "spelling",
    rule: "Missing accents",
    explain: "*Bénéfique* takes two acute accents.",
    hint: "Two é.",
    status: "fixed",
  },
  " pour les salariés comme pour les employeurs. D’abord, les employés n’ont plus besoin ",
  {
    wrong: "à passer",
    fix: "de passer",
    category: "preposition",
    rule: "Avoir besoin de",
    explain: "*Avoir besoin* is always followed by *de*.",
    hint: "Not à.",
    status: "revealed",
  },
  " deux heures par jour dans les ",
  {
    wrong: "embouteilages",
    fix: "embouteillages",
    category: "spelling",
    rule: "Double l in -eillage",
    explain: "Nouns in *-eillage* double the l.",
    hint: "Count the l.",
    status: "fixed",
  },
  ", ce qui leur ",
  {
    wrong: "permettent",
    fix: "permet",
    category: "conjugation",
    rule: "Ce qui takes a singular verb",
    explain: "*Ce qui* is singular, so its verb is too.",
    hint: "Who does it?",
    status: "skipped",
  },
  " de consacrer plus de temps à leur famille. Ensuite, ils ",
  {
    wrong: "peut",
    fix: "peuvent",
    category: "conjugation",
    rule: "Pouvoir with ils",
    explain: "With *ils*, *pouvoir* is *peuvent*.",
    hint: "Third person plural.",
    status: "fixed",
  },
  " organiser leur journée ",
  {
    wrong: "selon de",
    fix: "selon",
    category: "preposition",
    rule: "Selon takes no de",
    explain: "*Selon* is a preposition already; it takes its noun directly.",
    hint: "One word too many.",
    status: "fixed",
  },
  " leurs besoins et travailler dans un environnement calme. Par ailleurs, les entreprises ",
  {
    wrong: "économise",
    fix: "économisent",
    accept: ["économisent"],
    category: "conjugation",
    rule: "Plural subject, plural verb",
    explain: "*Les entreprises* is plural, so the verb ends in *-ent*.",
    hint: "Who saves?",
    status: "revealed",
  },
  " sur les loyers des bureaux ",
  {
    wrong: "dans",
    fix: "en",
    category: "preposition",
    rule: "En centre-ville",
    explain: "The set phrase is *en centre-ville*, with no article.",
    hint: "A two-letter word.",
    status: "fixed",
  },
  " centre-ville. Certes, certains ",
  {
    wrong: "travailleur",
    fix: "travailleurs",
    category: "agreement",
    rule: "Certains takes a plural noun",
    explain: "*Certains* is plural, so its noun takes an s.",
    hint: "More than one.",
    status: "fixed",
  },
  " se sentent ",
  {
    wrong: "isolé",
    fix: "isolés",
    category: "agreement",
    rule: "Adjective agrees with subject",
    explain: "After *se sentir*, the adjective agrees with the subject, *certains travailleurs*.",
    hint: "Masculine plural.",
    status: "skipped",
  },
  " et ",
  {
    wrong: "manque",
    fix: "manquent",
    category: "conjugation",
    rule: "Plural subject, plural verb",
    explain: "The subject is still *certains travailleurs*.",
    hint: "Same subject as *se sentent*.",
    status: "fixed",
  },
  " de contact avec ",
  {
    wrong: "leur collègues",
    fix: "leurs collègues",
    category: "agreement",
    rule: "Leur before a plural noun",
    explain: "As a possessive, *leur* takes an s before a plural noun.",
    hint: "Collègues is plural.",
  },
  ", mais une journée par semaine au bureau suffit à maintenir une vie ",
  {
    wrong: "professionnele",
    fix: "professionnelle",
    category: "spelling",
    rule: "Feminine of -el doubles the l",
    explain: "Adjectives in *-el* double the l in the feminine: *professionnel*, *professionnelle*.",
    hint: "Feminine, -elle.",
  },
  " riche et ",
  {
    wrong: "équilibré",
    fix: "équilibrée",
    category: "agreement",
    rule: "Adjective agrees with its noun",
    explain: "*Équilibrée* describes *une vie*, feminine.",
    hint: "Une vie.",
  },
  ".",
];

const P3: Seg[] = [
  "En conclusion, le télétravail ",
  {
    wrong: "représent",
    fix: "représente",
    category: "conjugation",
    rule: "Third person ends in -e",
    explain: "First-group verbs end in *-e* with *il* or *elle*.",
    hint: "One letter missing.",
  },
  " un progrès, ",
  {
    wrong: "a condition",
    fix: "à condition",
    category: "spelling",
    rule: "À, the preposition",
    explain: "The preposition takes a grave accent: *à condition que*.",
    hint: "Not the verb avoir.",
  },
  " qu’il reste un choix et non une obligation.",
];

const SEEN: Record<Category, number> = { preposition: 2, agreement: 7, conjugation: 3, spelling: 4 };

export type ProtoMistake = CorrectionMistake & { accept: string[] };

function build() {
  const blocks: { id: string; text: string }[] = [];
  const mistakes: ProtoMistake[] = [];
  let n = 0;
  [P1, P2, P3].forEach((segs, bi) => {
    const blockId = `b${bi + 1}`;
    let text = "";
    for (const s of segs) {
      if (typeof s === "string") {
        text += s;
        continue;
      }
      n++;
      const status = s.status ?? "open";
      const phrase = status === "fixed" || status === "revealed" ? s.fix : s.wrong;
      mistakes.push({
        id: `m${n}`,
        blockId,
        start: text.length,
        end: text.length + phrase.length,
        number: n,
        category: s.category,
        wrong: s.wrong,
        fix: s.fix,
        accept: s.accept ?? [s.fix],
        rule: s.rule,
        explain: s.explain,
        hint: s.hint,
        status,
        attempts: 0,
        hinted: false,
        answered: status === "revealed",
        seen: SEEN[s.category],
      });
      text += phrase;
    }
    blocks.push({ id: blockId, text });
  });
  return { blocks, mistakes };
}

export const INITIAL = build();
/** The mistake being fixed when the page opens: 14, "professionnele". */
export const INITIAL_ACTIVE = "m14";
