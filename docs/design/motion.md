# Motion

Source: `app/globals.css` (curves, reduced motion), the components' classes (timings). Motion is built into every component; this file is for native components.

```
Is it triggered by the keyboard (arrow keys, shortcuts) or used dozens of times a session?
 └── Yes → no animation (menu highlight, command list)
Is something appearing or disappearing (panel, popover, toast)?
 └── Yes → fade + scale from its trigger: ease-out in, faster ease-in out
Is something already on screen moving to a new place (tab indicator)?
 └── Yes → translate on ease-in-out
Is it a color, background or border change on hover/press/focus?
 └── Yes → transition-colors (150ms default)
```

| What | In | Out | Curve |
| --- | --- | --- | --- |
| Popovers, menus | 150ms | 100ms | `ease-out` in, `ease-in` out |
| Tooltips | 125ms after a 400ms delay; instant between neighbors | 125ms | `ease-out` |
| Dialogs and their scrim | 200ms (same for both) | 150ms | `ease-out` in, `ease-in` out |
| Drawers and their scrim | 300ms | 250ms | `ease-drawer` |
| Tab indicator | 200ms | — | `ease-in-out` |
| Paragraph drag: lifted card fades in | 150ms | 150ms | default |
| Paragraph drag: neighbors slide aside | 200ms | — | `ease-in-out` |
| Paragraph drop: settles into its slot | 150ms | — | `ease-out` |
| Paragraph moved by keyboard or menu | 200ms (both swap, FLIP) | — | `ease-in-out` |
| Button press | 150ms to `scale-[0.96]` | 150ms | `ease-out` |

Rules:
- Animate `opacity`, `scale` and `translate` only. Never `transition-all` or animated `width`, `height`, `margin`, `padding` or `top/left`. Name the properties: `transition-[opacity,scale]`.
- Enter from `scale-95` (popovers) or `scale-[0.97]` (dialogs, tooltips), never from 0. Scale from the trigger with `origin-(--transform-origin)`.
- Exits are 25–35% shorter than enters. Nothing in the product takes longer than 300ms.
- Base UI elements animate with `data-starting-style:` / `data-ending-style:` and CSS transitions, not keyframes: transitions reverse cleanly when interrupted.
- Nothing animates on page load. Motion follows something the user did.
- `ease-out`, `ease-in-out` and `ease-drawer` are Ink's curves (`ease-out` is overridden to a strong quint). Don't write `cubic-bezier(…)` in components.
- `prefers-reduced-motion` is handled globally in `globals.css` (all transitions and animations end instantly). Don't add per-component reduced-motion rules for CSS; a JS-driven animation must check it itself.
- No animation library. CSS transitions cover everything so far; ask before adding one.
