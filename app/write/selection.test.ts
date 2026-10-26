import { describe, expect, test } from "bun:test";

import { lookupTerm } from "./selection";

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

  test("more than a phrase (8 words) is no term", () => {
    const sentence = `${text} Ce temps peut être consacré à sa famille.`;
    expect(lookupTerm(sentence, 0, sentence.length)).toBeNull();
  });

  test("line breaks become spaces", () => {
    expect(lookupTerm("vie\nprivée", 0, 10)?.term).toBe("vie privée");
  });
});

function span(part: string) {
  const [start, end] = at(part);
  return { start, end };
}
