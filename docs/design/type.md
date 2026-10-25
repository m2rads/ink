# Type

Source: `app/globals.css` (scale), `app/layout.tsx` (fonts). Live: `/design/type`.

Inter (`font-sans`, the default) for the interface; Literata (`font-serif`) for essay text and nothing else. Tailwind's sizes are deleted: `text-xs`, `text-sm`, `text-base`, `text-lg` produce **no CSS and no error**. Use these steps only.

| Class | Size | Use |
| --- | --- | --- |
| `text-caption` | 12px | Counts, timestamps, keyboard hints. The floor: nothing smaller, except `text-sup`. |
| `text-sup` | 0.55em of the essay (9–10px) | Mistake numbers raised beside marked phrases, and nothing else. Decorative: each note repeats its number, and the mark's label carries it. |
| `text-label` | 13px | Chips, note headers, app bar meta, form labels. |
| `text-ui` | 14px | Buttons, note explanations, menu items, dense controls. |
| `text-body` | 16px | Default interface text and every input (16px stops iOS zooming). |
| `text-title` | 18px, 600 | Rule titles in notes, card headings. |
| `text-heading` | 24px, 600 | Page headings. One per page. |
| `text-display` | 32px, 650 | Whole-page empty states (no essays at all) and onboarding only. An empty list or filter result inside a page uses `text-title`. |
| `text-essay` | 17→19px, fluid | Essay body and the inline fix input. Always with `font-serif`. |
| `text-essay-title` | 28px, 600 | The essay prompt above the text. Always with `font-serif`. |

```
Is it essay text (the user's French, or the prompt)? → font-serif text-essay / text-essay-title
Is it a page heading? → text-heading
A heading inside a card or note? → text-title
Readable interface text? → text-body (default) or text-ui (in controls and notes)
A label on a control or chip? → text-label
Small meta? → text-caption
```

Rules:
- Weights: regular (400) for text, `font-medium` (500) for labels, buttons and emphasis. Title, heading and display carry their own weight; don't add `font-bold`. Bold is for UI emphasis; italic is for French examples inside notes only.
- Essay text is capped at 65 characters per line: `max-w-prose` on the essay container. Interface paragraphs cap at `max-w-prose` too.
- Section labels use the `eyebrow` utility (12px, uppercase, 0.06em tracking) with `text-text-3`. Write the source string in sentence case; `eyebrow` uppercases it.
- Sentence case everywhere: "Submit essay", not "Submit Essay".
- Numbers that change or sit in columns (timer, word count, mistake counts) get `tabular-nums` so they don't jitter.
- Never set `leading-*` or `tracking-*` on these steps; each step carries its own.
