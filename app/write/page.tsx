import type { Metadata } from "next";
import { Suspense } from "react";

import { AppBarSkeleton } from "@/components/app-bar";
import { Skeleton } from "@/components/ui/skeleton";

import { EssayScreen } from "./essay-screen";
import { WritingScreen, type Prompt } from "./writing-screen";

export const metadata: Metadata = {
  title: "Write · Ink",
};

// One sample prompt per section until prompts come from a library. French
// punctuation takes a narrow no-break space before "?".
const PROMPTS: Record<Prompt["section"], Omit<Prompt, "run">> = {
  A: {
    id: "chien-retrouve",
    section: "A",
    title: "Un chien parcourt 300 kilomètres pour retrouver sa famille",
    instructions: "Voici le début d’un article paru dans un journal local. Écrivez la suite de l’article.",
    excerpt:
      "Max, un berger allemand de six ans, avait disparu pendant le déménagement de sa famille en mars dernier. Mardi matin, les Moreau ont reçu un appel inattendu d’un refuge situé à 300 kilomètres de chez eux…",
    minWords: 80,
  },
  B: {
    id: "teletravail",
    section: "B",
    title: "Le télétravail devrait-il devenir la norme ?",
    instructions:
      "Un magazine en ligne demande à ses lecteurs ce qu’ils pensent du télétravail. Écrivez un article dans lequel vous donnez votre opinion et la défendez avec des arguments et des exemples.",
    minWords: 200,
  },
};

// /write?essay=<id> opens one of the user's essays (from /home). The sample
// exam runs stay at /write?section=A&run=mock until runs get their own entry.
// Search params are request-time data, so they're read inside Suspense: the
// skeleton prerenders as the static shell and the run streams in.
export default function WritePage({ searchParams }: PageProps<"/write">) {
  return (
    <Suspense fallback={<WritingSkeleton />}>
      <Run searchParams={searchParams} />
    </Suspense>
  );
}

async function Run({ searchParams }: Pick<PageProps<"/write">, "searchParams">) {
  const params = await searchParams;
  if (typeof params.essay === "string") return <EssayScreen id={params.essay} />;
  const section = params.section === "A" ? "A" : "B";
  const run = params.run === "mock" ? "mock" : "practice";
  return <WritingScreen prompt={{ ...PROMPTS[section], run }} />;
}

function WritingSkeleton() {
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
