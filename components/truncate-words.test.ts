import { describe, expect, test } from "bun:test";

import { fitWords } from "./truncate-words";

// A fake measure: anything up to `max` characters fits.
const upTo = (max: number) => (s: string) => s.length <= max;

describe("fitWords", () => {
  const title = "Le télétravail devrait-il devenir la norme ?";

  test("keeps text that fits", () => {
    expect(fitWords(title, upTo(100))).toBe(title);
  });

  test("ends on a whole word, never inside one", () => {
    // "Le télétravail devrait-il dev" would be 29 characters; it stops at the last whole word.
    expect(fitWords(title, upTo(29))).toBe("Le télétravail devrait-il…");
  });

  test("keeps hyphenated words whole", () => {
    expect(fitWords(title, upTo(24))).toBe("Le télétravail…");
  });

  test("drops punctuation left before the ellipsis", () => {
    expect(fitWords("Bonjour, je suis Marie, et toi ?", upTo(10))).toBe("Bonjour…");
    expect(fitWords("Un mot – puis un autre", upTo(9))).toBe("Un mot…");
  });

  test("hands a single word that doesn't fit to CSS", () => {
    expect(fitWords("Anticonstitutionnellement", upTo(5))).toBe("Anticonstitutionnellement");
    expect(fitWords("Anticonstitutionnellement et plus", upTo(5))).toBe("Anticonstitutionnellement et plus");
  });
});
