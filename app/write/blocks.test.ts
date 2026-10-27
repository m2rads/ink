import { describe, expect, test } from "bun:test";

import {
  blocksFromText,
  blocksToText,
  countWords,
  insertText,
  isBefore,
  mergeWithNext,
  mergeWithPrevious,
  moveBlock,
  pressEnter,
  replaceRange,
  splitBlock,
  textBetween,
  type Block,
} from "./blocks";

const doc = (...texts: string[]): Block[] => texts.map((text, i) => ({ id: `b${i}`, text }));
const texts = (blocks: Block[]) => blocks.map((b) => b.text);

describe("splitBlock", () => {
  test("splits at the caret and puts the caret at the start of the new block", () => {
    const edit = splitBlock(doc("Bonjour le monde"), "b0", 8, 8)!;
    expect(texts(edit.blocks)).toEqual(["Bonjour ", "le monde"]);
    expect(edit.caret).toEqual({ blockId: edit.blocks[1].id, offset: 0 });
  });

  test("deletes the selection before splitting", () => {
    const edit = splitBlock(doc("Bonjour cher monde"), "b0", 8, 13)!;
    expect(texts(edit.blocks)).toEqual(["Bonjour ", "monde"]);
  });

  test("keeps the original block's id for the first half", () => {
    const edit = splitBlock(doc("ab"), "b0", 1, 1)!;
    expect(edit.blocks[0].id).toBe("b0");
  });

  test("in an empty block, adds another empty block below", () => {
    const edit = splitBlock(doc("Un", ""), "b1", 0, 0);
    expect(texts(edit.blocks)).toEqual(["Un", "", ""]);
    expect(edit.caret).toEqual({ blockId: edit.blocks[2].id, offset: 0 });
  });
});

describe("merging", () => {
  test("backspace at the start joins onto the previous block", () => {
    const edit = mergeWithPrevious(doc("Premier.", " Second."), "b1")!;
    expect(texts(edit.blocks)).toEqual(["Premier. Second."]);
    expect(edit.caret).toEqual({ blockId: "b0", offset: 8 });
  });

  test("backspace in the first block does nothing", () => {
    expect(mergeWithPrevious(doc("Seul"), "b0")).toBeNull();
  });

  test("delete at the end pulls the next block in", () => {
    const edit = mergeWithNext(doc("Un", "Deux", "Trois"), "b0")!;
    expect(texts(edit.blocks)).toEqual(["UnDeux", "Trois"]);
    expect(edit.caret).toEqual({ blockId: "b0", offset: 2 });
  });

  test("delete in the last block does nothing", () => {
    expect(mergeWithNext(doc("Un", "Deux"), "b1")).toBeNull();
  });
});

describe("insertText", () => {
  test("single line replaces the selection in place", () => {
    const edit = insertText(doc("Il faut que tu viens."), "b0", 15, 20, "viennes");
    expect(texts(edit.blocks)).toEqual(["Il faut que tu viennes."]);
    expect(edit.caret.offset).toBe(22);
  });

  test("pasted paragraphs become blocks around the caret", () => {
    const edit = insertText(doc("Avant|Après"), "b0", 6, 6, "un\n\ndeux\ntrois");
    expect(texts(edit.blocks)).toEqual(["Avant|un", "deux", "troisAprès"]);
    expect(edit.caret).toEqual({ blockId: edit.blocks[2].id, offset: 5 });
  });

  test("Windows line endings split like Unix ones", () => {
    const edit = insertText(doc(""), "b0", 0, 0, "un\r\ndeux");
    expect(texts(edit.blocks)).toEqual(["un", "deux"]);
  });

  test("composes accents to one character (NFC)", () => {
    const edit = insertText(doc(""), "b0", 0, 0, "été");
    expect(edit.blocks[0].text).toBe("été");
    expect(edit.blocks[0].text.length).toBe(3);
  });
});

describe("ranges across blocks", () => {
  const at = (blockId: string, offset: number) => ({ blockId, offset });

  test("typing over a selection across blocks joins its two ends", () => {
    const edit = replaceRange(doc("Bonjour le", "milieu", "monde entier"), at("b0", 8), at("b2", 6), "X");
    expect(texts(edit.blocks)).toEqual(["Bonjour Xentier"]);
    expect(edit.caret).toEqual({ blockId: "b0", offset: 9 });
  });

  test("deleting it leaves the caret where it began", () => {
    const edit = replaceRange(doc("ab", "cd"), at("b0", 1), at("b1", 1), "");
    expect(texts(edit.blocks)).toEqual(["ad"]);
    expect(edit.caret).toEqual({ blockId: "b0", offset: 1 });
  });

  test("pasting paragraphs over it makes new blocks", () => {
    const edit = replaceRange(doc("ab", "cd", "ef"), at("b0", 1), at("b2", 1), "un\n\ndeux");
    expect(texts(edit.blocks)).toEqual(["aun", "deuxf"]);
  });

  test("within one block, it's a plain replace", () => {
    const edit = replaceRange(doc("abc"), at("b0", 1), at("b0", 2), "X");
    expect(texts(edit.blocks)).toEqual(["aXc"]);
  });

  test("copies with a blank line between paragraphs, empty ones included", () => {
    expect(textBetween(doc("Un deux", "", "trois quatre"), at("b0", 3), at("b2", 5))).toBe("deux\n\n\n\ntrois");
    expect(textBetween(doc("abc"), at("b0", 1), at("b0", 3))).toBe("bc");
  });

  test("orders carets across and within blocks", () => {
    const blocks = doc("ab", "cd");
    expect(isBefore(blocks, at("b0", 2), at("b1", 0))).toBe(true);
    expect(isBefore(blocks, at("b1", 0), at("b0", 2))).toBe(false);
    expect(isBefore(blocks, at("b1", 0), at("b1", 0))).toBe(false);
  });
});

