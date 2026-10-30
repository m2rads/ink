import { describe, expect, test } from "bun:test";

import { lookUpVerb, readForm, type VerbLookup } from "./conjugation";
import { AVOIR, ÊTRE } from "./conjugation/auxiliaries";
import { auxiliaries, conjugate, infinitive, plain, rows, TENSES, verbView, withoutSubject } from "./conjugation/compose";
import lefff from "./conjugation/lefff.json";
import type { Verb } from "./conjugation/types";

/** "se lever · passeCompose:2", "aller · imparfait:3 subjonctif:3", "-" for null. */
function show(r: VerbLookup | null) {
  if (!r) return "-";
  const name = `${r.verb.pronominal ? "se " : ""}${r.verb.inf}`;
  return [name, r.readings.map((x) => `${x.tense}${x.persons.length ? `:${x.persons.join("")}` : ""}`).join(" ")].filter(Boolean).join(" · ");
}

const look = (words: string[], before?: string) => Object.fromEntries(words.map((w) => [w, show(lookUpVerb(w, before))]));
const verb = (inf: string) => lookUpVerb(inf)!.verb;
/** Every spelling of every person, as plain strings. */
const table = (v: Verb, id: Parameters<typeof rows>[1]) => rows(v, id).map((r) => r.forms.map(plain).join(" / "));

describe("lookUpVerb: infinitives", () => {
  test("plain and pronominal", () => {
    expect(look(["aller", "être", "avoir", "finir", "prendre", "se lever", "s'asseoir", "s’asseoir", "se souvenir", "s'habiller", "Aller"])).toEqual({
      aller: "aller",
      être: "être",
      avoir: "avoir",
      finir: "finir",
      prendre: "prendre",
      "se lever": "se lever",
      "s'asseoir": "se asseoir",
      "s’asseoir": "se asseoir",
      "se souvenir": "se souvenir",
      "s'habiller": "se habiller",
      Aller: "aller",
    });
  });

  test("verbs only used with se are always pronominal", () => {
    expect(look(["souviens", "évanouie"])).toEqual({ souviens: "se souvenir · present:01 imperatif:1", évanouie: "se évanouir · participes" });
    expect(verb("s'évanouir").aux).toBe("être");
  });
});

