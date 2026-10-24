import { cn } from "@/lib/utils";

// The bar across the top of the writing and correction screens. It spans the
// whole window while the essay keeps its reading column, so the crumb, run
// details, clock and progress have room. Tabular figures throughout, so a
// ticking clock or changing count never shifts its neighbors.

export function AppBar({ className, ...props }: React.ComponentProps<"header">) {
  return (
    <header
      className={cn(
        "sticky top-0 z-10 flex h-14 shrink-0 items-center justify-between gap-4 border-b bg-bg px-4 tabular-nums sm:px-6",
        className,
      )}
      {...props}
    />
  );
}

/** Holds the bar's place while a screen loads. */
export function AppBarSkeleton() {
  return <div className="h-14 shrink-0 border-b" aria-hidden />;
}
