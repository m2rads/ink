"use client"

import { Toggle as TogglePrimitive } from "@base-ui/react/toggle"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

// Pressing scales it to 96% and back (150ms ease-out, as buttons do), so a
// click on a chip is felt before its filled pressed state settles in; joined
// (spacing 0) groups skip the scale, where it would pull an item off its
// neighbors.
// On touch screens a transparent ::before grows every size to a 44px hit
// area, vertically only inside a joined (spacing 0) group, where neighbors
// touch. Values include the outline variant's 1px border, which the bleed is
// measured from inside of; borderless toggles come out 2px larger.
const toggleVariants = cva(
  "group/toggle relative before:absolute before:rounded-full group-data-[spacing=0]/toggle-group:before:inset-x-0 inline-flex items-center justify-center gap-1 rounded-full text-ui font-medium whitespace-nowrap transition-[color,background-color,border-color,box-shadow,scale] duration-150 ease-out active:scale-[0.96] group-data-[spacing=0]/toggle-group:active:scale-100 outline-none hover:bg-sunken hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-focus-ring disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-warn aria-pressed:bg-sunken aria-pressed:text-text data-[state=on]:bg-sunken [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-transparent",
        outline: "border border-border-strong bg-transparent text-text-2 hover:bg-sunken aria-pressed:border-text-3/50",
      },
      size: {
        default:
          "h-8 min-w-8 px-2.5 pointer-coarse:before:-inset-[7px] has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        sm: "h-7 min-w-7 px-2.5 pointer-coarse:before:-inset-[9px] text-label has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-9 min-w-9 px-2.5 pointer-coarse:before:-inset-[5px] has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Toggle({
  className,
  variant = "default",
  size = "default",
  ...props
}: TogglePrimitive.Props & VariantProps<typeof toggleVariants>) {
  return (
    <TogglePrimitive
      data-slot="toggle"
      className={cn(toggleVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Toggle, toggleVariants }
