import { describe, expect, test } from "bun:test";

import { mergeWithPrevious, splitBlock, type Block } from "./blocks";
import { diffText, mapRange, remapMarks, type MarkPosition } from "./marks";

const doc = (...texts: string[]): Block[] => texts.map((text, i) => ({ id: `b${i}`, text }));

/** A mark on the first `phrase` from `from` in block `blockId` of `blocks`. */
function mark(blocks: Block[], blockId: string, phrase: string, from = 0): MarkPosition {
  const text = blocks.find((b) => b.id === blockId)!.text;
  const start = text.indexOf(phrase, from);
  return { blockId, start, end: start + phrase.length, before: text.slice(Math.max(0, start - 24), start) };
}

const phrase = (blocks: Block[], m: MarkPosition) => blocks.find((b) => b.id === m.blockId)!.text.slice(m.start, m.end);

function edit(texts: string[], m: MarkPosition, next: string[], caret?: { blockId: string; offset: number }) {
  const prev = doc(...texts);
  const after = doc(...next);
  const [moved] = remapMarks([m], prev, after, caret);
  return { moved, phrase: moved.lost ? null : phrase(after, moved) };
}

describe("diffText", () => {
  test("finds a typed letter", () => {
    expect(diffText("grand sac", "grands sac")).toEqual({ at: 5, removed: 0, inserted: "s" });
  });

  test("uses the caret to place a repeated letter", () => {
    expect(diffText("aa", "aaa", 1)).toEqual({ at: 0, removed: 0, inserted: "a" });
    expect(diffText("aa", "aaa", 3)).toEqual({ at: 2, removed: 0, inserted: "a" });
  });

  test("finds a replaced span", () => {
    expect(diffText("je vais a Paris", "je vais à Paris")).toEqual({ at: 8, removed: 1, inserted: "à" });
  });
});

describe("mapRange", () => {
  test("shifts with edits before the mark and ignores edits after", () => {
    expect(mapRange(5, 8, { at: 0, removed: 0, inserted: "ab" })).toEqual({ start: 7, end: 10 });
    expect(mapRange(5, 8, { at: 9, removed: 2, inserted: "" })).toEqual({ start: 5, end: 8 });
  });

  test("typing over the whole mark makes the mark the new words", () => {
    expect(mapRange(5, 8, { at: 5, removed: 3, inserted: "à la" })).toEqual({ start: 5, end: 9 });
  });

  test("grows at its end with a few letters of the same word, not with a space", () => {
    expect(mapRange(0, 5, { at: 5, removed: 0, inserted: "s" })).toEqual({ start: 0, end: 6 });
    expect(mapRange(0, 5, { at: 5, removed: 0, inserted: " " })).toEqual({ start: 0, end: 5 });
    expect(mapRange(0, 5, { at: 5, removed: 0, inserted: "tout le reste" })).toEqual({ start: 0, end: 5 });
  });

  test("typing at its start pushes it along", () => {
    expect(mapRange(3, 6, { at: 3, removed: 0, inserted: "t" })).toEqual({ start: 4, end: 7 });
  });

  test("an emptied mark fills with what's typed in its place", () => {
    expect(mapRange(3, 3, { at: 3, removed: 0, inserted: "de" })).toEqual({ start: 3, end: 5 });
  });

  test("a deletion that takes the mark and more loses it", () => {
    expect(mapRange(3, 6, { at: 1, removed: 8, inserted: "" })).toBeNull();
  });
});

describe("remapMarks", () => {
  test("follows a fix typed in place", () => {
    const m = mark(doc("Je vais a Paris."), "b0", "a", 8);
    expect(edit(["Je vais a Paris."], m, ["Je vais à Paris."]).phrase).toBe("à");
  });

  test("keeps the same array when nothing it marks changed", () => {
    const prev = doc("Je vais a Paris.", "Bonjour");
    const marks = [mark(prev, "b0", "a", 8)];
    expect(remapMarks(marks, prev, doc("Je vais a Paris.", "Bonjour!"))).toBe(marks);
  });

  test("follows its words into the new paragraph when Enter splits before them", () => {
    const prev = doc("Il pense que il a tort.");
    const m = mark(prev, "b0", "que il");
    const split = splitBlock(prev, "b0", 9, 9).blocks;
    const [moved] = remapMarks([m], prev, split);
    expect(moved.blockId).toBe(split[1].id);
    expect(phrase(split, moved)).toBe("que il");
  });

  test("follows its words into the paragraph they're merged into", () => {
    const prev = doc("Bonjour.", "Je vais a Paris.");
    const m = mark(prev, "b1", "a", 8);
    const merged = mergeWithPrevious(prev, "b1")!.blocks;
    const [moved] = remapMarks([m], prev, merged);
    expect(moved).toMatchObject({ blockId: "b0", lost: null });
    expect(phrase(merged, moved)).toBe("a");
  });

  test("a mark cut out of the essay comes back when the words are put back", () => {
    const texts = ["Hier, je vais a Paris."];
    const m = mark(doc(...texts), "b0", "a", 14);
    const cut = edit(texts, m, ["Hier, Paris."]).moved;
    expect(cut.lost).toBe("a");
    const [back] = remapMarks([cut], doc("Hier, Paris."), doc(...texts));
    expect(back.lost).toBeNull();
    expect(phrase(doc(...texts), back)).toBe("a");
  });
});
