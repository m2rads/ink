# Color

Source: `app/globals.css`. Every color is a semantic OKLCH token with a light and a dark value; the dark values switch automatically with `prefers-color-scheme`. Use the Tailwind utility (`bg-surface`, `text-text-2`, `border-border`), or `var(--surface)` in CSS. Never hex, `rgb()`, `oklch()`, arbitrary values, or `dark:` overrides: the tokens already flip.

Tailwind's palette is deleted (`--color-*: initial`). `bg-white`, `text-black`, `bg-zinc-50`, `text-blue-600` produce **no CSS and no error**; the element just loses its color.

## Background

```
The page itself → nothing; body already has bg-bg
A card, note or panel sitting on the page → bg-surface
A fill inside a card: chip, track, hover, pressed or selected row → bg-sunken
Something floating (popover, menu, dialog, toast) → bg-raised, but the component already sets it
The dim layer behind a modal → bg-scrim, set by Dialog/Drawer
```

In dark mode `bg-sunken` is *lighter* than `bg-surface`, so hovers and fills lift on a dark canvas. That's intended; don't swap them per theme.

## Text

```
Headings, body, essay text, active labels → text-text
Secondary body: descriptions, explanations in notes → text-text-2
Meta: timestamps, counts, placeholders, eyebrow labels → text-text-3
```

Dim text with these three tokens only, never `opacity-*`: opacity changes contrast differently on every background. `text-text-3` is the floor for anything people must read (WCAG AA on every surface).

## Borders

- `border` (no color) or `border-border`: hairlines. Dividers, card edges, list rows. Alpha in light mode, solid in dark.
- `border-border-strong`: the edge of something interactive (input, outline button). Built into those components; use it yourself only for a native control.

Elevated surfaces (popovers, menus, dialogs) get their edge from their shadow; never add a border or ring to them ([surfaces.md](surfaces.md)).

## Meaning: status, categories, brand

| Token | Use | Never |
| --- | --- | --- |
| `ok` | Accepted fix, success, progress done | Decoration |
| `warn` | Wrong fix, invalid input, destructive buttons | Success, info |
| `c-prep`, `c-accord`, `c-conj`, `c-ortho` | Mistake categories: Prepositions, Agreement, Conjugation, Spelling | Anything that isn't a category |
| `brand` | The logo mark; the one `brand` button per page | Links, focus, selection, hover, the writing and correction screens |

Category and status colors pass as 12px text on `bg-surface`. As backgrounds, use them only as tints: `bg-c-prep/14` for a highlight, `/24` on hover, nothing stronger, so all four categories stay equally loud. Pair every category color with its name or number; color alone doesn't identify it.

There is no blue "info" color and no red separate from `warn`. If you need one, ask; don't borrow `brand` or a category color.

## Internal tokens

`primary`, `primary-hover`, `primary-fg`, `focus-ring`, `scrim`, `tooltip`, `tooltip-fg`, `brand-hover`, `brand-fg` exist for the components that use them. Don't use them in screens; use the component.