describe("lookUpVerb: forms", () => {
  test("être, avoir, aller, faire", () => {
    expect(look(["suis", "es", "sommes", "étaient", "serons", "soyez", "ai", "avons", "eurent", "aie", "vais", "irais", "aille", "allons", "fais", "faisons", "ferez", "fasse", "fait"])).toEqual({
      suis: "être · present:0",
      es: "être · present:1",
      sommes: "être · present:3",
      étaient: "être · imparfait:5",
      serons: "être · futur:3",
      soyez: "être · subjonctif:4 imperatif:4",
      ai: "avoir · present:0",
      avons: "avoir · present:3",
      eurent: "avoir · passeSimple:5",
      aie: "avoir · subjonctif:0 imperatif:1",
      vais: "aller · present:0",
      irais: "aller · conditionnel:01",
      aille: "aller · subjonctif:02",
      allons: "aller · present:3 imperatif:3",
      fais: "faire · present:01 imperatif:1",
      faisons: "faire · present:3 imperatif:3",
      ferez: "faire · futur:4",
      fasse: "faire · subjonctif:02",
      fait: "faire · present:2 participes",
    });
  });

  test("pouvoir, vouloir, devoir, savoir, venir, prendre, mettre, dire, voir, finir", () => {
    expect(
      look(["peux", "puissent", "pourrai", "veut", "veuillez", "voudrions", "doivent", "dû", "sachions", "sut", "viennent", "viendra", "prennent", "pris", "mettons", "mis", "dites", "disiez", "voyons", "verrai", "vu", "finissons", "finirent"]),
    ).toEqual({
      peux: "pouvoir · present:01",
      puissent: "pouvoir · subjonctif:5",
      pourrai: "pouvoir · futur:0",
      veut: "vouloir · present:2",
      veuillez: "vouloir · imperatif:4",
      voudrions: "vouloir · conditionnel:3",
      doivent: "devoir · present:5 subjonctif:5",
      dû: "devoir · participes",
      sachions: "savoir · subjonctif:3",
      sut: "savoir · passeSimple:2",
      viennent: "venir · present:5 subjonctif:5",
      viendra: "venir · futur:2",
      prennent: "prendre · present:5 subjonctif:5",
      pris: "prendre · participes passeSimple:01",
      mettons: "mettre · present:3 imperatif:3",
      mis: "mettre · participes passeSimple:01",
      dites: "dire · present:4 imperatif:4 participes",
      disiez: "dire · imparfait:4 subjonctif:4",
      voyons: "voir · present:3 imperatif:3",
      verrai: "voir · futur:0",
      vu: "voir · participes",
      finissons: "finir · present:3 imperatif:3",
      finirent: "finir · passeSimple:5",
    });
  });

  test("spelling changes: payer, appeler, jeter, manger, commencer, lever", () => {
    expect(look(["paie", "paye", "paierai", "payerai", "appelle", "appelons", "appellerai", "jette", "jetterons", "mangeons", "mangeais", "commençons", "commençait", "lève", "lèverai"])).toEqual({
      paie: "payer · present:02 subjonctif:02 imperatif:1",
      paye: "payer · present:02 subjonctif:02 imperatif:1",
      paierai: "payer · futur:0",
      payerai: "payer · futur:0",
      appelle: "appeler · present:02 subjonctif:02 imperatif:1",
      appelons: "appeler · present:3 imperatif:3",
      appellerai: "appeler · futur:0",
      jette: "jeter · present:02 subjonctif:02 imperatif:1",
      jetterons: "jeter · futur:3",
      mangeons: "manger · present:3 imperatif:3",
      mangeais: "manger · imparfait:01",
      commençons: "commencer · present:3 imperatif:3",
      commençait: "commencer · imparfait:2",
      lève: "lever · present:02 subjonctif:02 imperatif:1",
      lèverai: "lever · futur:0",
    });
  });

  test("s'asseoir and se lever with their pronouns", () => {
    expect(look(["je m'assieds", "je m'assois", "nous nous asseyons", "assieds-toi", "je me lève", "lève-toi", "nous nous levions"])).toEqual({
      "je m'assieds": "se asseoir · present:0",
      "je m'assois": "se asseoir · present:0",
      "nous nous asseyons": "se asseoir · present:3",
      "assieds-toi": "se asseoir · imperatif:1",
      "je me lève": "se lever · present:0 subjonctif:0",
      "lève-toi": "se lever · imperatif:1",
      "nous nous levions": "se lever · imparfait:3 subjonctif:3",
    });
  });

  test("accents left out, never changed", () => {
    expect(look(["etais", "eleve", "connait", "a", "à"])).toEqual({
      etais: "être · imparfait:01",
      // élève or élevé: both are "eleve" without accents.
      eleve: "élever · present:02 subjonctif:02 imperatif:1 participes",
      connait: "connaître · present:2",
      a: "avoir · present:2",
      à: "-",
    });
  });

  test("1990 spellings are recognised but not shown", () => {
    expect(look(["cèderai", "ruissèle", "entraine", "assoir"])).toEqual({
      cèderai: "céder · futur:0",
      ruissèle: "ruisseler · present:02 subjonctif:02 imperatif:1",
      entraine: "entraîner · present:02 subjonctif:02 imperatif:1",
      assoir: "asseoir",
    });
    expect(verb("céder").simple.futur[0]).toBe("céderai");
    expect(verb("connaître").simple.present[2]).toBe("connaît");
  });

  test("not verbs", () => {
    expect(look(["maison", "très", "travail", "aujourd'hui", "peut-être", "plus", "tu", "", "123"])).toEqual({
      maison: "-",
      très: "-",
      travail: "-",
      "aujourd'hui": "-",
      "peut-être": "-",
      plus: "-",
      tu: "-",
      "": "-",
      "123": "-",
    });
  });
});

