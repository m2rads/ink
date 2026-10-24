# Toggles and tabs

Sources: `components/ui/toggle.tsx`, `toggle-group.tsx`, `tabs.tsx`.

```
Does the choice change which items are shown, and can several be on at once?
 └── Yes → ToggleGroup multiple (filter chips)
Does it switch between views of the same thing, exactly one at a time?
 ├── Yes, a compact switch of 2–4 views → Tabs, variant="default" (pill track)
 └── Yes, page-level sections or history filters → Tabs, variant="line" (underline)
Is it a single on/off for one setting? → Toggle
Does pressing it *do* something rather than select? → Button (buttons.md)
```

Never build any of these from Buttons with an "active" class: you lose `aria-pressed` / `role="tab"` and keyboard arrows.

## ToggleGroup

Use for filters where several values can be on, such as Margin's category chips. Use Tabs instead when exactly one view shows at a time.

Props that change the look: `variant` (`default`, `outline`), `size` (`default`, `sm`, `lg`), `spacing`, `orientation`. Nothing else exists.

- `variant="outline"`: the default for filter chips. Unpressed chips are outlined with `text-text-2`; pressed ones fill with `bg-sunken`, so state reads without color.
- `variant="default"`: toolbars of formatting-style toggles, where outlines would be noise.
- Sizes: `default` 32px, `sm` 28px, `lg` 36px. Chips beside 36px buttons use `lg`; inside notes use `sm`.
- `spacing={2}` (default) separates chips; `spacing={0}` joins them into one segmented pill.

Always pass `multiple` for filters and an `aria-label` describing what is filtered. A category chip carries a dot in its category color (`bg-c-prep`…), never a colored chip background, so the four categories stay equally loud.

```tsx
// Correct — app/design/components/demos.tsx
<ToggleGroup multiple variant="outline" defaultValue={["prep", "accord"]} aria-label="Filter mistakes by category">
  <ToggleGroupItem value="prep">
    <span className="size-2 rounded-full bg-c-prep" aria-hidden />
    Prepositions
  </ToggleGroupItem>
</ToggleGroup>

// Incorrect — buttons faking toggles, and a colored chip fill
<Button variant={on ? "default" : "outline"} className="bg-c-prep/10">Prepositions</Button>
```

## Tabs

Use to switch between views of the same content, one at a time. Use ToggleGroup when several can be on.

`TabsList` variants: `default`, `line`. Nothing else exists.

- `default`: a pill track with a raised chip that slides to the active tab. For 2–4 short options, such as "Section A / Section B".
- `line`: an underline that slides under the active tab. For page-level navigation between lists, such as "All essays / Mock runs / Practice".

The active highlight is one `TabsIndicator`, rendered automatically inside `TabsList`. Never style the active tab yourself (`data-active:bg-*`, `data-active:shadow-*`, borders), because the indicator would draw a second highlight. Labels are sentence case and 1–2 words.

```tsx
// Correct — app/design/components/demos.tsx
<Tabs defaultValue="b">
  <TabsList>
    <TabsTrigger value="a">Section A</TabsTrigger>
    <TabsTrigger value="b">Section B</TabsTrigger>
  </TabsList>
  <TabsContent value="a">…</TabsContent>
  <TabsContent value="b">…</TabsContent>
</Tabs>

// Incorrect — an invented variant and a hand-drawn active state
<TabsList variant="pills">
  <TabsTrigger value="a" className="data-active:bg-brand data-active:text-brand-fg">Section A</TabsTrigger>
</TabsList>
```

## Toggle

A single on/off button, such as "Show solved mistakes". Same `variant` and `size` sets as ToggleGroup. Give it an `aria-label` if it is icon-only. For a setting that persists (a preference), wait for a Switch component; don't fake one with Toggle.
