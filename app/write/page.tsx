import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { AppBarSkeleton } from "@/components/app-bar";
import { Skeleton } from "@/components/ui/skeleton";

import { EssayScreen } from "./essay-screen";

export const metadata: Metadata = {
  title: "Write · Encre",
};

// /write?essay=<id> opens one of the user's essays (from /home); &new=1 is a
// new essay that isn't saved until something is written. Without an essay
// there's nothing to open, so it goes Home. Search params are request-time
// data, so they're read inside Suspense: the skeleton prerenders as the
// static shell and the essay streams in.
export default function WritePage({ searchParams }: PageProps<"/write">) {
  return (
    <Suspense fallback={<EssaySkeleton />}>
      <Run searchParams={searchParams} />
    </Suspense>
  );
}

async function Run({ searchParams }: Pick<PageProps<"/write">, "searchParams">) {
  const params = await searchParams;
  if (typeof params.essay !== "string") redirect("/home");
  // Keyed by essay: its state (editable, coffee mode, the open card) belongs to one essay.
  return <EssayScreen key={params.essay} id={params.essay} fresh={params.new === "1"} />;
}

function EssaySkeleton() {
  return (
    <>
      <AppBarSkeleton />
      <main className="mx-auto w-full max-w-3xl px-4 sm:px-10" aria-busy>
        <div className="grid max-w-prose gap-3 pt-10" aria-hidden>
          <Skeleton className="h-8 w-4/5" />
          <Skeleton className="mt-2 h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </main>
    </>
  );
}
