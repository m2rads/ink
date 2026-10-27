// The lookup key for a French noun: what the build script indexes and what
// lookUpGender searches, so both sides must agree. Lowercase, no accents,
// ligatures spelled out (œ → oe, so "coeur" finds "cœur"), one kind of
// apostrophe, hyphens as spaces ("arc en ciel" finds "arc-en-ciel").

export function genderKey(text: string): string {
  return foldCase(text)
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Lowercase with ligatures and apostrophes unified, accents kept: the form compared to tell "côte" from "cote". */
export function foldCase(text: string): string {
  return text
    .normalize("NFC")
    .toLowerCase()
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae")
    .replace(/[’‘ʼ´`]/g, "'")
    .replace(/[‐‑‒–]/g, "-");
}
