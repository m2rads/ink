# Feedback

Sources: `components/ui/sonner.tsx`, `progress.tsx`, `skeleton.tsx`, `separator.tsx`.

```
Is the message about one field? → inline text under the field (forms.md), never a toast
Is it the result of something that finished in the background (saved, correction ready, failed)? → toast
Does the user need to decide something? → AlertDialog or Dialog (overlays.md), never a toast
Is an AI call running? → a trace of the steps it is really on (Review's `ReviewTrace`), never steps faked on a timer
Is something loading for more than 400ms? → Skeleton shaped like the result
Is it progress through a known number of steps (mistakes resolved)? → Progress
```

## Toast (Sonner)

Call `toast` from `"sonner"`. `<Toaster />` is mounted once, in `app/layout.tsx`; don't mount another.

- `toast.success("Fix accepted")`: something worked. `toast.error("Correction failed", { description: "Check your connection and retry." })`: something failed, and the description says what to do.
- Titles are 2–5 words, past tense or a plain state, no trailing period: "Essay saved", not "Your essay has been successfully saved!".
- Never `toast()` for validation errors or for anything the user must act on.
- Don't restyle toasts per call (`className`, `style`, custom icons); the Toaster sets the look.

## Progress

`<Progress value={31}><ProgressLabel>Resolved</ProgressLabel><ProgressValue /></Progress>`, `value` 0–100. For counts of known size ("4 of 13 resolved"). Don't use it for unknown waits (that's a Skeleton) or recolor the indicator.

## Skeleton

Placeholder blocks for content loading longer than 400ms, matching the final layout's line count and widths (`h-4 w-3/4`…) so nothing jumps when content arrives. Mark the group `aria-hidden`. Never use a spinner for content areas: it collapses the layout.

## Separator

`<Separator />` (horizontal) between groups; `orientation="vertical"` between inline meta ("214 words | 31:08"), inside a container with a set height (it stretches to it). Given its own height in a taller row instead, add `data-vertical:self-center`, or it sticks to the top. For lines between list rows, use `border-b` on the rows instead.

A toast's action (Retry, Review again) is text, not a filled button: `components/ui/sonner.tsx` styles every action as `text-label` `text-text-2`, `hover:text-text`, on no background. Don't restyle it per toast.
