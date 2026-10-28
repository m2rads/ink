import { describe, expect, test } from "bun:test";

import { checkGrammar } from "./grammar";

/** "word: kind" for each issue, to compare by what a reader sees. */
const found = (text: string) => checkGrammar(text).map((i) => `${text.slice(i.start, i.end)}: ${i.kind}`);

describe("checkGrammar", () => {
  test("learners' agreement, conjugation and homophone mistakes", () => {
    expect(found("Je pense que les grand villes sont polluées.")).toContain("grand: gn");
    expect(found("Une problème important.")).toContain("Une: gn");
    expect(found("Je suis d'accord avec cet idée.")).toContain("cet: gn");
    expect(found("Hier, il ont mangé au restaurant.")).toContain("ont: conj");
    expect(found("Je vous écrit pour vous demandé des informations.")).toEqual(["écrit: conj", "demandé: infi"]);
    expect(found("Ils sont allés a Paris.")).toContain("a: conf");
  });

  test("misspelled words", () => {
    expect(found("Il y a beaucoup d'embouteilages le matin.")).toEqual(["embouteilages: spell"]);
  });

  test("correct French gets nothing, typography included", () => {
    expect(found("Depuis quelques années, de plus en plus de villes européennes ferment leur centre aux voitures.")).toEqual([]);
    expect(found("C'est l'idée qu'on n'oublie pas : elle est juste !")).toEqual([]);
    expect(found("")).toEqual([]);
  });

  test("explains, with the corrections kept apart", () => {
    const [issue] = checkGrammar("Une problème important.");
    // Grammalecte spaces its punctuation with no-break spaces.
    expect(issue.message.replace(/\s/g, " ")).toBe("Accord de genre erroné : « problème » est masculin.");
    expect(issue.answers).toEqual(["Un"]);
    expect(checkGrammar("Il y a beaucoup d'embouteilages.")[0].answers).toContain("embouteillages");
  });

  test("issues never overlap", () => {
    const issues = checkGrammar("Il a aller au bureau et ils sont allé a Paris avec sa amis.");
    for (let i = 1; i < issues.length; i++) expect(issues[i].start).toBeGreaterThanOrEqual(issues[i - 1].end);
  });
});
