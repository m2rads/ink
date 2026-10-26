"use client";

import { ArrowRightIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { Logo } from "./mocks";

// Throwaway: /proto/landing. The nav, CTA and footer every variant shares.

const INTRO_KEY = "ink:landing:intro";

/**
 * True on the first page view of a session: the hero rises once, then never
 * again until a new visit (sessionStorage, not localStorage). The picker's
 * replay (R) clears it.
 */
export function useIntro() {
  const [play] = useState(() => {
    try {
      if (sessionStorage.getItem(INTRO_KEY)) return false;
      sessionStorage.setItem(INTRO_KEY, "1");
      return !matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch {
      return false;
    }
  });
  return play;
}

export function forgetIntro() {
  try {
    sessionStorage.removeItem(INTRO_KEY);
  } catch {
    // Storage blocked: the intro never played anyway.
  }
}

export function Nav({ className }: { className?: string }) {
  return (
    <header className={cn("mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6", className)}>
      <Link href="/" aria-label="Ink">
        <Logo />
      </Link>
      <Link href="/home" className={buttonVariants({ variant: "ghost", size: "sm" })}>
        Open Ink
      </Link>
    </header>
  );
}

/** The page's one brand-blue action. */
export function Cta({ children = "Start writing", className }: { children?: React.ReactNode; className?: string }) {
  return (
    <Link href="/home" className={cn(buttonVariants({ variant: "brand", size: "lg" }), className)}>
      {children}
      <ArrowRightIcon data-icon="inline-end" />
    </Link>
  );
}

/** The quiet second action: the page's own primary is the brand one. */
export function SecondaryCta({ children = "Start writing", href = "/home", className }: { children?: React.ReactNode; href?: string; className?: string }) {
  return (
    <Link href={href} className={cn(buttonVariants({ variant: "default", size: "lg" }), className)}>
      {children}
    </Link>
  );
}

export function Footer({ className }: { className?: string }) {
  return (
    <footer className={cn("mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-10 text-label text-text-3", className)}>
      <Logo />
      <p>For TEF candidates writing their Expression écrite</p>
    </footer>
  );
}
