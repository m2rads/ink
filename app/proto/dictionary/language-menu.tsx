"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { LANGUAGES } from "./data";
import { useProto } from "./harness";

// Throwaway: /proto/dictionary. The learner's language as a menu, for the
// variants that keep it behind a control. Each language in its own script,
// with its English name beside it.

export function LanguageMenu({
  trigger,
  align = "start",
}: {
  /** The element that opens the menu (Base UI `render`). */
  trigger: React.ReactElement;
  align?: "start" | "end";
}) {
  const { lang, setLang } = useProto();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={trigger} />
      <DropdownMenuContent align={align} className="w-80">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Your language</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={lang} onValueChange={(v) => setLang(v as string)}>
            {LANGUAGES.map((l) => (
              <DropdownMenuRadioItem key={l.code} value={l.code}>
                <span lang={l.code} dir={l.rtl ? "rtl" : "ltr"} className="whitespace-nowrap">
                  {l.native}
                </span>
                {l.hint && <span className="ml-auto whitespace-nowrap text-text-3">{l.name}</span>}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
