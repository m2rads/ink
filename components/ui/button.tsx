import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-full border border-transparent bg-clip-padding text-ui font-medium whitespace-nowrap transition-[color,background-color,border-color,box-shadow,scale] duration-150 ease-out outline-none select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-focus-ring active:not-aria-[haspopup]:scale-[0.96] disabled:pointer-events-none disabled:text-text-3 aria-invalid:border-warn [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-fg hover:bg-primary-hover disabled:bg-sunken",
        outline:
          "border-border-strong bg-transparent hover:bg-sunken hover:text-text aria-expanded:bg-sunken aria-expanded:text-text",
        secondary:
          "bg-sunken text-text disabled:bg-sunken hover:bg-[color-mix(in_oklch,var(--sunken),var(--text)_5%)] aria-expanded:bg-sunken aria-expanded:text-text",
        ghost:
          "hover:bg-sunken hover:text-text aria-expanded:bg-sunken aria-expanded:text-text",
        destructive:
          "bg-warn/10 text-warn hover:bg-warn/20 disabled:bg-sunken focus-visible:outline-warn",
        link: "text-text underline decoration-border-strong underline-offset-4 hover:decoration-current",
        // Rare: at most one per page. See --brand in globals.css.
        brand: "bg-brand text-brand-fg hover:bg-brand-hover disabled:bg-sunken",
      },
      size: {
        default:
          "h-9 gap-1.5 px-3.5 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        xs: "h-7 gap-1 px-2.5 text-label in-data-[slot=button-group]:rounded-row has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1 px-3 text-ui in-data-[slot=button-group]:rounded-row has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-10 gap-2 px-4 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        icon: "size-9",
        "icon-xs":
          "size-7 in-data-[slot=button-group]:rounded-row [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-8 in-data-[slot=button-group]:rounded-row",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
