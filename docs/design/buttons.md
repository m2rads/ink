# Buttons

Source: `components/ui/button.tsx`.

## Button

Use for actions: something happens on this page when it's pressed. Navigation is a Next `<Link>`, styled with `buttonVariants()`, never a `<Button>` with `router.push`, because a link can be opened in a new tab and a button can't. Turning a filter or view on and off is a ToggleGroup or Tabs ([toggles-and-tabs.md](toggles-and-tabs.md)), not buttons.

Variants: `default`, `outline`, `secondary`, `ghost`, `link`, `destructive`, `brand`. Nothing else exists; an unlisted variant is a bug, not an option.

`<Button>` with no `variant` is the **primary** (`default`: dark gray fill in light mode, light fill in dark). Omit `variant` only for the one primary in a view; write it on every other button.

- `default` (primary): the single next step in a view. "Check fix", "Submit essay". One per view, because two primaries means no hierarchy.
- `outline`: the default for everything else. Secondary actions beside a primary ("Skip", "Keep writing") and **every trigger** for a menu, popover, dialog, drawer or tooltip.
- `secondary`: supporting actions inside a note or card, where an outline would add another line to a surface that already has edges. "Show hint", "Show answer".
- `ghost`: low-emphasis actions that should almost disappear until hovered: "Cancel" in a toolbar, icon-only toolbar buttons.
- `link`: an action inside a sentence or a row of meta text. "See all notes". Underlined gray, never blue.
- `destructive`: deletes data or abandons work. "Delete essay", "Leave" in the mock-run alert. Pair it with an AlertDialog ([overlays.md](overlays.md)).
- `brand`: the one blue emphasis a page may have, such as the empty-state or onboarding CTA "Start mock run". It replaces the primary; a view never has both. Never in the writing or correction screens.

```
Does it navigate to another page?
 └── Yes → <Link className={buttonVariants({ variant: … })}>
Is it the one next step in this view?
 ├── Is this an empty state or onboarding, outside writing/correction? → variant="brand"
 └── Otherwise → no variant (primary)
Does it delete or abandon something? → variant="destructive"
Does it open a menu, popover, dialog, drawer or tooltip? → variant="outline"
Is it inside a note or card? → variant="secondary"
Is it inside a sentence? → variant="link"
Is it Cancel/dismiss, or icon-only in a toolbar? → variant="ghost"
Default → variant="outline"
```

```tsx
// Correct — app/design/components/demos.tsx
<DialogFooter>
  <DialogClose render={<Button variant="outline" />}>Keep writing</DialogClose>
  <DialogClose render={<Button />}>Submit</DialogClose>
</DialogFooter>

// Incorrect — two primaries (neither has a variant), and "primary"/"subtle" don't exist
<Button>Keep writing</Button>
<Button variant="primary">Submit</Button>
<Button variant="subtle">Skip</Button>
```

## Sizes

Sizes: `default`, `xs`, `sm`, `lg`, `icon`, `icon-xs`, `icon-sm`, `icon-lg`. Nothing else exists.

| Size | Height | Use |
| --- | --- | --- |
| `default` | 36px | Everywhere unless a row below applies. Matches Input height. |
| `sm` | 32px | Inside notes and cards, and in dense toolbars. |
| `xs` | 28px | Inline next to 13–14px text, such as an action in a note header. |
| `lg` | 40px | The single CTA of an empty state or onboarding step. |
| `icon`, `icon-sm`, `icon-xs`, `icon-lg` | 36/32/28/40px circles | Icon-only buttons, matching the text size beside them. |

Icon-only buttons always have `aria-label` and are wrapped in a Tooltip with the same words, because an icon alone is ambiguous.

```tsx
// Correct
<Tooltip>
  <TooltipTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Close notes" />}>
    <XIcon />
  </TooltipTrigger>
  <TooltipContent>Close notes</TooltipContent>
</Tooltip>

// Incorrect — no label, and size via className instead of a size
<Button variant="ghost" className="h-6 w-6 p-0"><XIcon /></Button>
```

## Look and states are built in

Buttons are pills (`rounded-full`); icon sizes are circles. Hover, press (scales to 96%), focus outline and disabled (`disabled:bg-sunken`, `text-text-3`) are all in `buttonVariants`. Every size has a 40px hit area, 44px on touch screens: a transparent `::before` bleeds past the pill (beyond the border: 2px for `default`, 4px for `sm`, 6px for `xs`; on touch 4, 6 and 8px). Keep at least that bleed doubled between neighbors (`gap-2` for `sm`, `gap-3` for `xs`, and `pointer-coarse:gap-3` for `sm` on touch) so hit areas never overlap, and don't put your own `before:` on a Button. Controls get `touch-action: manipulation` globally (no double-tap zoom); a custom gesture surface sets `touch-none`. Every enabled `<button>` and `role="button"` gets `cursor: pointer` globally (`globals.css`); disabled ones keep the arrow. Don't add `cursor-pointer` yourself; a gesture control may override it (`cursor-grab`). Never add `rounded-*`, `shadow-*`, `bg-*`, `text-*`, `h-*`, `px-*`, `opacity-*` or a custom `active:` style to a Button. Use `disabled`, never `opacity-50`. Icons come from `lucide-react` only; size them with the button's `size`, not `size-*` on the icon.

## Triggers

Overlay triggers render the Button through `render`; don't nest a `<Button>` inside a trigger (that makes a button inside a button).

```tsx
// Correct
<PopoverTrigger render={<Button variant="outline" />}>Rule details</PopoverTrigger>

// Incorrect — nested buttons
<PopoverTrigger><Button variant="outline">Rule details</Button></PopoverTrigger>
```
