"use client";

import { ArrowRightLeftIcon, ChevronDownIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

import { language, type Direction } from "./data";
import { useProto } from "./harness";
import { LanguageMenu } from "./language-menu";
import { MarginShell } from "./margin";

// Pair: the direction is a visible mode, like a translation app. A language
// pair sits above the field, source on the left: your language (a menu) and
// French, with a swap between them. You always know which way you're
// searching, and a word that exists in both languages can't be misread.

const EXAMPLE: Record<string, string> = { en: "commute…", es: "atasco…" };

export function Pair({ source = "sample" }: { source?: "sample" | "collins" }) {
  const { lang: code } = useProto();
  const lang = language(code);
  const [direction, setDirection] = useState<Exclude<Direction, "auto">>("to-fr");
  const toFrench = direction === "to-fr";

  const own = (
    <LanguageMenu
      trigger={
        <Button variant="ghost" size="xs" aria-label={`Your language: ${lang.name}`} className="-mx-1 min-w-0">
          <span lang={lang.code} dir={lang.rtl ? "rtl" : "ltr"} className="truncate">
            {lang.native}
          </span>
          <ChevronDownIcon data-icon="inline-end" />
        </Button>
      }
    />
  );
  const french = (
    <span lang="fr" className="px-1.5 text-label font-medium text-text-2">
      Français
    </span>
  );

  return (
    <MarginShell
      setup={{
        header: (
          <div className="flex items-center gap-1 text-label">
            {toFrench ? own : french}
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label={toFrench ? "Look up French words instead" : `Look up ${lang.name} words instead`}
                    onClick={() => setDirection(toFrench ? "from-fr" : "to-fr")}
                  />
                }
              >
                <ArrowRightLeftIcon />
              </TooltipTrigger>
              <TooltipContent>Swap</TooltipContent>
            </Tooltip>
            {toFrench ? french : own}
          </div>
        ),
        lookup: {
          source,
          direction,
          label: toFrench ? `Look up a ${lang.name} word in French` : "Look up a French word",
          placeholder: toFrench ? (EXAMPLE[lang.code] ?? `${lang.native}…`) : "trajet…",
        },
      }}
    />
  );
}
