# Forms

Sources: `components/ui/input.tsx`, `textarea.tsx`, `input-group.tsx`, `kbd.tsx`.

```
One line of text (email, a single word or phrase)? → Input
Several lines (an answer, the fallback essay surface)? → Textarea
Text with an icon, button or keyboard hint inside the field? → InputGroup
Search that lists results as you type? → Command (overlays.md)
```

## Input

Single-line text. 36px tall, 16px text (`text-body`) so iOS doesn't zoom on focus, `rounded-field` (10px), `bg-surface`, `border-border-strong`. Hover, focus (border darkens to `--focus-ring` plus a 2px wash) and invalid states are built in. No variants or sizes exist; don't change its height, radius, background or font size through `className`.

Every Input has a visible `<label>` (wired with `htmlFor`/`id`) or, when the context makes the label redundant, an `aria-label`. A placeholder shows an example value, never the label: it disappears as soon as typing starts.

Errors need three signals, because color alone is invisible to some users: `aria-invalid` on the input (the border turns `--warn`), an icon, and a sentence under it in `text-warn` that says how to fix it.

```tsx
// Correct
<label htmlFor="email" className="text-label text-text-2">Email</label>
<Input id="email" type="email" placeholder="you@example.com" aria-invalid={!!error} aria-describedby="email-error" />
{error && <p id="email-error" className="flex items-center gap-1.5 text-label text-warn"><CircleAlertIcon className="size-3.5" />Your email needs an @.</p>}

// Incorrect — placeholder as the label, color-only error, look overridden
<Input placeholder="Email" className="h-11 rounded-full border-red-500 text-sm" />
```

## Textarea

Several lines of text. `rounded-card` (12px), grows with its content (`field-sizing-content`, 80px minimum), same states and label rules as Input. Essay text inside it is set with `font-serif text-essay` on the Textarea; everything else stays `text-body`.

## InputGroup

An Input or Textarea with addons inside the border: `InputGroupAddon` (`align`: `inline-start`, `inline-end`, `block-start`, `block-end`), `InputGroupButton` (`size`: `xs`, `sm`, `icon-xs`, `icon-sm`; `variant` defaults to `ghost`), `InputGroupText`. Use it instead of positioning an icon over an Input with `absolute`.

## Kbd

Keyboard hints: `<Kbd>Enter</Kbd>`, and `<KbdGroup>` for chords (`⌘` `K`). Use the symbols `⌘ ⌥ ⇧ ⌃` and key names in title case ("Enter", "Esc"). Inside a TooltipContent it restyles itself; don't override it.
