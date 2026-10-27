import { describe, expect, test } from "bun:test";

import { lookUpGender, type Gender } from "./gender";

/** "f maison", "either élève", "senses tour f/m", "f plural vacances", "-" for null. */
function show(g: Gender | null) {
  if (!g) return "-";
  if (g.kind === "one") return `${g.gender}${g.plural ? " plural" : ""} ${g.lemma}`;
  if (g.kind === "either") return `either ${g.lemma}`;
  return `senses ${g.lemma} ${g.senses.map((s) => s.gender).join("/")}`;
}

const genders = (words: string[]) => Object.fromEntries(words.map((w) => [w, show(lookUpGender(w))]));

describe("lookUpGender", () => {
  test("common TEF nouns", () => {
    const m =
      "travail problème avis choix environnement salarié pays gouvernement emploi chômage argent temps monde jour exemple cas début avantage inconvénient réseau téléphone ordinateur journal article animal bénévolat diplôme stage sujet avenir bureau bonheur système thème programme musée lycée silence espace groupe prix bras foie maire".split(" ");
    const f =
      "maison société voiture santé loi entreprise ville famille école université vie année fois question idée opinion solution raison façon liberté sécurité langue pollution information eau nature expérience activité peau valeur peur couleur souris croix fourmi foi mère fin personne".split(" ");
    expect(genders(m)).toEqual(Object.fromEntries(m.map((w) => [w, `m ${w}`])));
    expect(genders(f)).toEqual(Object.fromEntries(f.map((w) => [w, `f ${w}`])));
  });

  test("plurals give the singular", () => {
    expect(genders(["chevaux", "travaux", "journaux", "yeux", "cieux", "bijoux", "genoux", "médias", "chefs-d'oeuvre"])).toEqual({
      chevaux: "m cheval",
      travaux: "m travail",
      journaux: "m journal",
      yeux: "m œil",
      cieux: "m ciel",
      bijoux: "m bijou",
      genoux: "m genou",
      médias: "m média",
      "chefs-d'oeuvre": "m chef-d'œuvre",
    });
  });

  test("nouns only used in the plural say so", () => {
    expect(genders(["vacances", "gens", "lunettes", "mathématiques", "échecs"])).toEqual({
      vacances: "f plural vacances",
      gens: "m plural gens",
      lunettes: "f plural lunettes",
      mathématiques: "f plural mathématiques",
      échecs: "m plural échecs",
    });
  });

  test("articles, elision and punctuation around the word", () => {
    expect(genders(["la maison", "l'arbre", "l’eau", "des enfants", "une élève", "maison!", "« voiture »", "Maison"])).toEqual({
      "la maison": "f maison",
      "l'arbre": "m arbre",
      "l’eau": "f eau",
      "des enfants": "either enfant",
      "une élève": "either élève",
      "maison!": "f maison",
      "« voiture »": "f voiture",
      Maison: "f maison",
    });
  });

  test("accents left out and ligatures spelled out", () => {
    expect(genders(["eleve", "coeur", "oeuvre", "probleme"])).toEqual({
      eleve: "either élève",
      coeur: "m cœur",
      oeuvre: "f œuvre",
      probleme: "m problème",
    });
  });

  test("either gender for the same meaning", () => {
    expect(genders(["élève", "enfant", "artiste", "collègue", "journaliste", "ministre", "médecin", "après-midi"])).toEqual({
      élève: "either élève",
      enfant: "either enfant",
      artiste: "either artiste",
      collègue: "either collègue",
      journaliste: "either journaliste",
      ministre: "either ministre",
      médecin: "either médecin",
      "après-midi": "either après-midi",
    });
  });

  test("the gender changes the meaning", () => {
    expect(genders(["tour", "livre", "poste", "manche", "mode", "voile", "vase", "page", "mémoire", "somme"])).toEqual({
      tour: "senses tour m/f",
      livre: "senses livre m/f",
      poste: "senses poste m/f",
      manche: "senses manche f/m",
      mode: "senses mode f/m",
      voile: "senses voile m/f",
      vase: "senses vase m/f",
      page: "senses page f/m",
      mémoire: "senses mémoire f/m",
      somme: "senses somme f/m",
    });
  });

  test("the article puts its own gender's meaning first", () => {
    expect(show(lookUpGender("le tour"))).toBe("senses tour m/f");
    expect(show(lookUpGender("la tour"))).toBe("senses tour f/m");
  });

  test("nouns whose gender shifts in the plural keep the singular's", () => {
    expect(genders(["amour", "délice", "orgue"])).toEqual({ amour: "m amour", délice: "m délice", orgue: "m orgue" });
  });

  test("a missing accent never turns one word into another", () => {
    expect(genders(["email", "emails"])).toEqual({ email: "m e-mail", emails: "m e-mail" });
  });

  test("compound nouns", () => {
    expect(genders(["pomme de terre", "arc-en-ciel", "chef-d'œuvre"])).toEqual({
      "pomme de terre": "f pomme de terre",
      "arc-en-ciel": "m arc-en-ciel",
      "chef-d'œuvre": "m chef-d'œuvre",
    });
  });

  test("words that are mostly something else get no gender, unless an article makes them nouns", () => {
    expect(genders(["ferme", "pendant", "devoir", "manger", "très", "grand", "avec", "heureux", "frais"])).toEqual(
      Object.fromEntries(["ferme", "pendant", "devoir", "manger", "très", "grand", "avec", "heureux", "frais"].map((w) => [w, "-"])),
    );
    expect(show(lookUpGender("la ferme"))).toBe("f ferme");
    expect(show(lookUpGender("le devoir"))).toBe("m devoir");
  });

  test("the noun reading a dictionary gives first", () => {
    expect(genders(["été", "personne"])).toEqual({ été: "m été", personne: "f personne" });
  });

  test("names, numbers and sentences get nothing", () => {
    expect(genders(["Paris", "Tours", "Claude", "123", "", "je vais à la maison", "x".repeat(80)])).toEqual(
      Object.fromEntries(["Paris", "Tours", "Claude", "123", "", "je vais à la maison", "x".repeat(80)].map((w) => [w, "-"])),
    );
  });
});
