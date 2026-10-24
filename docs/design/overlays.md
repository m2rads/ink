# Overlays

Sources: `components/ui/tooltip.tsx`, `popover.tsx`, `dropdown-menu.tsx`, `dialog.tsx`, `alert-dialog.tsx`, `drawer.tsx`, `command.tsx`. All built on Base UI; their motion, elevation and radius are built in ([motion.md](motion.md), [surfaces.md](surfaces.md)).

```
Is it a short hint about a control, readable without clicking?
 └── Yes → Tooltip (no links or buttons inside)
Is it a list of actions on one thing? → DropdownMenu
Is it extra content tied to something on screen (rule details)? → Popover
Is it search or lookup over many items? → Command
Does it confirm something destructive or irreversible? → AlertDialog
Does it need the user's full attention or a form (submit essay)? → Dialog
Is it the same content on a phone, too big for a popover (Margin's notes)? → Drawer
```

Triggers are `variant="outline"` Buttons rendered through `render` (see [buttons.md](buttons.md#triggers)), except icon-only triggers, which are `ghost`.

## Tooltip

Hover/focus hints, max one short sentence. Opens after 400ms; after that, neighbors open instantly. Wrap the app (or the screen) in one `TooltipProvider`; it's mounted in `DemoProviders` today, not yet in `app/layout.tsx`. Never put links or buttons inside: a tooltip can't be reached with the pointer or keyboard. Interactive content is a Popover.

## Popover

Click-opened content anchored to its trigger, such as rule details on small screens. Use `PopoverHeader`, `PopoverTitle`, `PopoverDescription` for text. 288px wide (`w-72`); change the width with `className="w-80"` if the content needs it, never its padding or background.

## DropdownMenu

Actions on one item (an essay row). Order: common actions first, a `DropdownMenuSeparator`, then the destructive one with `variant="destructive"`; `DropdownMenuItem` has only `default` and `destructive`. Keyboard shortcuts go in `DropdownMenuShortcut`. A menu item that deletes opens an AlertDialog; it never deletes immediately.

## Dialog

Tasks that need full attention: submitting an essay, a short form. `DialogHeader` (`DialogTitle`, `DialogDescription`) then `DialogFooter`. Footer: the safe choice as `outline` first, the primary last, at most one primary.

```tsx
// Correct — app/design/components/demos.tsx
<DialogFooter>
  <DialogClose render={<Button variant="outline" />}>Keep writing</DialogClose>
  <DialogClose render={<Button />}>Submit</DialogClose>
</DialogFooter>

// Incorrect — "OK"/"Cancel" say nothing, and two primaries
<DialogFooter>
  <Button>Cancel</Button>
  <Button>OK</Button>
</DialogFooter>
```

## AlertDialog

Confirms destructive or irreversible actions only: leaving a mock run, deleting an essay. The title is a question naming the action ("Leave the mock run?"); the description says what is lost. `AlertDialogCancel` (outline, the safe choice) then `AlertDialogAction variant="destructive"` whose label repeats the verb ("Leave", "Delete"), never "OK" or "Confirm". Use `size="sm"` only for a one-line description.

## Drawer

A bottom sheet for phones, where Margin's notes column doesn't fit. Same header pattern as Dialog (`DrawerHeader`, `DrawerTitle`, `DrawerDescription`). Default `swipeDirection` is `down`; keep it. Desktop layouts never use a Drawer for content that fits beside the essay.

## Command

Search-as-you-type lists (dictionary lookup). Inline `Command` inside the lookup panel; `CommandDialog` only for a global ⌘K. Group results with `CommandGroup heading="…"`, put the word class or shortcut in `CommandShortcut`, and always include `CommandEmpty` with a sentence ("No entries found.").