describe("lookUpVerb: ambiguous forms and context", () => {
  test("allions: imparfait first, subjunctive first after que", () => {
    expect(show(lookUpVerb("allions"))).toBe("aller · imparfait:3 subjonctif:3");
    expect(show(lookUpVerb("allions", "Il faut que nous"))).toBe("aller · subjonctif:3 imparfait:3");
    expect(show(lookUpVerb("que nous allions"))).toBe("aller · subjonctif:3 imparfait:3");
  });

  test("suis: être unless the sentence says suivre", () => {
    expect(show(lookUpVerb("suis"))).toBe("être · present:0");
    expect(show(lookUpVerb("suis", "je"))).toBe("être · present:0");
    expect(show(lookUpVerb("suis allé"))).toBe("aller · passeCompose:0");
    expect(show(lookUpVerb("suivi", "je l'ai"))).toBe("suivre · passeCompose:0");
  });

  test("the subject picks the person", () => {
    expect(look(["paie"], "Je pense que l'entreprise")).toEqual({ paie: "payer · subjonctif:2 present:2" });
    expect(show(lookUpVerb("que l'entreprise paie"))).toBe("payer · subjonctif:2 present:2");
    expect(show(lookUpVerb("doivent", "Les étudiants"))).toBe("devoir · present:5 subjonctif:5");
    expect(show(lookUpVerb("finis", "tu"))).toBe("finir · present:1 passeSimple:1");
    expect(show(lookUpVerb("j'irais"))).toBe("aller · conditionnel:0");
    expect(show(lookUpVerb("c'est"))).toBe("être · present:2");
    expect(show(lookUpVerb("a-t-il"))).toBe("avoir · present:2");
  });

  test("a word that is mostly something else is a verb only when the sentence says so", () => {
    expect(show(lookUpVerb("porte", "Il ouvre la"))).toBe("-");
    expect(show(lookUpVerb("porte", "Il"))).toBe("porter · present:2 subjonctif:2");
    // Typed alone it may be meant as the verb.
    expect(show(lookUpVerb("porte"))).toBe("porter · present:02 subjonctif:02 imperatif:1");
  });

  test("a capital mid-sentence is a name", () => {
    expect(show(lookUpVerb("Marie", "Hier,"))).toBe("-");
    expect(show(lookUpVerb("Paris", "Je vais à"))).toBe("-");
  });

  test("s'en aller shows as aller; other verbs with en stay pronominal", () => {
    expect(look(["je m'en vais", "va-t'en", "elle s'en est allée", "je m'en souviens"])).toEqual({
      "je m'en vais": "aller · present:0",
      "va-t'en": "aller · imperatif:1",
      "elle s'en est allée": "aller · passeCompose:2",
      "je m'en souviens": "se souvenir · present:0",
    });
  });

  test("the conjugated verb wins over an infinitive after it", () => {
    expect(show(lookUpVerb("je veux manger"))).toBe("vouloir · present:0");
    expect(show(lookUpVerb("Il faut que tu viennes"))).toBe("venir · subjonctif:1");
  });
});

describe("lookUpVerb: compound tenses from text", () => {
  test("avoir and être", () => {
    expect(
      look(["j'ai mangé", "nous sommes allés", "elle s'est levée", "qu'il ait fini", "je n'ai pas pu venir", "si j'avais su", "nous serions partis", "a-t-il compris", "ils auront fini", "elles se sont rencontrées"]),
    ).toEqual({
      "j'ai mangé": "manger · passeCompose:0",
      "nous sommes allés": "aller · passeCompose:3",
      "elle s'est levée": "se lever · passeCompose:2",
      "qu'il ait fini": "finir · subjonctifPasse:2",
      "je n'ai pas pu venir": "pouvoir · passeCompose:0",
      "si j'avais su": "savoir · plusQueParfait:0",
      "nous serions partis": "partir · conditionnelPasse:3",
      "a-t-il compris": "comprendre · passeCompose:2",
      "ils auront fini": "finir · futurAnterieur:5",
      "elles se sont rencontrées": "se rencontrer · passeCompose:5",
    });
  });

  test("the participle selected with its auxiliary before it", () => {
    expect(look(["mangé"], "j'ai")).toEqual({ mangé: "manger · passeCompose:0" });
    expect(look(["levés"], "nous nous sommes")).toEqual({ levés: "se lever · passeCompose:3" });
  });

  test("être with an avoir verb is a passive: the participle", () => {
    expect(show(lookUpVerb("la maison est vendue"))).toBe("vendre · participes");
    expect(show(lookUpVerb("a été vendue"))).toBe("vendre · participes");
    expect(show(lookUpVerb("après avoir mangé"))).toBe("manger · participes");
  });

  test("verbs with both auxiliaries read with either", () => {
    expect(show(lookUpVerb("elle est passée"))).toBe("passer · passeCompose:2");
    expect(show(lookUpVerb("il a passé"))).toBe("passer · passeCompose:2");
    expect(show(lookUpVerb("ils sont sortis"))).toBe("sortir · passeCompose:5");
    expect(show(lookUpVerb("j'ai sorti"))).toBe("sortir · passeCompose:0");
  });
});

