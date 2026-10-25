import { beforeEach, describe, expect, test } from "bun:test";

import { hasWriting, isSaved, removeEssay, saveEssay } from "./essays";

// No localStorage under bun: the store keeps everything in memory, which is
// all these tests need.
const ids: string[] = [];
const newId = () => {
  const id = crypto.randomUUID();
  ids.push(id);
  return id;
};

beforeEach(() => {
  for (const id of ids.splice(0)) removeEssay(id);
});

describe("hasWriting", () => {
  test("needs a title or at least one word", () => {
    expect(hasWriting({ title: "", words: 0 })).toBe(false);
    expect(hasWriting({ title: "   ", words: 0 })).toBe(false);
    expect(hasWriting({ title: "Le télétravail", words: 0 })).toBe(true);
    expect(hasWriting({ title: "", words: 1 })).toBe(true);
  });
});

describe("saving lazily", () => {
  test("a new essay isn't in the list until saveEssay", () => {
    const id = newId();
    expect(isSaved(id)).toBe(false);
    saveEssay(id, { title: "", words: 3 });
    expect(isSaved(id)).toBe(true);
  });

  test("saving again updates the essay instead of adding another", () => {
    const id = newId();
    saveEssay(id, { title: "Brouillon", words: 0 });
    saveEssay(id, { title: "Brouillon", words: 12 });
    expect(isSaved(id)).toBe(true);
    removeEssay(id);
    expect(isSaved(id)).toBe(false);
  });

  test("removing an essay that was never saved does nothing", () => {
    const id = newId();
    removeEssay(id);
    expect(isSaved(id)).toBe(false);
  });
});
