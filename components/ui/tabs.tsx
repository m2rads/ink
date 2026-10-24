"use client"

import { Tabs as TabsPrimitive } from "@base-ui/react/tabs"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

function Tabs({
  className,
  orientation = "horizontal",
  ...props
}: TabsPrimitive.Root.Props) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      className={cn(
        "group/tabs grid gap-2 data-vertical:grid-cols-[auto_minmax(0,1fr)]",
        className
      )}
      {...props}
    />
  )
}

const tabsListVariants = cva(
  "group/tabs-list relative isolate inline-flex w-fit items-center justify-center rounded-lg p-[3px] text-text-3 group-data-horizontal/tabs:h-9 group-data-vertical/tabs:h-fit group-data-vertical/tabs:flex-col data-[variant=line]:rounded-none",
  {
    variants: {
      variant: {
        default: "bg-sunken",
        line: "gap-1 bg-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function TabsList({
  className,
  variant = "default",
  children,
  ...props
}: TabsPrimitive.List.Props & VariantProps<typeof tabsListVariants>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    >
      {children}
      <TabsIndicator />
    </TabsPrimitive.List>
  )
}

// One highlight for the whole list that slides to the active tab, instead of
// each tab switching its own background on and off. Base UI measures the
// active tab into --active-tab-* variables; the list is its positioning
// context, and -z-10 inside the isolated list puts it behind the labels.
function TabsIndicator({ className, ...props }: TabsPrimitive.Indicator.Props) {
  return (
    <TabsPrimitive.Indicator
      data-slot="tabs-indicator"
      className={cn(
        "absolute top-0 left-0 -z-10 translate-x-(--active-tab-left) translate-y-(--active-tab-top) transition-[translate,width,height] duration-200 ease-in-out",
        // Default: the raised chip behind the active tab.
        "group-data-[variant=default]/tabs-list:h-(--active-tab-height) group-data-[variant=default]/tabs-list:w-(--active-tab-width) group-data-[variant=default]/tabs-list:rounded-[5px] group-data-[variant=default]/tabs-list:bg-raised group-data-[variant=default]/tabs-list:shadow-raised",
        // Line: a 2px rule 3px below a horizontal tab, or beside a vertical one.
        "group-data-[variant=line]/tabs-list:bg-text",
        "group-data-horizontal/tabs:group-data-[variant=line]/tabs-list:mt-[calc(var(--active-tab-height)+3px)] group-data-horizontal/tabs:group-data-[variant=line]/tabs-list:h-0.5 group-data-horizontal/tabs:group-data-[variant=line]/tabs-list:w-(--active-tab-width)",
        "group-data-vertical/tabs:group-data-[variant=line]/tabs-list:ml-[calc(var(--active-tab-width)+2px)] group-data-vertical/tabs:group-data-[variant=line]/tabs-list:h-(--active-tab-height) group-data-vertical/tabs:group-data-[variant=line]/tabs-list:w-0.5",
        className
      )}
      {...props}
    />
  )
}

function TabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      className={cn(
        "relative inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-[5px] border border-transparent px-2.5 py-0.5 text-ui font-medium whitespace-nowrap text-text-3 transition-colors group-data-vertical/tabs:w-full group-data-vertical/tabs:justify-start hover:text-text focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-solid focus-visible:outline-focus-ring disabled:pointer-events-none disabled:opacity-50 has-data-[icon=inline-end]:pr-1 has-data-[icon=inline-start]:pl-1 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        // The active highlight is TabsIndicator; the tab itself only darkens its label.
        "data-active:text-text",
        className
      )}
      {...props}
    />
  )
}

// Panels cross-fade. While switching, the old panel stays mounted until its
// fade ends, so every panel shares one grid cell and the two overlap instead
// of stacking. The list is auto-placed into the remaining cell.
function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-content"
      className={cn(
        "text-ui outline-none group-data-horizontal/tabs:col-start-1 group-data-horizontal/tabs:row-start-2 group-data-vertical/tabs:col-start-2 group-data-vertical/tabs:row-start-1",
        "transition-opacity duration-150 ease-out data-starting-style:opacity-0 data-ending-style:opacity-0 data-ending-style:duration-100 data-ending-style:ease-in",
        className
      )}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent, TabsIndicator, tabsListVariants }
