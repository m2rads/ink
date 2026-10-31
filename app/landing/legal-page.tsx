import "./landing.css";

import { SITE } from "@/lib/site";

import { Footer, Nav } from "./parts";

// The shell of a policy page (Terms, Privacy, Refunds): the landing page's
// nav and footer around one reading column. Public (proxy.ts), since a
// buyer reads them before signing in and a payments review reads them
// without an account.

export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="lp min-h-dvh bg-bg text-text">
      <Nav />
      <main className="mx-auto w-full max-w-6xl px-6 pt-16 pb-24 sm:pt-20">
        <article className="lp-prose">
          <h1 className="text-display font-medium tracking-tight text-balance">{title}</h1>
          <p className="mt-2 text-label text-text-3">Last updated {SITE.policiesUpdated}</p>
          <div className="mt-6 text-body">{children}</div>
        </article>
      </main>
      <Footer className="border-t" />
    </div>
  );
}
