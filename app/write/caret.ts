// Caret and selection geometry inside a <textarea>, which the DOM doesn't expose. A hidden
// mirror div copies the textarea's text metrics, and a marker span placed at
// the offset reports where the caret would be drawn.

const COPIED = [
  "boxSizing",
  "width",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "borderTopWidth",
  "borderRightWidth",
  "borderBottomWidth",
  "borderLeftWidth",
  "borderStyle",
  "fontFamily",
  "fontSize",
  "fontWeight",
  "fontStyle",
  "fontStretch",
  "fontVariant",
  "fontFeatureSettings",
  "fontVariationSettings",
  "fontKerning",
  "fontOpticalSizing",
  "letterSpacing",
  "wordSpacing",
  "lineHeight",
  "textIndent",
  "textTransform",
  "tabSize",
  "hyphens",
  "overflowWrap",
  "wordBreak",
] as const;

let mirror: HTMLDivElement | null = null;

/** The hidden mirror, set to `el`'s text metrics. */
function mirrorOf(el: HTMLTextAreaElement): HTMLDivElement {
  if (!mirror) {
    mirror = document.createElement("div");
    mirror.setAttribute("aria-hidden", "true");
    Object.assign(mirror.style, {
      position: "absolute",
      top: "0",
      left: "-9999px",
      visibility: "hidden",
      whiteSpace: "pre-wrap",
      height: "auto",
    });
    document.body.appendChild(mirror);
  }
  const style = getComputedStyle(el);
  for (const prop of COPIED) mirror.style[prop] = style[prop];
  return mirror;
}

function caretPoint(el: HTMLTextAreaElement, offset: number): { top: number; left: number } {
  const mirror = mirrorOf(el);
  mirror.textContent = el.value.slice(0, offset);
  const marker = document.createElement("span");
  // Non-empty so the marker gets a line box even at the very end.
  marker.textContent = el.value.slice(offset) || ".";
  mirror.appendChild(marker);
  return { top: marker.offsetTop, left: marker.offsetLeft };
}

export function isOnFirstLine(el: HTMLTextAreaElement, offset: number): boolean {
  return caretPoint(el, offset).top === caretPoint(el, 0).top;
}

export function isOnLastLine(el: HTMLTextAreaElement, offset: number): boolean {
  return caretPoint(el, offset).top === caretPoint(el, el.value.length).top;
}

export function caretX(el: HTMLTextAreaElement, offset: number): number {
  return caretPoint(el, offset).left;
}

/** The top of the caret's line, from the top of the textarea's box. */
export function caretTop(el: HTMLTextAreaElement, offset: number): number {
  return caretPoint(el, offset).top;
}

/**
 * The offset on the textarea's first or last visual line whose caret is
 * horizontally closest to `x`, so ↑/↓ across blocks keeps its column.
 */
export function offsetAtX(el: HTMLTextAreaElement, x: number, line: "first" | "last"): number {
  const length = el.value.length;
  const lineTop = caretPoint(el, line === "first" ? 0 : length).top;
  const onLine = (o: number) => caretPoint(el, o).top === lineTop;

  // Bounds of that visual line: binary search for where the line changes.
  let start = 0;
  let end = length;
  if (line === "first") {
    let lo = 0;
    let hi = length;
    while (lo < hi) {
      const mid = Math.ceil((lo + hi) / 2);
      if (onLine(mid)) lo = mid;
      else hi = mid - 1;
    }
    end = lo;
  } else {
    let lo = 0;
    let hi = length;
    while (lo < hi) {
      const mid = Math.floor((lo + hi) / 2);
      if (onLine(mid)) hi = mid;
      else lo = mid + 1;
    }
    start = lo;
  }

  // Within one line, x grows with the offset.
  let lo = start;
  let hi = end;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (caretPoint(el, mid).left < x) lo = mid + 1;
    else hi = mid;
  }
  if (lo > start && Math.abs(caretPoint(el, lo - 1).left - x) <= Math.abs(caretPoint(el, lo).left - x)) {
    return lo - 1;
  }
  return lo;
}

/** One box per visual line of the text from `start` to `end`, relative to the textarea's border box. */
export function rangeRects(el: HTMLTextAreaElement, start: number, end: number) {
  const mirror = mirrorOf(el);
  mirror.textContent = el.value.slice(0, start);
  const span = document.createElement("span");
  span.textContent = el.value.slice(start, end);
  mirror.append(span, el.value.slice(end) || ".");
  const box = mirror.getBoundingClientRect();
  return [...span.getClientRects()]
    .filter((r) => r.width > 0)
    .map((r) => ({ x: r.left - box.left, y: r.top - box.top, width: r.width, height: r.height }));
}
