"use client";

import { useRef } from "react";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

import { useProto } from "./harness";
import { Lookup, useLookupHotkey } from "./lookup";
import type { LookupSetup } from "./margin";

// Margin's fallback when the window has no room beside the essay: the same
// lookup and language control, in a sheet over the essay from the left.

export function DictionarySheet({
  open,
  onOpenChange,
  setup,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  setup: LookupSetup;
}) {
  const { focusEssay } = useProto();
  const input = useRef<HTMLInputElement>(null);
  useLookupHotkey(() => onOpenChange(!open));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        initialFocus={input}
        finalFocus={() => {
          focusEssay();
          return false;
        }}
        className="gap-0"
      >
        <SheetHeader className="flex-row items-center justify-between pr-12">
          <SheetTitle>Dictionary</SheetTitle>
          {setup.title}
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col px-4 pb-4">
          {setup.header && <div className="mb-3">{setup.header}</div>}
          <Lookup inputRef={input} {...setup.lookup} className="flex-1" />
          {setup.footer}
        </div>
      </SheetContent>
    </Sheet>
  );
}
