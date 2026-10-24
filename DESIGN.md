# Ink design system

Gray-first and quiet, after Linear: a near-black floor in dark mode, surfaces that lift in small steps, hairline edges, pill-shaped actions. Color carries meaning only (mistake categories, ok/warn), and brand blue appears at most once per page. The essay is the loudest thing on screen; chrome recedes.

Read the topic file for whatever you are building before writing UI. Each one is short.

| Building… | Read |
| --- | --- |
| Any button, link-styled action or icon button | [buttons.md](docs/design/buttons.md) |
| Filters, segmented views, on/off controls | [toggles-and-tabs.md](docs/design/toggles-and-tabs.md) |
| Inputs, textareas, keyboard hints | [forms.md](docs/design/forms.md) |
| Tooltips, popovers, menus, dialogs, drawers, command | [overlays.md](docs/design/overlays.md) |
| Toasts, progress, loading, dividers | [feedback.md](docs/design/feedback.md) |
| Any color: backgrounds, text, borders, status, categories | [color.md](docs/design/color.md) |
| Font sizes and weights | [type.md](docs/design/type.md) |
| Shadows, radius, borders, focus rings | [surfaces.md](docs/design/surfaces.md) |
| Transitions and animation | [motion.md](docs/design/motion.md) |

Live reference: `/design/components` and `/design/type` in the dev server.

## Rules that apply everywhere

1. **Use a component from `components/ui/` before writing markup.** Its file is the source of truth: the `cva` variant and size unions list everything that exists. An unlisted variant or size is a bug, not an option. TypeScript rejects invented values; do not cast around it.
2. **Never style a component's look through `className`.** `className` is for layout only: margin, width, `flex`/`grid` placement, `self-*`, `order`. Never color, background, border, radius, font size, height or padding. A look that no variant gives you is a design decision; ask, don't improvise.
3. **Tokens only, semantic only.** Colors come from [color.md](docs/design/color.md), sizes from [type.md](docs/design/type.md), shadows and radii from [surfaces.md](docs/design/surfaces.md). Tailwind's own palette, font sizes, shadows and radii are deleted in `app/globals.css`, so `bg-zinc-100`, `text-sm`, `shadow-md` or `rounded-lg` compile to **nothing, silently**. No hex, `rgb()`, `oklch()` or arbitrary values (`bg-[#…]`, `text-[13px]`) in components.
4. **One primary action per view.** Two dark filled buttons means the screen has no next step. See the flowchart in [buttons.md](docs/design/buttons.md).
5. **Brand blue at most once per page**, never in the writing or correction screens: blue there competes with the essay and the category colors.
6. **Every control is labelled.** Icon-only buttons get `aria-label` and a Tooltip; inputs get a `<label>` or `aria-label`. A placeholder is never the label.

## Which component?

```
Does the user trigger an action?
 ├── Yes, and it navigates to another page → Next <Link> styled with buttonVariants() — buttons.md
 ├── Yes → <Button> — buttons.md
 └── No
      ├── Filtering, several values on at once (mistake categories) → ToggleGroup multiple — toggles-and-tabs.md
      ├── Exactly one view or filter at a time (Section A/B, All / Mock / Practice) → Tabs — toggles-and-tabs.md
      ├── Typing text → Input (one line) or Textarea (several) — forms.md
      ├── Extra info about something on screen → Tooltip (hover hint) or Popover (click) — overlays.md
      └── Reporting what happened → toast (Sonner) — feedback.md
```

## What doesn't exist yet

These are Ink's product components. They are not built; build them natively (never from shadcn) when a screen needs them: essay editor, prompt card, timer, word count, lookup panel, app bar, the `<Correction>` compound (Filters, Paragraph, Mark, FixInput, Notes, Note, Feedback), category tag, correction summary, essay history row, category trend bars, empty states. Build it as a named component (`function EssayHistoryRow…`) inside the screen file that first needs it, from `components/ui/` parts and tokens; move it to `components/` once a second or third screen copies it.
