import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"
import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-9 w-full min-w-0 rounded-lg border border-border-strong bg-surface px-3 py-1 text-body transition-[color,background-color,border-color,box-shadow] hover:border-text-3/45 outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-ui file:font-medium file:text-text placeholder:text-text-3 focus-visible:border-focus-ring focus-visible:ring-2 focus-visible:ring-focus-ring/12 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-sunken disabled:text-text-3 aria-invalid:border-warn aria-invalid:ring-2 aria-invalid:ring-warn/12",
        className
      )}
      {...props}
    />
  )
}

export { Input }
