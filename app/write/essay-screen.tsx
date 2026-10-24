"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useRef } from "react";

import { AppBar, AppBarSkeleton } from "@/components/app-bar";
import { Skeleton } from "@/components/ui/skeleton";
import { essayTitle, updateEssay, useEssays } from "@/lib/essays";

import { countWords, type Block } from "./blocks";
import { useDraft } from "./draft-store";
import { EssayEditor } from "./essay-editor";

// The user's own essay: a title (their prompt, or any name) and the text.
// No exam framing; an empty title and body are the empty state.

const BODY_ID = "essay-body";

export function EssayScreen({ id }: { id: string }) {
  const essays = useEssays();
  const [blocks, setBlocks] = useDraft(id);
  const essay = essays?.find((e) => e.id === id);

  if (essays === null || blocks === null) return <ScreenSkeleton />;

  if (!essay) {
    return (
      <main className="mx-auto grid max-w-prose gap-2 px-4 pt-24 text-center">
        <h1 className="text-title">This essay isn’t on this device</h1>
        <p className="text-ui text-text-2">
          Essays are saved in this browser for now.{" "}
          <Link href="/home" className="text-text underline decoration-border-strong underline-offset-4 hover:decoration-current">
            Back to Home
          </Link>
        </p>
      </main>
    );
  }

  const isNew = essay.title === "" && essay.words === 0;

  function onBodyChange(next: Block[]) {
    setBlocks(next);
    updateEssay(id, { words: countWords(next) });
  }

  return (
    <>
      <AppBar>
        <p className="min-w-0 truncate text-label text-text-3">
          <Link href="/home" className="transition-colors hover:text-text">
            Home
          </Link>{" "}
          <span aria-hidden>/</span>{" "}
          <span className="text-text" lang="fr">
            {essayTitle(essay)}
          </span>
        </p>
        <span className="shrink-0 text-label text-text-3">
          {essay.words.toLocaleString("en")} {essay.words === 1 ? "word" : "words"}
        </span>
      </AppBar>

      <main className="mx-auto w-full max-w-3xl px-4 sm:px-10">
        <TitleField
          value={essay.title}
          autoFocus={isNew}
          onChange={(title) => updateEssay(id, { title })}
        />

        <EssayEditor
          id={BODY_ID}
          value={blocks}
          onValueChange={onBodyChange}
          aria-label="Your essay"
          placeholder="Écrivez votre texte ici…"
          autoFocus={!isNew}
          className="mt-6 max-w-prose min-h-96 pb-40"
        />
      </main>
    </>
  );
}

// One line of title that wraps as it grows. Enter or ↓ at the end moves into
// the essay; pasted line breaks become spaces. Literata's descenders and
// accents reach past the 1.2 line-height, so py-1 gives them room inside the
// box (mt-9 instead of mt-10 keeps the text where it was) and nothing scrolls
// or clips.
function TitleField({
  value,
  autoFocus,
  onChange,
}: {
  value: string;
  autoFocus: boolean;
  onChange: (value: string) => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  // Grows with its text and never scrolls. CSS field-sizing does this where
  // supported; elsewhere, size it to its content after every change.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || CSS.supports("field-sizing", "content")) return;
    el.style.height = "0px";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  useEffect(() => {
    if (autoFocus && matchMedia("(pointer: fine)").matches) ref.current?.focus();
    // Only on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function focusBody() {
    const first = document.getElementById(BODY_ID)?.querySelector("textarea");
    first?.focus();
    first?.setSelectionRange(0, 0);
  }

  return (
    <textarea
      ref={ref}
      value={value}
      rows={1}
      lang="fr"
      aria-label="Title or prompt"
      placeholder="Untitled"
      spellCheck={false}
      autoCorrect="off"
      autoCapitalize="off"
      autoComplete="off"
      data-gramm="false"
      data-lt-active="false"
      onChange={(e) => onChange(e.target.value.replace(/\s*\n\s*/g, " "))}
      onKeyDown={(e) => {
        const el = e.currentTarget;
        const atEnd = el.selectionStart === el.value.length && el.selectionEnd === el.value.length;
        if (e.key === "Enter" || (e.key === "ArrowDown" && atEnd)) {
          e.preventDefault();
          focusBody();
        }
      }}
      className="field-sizing-content mt-9 block w-full max-w-prose resize-none overflow-hidden bg-transparent py-1 font-serif text-essay-title text-text outline-none placeholder:text-text-3"
    />
  );
}

function ScreenSkeleton() {
  return (
    <>
      <AppBarSkeleton />
      <main className="mx-auto w-full max-w-3xl px-4 sm:px-10" aria-busy>
        <div className="grid max-w-prose gap-3 pt-10" aria-hidden>
          <Skeleton className="h-8 w-3/5" />
          <Skeleton className="mt-4 h-4 w-full" />
          <Skeleton className="h-4 w-11/12" />
        </div>
      </main>
    </>
  );
}
