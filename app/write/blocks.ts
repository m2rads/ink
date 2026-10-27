// The essay as a list of paragraph blocks, and the edits the editor makes to
// it. Pure functions only: the editor component owns focus and the DOM.
// A block's text may hold line breaks ("\n"): lines inside one paragraph,
// made by Enter at the end of a line (pressEnter).

export type Block = { id: string; text: string };

/** Where the caret should land after an edit. */
export type Caret = { blockId: string; offset: number };

export type Edit = { blocks: Block[]; caret: Caret };

export function createBlock(text = ""): Block {
  return { id: crypto.randomUUID(), text };
}

/** Plain text with paragraphs separated by line breaks; blank lines collapse. */
export function blocksFromText(text: string): Block[] {
  const paragraphs = splitParagraphs(text);
  return paragraphs.length ? paragraphs.map((p) => createBlock(p)) : [createBlock()];
}

export function blocksToText(blocks: Block[]): string {
  return blocks
    .map((b) => b.text.trim())
    .filter(Boolean)
    .join("\n\n");
}

/**
 * Words as the prototype counts them: whitespace-separated tokens containing
 * a letter, so "l’homme" is one word and a lone "–" or "?" is none.
 */
export function countWords(blocks: Block[]): number {
  let count = 0;
  for (const b of blocks) {
    for (const token of b.text.split(/\s+/)) {
      if (/\p{L}/u.test(token)) count++;
    }
  }
  return count;
}

/** NFC (so é is one character), Windows line endings unified, tabs as spaces. */
export function normalizeText(text: string): string {
  return text.normalize("NFC").replace(/\r\n?/g, "\n").replace(/\t/g, " ");
}

/**
 * Replace the selection [start, end) of a block with `text`. Line breaks in
 * `text` (paste, drop, an autocorrect newline) start new blocks: the first
 * line joins the text before the selection, the last line keeps the text
 * after it, and the caret lands at the end of the inserted text.
 */
export function insertText(blocks: Block[], id: string, start: number, end: number, text: string): Edit {
  const index = indexOf(blocks, id);
  const block = blocks[index];
  const before = block.text.slice(0, start);
  const after = block.text.slice(end);
  const lines = normalizeText(text).split("\n");

  if (lines.length === 1) {
    const updated = { ...block, text: before + lines[0] + after };
    return {
      blocks: replaceAt(blocks, index, [updated]),
      caret: { blockId: block.id, offset: before.length + lines[0].length },
    };
  }

  // Middle lines become their own paragraphs; blank lines don't.
  const middle = lines.slice(1, -1).filter((l) => l.trim() !== "").map((l) => createBlock(l));
  const first = { ...block, text: before + lines[0] };
  const lastLine = lines[lines.length - 1];
  const last = createBlock(lastLine + after);
  return {
    blocks: replaceAt(blocks, index, [first, ...middle, last]),
    caret: { blockId: last.id, offset: lastLine.length },
  };
}

/**
 * Enter: delete the selection, then split the block at the caret. In an
 * empty block it adds another empty one below: writers can leave blank
 * paragraphs.
 */
export function splitBlock(blocks: Block[], id: string, start: number, end: number): Edit {
  const index = indexOf(blocks, id);
  const block = blocks[index];
  const head = { ...block, text: block.text.slice(0, start) };
  const tail = createBlock(block.text.slice(end));
  return { blocks: replaceAt(blocks, index, [head, tail]), caret: { blockId: tail.id, offset: 0 } };
}

/**
 * Enter, the way it works at the end of a line: there it starts a new line
 * in the same paragraph, and Enter again on that empty line takes it back
 * out and starts a new paragraph instead. Anywhere else (mid-line, over a
 * selection, in an empty paragraph) it splits the block (splitBlock).
 */
export function pressEnter(blocks: Block[], id: string, start: number, end: number): Edit {
  const block = blocks[indexOf(blocks, id)];
  const text = block.text;
  const atLineEnd = start === end && text !== "" && (start === text.length || text[start] === "\n");
  if (!atLineEnd) return splitBlock(blocks, id, start, end);

  const onEmptyLine = start === 0 || text[start - 1] === "\n";
  if (!onEmptyLine) return insertLineBreak(blocks, id, start);

  // The empty line goes, with the line breaks on either side of it.
  const head = { ...block, text: text.slice(0, Math.max(0, start - 1)) };
  const tail = createBlock(text.slice(text[start] === "\n" ? start + 1 : start));
  return { blocks: replaceAt(blocks, indexOf(blocks, id), [head, tail]), caret: { blockId: tail.id, offset: 0 } };
}

