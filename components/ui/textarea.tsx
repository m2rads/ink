import * as React from "react"
import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-20 w-full rounded-card border border-border-strong bg-surface px-3 py-2 text-body transition-[color,background-color,border-color,box-shadow] hover:border-text-3/45 outline-none placeholder:text-text-3 focus-visible:border-focus-ring focus-visible:ring-2 focus-visible:ring-focus-ring/12 disabled:cursor-not-allowed disabled:bg-sunken disabled:text-text-3 aria-invalid:border-warn aria-invalid:ring-2 aria-invalid:ring-warn/12",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
