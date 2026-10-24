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

## Product components

Built, in `app/home/` and `components/`:
- **`AppSidebar`** (`components/app-sidebar.tsx`, on shadcn's `Sidebar`, `collapsible="offcanvas"`): the logo, New essay (`outline`, because the page owns the primary action), then every essay as one flat list, most recently edited first. Don't add sections, groups, a user footer or nav items without a decision; it was cut down on purpose. On phones it's a sheet behind `SidebarTrigger`.
- **`ContributionGraph`** (`app/home/contribution-graph.tsx`): the year of essays, 53 weeks ending today, cells sized to the column (`rounded-cell`, five `bg-text/*` levels), hover detail in the caption. Data is one `{ date, words }` per essay, in the user's local days.
- **Essays** (`lib/essays.ts`): `useEssays()`, `useStartEssay()` (creates a blank essay and opens `/write?essay=<id>`), `updateEssay()`. Starting an essay never asks anything first: no form, dialog or popover.

Built, in `app/write/`:
- **`EssayScreen`** (`essay-screen.tsx`): a user's essay at `/write?essay=<id>`: an "Untitled" title field (their prompt or any name; Enter goes to the body) and the `EssayEditor`. No exam framing. The sample exam runs (`/write?section=…&run=…`) still use `WritingScreen` with the timer.
- **`EssayEditor`** (`essay-editor.tsx`): any surface where the user writes essay text. Never a `Textarea` and never a third-party editor for essay text. `value`/`defaultValue`/`onValueChange` take `Block[]` from `blocks.ts`; `placeholder` in French. Writing aids (spellcheck, autocorrect, Grammarly, LanguageTool) are off on purpose: the exam has none. Its caret is its focus indicator; don't add an outline around paragraphs. Paragraphs reorder three ways: drag the grip handle in the left margin, click it for Move up / Move down (the non-drag alternative WCAG 2.5.7 requires), or ⌘⇧↑/↓ (Ctrl+Shift on Windows); each move is one undo step and is announced to screen readers. Handles show on hover, on fine pointers at `sm` and up, and need 40px of left margin: put the editor in a container with `sm:px-10` (as `writing-screen.tsx` does). `readOnly` hides them.
- **`WordCount`** (`writing-screen.tsx`): `142 / 200 words` below the minimum, `✓ 214 words` at or above it. Count words with `countWords()` only, so every screen agrees.
- **`ExamClock`** (`writing-screen.tsx`, logic in `timer.ts`): the run's countdown, 25 min for Section A and 35 for B (`EXAM_MINUTES`). Always computed from stored timestamps, never counted. Practice: starts on the first keystroke, can pause (the essay locks while paused), runs into overtime (`+1:05`). Mock: starts from an explicit "Start mock run", never pauses, keeps running if the page is closed, stops at `0:00` and locks the essay. The clock turns `text-warn` at 5:00 left; screen readers hear 5 min, 1 min and time's up, never every second.

Not built yet; build them natively (never from shadcn) when a screen needs them: lookup panel, the `<Correction>` compound (Filters, Paragraph, Mark, FixInput, Notes, Note, Feedback), category tag, correction summary, essay history row, category trend bars, empty states. Build it as a named component (`function EssayHistoryRow…`) inside the screen file that first needs it, from `components/ui/` parts and tokens; move it to `components/` once a second or third screen copies it.