function insertLineBreak(blocks: Block[], id: string, at: number): Edit {
  const index = indexOf(blocks, id);
  const block = blocks[index];
  const updated = { ...block, text: block.text.slice(0, at) + "\n" + block.text.slice(at) };
  return { blocks: replaceAt(blocks, index, [updated]), caret: { blockId: id, offset: at + 1 } };
}

/**
 * Replace the text from `start` to `end` (start first; they may be in
 * different blocks) with `text`. The blocks between them go, and the two ends
 * join into the first one: a selection across paragraphs that's typed over,
 * deleted or pasted onto.
 */
export function replaceRange(blocks: Block[], start: Caret, end: Caret, text: string): Edit {
  const i = indexOf(blocks, start.blockId);
  const j = indexOf(blocks, end.blockId);
  if (i === j) return insertText(blocks, start.blockId, start.offset, end.offset, text);
  const first = blocks[i];
  const joined = { ...first, text: first.text.slice(0, start.offset) + blocks[j].text.slice(end.offset) };
  return insertText([...blocks.slice(0, i), joined, ...blocks.slice(j + 1)], first.id, start.offset, start.offset, text);
}

/** The text from `start` to `end` (start first), paragraphs separated by a blank line: what a copy puts on the clipboard. */
export function textBetween(blocks: Block[], start: Caret, end: Caret): string {
  const i = indexOf(blocks, start.blockId);
  const j = indexOf(blocks, end.blockId);
  if (i === j) return blocks[i].text.slice(start.offset, end.offset);
  return [
    blocks[i].text.slice(start.offset),
    ...blocks.slice(i + 1, j).map((b) => b.text),
    blocks[j].text.slice(0, end.offset),
  ].join("\n\n");
}

/** Whether caret `a` comes before caret `b` in the essay. */
export function isBefore(blocks: Block[], a: Caret, b: Caret): boolean {
  const i = indexOf(blocks, a.blockId);
  const j = indexOf(blocks, b.blockId);
  return i < j || (i === j && a.offset < b.offset);
}

/** Backspace at the start of a block: join it onto the end of the previous one. */
export function mergeWithPrevious(blocks: Block[], id: string): Edit | null {
  const index = indexOf(blocks, id);
  if (index === 0) return null;
  const prev = blocks[index - 1];
  const merged = { ...prev, text: prev.text + blocks[index].text };
  return {
    blocks: [...blocks.slice(0, index - 1), merged, ...blocks.slice(index + 1)],
    caret: { blockId: prev.id, offset: prev.text.length },
  };
}

/** Delete at the end of a block: pull the next block's text into it. */
export function mergeWithNext(blocks: Block[], id: string): Edit | null {
  const index = indexOf(blocks, id);
  if (index === blocks.length - 1) return null;
  const block = blocks[index];
  const merged = { ...block, text: block.text + blocks[index + 1].text };
  return {
    blocks: [...blocks.slice(0, index), merged, ...blocks.slice(index + 2)],
    caret: { blockId: block.id, offset: block.text.length },
  };
}

/**
 * Move a block so it ends up at index `to` (an index into the result).
 * Returns the same array when nothing moves.
 */
export function moveBlock(blocks: Block[], id: string, to: number): Block[] {
  const from = indexOf(blocks, id);
  const target = Math.max(0, Math.min(blocks.length - 1, to));
  if (target === from) return blocks;
  const rest = [...blocks.slice(0, from), ...blocks.slice(from + 1)];
  return [...rest.slice(0, target), blocks[from], ...rest.slice(target)];
}

function splitParagraphs(text: string): string[] {
  return normalizeText(text)
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

function indexOf(blocks: Block[], id: string): number {
  const index = blocks.findIndex((b) => b.id === id);
  if (index === -1) throw new Error(`No block with id ${id}`);
  return index;
}

function replaceAt(blocks: Block[], index: number, replacement: Block[]): Block[] {
  return [...blocks.slice(0, index), ...replacement, ...blocks.slice(index + 1)];
}