describe("lookUpVerb: what a verb carries", () => {
  test("auxiliaries", () => {
    expect(["aller", "venir", "naître", "mourir", "rester", "tomber"].map((v) => verb(v).aux)).toEqual(Array(6).fill("être"));
    expect(["manger", "finir", "être", "avoir", "faire", "vivre"].map((v) => verb(v).aux)).toEqual(Array(6).fill("avoir"));
    expect(["passer", "sortir", "monter", "descendre", "rentrer", "retourner", "entrer"].map((v) => verb(v).aux)).toEqual(Array(7).fill("both"));
    expect(verb("se lever").aux).toBe("être");
  });

  test("groups", () => {
    expect(Object.fromEntries(["parler", "finir", "aller", "prendre", "manger", "commencer", "lever", "céder", "appeler", "jeter", "acheter", "payer", "employer", "envoyer", "haïr"].map((v) => [v, verb(v).group]))).toEqual({
      parler: "1st group",
      finir: "2nd group",
      aller: "Irregular",
      prendre: "Irregular",
      manger: "1st group · g → ge",
      commencer: "1st group · c → ç",
      lever: "1st group · e → è",
      céder: "1st group · é → è",
      appeler: "1st group · l → ll",
      jeter: "1st group · t → tt",
      acheter: "1st group · e → è",
      payer: "1st group · y → i or y",
      employer: "1st group · y → i",
      envoyer: "1st group · y → i · futur enverr-",
      haïr: "2nd group",
    });
  });

  test("variants and fixed cells", () => {
    const v = (inf: string) => verb(inf).simple;
    expect(v("payer").present[0]).toEqual(["paie", "paye"]);
    expect(v("asseoir").present[0]).toEqual(["assieds", "assois"]);
    expect(v("pouvoir").present[0]).toEqual(["peux", "puis"]);
    expect(v("taire").present[2]).toBe("tait");
    expect(verb("résoudre").participePasse).toBe("résolu");
    expect(verb("inclure").participePasse).toBe("inclus");
    expect(v("gésir").present).toEqual(["gis", "gis", "gît", "gisons", "gisez", "gisent"]);
    expect(v("falloir").present).toEqual([[], [], "faut", [], [], []]);
    expect(verb("falloir").participePresent).toBe("");
    expect(v("vêtir").present[2]).toBe("vêt");
    expect(verb("foutre").imperatif[0]).toBe("fous");
    expect(v("ressortir").present[0]).toBe("ressors");
  });

  test("être and avoir match the hand-written auxiliaries", () => {
    for (const aux of [ÊTRE, AVOIR]) {
      const v = verb(aux.inf);
      expect(v.simple).toEqual(aux.simple);
      expect(v.imperatif).toEqual(aux.imperatif);
      expect([v.participePresent, v.participePasse]).toEqual([aux.participePresent, aux.participePasse]);
    }
  });

  test("a result is one verb, about a kilobyte", () => {
    for (const w of ["allions", "s'asseoir", "payer"]) expect(JSON.stringify(lookUpVerb(w)).length).toBeLessThan(2000);
  });
});