describe("plain text", () => {
  test("round-trips paragraphs and drops empty ones", () => {
    const blocks = blocksFromText("Un.\n\n\nDeux.\n");
    expect(texts(blocks)).toEqual(["Un.", "Deux."]);
    expect(blocksToText([...blocks, { id: "x", text: "  " }])).toBe("Un.\n\nDeux.");
  });

  test("empty text still gives one block to type in", () => {
    expect(texts(blocksFromText(""))).toEqual([""]);
  });
});

describe("countWords", () => {
  test("counts tokens with a letter, like the prototype", () => {
    expect(countWords(doc("Je ne suis pas d’accord – vraiment ?", "Oui."))).toBe(7);
  });

  test("is zero for an empty essay", () => {
    expect(countWords(doc("", "   "))).toBe(0);
  });
});

describe("moveBlock", () => {
  const four = doc("Un", "Deux", "Trois", "Quatre");

  test("moves down and up by one", () => {
    expect(texts(moveBlock(four, "b0", 1))).toEqual(["Deux", "Un", "Trois", "Quatre"]);
    expect(texts(moveBlock(four, "b2", 1))).toEqual(["Un", "Trois", "Deux", "Quatre"]);
  });

  test("moves to the ends", () => {
    expect(texts(moveBlock(four, "b1", 3))).toEqual(["Un", "Trois", "Quatre", "Deux"]);
    expect(texts(moveBlock(four, "b3", 0))).toEqual(["Quatre", "Un", "Deux", "Trois"]);
  });

  test("clamps past either end and keeps ids and text", () => {
    const moved = moveBlock(four, "b0", 99);
    expect(texts(moved)).toEqual(["Deux", "Trois", "Quatre", "Un"]);
    expect(moved[3]).toBe(four[0]);
    expect(texts(moveBlock(four, "b2", -5))).toEqual(["Trois", "Un", "Deux", "Quatre"]);
  });

  test("returns the same array when the block stays put", () => {
    expect(moveBlock(four, "b2", 2)).toBe(four);
  });
});

describe("pressEnter", () => {
  test("at the end of a paragraph starts a new line in it", () => {
    const edit = pressEnter(doc("Bonjour"), "b0", 7, 7);
    expect(texts(edit.blocks)).toEqual(["Bonjour\n"]);
    expect(edit.caret).toEqual({ blockId: "b0", offset: 8 });
  });

  test("at the end of a line inside a paragraph starts a new line there", () => {
    const edit = pressEnter(doc("Un\ndeux"), "b0", 2, 2);
    expect(texts(edit.blocks)).toEqual(["Un\n\ndeux"]);
    expect(edit.caret).toEqual({ blockId: "b0", offset: 3 });
  });

  test("again on the empty last line, takes the line back and starts a paragraph", () => {
    const edit = pressEnter(doc("Bonjour\n", "Suite"), "b0", 8, 8);
    expect(texts(edit.blocks)).toEqual(["Bonjour", "", "Suite"]);
    expect(edit.caret).toEqual({ blockId: edit.blocks[1].id, offset: 0 });
  });

  test("on an empty line mid-paragraph, splits there without either line break", () => {
    const edit = pressEnter(doc("Un\n\ndeux"), "b0", 3, 3);
    expect(texts(edit.blocks)).toEqual(["Un", "deux"]);
    expect(edit.caret).toEqual({ blockId: edit.blocks[1].id, offset: 0 });
  });

  test("mid-line, over a selection or in an empty paragraph, splits as before", () => {
    expect(texts(pressEnter(doc("Bonjour le monde"), "b0", 8, 8).blocks)).toEqual(["Bonjour ", "le monde"]);
    expect(texts(pressEnter(doc("Bonjour le monde"), "b0", 8, 16).blocks)).toEqual(["Bonjour ", ""]);
    expect(texts(pressEnter(doc(""), "b0", 0, 0).blocks)).toEqual(["", ""]);
  });
});
