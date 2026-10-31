import { ArrowRightIcon } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { SITE } from "@/lib/site";
import { cn } from "@/lib/utils";

import { Logo } from "./mocks";

// The nav, the actions and the footer the landing page and the legal pages
// share. The footer carries what a buyer, a card network or Stripe's review
// looks for on the site (lib/site.ts): who sells Ink and where, how to reach
// us, and the policies.

export function Nav({ className }: { className?: string }) {
  return (
    <header className={cn("mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6", className)}>
      <Link href="/" aria-label={SITE.name}>
        <Logo />
      </Link>
      <Link href="/home" className={buttonVariants({ variant: "ghost", size: "sm" })}>
        Open {SITE.name}
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

const POLICIES = [
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
  { href: "/refunds", label: "Refunds" },
] as const;

export function Footer({ className }: { className?: string }) {
  return (
    <footer className={cn("mx-auto grid w-full max-w-6xl gap-4 px-6 py-10 text-label text-text-3", className)}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Logo />
        <nav aria-label="Policies" className="flex flex-wrap gap-x-5 gap-y-2">
          {POLICIES.map((p) => (
            <Link key={p.href} href={p.href} className="transition-colors duration-150 hover:text-text">
              {p.label}
            </Link>
          ))}
          <a href={`mailto:${SITE.supportEmail}`} className="transition-colors duration-150 hover:text-text">
            {SITE.supportEmail}
          </a>
        </nav>
      </div>
      <p>
        {SITE.name} is made and sold by {SITE.legalName}, {SITE.location}. For TEF candidates writing their Expression écrite.
      </p>
    </footer>
  );
}
