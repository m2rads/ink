import { describe, expect, test } from "bun:test";

import { lookupTerm, wordsBefore } from "./selection";

const text = "Le télétravail permet d’économiser le temps du trajet.";
const at = (part: string) => [text.indexOf(part), text.indexOf(part) + part.length] as const;

describe("lookupTerm", () => {
  test("a whole word as selected", () => {
    expect(lookupTerm(text, ...at("trajet"))?.term).toBe("trajet");
  });

  test("widens part of a word to the whole word", () => {
    expect(lookupTerm(text, ...at("élétrava"))).toEqual({ term: "télétravail", ...span("télétravail") });
  });

  test("trims spaces and punctuation at the edges", () => {
    expect(lookupTerm(text, ...at(" trajet."))?.term).toBe("trajet");
  });

  test("keeps elisions and accents inside a phrase", () => {
    expect(lookupTerm(text, ...at("d’économiser"))?.term).toBe("d’économiser");
  });

  test("a phrase across words", () => {
    expect(lookupTerm(text, ...at("temps du traj"))?.term).toBe("temps du trajet");
  });

  test("nothing but punctuation is no term", () => {
    expect(lookupTerm(text, ...at("."))).toBeNull();
  });

  test("a whole sentence is a term", () => {
    const sentence = `${text} Ce temps peut être consacré à sa famille.`;
    expect(lookupTerm(sentence, 0, sentence.length)?.term).toBe(sentence.replace(/\.$/, ""));
  });

  test("more than 200 characters is no term", () => {
    const long = "le temps du trajet ".repeat(11);
    expect(lookupTerm(long, 0, long.length)).toBeNull();
  });

  test("line breaks become spaces", () => {
    expect(lookupTerm("vie\nprivée", 0, 10)?.term).toBe("vie privée");
  });
});

function span(part: string) {
  const [start, end] = at(part);
  return { start, end };
}

describe("wordsBefore", () => {
  test("the last few words before the selection", () => {
    const value = "Il faut que nous allions";
    expect(wordsBefore(value, value.indexOf("allions"))).toBe("Il faut que nous");
  });

  test("at most six words", () => {
    const value = "Quand j’étais enfant, chaque été, nous y allions";
    expect(wordsBefore(value, value.indexOf("allions"))).toBe("j’étais enfant, chaque été, nous y");
  });

  test("only the selection's own line", () => {
    const value = "Cher Monsieur,\nje suis";
    expect(wordsBefore(value, value.indexOf("suis"))).toBe("je");
  });

  test("nothing at the start", () => {
    expect(wordsBefore("Allons-y", 0)).toBe("");
  });

  test("never more than 100 characters", () => {
    const long = "anticonstitutionnellement ".repeat(6);
    expect(wordsBefore(long, long.length).length).toBeLessThanOrEqual(100);
  });
});
