# Surfaces: elevation, radius, focus

Source: `app/globals.css`. Hierarchy comes from surface steps and hairlines, not shadows: shadows are only for things that float above the page.

## Elevation

Tailwind's shadows are deleted (`shadow-sm`, `shadow-md`, `shadow-lg` produce **no CSS and no error**). Three exist. Each includes its own 1px edge, so an elevated surface never also gets `border` or `ring-*`.

| Class | Used by | Use it yourself for |
| --- | --- | --- |
| `shadow-raised` | The active tab chip | A raised chip inside a sunken track, nothing else |
| `shadow-overlay` | Popovers, menus, tooltips, toasts | A native floating panel anchored to a trigger |
| `shadow-modal` | Dialogs, alert dialogs, drawers | Nothing; use those components |

Cards and notes on the page are flat: `bg-surface border rounded-card`, no shadow. A card with a shadow claims to float, and nothing on the page floats.

```tsx
// Correct
<div className="rounded-card border bg-surface p-4">…</div>

// Incorrect — a deleted shadow, a deleted radius, and border plus shadow together
<div className="rounded-lg border bg-white p-4 shadow-md">…</div>
```

## Radius

Tailwind's radii are deleted (`rounded-sm`…`rounded-3xl` produce **no CSS and no error**). The scale, after Linear's app:

| Class | Size | Use |
| --- | --- | --- |
| `rounded-full` | pill / circle | Buttons, chips, toggles, tab track and tabs, badges, avatars, dots |
| `rounded-card` | 12px | Cards, notes, panels, popovers, menus, dialogs, drawers, textareas, toasts |
| `rounded-field` | 10px | Single-line inputs |
| `rounded-row` | 6px | Rows inside a container (menu and command items, selectable list rows), tooltips, skeletons, highlight marks in text |
| `rounded-tight` | 4px | Keyboard keys |

Nested corners: inner radius = outer radius − padding. A `rounded-card` (12px) container holding `rounded-row` (6px) items uses 6px padding (`p-1.5`). With more padding, the inner item gets a smaller step, never the same radius as its parent, or the corners gap visibly.

## Focus

Built into every component. For a native focusable element:

- Controls (anything clicked): `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-focus-ring`. One outline, never a `ring-*` halo.
- Fields (anything typed into): `focus-visible:border-focus-ring focus-visible:ring-2 focus-visible:ring-focus-ring/12`.

Never `outline-none` without one of these: keyboard users lose their place. Never color a focus state with `brand`.