describe("compose", () => {
  const all = (v: Verb, id: Parameters<typeof conjugate>[1], p: number) => conjugate(v, id, p).map(plain);

  test("elision: j', m', qu', h muet but not h aspiré", () => {
    expect(all(verb("aimer"), "present", 0)).toEqual(["j’aime"]);
    expect(all(verb("se lever"), "passeCompose", 0)).toEqual(["je me suis levé(e)"]);
    expect(all(verb("s'habiller"), "present", 0)).toEqual(["je m’habille"]);
    expect(all(verb("habiter"), "present", 0)).toEqual(["j’habite"]);
    expect(all(verb("haïr"), "present", 0)).toEqual(["je hais"]);
    expect(all(verb("finir"), "subjonctifPasse", 2)).toEqual(["qu’il/elle ait fini"]);
    expect(all(verb("aller"), "subjonctif", 5)).toEqual(["qu’ils/elles aillent"]);
    expect(infinitive(verb("s'asseoir"))).toBe("s’asseoir");
    expect(infinitive(verb("se hâter"))).toBe("se hâter");
  });

  test("agreement with être", () => {
    expect(table(verb("aller"), "passeCompose")).toEqual([
      "je suis allé(e)",
      "tu es allé(e)",
      "il/elle est allé(e)",
      "nous sommes allé(e)s",
      "vous êtes allé(e)(s)",
      "ils/elles sont allé(e)s",
    ]);
    expect(table(verb("s'asseoir"), "passeCompose")[3]).toBe("nous nous sommes assis(es)");
    expect(table(verb("manger"), "passeCompose")[3]).toBe("nous avons mangé");
  });

  test("both auxiliaries: être first, then avoir", () => {
    const v = verb("passer");
    expect(auxiliaries(v)).toEqual(["être", "avoir"]);
    expect(all(v, "passeCompose", 0)).toEqual(["je suis passé(e)", "j’ai passé"]);
    expect(table(v, "participes")[2]).toBe("étant passé(e)(s) / ayant passé");
    expect(auxiliaries(verb("se passer"))).toEqual(["être"]);
  });

  test("pronominal forms", () => {
    const v = verb("se lever");
    expect(withoutSubject(v, "present", 3).map(plain)).toEqual(["nous levons"]);
    expect(conjugate(v, "present", 3).map(plain)).toEqual(["nous nous levons"]);
    expect(table(v, "imperatif")).toEqual(["lève-toi", "levons-nous", "levez-vous"]);
    expect(table(v, "participes")).toEqual(["se levant", "levé", "s’étant levé(e)(s)"]);
    expect(all(verb("s'asseoir"), "present", 0)).toEqual(["je m’assieds", "je m’assois"]);
  });

  test("impersonal verbs: il only, and only where the verb has a person", () => {
    expect(table(verb("falloir"), "present")).toEqual(["", "", "il faut", "", "", ""]);
    expect(table(verb("falloir"), "passeCompose")).toEqual(["", "", "il a fallu", "", "", ""]);
    expect(table(verb("pleuvoir"), "present")).toEqual(["", "", "il pleut", "", "", "ils pleuvent"]);
  });
});

describe("verbView: finished tables for the Mac app", () => {
  test("every tense, as rows gives it", () => {
    const v = verb("aller");
    const view = verbView(v);
    expect(Object.keys(view.tables)).toEqual(TENSES.map((t) => t.id));
    expect(view.tables.passeCompose[0]).toEqual({
      person: 0,
      forms: [
        [
          { t: "je ", k: "pro" },
          { t: "suis ", k: "aux" },
          { t: "allé", k: "verb" },
          { t: "(e)", k: "agree" },
        ],
      ],
    });
    expect(view.tables.imperatif.map((r) => r.person)).toEqual([1, 3, 4]);
    expect(view.tables.participes.map((r) => r.label)).toEqual(["Présent", "Passé", "Composé"]);
    for (const { id } of TENSES) expect(view.tables[id]).toEqual(rows(v, id));
  });

  test("the infinitive as written, and the auxiliaries", () => {
    expect(verbView(verb("aller"))).toMatchObject({ infinitive: "aller", auxiliaries: ["être"] });
    expect(verbView(verb("se lever"))).toMatchObject({ infinitive: "se lever", auxiliaries: ["être"] });
    expect(verbView(verb("s'asseoir")).infinitive).toBe("s’asseoir");
    expect(verbView(verb("passer")).auxiliaries).toEqual(["être", "avoir"]);
  });

  test("a verb with its tables, about 8 kB", () => {
    const size = JSON.stringify({ ...lookUpVerb("aller"), view: verbView(verb("aller")) }).length;
    expect(size).toBeLessThan(12_000);
  });
});

describe("the data", () => {
  // The reverse index is the template analysis: every shown form of every verb must read back to it.
  test("every form reads back to its verb", () => {
    const templates = lefff.templates.split("|").map((l) => {
      const [end, cells] = l.split(";");
      return { end, slots: cells.split(",").map((c) => (c ? c.split("/") : [])) };
    });
    const missing: string[] = [];
    let n = 0;
    for (const line of lefff.verbs.split("|")) {
      const [inf, id] = line.split(";");
      const { end, slots } = templates[parseInt(id, 36)];
      const stem = inf.slice(0, inf.length - end.length);
      for (const s of new Set(slots.flat())) {
        const form = stem + s.replace("~", "");
        n++;
        if (!readForm(form).some((r) => r.verb === inf)) missing.push(`${inf}: ${form}`);
      }
      if (!readForm(inf).some((r) => r.verb === inf && r.tense === "infinitif")) missing.push(`${inf}: infinitive`);
    }
    expect(missing).toEqual([]);
    expect(n).toBeGreaterThan(200000);
  });
});
