"use client";

import { PenLineIcon, SunMoonIcon, UserRoundIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";

import { AppSidebar } from "@/components/app-sidebar";
import { TruncateWords } from "@/components/truncate-words";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { me } from "@/lib/api/client";
import { useSession } from "@/lib/auth-client";
import { essayHref, essayTitle, localDay, useEssays, useStartEssay, type EssayMeta } from "@/lib/essays";
import type { Allowance } from "@/lib/plans";
import { signOutAndClear } from "@/lib/sync/client";
import { setTheme, useThemeChoice, type ThemeChoice } from "@/lib/theme";

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
          <div className="ml-auto -mr-1 flex items-center gap-2">
            <ThemeMenu />
            <AccountMenu />
          </div>
        </header>

        <main className="px-4 py-12 sm:px-10">
          <div className="mx-auto max-w-5xl">
            <div className="flex flex-wrap items-end justify-between gap-6">
              {ready ? <Streak activity={activity} today={today} /> : <Skeleton className="h-16 w-64" />}
              <Button variant="brand" size="lg" onClick={startEssay}>
                <PenLineIcon />
                New essay
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
        {wroteToday ? "Done for today" : streak > 0 ? "Write today to keep it" : "Write today to start one"}
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
          Each one fills a day in the graph.
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
                keepLastWord
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

// The theme is chosen rarely, so it lives here rather than in the writing
// screens' bars, where chrome stays out of the essay's way.
function ThemeMenu() {
  const choice = useThemeChoice();
  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger
          render={
            <DropdownMenuTrigger
              render={<Button variant="ghost" size="icon-sm" aria-label="Theme" />}
            />
          }
        >
          <SunMoonIcon />
        </TooltipTrigger>
        <TooltipContent>Theme</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Theme</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={choice ?? "system"} onValueChange={(v) => setTheme(v as ThemeChoice)}>
            <DropdownMenuRadioItem value="light">Light</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="dark">Dark</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="system">System</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Who's signed in, what's left of the plan, and Sign out. Next to the theme,
// for the same reason: it's rarely needed, and the writing screens stay quiet.
function AccountMenu() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [allowance, setAllowance] = useState<Allowance | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open || !session) return;
    let gone = false;
    me()
      .then((r) => !gone && setAllowance(r.allowance))
      .catch(() => {});
    return () => {
      gone = true;
    };
  }, [open, session]);

  // Holds the button's place while the session loads.
  if (isPending || !session) return <span aria-hidden className="size-8" />;
  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger
          render={<DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Account" />} />}
        >
          <UserRoundIcon />
        </TooltipTrigger>
        <TooltipContent>Account</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{session.user.email}</DropdownMenuLabel>
          <p className="px-2 pb-1.5 text-caption text-text-3 tabular-nums">
            {allowance ? reviewsLine(allowance) : " "}
          </p>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/plans" />}>Plans</DropdownMenuItem>
        <DropdownMenuItem
          onClick={() =>
            signOutAndClear()
              .then(() => router.replace("/sign-in"))
              .catch(() =>
                toast.error("Couldn’t sign out", { description: "Some changes aren’t saved to your account yet. Try again online." }),
              )
          }
        >
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function reviewsLine(a: Allowance) {
  // Reviews that last as long as the pass don't need their own date.
  const until = a.resetsAt === a.passEndsAt ? "" : ` until ${turnover(a.resetsAt)}`;
  const reviews = `${plural(a.reviewsLeft, "review")} left${until}`;
  return a.passEndsAt ? `Exam Pass until ${turnover(a.passEndsAt)} · ${reviews}` : reviews;
}

// The free allowance turns over at midnight UTC: show that day, not the
// evening before in the Americas. A pass ends at the time it was bought, so
// that one is the writer's own day.
function turnover(iso: string) {
  const midnightUtc = iso.endsWith("T00:00:00.000Z");
  return new Date(iso).toLocaleDateString("en", { month: "short", day: "numeric", ...(midnightUtc && { timeZone: "UTC" }) });
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
