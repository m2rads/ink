"use client";

import { PenLineIcon } from "lucide-react";
import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";

import { AppSidebar } from "@/components/app-sidebar";
import { TruncateWords } from "@/components/truncate-words";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { essayHref, essayTitle, localDay, useEssays, useStartEssay, type EssayMeta } from "@/lib/essays";

import { ContributionGraph, currentStreak, type Activity } from "./contribution-graph";

// Home, decided from /proto/home (see AGENTS.md): the streak, the year graph
// and the one brand action from "Rail", then "Recent" from "Studio".

export function HomeScreen() {
  const essays = useEssays();
  const today = useToday();
  const startEssay = useStartEssay();

  const activity = useMemo<Activity[]>(
    () => (essays ?? []).map((e) => ({ date: localDay(e.createdAt), words: e.words })),
    [essays],
  );
  const ready = essays !== null && today !== null;

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="h-4 data-vertical:self-center" />
          <h1 className="text-label font-medium">Home</h1>
        </header>

        <main className="px-4 py-12 sm:px-10">
          <div className="mx-auto max-w-5xl">
            <div className="flex flex-wrap items-end justify-between gap-6">
              {ready ? <Streak activity={activity} today={today} /> : <Skeleton className="h-16 w-64" />}
              <Button variant="brand" size="lg" onClick={startEssay}>
                <PenLineIcon />
                Write an essay
              </Button>
            </div>

            {ready ? (
              <ContributionGraph activity={activity} today={today} className="mt-12" />
            ) : (
              <Skeleton className="mt-12 aspect-[7/1] w-full" />
            )}

            <Recent essays={essays} />
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

// The year's totals are the graph's caption; this line says where today stands.
function Streak({ activity, today }: { activity: Activity[]; today: string }) {
  const streak = currentStreak(activity, today);
  const wroteToday = activity.some((a) => a.date === today);
  return (
    <div>
      <p className="flex items-baseline gap-3">
        <span className="text-display tabular-nums">{streak}</span>
        <span className="text-title text-text-2">day streak</span>
      </p>
      <p className="mt-2 text-ui text-text-3">
        {wroteToday ? "You wrote today." : streak > 0 ? "Write today to keep it going." : "Write today to start a streak."}
      </p>
    </div>
  );
}

function Recent({ essays }: { essays: EssayMeta[] | null }) {
  if (essays === null) return null;
  if (essays.length === 0) {
    return (
      <section className="mt-12 rounded-card border border-dashed p-8 text-center">
        <h2 className="text-title">Write your first essay</h2>
        <p className="mx-auto mt-1 max-w-prose text-ui text-text-2">
          Start with Write an essay. Each essay you write fills a day in the graph above.
        </p>
      </section>
    );
  }
  return (
    <section className="mt-12">
      <h2 className="eyebrow text-text-3">Recent</h2>
      <ul className="mt-3 divide-y border-y">
        {essays.slice(0, 5).map((e) => (
          <li key={e.id}>
            <Link
              href={essayHref(e.id)}
              className="flex items-baseline gap-4 rounded-row py-3 transition-colors hover:text-text-2 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-solid focus-visible:outline-focus-ring"
            >
              <TruncateWords
                text={essayTitle(e)}
                lang="fr"
                className={e.title.trim() ? "font-serif text-body" : "font-serif text-body text-text-3"}
              />
              <span className="shrink-0 text-label text-text-3 tabular-nums">
                {plural(e.words, "word")} · {shortDate(e.updatedAt)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

// Today's local date. Read through a store so renders stay pure; the server
// has no local date, so it renders skeletons.
const noSubscribe = () => () => {};
const readToday = () => localDay(new Date());
function useToday(): string | null {
  return useSyncExternalStore(noSubscribe, readToday, () => null);
}

function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString("en", { month: "short", day: "numeric" });
}

function plural(n: number, word: string) {
  return `${n.toLocaleString("en")} ${word}${n === 1 ? "" : "s"}`;
}
