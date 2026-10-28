"use client"

import { Toaster as Sonner, type ToasterProps } from "sonner"
import { useTheme } from "@/lib/theme"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

// Follows Ink's theme (lib/theme.ts), which can differ from the OS's.
const Toaster = ({ ...props }: ToasterProps) => {
  const theme = useTheme()
  return (
    <Sonner
      theme={theme ?? "system"}
      className="toaster group"
      icons={{
        success: (
          <CircleCheckIcon className="size-4" />
        ),
        info: (
          <InfoIcon className="size-4" />
        ),
        warning: (
          <TriangleAlertIcon className="size-4" />
        ),
        error: (
          <OctagonXIcon className="size-4" />
        ),
        loading: (
          <Loader2Icon className="size-4 animate-spin" />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--raised)",
          "--normal-text": "var(--text)",
          "--normal-border": "transparent",
          "--border-radius": "var(--radius-card)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast shadow-overlay!",
          // An action is text, like the card actions: no filled button in a toast.
          actionButton:
            "bg-transparent! px-1! text-label! font-medium! text-text-2! transition-colors duration-150 ease-out hover:text-text! focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
